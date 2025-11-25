// ================================================
// 📄 Generador de DDL.txt (Estructura de MongoDB)
// ================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB, getDB } from "../config/db.js";

// 🛑 Obtener ruta real del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generarDDL() {
  await connectDB();
  const db = getDB();

  // 📌 Obtener nombres de colecciones
  const collections = await db.listCollections().toArray();
  const names = collections.map(c => c.name);

  let ddl = "📦 ESTRUCTURA BASE DE DATOS (MongoDB)\n\n";
  ddl += `📌 Base de Datos: ${db.databaseName}\n`;
  ddl += `📅 Generado: ${new Date().toLocaleString()}\n\n`;
  ddl += `======================================\n`;
  ddl += `   COLECCIONES Y ESQUEMAS \n`;
  ddl += `======================================\n\n`;

  for (const name of names) {
    const sample = await db.collection(name).findOne();

    ddl += `\n📂 Colección: ${name}\n`;
    ddl += `--------------------------------------\n`;

    if (!sample) {
      ddl += `  ⚠️ Sin documentos aún\n\n`;
      continue;
    }

    for (const key of Object.keys(sample)) {
      ddl += `  - ${key}: ${typeof sample[key]}\n`;
    }
    ddl += `\n`;
  }

  // 💾 Guardar en carpeta /scripts
  const outputPath = path.join(__dirname, "DDL.txt");
  fs.writeFileSync(outputPath, ddl, "utf8");

  console.log(`\n🟢 Archivo generado correctamente: ${outputPath}\n`);
}

generarDDL().catch(err => console.error("❌ ERROR:", err));
