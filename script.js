let datos = [];

// =====================
// CARGAR DATOS
// =====================

fetch("/data/data.json")
    .then(response => response.json())
    .then(json => {

        datos = json;

        console.log(`✅ Registros cargados: ${datos.length}`);

    })
    .catch(error => {

        console.error("Error cargando JSON:", error);

    });

// =====================
// BOTÓN CONSULTAR
// =====================

document
    .getElementById("btnConsultar")
    .addEventListener("click", buscarCCT);

// =====================
// ENTER
// =====================

document
    .getElementById("cct")
    .addEventListener("keypress", function(event) {

        if (event.key === "Enter") {
            buscarCCT();
        }

    });

// =====================
// MAYÚSCULAS
// =====================

document
    .getElementById("cct")
    .addEventListener("input", function() {

        this.value = this.value.toUpperCase();

    });

// =====================
// FORMATEAR FECHA
// =====================

function parseFechaTexto(valor) {

    const texto = String(valor).trim();

    const partes = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);

    if (partes) {
        let [, dia, mes, anio] = partes;

        if (anio.length === 2) {
            anio = `20${anio}`;
        }

        const diaNum = Number(dia);
        const mesNum = Number(mes);

        if (mesNum >= 1 && mesNum <= 12 && diaNum >= 1 && diaNum <= 31) {
            return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${anio}`;
        }
    }

    const fecha = new Date(texto);

    if (!isNaN(fecha)) {
        return fecha.toLocaleDateString(
            "es-MX",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );
    }

    return null;
}

function formatearFecha(valor) {

    if (!valor && valor !== 0) return "No disponible";

    if (typeof valor === "number" && !isNaN(valor)) {

        const fechaExcel = new Date(
            (valor - 25569) * 86400 * 1000
        );

        return fechaExcel.toLocaleDateString(
            "es-MX",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );
    }

    const fechaFormateada = parseFechaTexto(valor);
    return fechaFormateada || "No disponible";
}

// =====================
// FORMATEAR HORA
// =====================

function formatearHora(valor) {

    if (!valor && valor !== 0) return null;

    if (typeof valor === "number" && !isNaN(valor)) {

        const totalSegundos =
            Math.round(valor * 86400);

        const horas =
            Math.floor(totalSegundos / 3600);

        const minutos =
            Math.floor(
                (totalSegundos % 3600) / 60
            );

        return `${horas.toString().padStart(2, "0")}:${minutos.toString().padStart(2, "0")} hrs`;
    }

    const texto = String(valor).trim();
    if (texto === "") return null;

    const fecha = new Date(`1970-01-01 ${texto}`);

    if (!isNaN(fecha)) {
        const horas = fecha.getHours().toString().padStart(2, "0");
        const minutos = fecha.getMinutes().toString().padStart(2, "0");
        return `${horas}:${minutos} hrs`;
    }

    return texto;
}

function parseFechaDate(valor) {
    if (!valor && valor !== 0) return null;

    if (typeof valor === "number" && !isNaN(valor)) {
        return new Date((valor - 25569) * 86400 * 1000);
    }

    const texto = String(valor).trim();
    if (texto === "") return null;

    const partes = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (partes) {
        let [, dia, mes, anio] = partes;
        if (anio.length === 2) {
            anio = `20${anio}`;
        }
        return new Date(`${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`);
    }

    const fecha = new Date(texto);
    return isNaN(fecha) ? null : fecha;
}

function fechaPasada(valor) {
    const fecha = parseFechaDate(valor);
    if (!fecha) return false;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);

    return fecha < hoy;
}

function logConsultaServidor(registro) {
    if (!registro || !registro.cct) return;

    const payload = {
        cct: registro.cct,
        escuela: registro.escuela || "Sin nombre"
    };

    fetch("/api/log-query", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            console.warn("No se pudo registrar la consulta en el servidor.");
        }
    })
    .catch(error => {
        console.warn("Error de red al registrar la consulta:", error);
    });
}

function obtenerHorario(registro) {
    const inicio = formatearHora(registro.hora_inicio || registro.horaInicio || registro["Hora Inicio"] || registro["hora inicio"] || registro.hora_atencion);
    const fin = formatearHora(registro.hora_final || registro.hora_fin || registro.horaFinal || registro["Hora Final"] || registro["hora fin"] || registro.hora_atencion);

    if (inicio && fin) {
        if (inicio === fin) {
            return inicio;
        }
        return `${inicio} - ${fin}`;
    }

    return inicio || fin || "No disponible";
}

// =====================
// BUSCAR CCT
// =====================

function buscarCCT() {

    const cct = document
        .getElementById("cct")
        .value
        .trim()
        .toUpperCase();

    const resultado =
        document.getElementById("resultado");

    if (cct === "") {

        resultado.innerHTML = `

        <div class="mensaje-advertencia">
            ⚠️ Ingrese una Clave de Centro de Trabajo.
        </div>

        `;

        return;
    }

    const registro = datos.find(item =>
        item.cct &&
        item.cct.toUpperCase() === cct
    );

    if (!registro) {

        resultado.innerHTML = `

        <div class="mensaje-error">
            ⚠️ No existe información para el CCT:
            <strong>${cct}</strong>
        </div>

        `;

        return;
    }

    logConsultaServidor(registro);

    const alertaFecha = fechaPasada(registro.fecha_atencion)
        ? `
        <div class="mensaje-advertencia">
            <strong>⚠️ Fecha de atención vencida</strong>
            <p>Tu fecha de atención ya pasó. Pronto publicaremos una nueva fecha para atender rezagos.</p>
            <p>Estate al pendiente de las actualizaciones.</p>
        </div>
        `
        : "";

    resultado.innerHTML = `

    <div class="tarjeta-resultado">

        <div class="tarjeta-header">

            <h2>${registro.escuela}</h2>

            <div>${registro.cct}</div>

        </div>

        ${alertaFecha}

        <div class="tarjeta-cuerpo">

            <div class="campo">
                <span class="etiqueta">Programa</span>
                <span class="valor">${registro.programa}</span>
            </div>

            <div class="campo">
                <span class="etiqueta">Sede de Atención</span>
                <span class="valor">${registro.sede}</span>
            </div>

            <div class="campo">
                <span class="etiqueta">Fecha</span>
                <span class="valor">
                    ${formatearFecha(registro.fecha_atencion)}
                </span>
            </div>

            <div class="campo">
                <span class="etiqueta">Horario</span>
                <span class="valor">
                    ${obtenerHorario(registro)}
                </span>
            </div>

            <div class="campo">
                <span class="etiqueta">
                    Comité de Contraloría Social
                </span>
                <span class="valor">
                    ${registro.estatus_comite}
                </span>
            </div>

            <div class="campo">
                <span class="etiqueta">
                    Referencia
                </span>
                <span class="valor">
                    ${registro.referencia}
                </span>
            </div>

            <a
                class="btn-mapa"
                href="https://www.google.com/maps?q=${registro.lat},${registro.lon}"
                target="_blank">

                📍 VER UBICACIÓN EN GOOGLE MAPS

            </a>

        </div>

    </div>

    `;
}