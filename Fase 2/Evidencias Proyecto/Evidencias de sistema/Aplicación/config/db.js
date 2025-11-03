import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://duoc_user:7OtcjHwo0BDDcqih@cluster0.lkz5yof.mongodb.net/?retryWrites=true&w=majority";

const dbName = process.env.DB_NAME || "duoc_user";

let client;
let db;

// 🔹 Conectar a MongoDB Atlas
export async function connectDB() {
  if (db) return db; // Ya conectado

  try {
    client = new MongoClient(uri, {
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    });

    await client.connect();
    await client.db("admin").command({ ping: 1 });
    db = client.db(dbName);

    console.log(` Conectado correctamente a MongoDB Atlas → Base de datos: ${dbName}`);
    return db;
  } catch (error) {
    console.error(" Error al conectar a MongoDB Atlas:", error);
    throw new Error("No se pudo conectar con la base de datos");
  }
}

// 🔹 Obtener la instancia actual de la base de datos
export function getDB() {
  if (!db) throw new Error("No hay conexión con la base de datos");
  return db;
}

export default { connectDB, getDB };
