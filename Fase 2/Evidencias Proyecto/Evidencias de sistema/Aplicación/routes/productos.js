// ===============================================
// 📁 routes/productos.js — COMPLETO Y CORREGIDO
// ===============================================
import express from "express";
import { getDB } from "../config/db.js";


const router = express.Router();

router.get("/:id/historico", async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    const esObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const filtroProducto = esObjectId
      ? { _id: new ObjectId(id) }
      : { _id: id };

    const producto = await db.collection("productos").findOne(filtroProducto);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const filtroHistorial = esObjectId
      ? { productId: new ObjectId(id) }
      : { productId: id };

    // 🟦 Obtener historial real
    let historialReal = await db
      .collection("priceHistory")
      .find(filtroHistorial)
      .sort({ fecha: 1 })
      .toArray();

    // Normalizar (fecha || date)
    historialReal = historialReal.map(h => ({
      date: h.date || h.fecha,
      price: h.price
    }));

    // 🟦 Ordenar por fecha
    historialReal.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 🟦 Generar lista de 30 días hacia atrás
    const hoy = new Date();
    const historialCompleto = [];

    // Determinar precio base inicial
    let precioAnterior =
      historialReal.length > 0 ? historialReal[0].price : producto.currentPrice;

    for (let i = 29; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - i);

      // Buscar precio real exacto ese día
      const registroReal = historialReal.find(h => {
        const d1 = new Date(h.date).toISOString().split("T")[0];
        const d2 = fecha.toISOString().split("T")[0];
        return d1 === d2;
      });

      if (registroReal) {
        precioAnterior = registroReal.price; // actualizar
      }

      historialCompleto.push({
        date: fecha,
        price: precioAnterior
      });
    }

    // 🟦 Variación (último vs anteúltimo)
    let variacion = 0;
    let emoji = "➖";

    if (historialCompleto.length >= 2) {
      const prev = historialCompleto[28].price;
      const actual = historialCompleto[29].price;

      variacion = prev !== 0
        ? (((actual - prev) / prev) * 100).toFixed(1)
        : 0;

      if (variacion > 0) emoji = "📈";
      else if (variacion < 0) emoji = "📉";
    }

    // 🟦 Días con mismo precio
    let diasEstable = 1;
    for (let i = historialCompleto.length - 2; i >= 0; i--) {
      if (historialCompleto[i].price === historialCompleto[i + 1].price) {
        diasEstable++;
      } else break;
    }

    return res.json({
      ok: true,
      producto,
      historial: historialCompleto,
      variacion: Number(variacion),
      emoji,
      tendenciaColor:
        variacion > 0 ? "#d32f2f" : variacion < 0 ? "#2e7d32" : "#00A7B5",
      diasEstable,
    });
  } catch (error) {
    console.error("❌ Error en HISTORICO:", error);
    res.status(500).json({ error: "Error al obtener histórico" });
  }
});


// ==========================================================
// SUGERENCIAS
// ==========================================================
router.get("/sugerencias", async (req, res) => {
  try {
    const db = getDB();
    const q = req.query.q?.trim() || "";

    if (q.length < 2) return res.json([]);

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

// ==========================================================
// LISTA GENERAL
// ==========================================================
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
