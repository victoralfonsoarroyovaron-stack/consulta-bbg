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

// Función fecha DD/MM/AAAA
function formatearFecha(valor) {

    if (!valor) return "";

    const fecha = new Date(valor);

    if (isNaN(fecha)) return valor;

    const dia = String(
        fecha.getDate()
    ).padStart(2, "0");

    const mes = String(
        fecha.getMonth() + 1
    ).padStart(2, "0");

    const anio = fecha.getFullYear();

    return `${dia}/${mes}/${anio}`;
}

// Función hora HH:MM
function formatearHora(valor) {

    if (!valor) return "";

    const fecha = new Date(
        `1970-01-01 ${valor}`
    );

    if (isNaN(fecha)) return valor;

    const horas = String(
        fecha.getHours()
    ).padStart(2, "0");

    const minutos = String(
        fecha.getMinutes()
    ).padStart(2, "0");

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

    if (item.hora_atencion) {

        item.hora_atencion =
            formatearHora(
                item.hora_atencion
            );
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