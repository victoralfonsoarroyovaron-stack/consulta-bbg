const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

// Ruta del Excel
const archivoExcel = path.join(__dirname, "../excel/BaseMaestra.xlsx");

// Leer archivo
const workbook = xlsx.readFile(archivoExcel);

// Hoja DATOS
const hoja = workbook.Sheets["DATOS"];

if (!hoja) {
    console.error("No existe una hoja llamada DATOS");
    process.exit(1);
}

// Convertir a JSON
const datos = xlsx.utils.sheet_to_json(hoja, {
    raw: false,
    defval: ""
});

// Guardar JSON
const rutaJson = path.join(__dirname, "../data/data.json");

fs.writeFileSync(
    rutaJson,
    JSON.stringify(datos, null, 2),
    "utf8"
);

console.log(`✅ Archivo generado correctamente`);
console.log(`📄 Registros: ${datos.length}`);
console.log(`📁 ${rutaJson}`);