let datos = [];

// =====================================
// CARGAR JSON
// =====================================

fetch("data/data.json")
    .then(response => {

        if (!response.ok) {
            throw new Error(
                `Error HTTP: ${response.status}`
            );
        }

        return response.json();

    })
    .then(json => {

        datos = json;

        console.log(
            `✅ Registros cargados: ${datos.length}`
        );

    })
    .catch(error => {

        console.error(
            "❌ Error cargando data.json:",
            error
        );

    });

// =====================================
// BOTÓN CONSULTAR
// =====================================

document
    .getElementById("btnConsultar")
    .addEventListener("click", buscarCCT);

// =====================================
// ENTER PARA CONSULTAR
// =====================================

document
    .getElementById("cct")
    .addEventListener("keypress", function(event) {

        if (event.key === "Enter") {

            buscarCCT();

        }

    });

// =====================================
// MAYÚSCULAS AUTOMÁTICAS
// =====================================

document
    .getElementById("cct")
    .addEventListener("input", function() {

        this.value = this.value.toUpperCase();

    });

// =====================================
// FUNCIÓN BUSCAR
// =====================================

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
            <div style="
                background:#fff3cd;
                border-left:5px solid #ffc107;
                padding:15px;
                border-radius:8px;">
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
            <div style="
                background:#ffecec;
                border-left:5px solid #dc3545;
                padding:15px;
                border-radius:8px;">
                ⚠️ No se encontró información para:
                <strong>${cct}</strong>
            </div>
        `;

        return;
    }

    resultado.innerHTML = `

        <div class="tarjeta-resultado">

            <h2>${registro.escuela || "Sin información"}</h2>

            <div class="campo">
                <strong>Programa</strong>
                ${registro.programa || "-"}
            </div>

            <div class="campo">
                <strong>Sede de atención</strong>
                ${registro.sede || "-"}
            </div>

            <div class="campo">
                <strong>Fecha de atención</strong>
                ${registro.fecha_atencion || "-"}
            </div>

            <div class="campo">
                <strong>Hora de atención</strong>
                ${registro.hora_atencion || "-"}
            </div>

            <div class="campo">
                <strong>Comité de Contraloría Social</strong>
                ${registro.estatus_comite || "-"}
            </div>

            <div class="campo">
                <strong>Referencia</strong>
                ${registro.referencia || "-"}
            </div>

            <a
                class="btn-mapa"
                href="https://www.google.com/maps?q=${registro.lat},${registro.lon}"
                target="_blank">

                📍 Abrir ubicación

            </a>

        </div>

    `;

    // CONTADOR DE CONSULTAS

    fetch("https://api.countapi.xyz/hit/consulta-bbg/consultas")
        .catch(() => {});
}

// =====================================
// CONTADOR DE VISITAS
// =====================================

window.addEventListener("load", () => {

    console.log("🚀 Página cargada");

    const contador =
        document.getElementById("contadorVisitas");

    if (!contador) {

        console.error(
            "No existe #contadorVisitas"
        );

        return;
    }

    fetch(
        "https://api.countapi.xyz/hit/consulta-bbg/visitas"
    )
        .then(response => response.json())
        .then(data => {

            contador.innerHTML =
                `👥 Visitas al portal: ${data.value.toLocaleString("es-MX")}`;

            console.log(
                "Contador actualizado:",
                data.value
            );

        })
        .catch(error => {

            console.error(
                "Error contador:",
                error
            );

            contador.innerHTML =
                "👥 Visitas al portal: No disponible";

        });

});

window.onload = function () {

    document.getElementById("contadorVisitas").innerHTML =
        "✅ Script cargado correctamente";

};