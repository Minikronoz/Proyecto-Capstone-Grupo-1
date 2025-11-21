// ==============================================
//  routes/catalogo.js — versión MongoClient final
// ==============================================
import express from "express";
import { getDB } from "../config/db.js";

const router = express.Router();

// -------------------------------------------------------------
//  Sugerencias de productos (autocompletado)
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
//  Catálogo principal (búsqueda + carga inicial)
// -------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const db = getDB();

    // ==============================
    //  Normalizador inteligente de búsquedas (sin acentos)
    // ==============================
    function normalizarRegex(text) {
      const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(
        escaped
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""), // elimina acentos
        "i"
      );
    }

    // ==============================
    //  Filtro dinámico
    // ==============================
    let filtro = {};

    if (q.length >= 2) {
      const regex = normalizarRegex(q);

      filtro = {
        $or: [
          { title: regex },
          { brand: regex }
        ]
      };
    }

    // ==============================
    //  Proyección (campos permitidos)
    // ==============================
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
      categoria: 1,
    };

    // ==============================
    //  Consulta a MongoDB
    // ==============================
    const productos = await db
      .collection("productos")
      .find(filtro)
      .project(proyeccion)
      .sort({ lastUpdate: -1 }) // primero los más recientes
      .limit(7000)
      .toArray();

    res.json(productos);

  } catch (err) {
    console.error("❌ [catalogo] Error al obtener productos:", err);
    res.status(500).json({ error: "Error al cargar catálogo de productos" });
  }
});



export default router;
