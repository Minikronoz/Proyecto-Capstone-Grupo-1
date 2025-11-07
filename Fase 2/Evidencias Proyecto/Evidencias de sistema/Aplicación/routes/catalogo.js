// ==============================================
// 📁 routes/catalogo.js
// ==============================================
import express from "express";
import { getDB } from "../config/db.js";

const router = express.Router();

// -------------------------------------------------------------
// 🔍 1️⃣ Sugerencias de productos (para el autocompletado)
// -------------------------------------------------------------
router.get("/sugerencias", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 2) return res.json([]);

    const db = getDB();

    // Buscar solo en títulos, ignorando mayúsculas/minúsculas
    const productos = await db
      .collection("productos")
      .find({ title: { $regex: q, $options: "i" } })
      .project({ title: 1 })
      .limit(8)
      .toArray();

    // Evita duplicados (algunos productos pueden tener el mismo nombre)
    const titulosUnicos = [...new Set(productos.map((p) => p.title))];
    res.json(titulosUnicos);
  } catch (err) {
    console.error("❌ [catalogo] Error en /sugerencias:", err);
    res.status(500).json({ error: "Error al obtener sugerencias" });
  }
});

// -------------------------------------------------------------
// 🛒 2️⃣ Catálogo principal (búsqueda + carga inicial)
// -------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const db = getDB();

    // Filtro dinámico
    let filtro = {};
    if (q && q.length >= 2) {
      filtro = { title: { $regex: q, $options: "i" } };
    }

    // Campos que se devuelven al frontend
    const proyeccion = {
      _id: 1,
      title: 1,
      brand: 1,
      store: 1,
      currentPrice: 1,
      formattedPrice: 1,
      image: 1,
      link: 1,
      pricePerUnit: 1,
      lastUpdate: 1,
      offerDescription: 1,
      priceNormal: 1,
    };

    const productos = await db
      .collection("productos")
      .find(filtro)
      .project(proyeccion)
      .sort({ lastUpdate: -1 })
      .limit(400)
      .toArray();

    res.json(productos);
  } catch (err) {
    console.error("❌ [catalogo] Error al obtener productos:", err);
    res.status(500).json({ error: "Error al cargar catálogo de productos" });
  }
});

// -------------------------------------------------------------
// 🧠 3️⃣ Sugerencia: Crear índice si no existe (opcional)
// -------------------------------------------------------------
// Esto mejora el rendimiento de las búsquedas por título
(async () => {
  try {
    const db = getDB();
    await db.collection("productos").createIndex({ title: "text" });
    console.log("⚙️ Índice de texto creado en 'productos.title'");
  } catch (err) {
    console.warn("⚠️ No se pudo crear índice de texto:", err.message);
  }
})();

export default router;
