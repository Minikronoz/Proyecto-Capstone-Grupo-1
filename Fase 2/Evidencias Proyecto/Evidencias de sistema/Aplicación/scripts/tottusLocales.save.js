import fs from "fs";
import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

// ========================================================
//  Convertir JSON de Tottus al formato estándar
// ========================================================
function parsearLocalesDesdeJSON(data) {
  return data.stores.map(store => {
    return {
      name: "Tottus",
      direccion: store.direccion,
      info: store.horario.join(" | "),
      region: store.region,
      comuna: store.comuna,
      lastUpdate: new Date()
    };
  });
}

// ========================================================
//  Guardar en MongoDB
// ========================================================
async function guardarEnMongo(locales) {
  const cliente = new MongoClient(MONGODB_URI);

  await cliente.connect();
  const db = cliente.db(DB_NAME);

  const coleccion = db.collection("locales_tottus");

  console.log("🧹 Limpiando colección locales_tottus...");
  await coleccion.deleteMany({});

  console.log(`📥 Insertando ${locales.length} locales...`);
  await coleccion.insertMany(locales);

  console.log("✅ Datos guardados correctamente en locales_tottus");
  await cliente.close();
}

// ========================================================
//  MAIN
// ========================================================
async function main() {
  try {
    console.log("📄 Leyendo archivo tottus_stores.json...");
    const contenido = fs.readFileSync("./data/tottus_stores.json", "utf8");

    const data = JSON.parse(contenido);

    const locales = parsearLocalesDesdeJSON(data);

    console.log(`📌 Locales listos para guardar: ${locales.length}`);

    await guardarEnMongo(locales);

    console.log("🎉 Tottus importado con éxito");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main();
