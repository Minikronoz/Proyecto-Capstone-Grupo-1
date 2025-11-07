// =============================================
// 🌱 Script de datos de prueba para dashboard (versión nativa MongoDB Atlas)
// =============================================
import dotenv from "dotenv";
import { connectDB, closeDB } from "../config/db.js";
import { ObjectId } from "mongodb";

dotenv.config();

async function seed() {
  try {
    const db = await connectDB(); // ✅ connectDB ya devuelve la base de datos
    console.log("✅ Conectado a MongoDB Atlas para insertar datos de prueba");

    // 🧹 Limpieza parcial de colecciones
    await db.collection("productos").deleteMany({});
    await db.collection("priceHistory").deleteMany({});
    await db.collection("users").deleteMany({});

    // 🛒 Productos de prueba
    const productosInsert = await db.collection("productos").insertMany([
      {
        title: "Leche Colún Entera 1L",
        brand: "Colún",
        store: "unimarc",
        currentPrice: 1290,
        formattedPrice: "$1.290",
        categoria: "Lácteos",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
      },
      {
        title: "Pan de Molde Tottus 500g",
        brand: "Tottus",
        store: "tottus",
        currentPrice: 990,
        formattedPrice: "$990",
        categoria: "Panadería",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
      },
      {
        title: "Manzanas Fuji Jumbo 1kg",
        brand: "Jumbo",
        store: "jumbo",
        currentPrice: 1790,
        formattedPrice: "$1.790",
        categoria: "Frutas",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10)
      },
      {
        title: "Aceite Maravilla A Cuenta 1L",
        brand: "A Cuenta",
        store: "acuenta",
        currentPrice: 850,
        formattedPrice: "$850",
        categoria: "Aceites",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
      }
    ]);
    console.log(`🛒 Insertados ${productosInsert.insertedCount} productos`);

    // 💰 Historial de precios (relacionado con productos)
    const productosIds = Object.values(productosInsert.insertedIds);
    await db.collection("priceHistory").insertMany([
      { productId: productosIds[0], store: "unimarc", price: 1290, date: new Date() },
      { productId: productosIds[1], store: "tottus", price: 990, date: new Date() },
      { productId: productosIds[2], store: "jumbo", price: 1790, date: new Date() },
      { productId: productosIds[3], store: "acuenta", price: 850, date: new Date() },
      { productId: productosIds[0], store: "unimarc", price: 1250, date: new Date(Date.now() - 86400000) },
      { productId: productosIds[1], store: "tottus", price: 950, date: new Date(Date.now() - 86400000) }
    ]);
    console.log("💵 Historial de precios creado");

    // 👥 Usuarios de prueba
    await db.collection("users").insertMany([
      {
        nombre: "Carlos",
        correo: "carlos@test.cl",
        genero: "Masculino",
        region: "Biobío",
        createdAt: new Date()
      },
      {
        nombre: "Daniela",
        correo: "daniela@test.cl",
        genero: "Femenino",
        region: "Metropolitana",
        createdAt: new Date()
      },
      {
        nombre: "Pepe",
        correo: "pepe@test.cl",
        genero: "Masculino",
        region: "Biobío",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8)
      },
      {
        nombre: "María",
        correo: "maria@test.cl",
        genero: "Femenino",
        region: "Ñuble",
        createdAt: new Date()
      }
    ]);
    console.log("👥 Usuarios de prueba insertados");

    console.log("✅ Todo listo. Dashboard tendrá datos para las métricas.");

    // ✅ Cerrar conexión de forma correcta
    await closeDB();
  } catch (err) {
    console.error("❌ Error insertando datos de prueba:", err);
  }
}

seed();
