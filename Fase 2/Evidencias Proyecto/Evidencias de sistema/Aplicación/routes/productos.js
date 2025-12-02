// ===============================================
//  routes/productos.js — COMPLETO Y CORREGIDO
// ===============================================
import express from "express";
import { ObjectId } from "mongodb"; 
import { getDB } from "../config/db.js";

const router = express.Router();

// =============================================================
//  Obtener sugerencias de búsqueda
// =============================================================
router.get("/sugerencias", async (req, res) => {
  try {
    const db = getDB();
    const { q } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json([]);
    }

    const termino = q.trim().toLowerCase();
    let regex;

    // Coincidencia EXACTA si 3 letras o menos
    if (termino.length <= 3) {
      regex = new RegExp(`\\b${termino}\\b`, "i");
    } else {
      regex = new RegExp(termino, "i");
    }

    const productos = await db.collection("productos")
      .find({
        $or: [
          { title: regex },
          { brand: regex }
        ]
      })
      .limit(15)
      .toArray();

    const sugerencias = [...new Set(productos.map(p => p.title))].slice(0, 10);

    res.json(sugerencias);

  } catch (err) {
    console.error("❌ Error sugerencias:", err);
    res.status(500).json([]);
  }
});


// =============================================================
//  Obtener historial de precios de un producto
// =============================================================
router.get("/:id/historico", async (req, res) => {
  try {
    const db = getDB();
    const productId = req.params.id;

    console.log("🔍 Buscando historial para:", productId);

    //  Validar que el ID sea válido
    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ 
        ok: false, 
        error: "ID de producto inválido" 
      });
    }

    //  Buscar el producto
    const producto = await db.collection("productos").findOne({
      _id: new ObjectId(productId)
    });

    if (!producto) {
      console.log("❌ Producto no encontrado:", productId);
      return res.status(404).json({ 
        ok: false, 
        error: "Producto no encontrado" 
      });
    }

    console.log(" Producto encontrado:", producto.title);

    //  Buscar historial de precios
    const historial = await db.collection("priceHistory")
      .find({ productId: new ObjectId(productId) })
      .sort({ fecha: 1 }) // Ordenar por fecha ascendente
      .toArray();

    console.log(` Historial encontrado: ${historial.length} registros`);

    //  Si no hay historial, crear uno con el precio actual
    if (historial.length === 0) {
      const registroActual = {
        productId: new ObjectId(productId),
        store: producto.store,
        price: producto.currentPrice,
        previousPrice: null,
        variation: 0,
        offerDescription: producto.offerDescription || null,
        fecha: producto.lastUpdate || new Date()
      };

      await db.collection("priceHistory").insertOne(registroActual);
      
      console.log(" Creado primer registro de historial");

      return res.json({
        ok: true,
        producto,
        historial: [{
          date: registroActual.fecha,
          price: registroActual.price,
          variation: 0
        }]
      });
    }

    //  Formatear historial para el gráfico
    const historialFormateado = historial.map(h => ({
      date: h.fecha,
      price: h.price,
      previousPrice: h.previousPrice,
      variation: h.variation || 0,
      offerDescription: h.offerDescription
    }));

    res.json({
      ok: true,
      producto,
      historial: historialFormateado
    });

  } catch (err) {
    console.error("❌ Error en HISTORICO:", err);
    res.status(500).json({ 
      ok: false, 
      error: "Error al obtener historial de precios",
      details: err.message 
    });
  }
});

// =============================================================
//  Buscar productos (para catálogo)
// =============================================================
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const { q, store, categoria, minPrice, maxPrice, marcas } = req.query;

    const filtro = {};

// =====================================================
//  🎯 BÚSQUEDA — inteligente con soporte para "sal"
// =====================================================
if (q && q.trim() !== "") {

  let termino = q.trim();

  let regex;

  // Si el frontend envió delimitadores \b → coincidencia EXACTA
  if (termino.includes("\\b")) {

    // Limpia doble escape: "\\bsal\\b" → "\bsal\b"
    let limpio = termino.replace(/\\\\b/g, "\\b");

    // Asegurar que la expresión tenga ambos bordes
    if (!limpio.startsWith("\\b")) limpio = "\\b" + limpio;
    if (!limpio.endsWith("\\b")) limpio = limpio + "\\b";

    try {
      regex = new RegExp(limpio, "i");  // 👉 regex real
    } catch (e) {
      console.error("⚠ Regex inválida, usando fallback:", limpio);
      regex = new RegExp(termino.replace(/\\b/g, ""), "i");
    }
  }

  // Palabras cortas → coincidencia exacta
  else if (termino.length <= 3) {
    regex = new RegExp(`\\b${termino}\\b`, "i");
  }

  // Palabras largas → búsqueda normal
  else {
    regex = new RegExp(termino, "i");
  }

  filtro.$or = [
    { title: regex },
    { brand: regex }
  ];
}


    // =====================================================
    //  Filtro por marcas (sidebar)
    // =====================================================
    if (marcas) {
      filtro.brand = { $in: marcas.split(",") };
    }

    // =====================================================
    //  Filtro por tienda
    // =====================================================
if (store) {
  filtro.store = { $in: store.split(",") };
}


    // =====================================================
    //  Filtro por categoría
    // =====================================================
    if (categoria) {
      filtro.categoria = categoria;
    }

    // =====================================================
    //  Rango de precios
    // =====================================================
    if (minPrice || maxPrice) {
      filtro.currentPrice = {};
      if (minPrice) filtro.currentPrice.$gte = parseFloat(minPrice);
      if (maxPrice) filtro.currentPrice.$lte = parseFloat(maxPrice);
    }

    console.log("📌 Filtros aplicados:", filtro);

    const productos = await db.collection("productos")
      .find(filtro)
      .sort({ lastUpdate: -1 })
      .limit(200)
      .toArray();

    res.json({
      ok: true,
      count: productos.length,
      productos
    });

  } catch (err) {
    console.error("❌ Error buscando productos:", err);
    res.status(500).json({
      ok: false,
      error: "Error al buscar productos"
    });
  }
});

// =============================================================
//  Obtener producto por ID
// =============================================================
router.get("/api/productos/:id", async (req, res) => {
  try {
    const db = getDB();
    const productId = req.params.id;

    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ 
        ok: false, 
        error: "ID de producto inválido" 
      });
    }

    const producto = await db.collection("productos").findOne({
      _id: new ObjectId(productId)
    });

    if (!producto) {
      return res.status(404).json({ 
        ok: false, 
        error: "Producto no encontrado" 
      });
    }

    res.json({
      ok: true,
      producto
    });

  } catch (err) {
    console.error("❌ Error obteniendo producto:", err);
    res.status(500).json({ 
      ok: false, 
      error: "Error al obtener producto" 
    });
  }
});
// =============================================================
//  Obtener marcas filtradas por búsqueda y tiendas seleccionadas
// =============================================================
router.get("/marcas", async (req, res) => {
  try {
    const db = getDB();
    const { q, tiendas } = req.query;

    const filtro = {};

    if (q && q.trim() !== "") {
      filtro.$or = [
        { title: { $regex: q, $options: "i" } },
        { brand: { $regex: q, $options: "i" } }
      ];
    }

    if (tiendas) {
      filtro.store = { $in: tiendas.split(",") };
    }

    //  Group para obtener marcas únicas
    const marcas = await db.collection("productos")
      .aggregate([
        { $match: filtro },
        { $group: { _id: "$brand" } },
        { $sort: { _id: 1 } }
      ])
      .toArray();

    res.json({
      ok: true,
      marcas: marcas.map(m => m._id).filter(Boolean)
    });

  } catch (err) {
    console.error("❌ Error cargando marcas:", err);
    res.status(500).json({ ok: false, error: "Error al obtener marcas" });
  }
});

export default router;
