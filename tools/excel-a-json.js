const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

// Archivo Excel
const archivoExcel = path.join(
    __dirname,
    "../excel/BaseMaestra.xlsx"
);

// Leer libro
const workbook = xlsx.readFile(archivoExcel);

// Hoja DATOS
const hoja = workbook.Sheets["DATOS"];

if (!hoja) {

    console.error(
        "No existe una hoja llamada DATOS"
    );

    process.exit(1);
}

// Convertir hoja a JSON
let datos = xlsx.utils.sheet_to_json(
    hoja,
    {
        raw: false,
        defval: ""
    }
);

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

        if (diaNum >= 1 && diaNum <= 31 && mesNum >= 1 && mesNum <= 12) {
            return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${anio}`;
        }
    }

    const fecha = new Date(texto);

    if (!isNaN(fecha)) {
        const dia = String(fecha.getDate()).padStart(2, "0");
        const mes = String(fecha.getMonth() + 1).padStart(2, "0");
        const anio = fecha.getFullYear();
        return `${dia}/${mes}/${anio}`;
    }

    return null;
}

// Función fecha DD/MM/AAAA
function formatearFecha(valor) {

    if (!valor && valor !== 0) return "";

    if (typeof valor === "number" && !isNaN(valor)) {
        const fecha = new Date((valor - 25569) * 86400 * 1000);
        const dia = String(fecha.getDate()).padStart(2, "0");
        const mes = String(fecha.getMonth() + 1).padStart(2, "0");
        const anio = fecha.getFullYear();
        return `${dia}/${mes}/${anio}`;
    }

    const fechaFormateada = parseFechaTexto(valor);
    return fechaFormateada || String(valor);
}

// Función hora HH:MM
function formatearHora(valor) {

    if (!valor && valor !== 0) return "";

    const texto = String(valor).trim();
    if (texto === "") return "";

    const fecha = new Date(`1970-01-01 ${texto}`);

    if (isNaN(fecha)) return texto;

    const horas = String(fecha.getHours()).padStart(2, "0");
    const minutos = String(fecha.getMinutes()).padStart(2, "0");
    return `${horas}:${minutos}`;
}

// Recorrer registros
datos = datos.map(item => {

    if (item.fecha_atencion) {

        item.fecha_atencion =
            formatearFecha(
                item.fecha_atencion
            );
    }

    if (item.fecha_inicio) {

        item.fecha_inicio =
            formatearFecha(
                item.fecha_inicio
            );
    }

    if (item.fecha_fin) {

        item.fecha_fin =
            formatearFecha(
                item.fecha_fin
            );
    }

    const horaInicio = item.hora_inicio || item.horaInicio || item["Hora Inicio"] || item["hora inicio"];
    const horaFinal = item.hora_final || item.hora_fin || item.horaFinal || item["Hora Final"] || item["hora fin"];

    if (horaInicio) {
        item.hora_inicio = formatearHora(horaInicio);
    }

    if (horaFinal) {
        item.hora_final = formatearHora(horaFinal);
    }

    if (!item.hora_inicio && item.hora_atencion) {
        item.hora_atencion = formatearHora(item.hora_atencion);
    }

    return item;
});

// Guardar JSON
const rutaJson = path.join(
    __dirname,
    "../data/data.json"
);

fs.writeFileSync(
    rutaJson,
    JSON.stringify(
        datos,
        null,
        2
    ),
    "utf8"
);

console.log(
    "✅ Archivo generado correctamente"
);

console.log(
    `📄 Registros: ${datos.length}`
);

console.log(
    `📁 ${rutaJson}`
);