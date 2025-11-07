// =============================================
// 🌱 Script de datos de prueba para dashboard (versión nativa MongoDB)
// =============================================
import dotenv from "dotenv";
import { connectDB, getDB } from "../config/db.js";
import { ObjectId } from "mongodb";
import crypto from "crypto"; // ✅ Para generar uniqueHash

dotenv.config();

async function seed() {
  try {
    const client = await connectDB();
    const db = getDB();
    console.log("✅ Conectado a MongoDB para insertar datos de prueba");

    // Limpieza parcial
    await db.collection("productos").deleteMany({});
    await db.collection("priceHistory").deleteMany({});
    await db.collection("users").deleteMany({});

    // 🧩 Productos de prueba
    const productos = await db.collection("productos").insertMany([
      {
        title: "Leche Colún Entera 1L",
        brand: "Colún",
        store: "unimarc",
        currentPrice: 1290,
        formattedPrice: "$1.290",
        categoria: "Lácteos",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      },
      {
        title: "Pan de Molde Tottus 500g",
        brand: "Tottus",
        store: "tottus",
        currentPrice: 990,
        formattedPrice: "$990",
        categoria: "Panadería",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      },
      {
        title: "Manzanas Fuji Jumbo 1kg",
        brand: "Jumbo",
        store: "jumbo",
        currentPrice: 1790,
        formattedPrice: "$1.790",
        categoria: "Frutas",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
      },
      {
        title: "Aceite Maravilla A Cuenta 1L",
        brand: "A Cuenta",
        store: "acuenta",
        currentPrice: 850,
        formattedPrice: "$850",
        categoria: "Aceites",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      },
    ]);
    console.log(`🛒 Insertados ${productos.insertedCount} productos`);

    // 💰 Historial de precios (con uniqueHash)
    const productosIds = Object.values(productos.insertedIds);
    await db.collection("priceHistory").insertMany([
      {
        productId: productosIds[0],
        store: "unimarc",
        price: 1290,
        uniqueHash: crypto.randomUUID(),
      },
      {
        productId: productosIds[1],
        store: "tottus",
        price: 990,
        uniqueHash: crypto.randomUUID(),
      },
      {
        productId: productosIds[2],
        store: "jumbo",
        price: 1790,
        uniqueHash: crypto.randomUUID(),
      },
      {
        productId: productosIds[3],
        store: "acuenta",
        price: 850,
        uniqueHash: crypto.randomUUID(),
      },
      {
        productId: productosIds[0],
        store: "unimarc",
        price: 1250,
        uniqueHash: crypto.randomUUID(),
      },
      {
        productId: productosIds[1],
        store: "tottus",
        price: 950,
        uniqueHash: crypto.randomUUID(),
      },
    ]);
    console.log("💵 Historial de precios creado con uniqueHash");

    // 👥 Usuarios de prueba
    await db.collection("users").insertMany([
      {
        nombre: "Carlos",
        correo: "carlos@test.cl",
        genero: "Masculino",
        region: "Biobío",
        createdAt: new Date(),
        lastLogin: new Date(),
      },
      {
        nombre: "Daniela",
        correo: "daniela@test.cl",
        genero: "Femenino",
        region: "Metropolitana",
        createdAt: new Date(),
        lastLogin: new Date(),
      },
      {
        nombre: "Pepe",
        correo: "pepe@test.cl",
        genero: "Masculino",
        region: "Biobío",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
      },
      {
        nombre: "María",
        correo: "maria@test.cl",
        genero: "Femenino",
        region: "Ñuble",
        createdAt: new Date(),
        lastLogin: new Date(),
      },
    ]);
    console.log("👥 Usuarios de prueba insertados");

    console.log("✅ Todo listo. Dashboard tendrá datos para las métricas.");
    // ❌ No cerramos client, ya que connectDB no retorna el objeto MongoClient
    // await client.close();  <-- eliminar o comentar esta línea
  } catch (err) {
    console.error("❌ Error insertando datos de prueba:", err);
  }
}

seed();
