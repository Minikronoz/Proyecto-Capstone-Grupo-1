// ====== scripts/exportSchema.js ======
import { connectDB, getDB } from "../config/db.js";
import fs from "fs";

// 👉 función para detectar tipos
function detectType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

// 👉 analizar un ejemplo de documento
function analyzeDocument(doc) {
  const schema = {};
  for (const key in doc) {
    schema[key] = detectType(doc[key]);
  }
  return schema;
}

async function exportSchema() {
  try {
    await connectDB();
    const db = getDB();

    const collections = await db.listCollections().toArray();
    const output = {};

    for (const col of collections) {
      const name = col.name;
      const example = await db.collection(name).findOne({});
      const indexes = await db.collection(name).indexes();

      output[name] = {
        exampleSchema: example ? analyzeDocument(example) : "📌 No hay ejemplo (vacía)",
        indexes,
      };
    }

    fs.writeFileSync("mongo_schema_output.json", JSON.stringify(output, null, 2));
    console.log("📄 Archivo generado: mongo_schema_output.json");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error exportando esquema:", err);
    process.exit(1);
  }
}

exportSchema();
