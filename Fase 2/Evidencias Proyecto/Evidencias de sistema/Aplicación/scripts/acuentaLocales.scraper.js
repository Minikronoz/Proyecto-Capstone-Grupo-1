import fs from "fs";
import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

// ========================================================
//  Función que convierte un bloque de texto en objetos limpitos
// ========================================================
function parsearLocales(texto) {
  const lineas = texto.trim().split("\n");

  const locales = lineas.map((linea) => {
    const partes = linea.split("\t");

    // Estructura esperada:
    // 0 supermercado
    // 1 comuna
    // 2 direccion
    // 3 estado
    // 4 region
    // 5 hora apertura
    // 6 hora cierre

    const [
      tipo,
      comuna,
      direccion,
      estado,
      region,
      apertura,
      cierre,
    ] = partes.map((v) => v.trim());

    return {
      name: tipo
  .split(" ")
  .map(p => p.charAt(0).toUpperCase() + p.slice(1))
  .join(" "),
      direccion,
      info: `Horario: ${apertura} – ${cierre}\nEstado: ${estado}`,
      region,
      comuna,
      lastUpdate: new Date(),
    };
  });

  return locales;
}

// ========================================================
//  Guardar en MongoDB
// ========================================================
async function guardarEnMongo(locales) {
  const cliente = new MongoClient(MONGODB_URI);

  await cliente.connect();
  const db = cliente.db(DB_NAME);

  const coleccion = db.collection("locales_acuenta");

  console.log(" Limpiando colección...");
  await coleccion.deleteMany({});

  console.log(` Insertando ${locales.length} locales...`);
  await coleccion.insertMany(locales);

  console.log(" Datos guardados correctamente");
  await cliente.close();
}

// ========================================================
//  MAIN
// ========================================================
async function main() {
  try {
    console.log("📄 Leyendo archivo...");
    const texto = fs.readFileSync("./data/locales_acuenta_raw.txt", "utf8");

    console.log("🔎 Parseando locales...");
    const locales = parsearLocales(texto);

    console.log(`📌 Locales listos para guardar: ${locales.length}`);

    await guardarEnMongo(locales);

    console.log("🎉 Finalizado con éxito");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
