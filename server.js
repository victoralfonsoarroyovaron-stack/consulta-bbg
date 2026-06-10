const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const usePostgres = Boolean(process.env.DATABASE_URL);
let db = null;
let pgPool = null;
let sqlite3 = null;

if (usePostgres) {
    const { Pool } = require("pg");
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
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
                    contador INTEGER DEFAULT 1,
                    ultima_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
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
                        contador INTEGER DEFAULT 1,
                        ultima_consulta DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
            }
        });
    }
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
    const { cct, escuela } = req.body;
    if (!cct) {
        return res.status(400).json({ error: "Falta el CCT" });
    }

    const clave = String(cct).trim().toUpperCase();
    const escuelaNombre = escuela || "Sin nombre";

    if (usePostgres) {
        try {
            await pgPool.query(
                `INSERT INTO consultas (cct, escuela, contador, ultima_consulta)
                 VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
                 ON CONFLICT (cct) DO UPDATE
                 SET contador = consultas.contador + 1,
                     ultima_consulta = CURRENT_TIMESTAMP`,
                [clave, escuelaNombre]
            );
            return res.json({ ok: true });
        } catch (err) {
            console.error("Error registrando consulta en PostgreSQL:", err);
            return res.status(500).json({ error: "Error al registrar" });
        }
    }

    db.run(
        `INSERT INTO consultas (cct, escuela) VALUES (?, ?)
         ON CONFLICT(cct) DO UPDATE SET contador = contador + 1, ultima_consulta = CURRENT_TIMESTAMP`,
        [clave, escuelaNombre],
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
                `SELECT cct, escuela, contador, ultima_consulta
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
        `SELECT cct, escuela, contador, ultima_consulta 
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
