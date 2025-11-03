// routes/catalogo.js
import express from "express";
import { getDB } from "../config/db.js";

const router = express.Router();

// 🔹 Ruta de sugerencias (sin tocar)
router.get("/sugerencias", async (req, res) => {
  try {
    const q = req.query.q?.trim() || "";
    const db = getDB();
    if (!q) return res.json([]);

    const productos = await db
      .collection("productos")
      .find({ title: { $regex: q, $options: "i" } }) // ✅ solo busca por título
      .project({ title: 1 })
      .limit(8)
      .toArray();

    res.json(productos.map((p) => p.title));
  } catch (err) {
    console.error("[catalogo] Error al obtener sugerencias:", err);
    res.status(500).json({ error: "Error cargando sugerencias" });
  }
});

// 🔹 Búsqueda principal
router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.trim() || "";
    const db = getDB();

    let filtro = {};
    if (q) {
      // ✅ Ahora solo busca coincidencias en el título
      filtro = { title: { $regex: q, $options: "i" } };
    }

    const productos = await db
      .collection("productos")
      .find(filtro)
      .project({
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
      })
      .sort({ lastUpdate: -1 })
      .limit(400)
      .toArray();

    res.json(productos);
  } catch (err) {
    console.error("[catalogo] Error al obtener productos:", err);
    res.status(500).json({ error: "Error cargando catálogo" });
  }
});

export default router;
