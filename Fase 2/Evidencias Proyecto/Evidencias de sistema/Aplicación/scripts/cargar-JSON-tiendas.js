import dotenv from "dotenv";
dotenv.config(); // ✅ PRIMERO CARGAR DOTENV

import { connectDB, getDB } from "../config/db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cargarLocalesSupermercados() {
  console.log("🔍 Verificando MONGODB_URI:", process.env.MONGODB_URI ? "✅ Definida" : "❌ Undefined");
  
  if (!process.env.MONGODB_URI) {
    console.error("❌ ERROR: MONGODB_URI no está definida en .env");
    process.exit(1);
  }
  
  await connectDB();
  const db = getDB();
  const colLocales = db.collection("locales_supermercados");
  
  // Limpiar colección existente
  await colLocales.deleteMany({});
  console.log("🗑️ Colección limpiada\n");

  let totalInsertados = 0;

  // Lista de supermercados y sus archivos JSON
  const supermercados = [
    { tienda: "unimarc", archivo: "unimarc_stores.json", campo: null },
    { tienda: "tottus", archivo: "tottus_stores.json", campo: "stores" },
    { tienda: "jumbo", archivo: "jumbo_stores.json", campo: null },
    { tienda: "acuenta", archivo: "acuenta_stores.json", campo: null },
    { tienda: "santaisabel", archivo: "santaisabel_stores.json", campo: null }
  ];

  for (const super_ of supermercados) {
    try {
      const filePath = path.join(__dirname, "../data", super_.archivo);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ ${super_.tienda}: Archivo no encontrado (${super_.archivo})`);
        continue;
      }

      const rawData = fs.readFileSync(filePath, "utf-8");
      let data = JSON.parse(rawData);
      
      // Si el JSON tiene un campo específico (ej: tottus tiene "stores")
      if (super_.campo && data[super_.campo]) {
        data = data[super_.campo];
      }

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`⚠️ ${super_.tienda}: Sin datos en ${super_.archivo}`);
        continue;
      }

      // Normalizar estructura
      const locales = data.map(local => ({
        tienda: super_.tienda,
        nombre: local.nombre || local.name || "Sin nombre",
        direccion: local.direccion || local.address || "Sin dirección",
        comuna: local.comuna || local.city || "Sin comuna",
        region: local.region || "Sin región",
        latitud: local.latitud || local.lat || null,
        longitud: local.longitud || local.lng || null,
        horario: local.horario || local.hours || "Sin horario",
        telefono: local.telefono || local.phone || null,
        servicios: local.servicios || local.services || []
      }));

      await colLocales.insertMany(locales);
      totalInsertados += locales.length;
      console.log(`✅ ${super_.tienda}: ${locales.length} locales cargados`);

    } catch (error) {
      console.log(`❌ ${super_.tienda}: Error al cargar - ${error.message}`);
    }
  }

  console.log(`\n📊 Total locales insertados: ${totalInsertados}`);
  
  // Crear índices para búsquedas rápidas
  await colLocales.createIndex({ tienda: 1, comuna: 1 });
  await colLocales.createIndex({ tienda: 1, region: 1 });
  console.log("✅ Índices creados");
  
  process.exit();
}

cargarLocalesSupermercados().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});