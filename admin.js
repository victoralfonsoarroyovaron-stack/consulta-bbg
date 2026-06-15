let sesionActiva = false;
const DISPLAY_LIMIT = 20;

async function checkSession() {
    const response = await fetch("/api/check-auth");
    const data = await response.json();
    return data.autenticado;
}

async function login(password) {
    const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
    });

    if (response.ok) {
        sesionActiva = true;
        mostrarPanelAdmin();
        return true;
    }
    return false;
}

function mostrarFormularioLogin() {
    const panel = document.querySelector(".monitor.admin-panel");
    panel.innerHTML = `
        <div class="login-form">
            <h2>Acceso al Panel de Administración</h2>
            <input 
                type="password" 
                id="passwordInput" 
                placeholder="Ingresa la contraseña" 
                autocomplete="off"
            />
            <button id="btnLogin" class="btn-monitor">Ingresar</button>
            <div id="loginError" style="color: #dc3545; margin-top: 12px; display: none;"></div>
        </div>
    `;

    document.getElementById("btnLogin").addEventListener("click", async () => {
        const pwd = document.getElementById("passwordInput").value;
        if (!pwd) {
            showLoginError("Ingresa la contraseña");
            return;
        }
        
        if (await login(pwd)) {
            document.getElementById("loginError").style.display = "none";
        } else {
            showLoginError("Contraseña incorrecta");
        }
    });

    document.getElementById("passwordInput").addEventListener("keypress", async (e) => {
        if (e.key === "Enter") {
            const pwd = document.getElementById("passwordInput").value;
            if (pwd && await login(pwd)) {
                document.getElementById("loginError").style.display = "none";
            }
        }
    });
}

function showLoginError(msg) {
    const errorDiv = document.getElementById("loginError");
    errorDiv.textContent = "❌ " + msg;
    errorDiv.style.display = "block";
}

async function obtenerTopConsultas(limite = 100) {
    try {
        const response = await fetch("/api/queries/top");

        if (response.status === 401) {
            sesionActiva = false;
            mostrarFormularioLogin();
            return [];
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const datos = await response.json();
        return datos.slice(0, limite);
    } catch (error) {
        console.error("Error al obtener consultas:", error);
        return [];
    }
}

function renderConsultas(lista, limite) {
    const subset = lista.slice(0, limite);
    return `
        <div class="monitor-title"><strong>Escuelas más consultadas</strong></div>
        <table class="tabla-consultas">
            <thead>
                <tr>
                    <th>Escuela</th>
                    <th>CCT</th>
                    <th>SARE</th>
                    <th>Municipio</th>
                    <th>Localidad</th>
                    <th class="columna-numero">Consultas</th>
                </tr>
            </thead>
            <tbody>
                ${subset.map(item => `
                    <tr>
                        <td>${item.escuela}</td>
                        <td class="codigo">${item.cct}</td>
                        <td>${item.sare || "No disponible"}</td>
                        <td>${item.municipio || "No disponible"}</td>
                        <td>${item.localidad || "No disponible"}</td>
                        <td class="columna-numero">${item.contador}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

async function mostrarMonitorResultados(mostrarTodas = false) {
    const monitor = document.getElementById("monitorResultado");
    const topConsultas = await obtenerTopConsultas(100);

    if (topConsultas.length === 0) {
        monitor.innerHTML = `<div>No hay consultas registradas aún.</div>`;
        return;
    }

    const limite = mostrarTodas ? topConsultas.length : DISPLAY_LIMIT;
    const textoBoton = mostrarTodas ? "Mostrar solo top 20" : `Mostrar ${topConsultas.length > DISPLAY_LIMIT ? topConsultas.length : DISPLAY_LIMIT}`;

    monitor.innerHTML = `
        ${renderConsultas(topConsultas, limite)}
        ${topConsultas.length > DISPLAY_LIMIT ? `
            <button id="btnToggleMostrar" class="btn-monitor" style="margin-top: 18px;">
                ${textoBoton}
            </button>
        ` : ""}
    `;

    if (topConsultas.length > DISPLAY_LIMIT) {
        document.getElementById("btnToggleMostrar").addEventListener("click", () => {
            mostrarMonitorResultados(!mostrarTodas);
        });
    }
}

async function mostrarPanelAdmin() {
    const panel = document.querySelector(".monitor.admin-panel");
    
    panel.innerHTML = `
        <button id="btnExportReport" class="btn-monitor">
            Exportar reporte de consultas
        </button>
        <button id="btnLogout" class="btn-monitor" style="background: #9D2449;">
            Cerrar sesión
        </button>
        <div id="monitorResultado" class="monitor-resultado"></div>
    `;

    document.getElementById("btnExportReport").addEventListener("click", descargarReporteExcel);
    document.getElementById("btnLogout").addEventListener("click", async () => {
        await fetch("/api/logout");
        sesionActiva = false;
        mostrarFormularioLogin();
    });

    await mostrarMonitorResultados();
}

async function descargarReporteExcel() {
    const topConsultas = await obtenerTopConsultas(100);
    if (!window.XLSX) {
        alert("La librería Excel no está disponible.");
        return;
    }

    if (topConsultas.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    const hoja = topConsultas.map(item => ({
        CCT: item.cct,
        Escuela: item.escuela,
        SARE: item.sare || "No disponible",
        Municipio: item.municipio || "No disponible",
        Localidad: item.localidad || "No disponible",
        Consultas: item.contador
    }));

    const libro = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(hoja);
    XLSX.utils.book_append_sheet(libro, worksheet, "Reporte de consultas");

    const nombreArchivo = `reporte_consultas_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(libro, nombreArchivo);
}

window.addEventListener("DOMContentLoaded", async () => {
    sesionActiva = await checkSession();
    
    if (sesionActiva) {
        await mostrarPanelAdmin();
    } else {
        mostrarFormularioLogin();
    }
});
