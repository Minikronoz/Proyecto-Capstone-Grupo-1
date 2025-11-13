// ==============================
// 📁 config/db.js (versión final CORREGIDA)
// ==============================
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "duoc_user";

let client = null;
let db = null;

export async function connectDB() {
  if (db) return db; // evitar reconectar

  try {
    client = new MongoClient(uri, {
      maxPoolSize: 20,
      connectTimeoutMS: 20000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    db = client.db(dbName);

    console.log(`✅ Conectado correctamente a MongoDB Atlas → Base de datos: ${dbName}`);

    // Si se cae, dejar db = null para reintentar
    client.on("close", () => {
      console.warn("⚠️ Conexión Mongo cerrada inesperadamente");
      db = null;
    });

    return db;
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB:", error);
    throw error;
  }
}

export function getDB() {
  if (!db) {
    throw new Error("❌ Base de datos no inicializada. Llama a connectDB() primero.");
  }
  return db;
}

export async function closeDB() {
  if (client) {
    await client.close();
    db = null;
    client = null;
    console.log("🔒 Conexión Mongo cerrada.");
  }
}

export default { connectDB, getDB, closeDB };
