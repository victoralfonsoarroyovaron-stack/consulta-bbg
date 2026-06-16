const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

function getPostgresConnectionString() {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }

    const instance = process.env.CLOUD_SQL_CONNECTION_NAME;
    if (!instance) {
        return null;
    }

    const user = process.env.DB_USER || "postgres";
    const password = process.env.DB_PASSWORD || "";
    const database = process.env.DB_NAME || "postgres";

    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@/${database}?host=/cloudsql/${instance}`;
}

const connectionString = getPostgresConnectionString();
const usePostgres = Boolean(connectionString);
let db = null;
let pgPool = null;
let sqlite3 = null;

if (usePostgres) {
    const { Pool } = require("pg");
    pgPool = new Pool({
        connectionString,
        ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
    });
} else {
    sqlite3 = require("sqlite3").verbose();
}

const app = express();
const PORT = process.env.PORT || 5500;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";

const dbPath = path.join(__dirname, "data", "consultas.db");
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

async function initDatabase() {
    if (usePostgres) {
        try {
            await pgPool.query(`
                CREATE TABLE IF NOT EXISTS consultas (
                    id SERIAL PRIMARY KEY,
                    cct TEXT UNIQUE NOT NULL,
                    escuela TEXT,
                    sare TEXT,
                    municipio TEXT,
                    localidad TEXT,
                    contador INTEGER DEFAULT 1,
                    ultima_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await pgPool.query(`ALTER TABLE consultas ADD COLUMN IF NOT EXISTS sare TEXT`);
            await pgPool.query(`ALTER TABLE consultas ADD COLUMN IF NOT EXISTS municipio TEXT`);
            await pgPool.query(`ALTER TABLE consultas ADD COLUMN IF NOT EXISTS localidad TEXT`);
            console.log("✅ Base de datos PostgreSQL conectada");
        } catch (err) {
            console.error("Error al inicializar PostgreSQL:", err);
            process.exit(1);
        }
    } else {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error("Error al abrir base de datos SQLite:", err);
            } else {
                console.log("✅ Base de datos SQLite conectada");
                db.run(`
                    CREATE TABLE IF NOT EXISTS consultas (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        cct TEXT UNIQUE NOT NULL,
                        escuela TEXT,
                        sare TEXT,
                        municipio TEXT,
                        localidad TEXT,
                        contador INTEGER DEFAULT 1,
                        ultima_consulta DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (createErr) => {
                    if (createErr) {
                        console.error("Error creando tabla consultas:", createErr);
                        return;
                    }
                    ensureSqliteColumns();
                });
            }
        });
    }
}

function ensureSqliteColumns() {
    db.all(`PRAGMA table_info(consultas)`, (err, rows) => {
        if (err) {
            console.error("Error consultando columnas de SQLite:", err);
            return;
        }

        const columns = rows.map(row => row.name);
        const needed = ["sare", "municipio", "localidad"];

        needed.forEach((column) => {
            if (!columns.includes(column)) {
                db.run(`ALTER TABLE consultas ADD COLUMN ${column} TEXT`, (alterErr) => {
                    if (alterErr) {
                        console.error(`Error añadiendo columna ${column}:`, alterErr);
                    }
                });
            }
        });
    });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "consulta_bbg_secreto",
    resave: false,
    saveUninitialized: true,
    cookie: { 
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

function checkAuth(req, res, next) {
    if (req.session && req.session.autenticado) {
        return next();
    }
    res.status(401).json({ error: "No autenticado" });
}

app.post("/api/log-query", async (req, res) => {
    const { cct, escuela, sare, municipio, localidad } = req.body;
    if (!cct) {
        return res.status(400).json({ error: "Falta el CCT" });
    }

    const clave = String(cct).trim().toUpperCase();
    const escuelaNombre = escuela || "Sin nombre";
    const sareValor = sare || "No disponible";
    const municipioValor = municipio || "No disponible";
    const localidadValor = localidad || "No disponible";

    if (usePostgres) {
        try {
            await pgPool.query(
                `INSERT INTO consultas (cct, escuela, sare, municipio, localidad, contador, ultima_consulta)
                 VALUES ($1, $2, $3, $4, $5, 1, CURRENT_TIMESTAMP)
                 ON CONFLICT (cct) DO UPDATE
                 SET contador = consultas.contador + 1,
                     ultima_consulta = CURRENT_TIMESTAMP,
                     escuela = EXCLUDED.escuela,
                     sare = EXCLUDED.sare,
                     municipio = EXCLUDED.municipio,
                     localidad = EXCLUDED.localidad`,
                [clave, escuelaNombre, sareValor, municipioValor, localidadValor]
            );
            return res.json({ ok: true });
        } catch (err) {
            console.error("Error registrando consulta en PostgreSQL:", err);
            return res.status(500).json({ error: "Error al registrar" });
        }
    }

    db.run(
        `INSERT INTO consultas (cct, escuela, sare, municipio, localidad)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(cct) DO UPDATE SET
             contador = contador + 1,
             ultima_consulta = CURRENT_TIMESTAMP,
             escuela = excluded.escuela,
             sare = excluded.sare,
             municipio = excluded.municipio,
             localidad = excluded.localidad`,
        [clave, escuelaNombre, sareValor, municipioValor, localidadValor],
        (err) => {
            if (err) {
                console.error("Error registrando consulta:", err);
                return res.status(500).json({ error: "Error al registrar" });
            }
            res.json({ ok: true });
        }
    );
});

app.post("/api/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        req.session.autenticado = true;
        return res.json({ ok: true });
    }
    res.status(401).json({ error: "Contraseña incorrecta" });
});

app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ ok: true });
    });
});

app.get("/api/queries/top", checkAuth, async (req, res) => {
    if (usePostgres) {
        try {
            const result = await pgPool.query(
                `SELECT cct, escuela, sare, municipio, localidad, contador, ultima_consulta
                 FROM consultas
                 ORDER BY contador DESC
                 LIMIT 100`
            );
            return res.json(result.rows || []);
        } catch (err) {
            console.error("Error al obtener consultas de PostgreSQL:", err);
            return res.status(500).json({ error: "Error al obtener datos" });
        }
    }

    db.all(
        `SELECT cct, escuela, sare, municipio, localidad, contador, ultima_consulta 
         FROM consultas 
         ORDER BY contador DESC 
         LIMIT 100`,
        (err, rows) => {
            if (err) {
                console.error("Error al obtener consultas:", err);
                return res.status(500).json({ error: "Error al obtener datos" });
            }
            res.json(rows || []);
        }
    );
});

app.get("/api/check-auth", (req, res) => {
    res.json({ autenticado: req.session && req.session.autenticado });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get(["/admin", "/admin/"], (req, res) => {
    res.sendFile(path.join(__dirname, "admin.html"));
});

app.use(express.static(path.join(__dirname)));

process.on("SIGINT", async () => {
    if (usePostgres) {
        try {
            await pgPool.end();
        } catch (err) {
            console.error(err);
        }
    } else if (db) {
        db.close((err) => {
            if (err) console.error(err);
        });
    }
    process.exit(0);
});

(async () => {
    await initDatabase();

    app.listen(PORT, () => {
        console.log(`\n🚀 Servidor iniciado en http://127.0.0.1:${PORT}`);
        console.log(`📊 Panel admin: http://127.0.0.1:${PORT}/admin`);
        console.log(`🔐 Contraseña: ${ADMIN_PASSWORD}\n`);
    });
})();
