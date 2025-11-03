// routes/productos.js
import express from "express";
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// 🔹 Obtener producto + historial
router.get("/:id/historico", async (req, res) => {
  try {
    const db = getDB();
    const id = req.params.id;

    // Detectar si el ID es un ObjectId válido
    const esObjectIdValido = /^[0-9a-fA-F]{24}$/.test(id);

    // Buscar producto
    const filtroProducto = esObjectIdValido ? { _id: new ObjectId(id) } : { _id: id };
    const producto = await db.collection("productos").findOne(filtroProducto);

    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Buscar historial asociado
    const filtroHistorial = esObjectIdValido ? { productId: new ObjectId(id) } : { productId: id };
    const historial = await db
      .collection("pricehistories")
      .find(filtroHistorial)
      .sort({ date: 1 })
      .toArray();

    // ✅ Respuesta correcta
    res.json({ producto, historial });
  } catch (error) {
    console.error("❌ Error al obtener historial:", error);
    res.status(500).json({ error: "No se pudo obtener el historial" });
  }
});

export default router;
