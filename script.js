let datos = [];

// =====================
// CARGAR DATOS
// =====================

fetch("data/data.json")
    .then(response => response.json())
    .then(json => {

        datos = json;

        console.log(
            `✅ Registros cargados: ${datos.length}`
        );

    })
    .catch(error => {

        console.error(
            "Error cargando JSON:",
            error
        );

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

        this.value =
            this.value.toUpperCase();

    });

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
resultado.innerHTML = `

<div class="tarjeta-resultado">

    <div class="tarjeta-header">

        <h2>${registro.escuela}</h2>

        <div>${registro.cct}</div>

    </div>

    <div class="tarjeta-cuerpo">

        <div class="campo">

            <span class="etiqueta">
                Programa
            </span>

            <span class="valor">
                ${registro.programa}
            </span>

        </div>

        <div class="campo">

            <span class="etiqueta">
                Sede de Atención
            </span>

            <span class="valor">
                ${registro.sede}
            </span>

        </div>

        <div class="campo">

            <span class="etiqueta">
                Fecha
            </span>

            <span class="valor">
                ${registro.fecha_atencion}
            </span>

        </div>

        <div class="campo">

            <span class="etiqueta">
                Horario
            </span>

            <span class="valor">
                ${registro.hora_atencion}
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