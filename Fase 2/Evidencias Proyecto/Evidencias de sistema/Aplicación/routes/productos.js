// ===============================================
// 📁 routes/productos.js
// ===============================================
import express from "express";
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

const router = express.Router();

/**
 * ==========================================================
 * 🔹 1. Obtener producto + historial de precios
 * Ejemplo: GET /api/productos/6789abc123/historico
 * ==========================================================
 */
router.get("/:id/historico", async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    // 🧩 Verificar si el ID es un ObjectId válido
    const esObjectIdValido = /^[0-9a-fA-F]{24}$/.test(id);
    const filtroProducto = esObjectIdValido ? { _id: new ObjectId(id) } : { _id: id };

    // 🛒 Buscar producto principal
    const producto = await db.collection("productos").findOne(filtroProducto);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // 📈 Buscar historial de precios asociado
    const filtroHistorial = esObjectIdValido ? { productId: new ObjectId(id) } : { productId: id };
    const historial = await db
      .collection("pricehistories")
      .find(filtroHistorial)
      .sort({ date: 1 })
      .toArray();

    // ✅ Enviar respuesta
    res.json({
      producto,
      historial,
      totalRegistros: historial.length,
    });
  } catch (error) {
    console.error("❌ Error en GET /productos/:id/historico:", error);
    res.status(500).json({ error: "Error al obtener historial del producto" });
  }
});

/**
 * ==========================================================
 * 🔹 2. Sugerencias de productos para autocompletado
 * Ejemplo: GET /api/productos/sugerencias?q=leche
 * ==========================================================
 */
router.get("/sugerencias", async (req, res) => {
  try {
    const db = getDB();
    const q = req.query.q?.trim() || "";

    if (q.length < 2) {
      return res.json([]); // Evita búsquedas innecesarias
    }

    const productos = await db
      .collection("productos")
      .find({ title: { $regex: q, $options: "i" } })
      .project({ title: 1 })
      .limit(10)
      .toArray();

    const sugerencias = productos.map((p) => p.title);

    res.json(sugerencias);
  } catch (err) {
    console.error("❌ Error en GET /productos/sugerencias:", err);
    res.status(500).json({ error: "Error al obtener sugerencias" });
  }
});

/**
 * ==========================================================
 * 🔹 3. Obtener lista general de productos (opcional)
 * ==========================================================
 */
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const productos = await db.collection("productos").find().limit(100).toArray();
    res.json(productos);
  } catch (err) {
    console.error("❌ Error en GET /productos:", err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

export default router;
