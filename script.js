let datos = [];

// Cargar datos desde el archivo JSON
fetch("data/data.json")
  .then(response => response.json())
  .then(json => {
    datos = json;
    console.log("Datos cargados correctamente:", datos);
  })
  .catch(error => {
    console.error("Error cargando data.json:", error);
  });

// Evento del botón CONSULTAR
document
  .getElementById("btnConsultar")
  .addEventListener("click", buscarCCT);

// Evento al presionar ENTER
document
  .getElementById("cct")
  .addEventListener("keypress", function(event) {

    if (event.key === "Enter") {
      buscarCCT();
    }

  });

// Función principal de búsqueda
function buscarCCT() {

  const cct = document
    .getElementById("cct")
    .value
    .trim()
    .toUpperCase();

  const resultado = document.getElementById("resultado");

  // Validar campo vacío
  if (cct === "") {

    resultado.innerHTML = `
      <div style="
        background:#fff3cd;
        border-left:5px solid #ffc107;
        padding:15px;
        border-radius:8px;">
        ⚠️ Ingrese una Clave de Centro de Trabajo (CCT).
      </div>
    `;

    return;
  }

  // Buscar CCT
  const registro = datos.find(
    item => item.cct.toUpperCase() === cct
  );

  // Si no existe
  if (!registro) {

    resultado.innerHTML = `
      <div style="
        background:#ffecec;
        border-left:5px solid #dc3545;
        padding:15px;
        border-radius:8px;">
        ⚠️ No se encontró información para el CCT:
        <strong>${cct}</strong>
      </div>
    `;

    return;
  }

  // Mostrar resultado
  resultado.innerHTML = `

    <div class="tarjeta-resultado">

      <h2>${registro.escuela}</h2>

      <div class="campo">
        <strong>Programa:</strong>
        ${registro.programa}
      </div>

      <div class="campo">
        <strong>Sede de atención:</strong>
        ${registro.sede}
      </div>

      <div class="campo">
        <strong>Fecha:</strong>
        ${registro.fecha_atencion}
      </div>

      <div class="campo">
        <strong>Hora:</strong>
        ${registro.hora_atencion}
      </div>

      <div class="campo">
        <strong>Comité de Contraloría Social:</strong>
        ${registro.estatus_comite}
      </div>

      <div class="campo">
        <strong>Referencia:</strong>
        ${registro.referencia}
      </div>

      <a
        class="btn-mapa"
        href="https://www.google.com/maps?q=${registro.lat},${registro.lon}"
        target="_blank">

        📍 Abrir ubicación en Google Maps

      </a>

    </div>

  `;
}

// Convertir automáticamente a MAYÚSCULAS

document.getElementById("cct").addEventListener("input", function() {

    this.value = this.value.toUpperCase();

});

// Simulación temporal del contador

document.getElementById("contadorVisitas").innerHTML =
"👥 Consultas realizadas: 5,082";