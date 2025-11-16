// ==============================================
// 📁 routes/catalogo.js — versión MongoClient final
// ==============================================
import express from "express";
import { getDB } from "../config/db.js";

const router = express.Router();

// -------------------------------------------------------------
// 🔍 1️⃣ Sugerencias de productos (autocompletado)
// -------------------------------------------------------------
router.get("/sugerencias", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2) return res.json([]);

    const db = getDB();

    // Regex seguro (evita inyecciones y mal rendimiento)
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const productos = await db
      .collection("productos")
      .find({ title: regex })
      .project({ title: 1 })
      .limit(8)
      .toArray();

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

    if (q.length >= 2) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filtro = { title: regex };
    }

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
      .sort({ lastUpdate: -1 }) // Más recientes primero
      .limit(7000)
      .toArray();

    res.json(productos);
  } catch (err) {
    console.error("❌ [catalogo] Error al obtener productos:", err);
    res.status(500).json({ error: "Error al cargar catálogo de productos" });
  }
});

// -------------------------------------------------------------
// 🧠 Eliminado: índice duplicado
// -------------------------------------------------------------
// Ya no se crea aquí porque index.js lo crea al iniciar.
// Mantener aquí causaba warnings y posibles errores en primera carga.

export default router;
