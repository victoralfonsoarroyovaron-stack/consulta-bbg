const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

// =========================
// CONFIGURACIÓN
// =========================

const archivoExcel = path.join(
    __dirname,
    "../excel/BaseMaestra.xlsx"
);

const workbook =
    xlsx.readFile(archivoExcel, {
        cellDates: true
    });

const hoja = workbook.Sheets["DATOS"];

if (!hoja) {

    console.error(
        "❌ No existe una hoja llamada DATOS"
    );

    process.exit(1);
}

// =========================
// FUNCIONES
// =========================

function formatearFecha(valor) {

    if (!valor) return "";

    const fecha = new Date(valor);

    if (isNaN(fecha)) return valor;

    const dia =
        String(fecha.getDate())
        .padStart(2, "0");

    const mes =
        String(fecha.getMonth() + 1)
        .padStart(2, "0");

    const anio =
        fecha.getFullYear();

    return `${dia}/${mes}/${anio}`;
}

function formatearHora(valor) {

    if (!valor) return "";

    // Si ya viene como texto
    if (typeof valor === "string") {

        const partes =
            valor.match(/(\d+):(\d+)/);

        if (partes) {

            return `${partes[1].padStart(2,"0")}:${partes[2]}`;
        }

        return valor;
    }

    // Si viene como decimal Excel
    if (typeof valor === "number") {

        const totalMinutos =
            Math.round(valor * 24 * 60);

        const horas =
            Math.floor(totalMinutos / 60);

        const minutos =
            totalMinutos % 60;

        return `${String(horas).padStart(2,"0")}:${String(minutos).padStart(2,"0")}`;
    }

    return valor;
}

// =========================
// CONVERSIÓN
// =========================

let datos =
    xlsx.utils.sheet_to_json(
        hoja,
        {
            raw: true,
            defval: ""
        }
    );

datos = datos.map(registro => {

    if (registro.fecha_inicio) {

        registro.fecha_inicio =
            formatearFecha(
                registro.fecha_inicio
            );
    }

    if (registro.fecha_fin) {

        registro.fecha_fin =
            formatearFecha(
                registro.fecha_fin
            );
    }

    if (registro.fecha_atencion) {

        registro.fecha_atencion =
            formatearFecha(
                registro.fecha_atencion
            );
    }

    if (registro.hora_atencion) {

        registro.hora_atencion =
            formatearHora(
                registro.hora_atencion
            );
    }

    return registro;
});

// =========================
// GUARDAR JSON
// =========================

const rutaJson =
    path.join(
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