// ======================================================================
// 🗃️ CARGAR JSON DE TIENDAS UNIMARC A MONGODB
// ======================================================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB, getDB } from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cargarLocales() {
  try {
    // ============================================
    // 📌 1) Leer archivo JSON
    // ============================================
    const filePath = path.join(__dirname, "../data/unimarc_stores.json");
    if (!fs.existsSync(filePath)) {
      console.log("❌ No se encontró el archivo JSON en /data");
      return;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    let locales = JSON.parse(raw);

    // Añadir campo tienda (si no existe)
    locales = locales.map(l => ({ tienda: "UNIMARC", ...l }));

    // ============================================
    // 🛢️ 2) Conectar a MongoDB e Insertar
    // ============================================
    await connectDB();
    const db = getDB();
    const collection = db.collection("supermercados_locales");

    // 🧹 Borra solo los locales de Unimarc
    await collection.deleteMany({ tienda: "UNIMARC" });

    // 🚀 Inserta nueva data
    await collection.insertMany(locales);

    console.log(`🎉 LOCALIDADES DE UNIMARC GUARDADAS: ${locales.length} registros`);
  } catch (err) {
    console.error("❌ Error cargando locales:", err);
  } finally {
    process.exit();
  }
}

cargarLocales();
