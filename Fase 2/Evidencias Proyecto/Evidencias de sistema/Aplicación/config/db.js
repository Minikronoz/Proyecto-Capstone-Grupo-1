// ==============================
// 📁 config/db.js (versión unificada y optimizada)
// ==============================
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

// ======================================================
// 🔹 URI y base de datos
// ======================================================
const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://duoc_user:7OtcjHwo0BDDcqih@cluster0.lkz5yof.mongodb.net/?retryWrites=true&w=majority";

const dbName = process.env.DB_NAME || "duoc_user";

let client = null;
let db = null;

// ======================================================
// 🚀 Conectar a MongoDB Atlas (solo una vez)
// ======================================================
export async function connectDB() {
  if (db) return db; // ✅ Evita reconexiones múltiples

  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false, // ⚙️ Permite escritura en procesos paralelos (scrapers)
        deprecationErrors: false,
      },
    });

    // Conectar cliente y hacer ping
    await client.connect();
    await client.db("admin").command({ ping: 1 });

    db = client.db(dbName);
    console.log(`✅ Conectado correctamente a MongoDB Atlas → Base de datos: ${dbName}`);
            client.on("connectionClosed", () => {
          console.warn("⚠️ Conexión Mongo cerrada inesperadamente, reintentando...");
          db = null;
        });
    return db;
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB Atlas:", error.message);
    throw new Error("No se pudo conectar con la base de datos Atlas.");
  }
}

// ======================================================
// 🔹 Obtener referencia actual de la DB
// ======================================================
export function getDB() {
  if (!db) {
    throw new Error("❌ Base de datos no inicializada. Llama a connectDB() primero.");
  }
  return db;
}

// ======================================================
// 🔹 Cerrar conexión (opcional para pruebas o seeders)
// ======================================================
export async function closeDB() {
  try {
    if (client) {
      await client.close();
      console.log("🔒 Conexión a MongoDB cerrada correctamente.");
      db = null;
      client = null;
    }
  } catch (error) {
    console.error("⚠️ Error al cerrar la conexión:", error.message);
  }
}

// ======================================================
// ✅ Exportación unificada
// ======================================================
export default { connectDB, getDB, closeDB };
