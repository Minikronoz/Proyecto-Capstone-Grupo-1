// ==============================
// 📁 config/db.js
// ==============================
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

// URI y base de datos
const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://duoc_user:7OtcjHwo0BDDcqih@cluster0.lkz5yof.mongodb.net/?retryWrites=true&w=majority";

const dbName = process.env.DB_NAME || "duoc_user";

let client;
let db;

// ==============================
// 🔹 Conectar a MongoDB Atlas
// ==============================
export async function connectDB() {
  if (db) return db; // ✅ Evita reconexiones múltiples

  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
      },
    });

    // Conectar cliente y hacer ping
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    db = client.db(dbName);

    console.log(`✅ Conectado correctamente a MongoDB Atlas → Base de datos: ${dbName}`);
    return db;
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB Atlas:", error);
    throw new Error("No se pudo conectar con la base de datos.");
  }
}

// ==============================
// 🔹 Obtener referencia actual de DB
// ==============================
export function getDB() {
  if (!db) {
    throw new Error("❌ Base de datos no inicializada. Llama a connectDB() primero.");
  }
  return db;
}

// ==============================
// 🔹 Cerrar conexión (opcional)
// ==============================
export async function closeDB() {
  if (client) {
    await client.close();
    console.log("🔒 Conexión a MongoDB cerrada correctamente.");
    db = null;
    client = null;
  }
}

export default { connectDB, getDB, closeDB };
