// ==============================
// 📁 routes/estadisticas.routes.js
// ==============================
import express from "express";
import { getDB } from "../config/db.js";
import { buildMatchFilters } from "../utils/buildMatchFilters.js";

import {
  rankingProductosNuevos,
  indiceCompetitividad,
  cruceGeneroRegion,
  usuariosNuevosRecurrentes,
  productosCrecimiento,
  insights,
  palabrasTendencia,
  distribucionUsuariosRegion,
  obtenerBajasDePrecio
} from "../controllers/estadisticas.controller.js";

const router = express.Router();

// ======================================
// 🔹 HELPER GENÉRICO PARA AGGREGATE
// ======================================
async function aggregateClicks(pipeline) {
  const db = getDB();
  return db.collection("clicks").aggregate(pipeline).toArray();
}
// ======================================
// 1️⃣ PRODUCTOS MÁS CLICKEADOS
// ======================================
router.get("/productos-mas-clickeados", async (req, res) => {
  try {
    const match = buildMatchFilters(req.query);

    const data = await aggregateClicks([
      { $match: { ...match, titulo: { $exists: true, $ne: "" } } },
      {
        $group: {
          _id: { $toUpper: { $trim: { input: "$titulo", chars: " " } } },
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /productos-mas-clickeados:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
// 2️⃣ CLICS POR SUPERMERCADO
// ======================================
router.get("/clics-por-supermercado", async (req, res) => {
  try {
    const match = buildMatchFilters(req.query);

    const data = await aggregateClicks([
      { $match: match },
      { $group: { _id: "$supermercado", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /clics-por-supermercado:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
// 3️⃣ CLICS POR DÍA
// ======================================
router.get("/clics-por-dia", async (req, res) => {
  try {
    const match = buildMatchFilters(req.query);

    const data = await aggregateClicks([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /clics-por-dia:", err);
    res.status(500).json({ error: err.message });
  }
});
// ======================================
// 4️⃣ USUARIOS POR EDAD
// ======================================
router.get("/usuarios-por-edad", async (req, res) => {
  try {
    const match = buildMatchFilters(req.query);

    const data = await aggregateClicks([
      { $match: { ...match, userEdad: { $exists: true } } },
      { $group: { _id: "$userEdad", total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /usuarios-por-edad:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
// 5️⃣ USUARIOS POR GÉNERO
// ======================================
router.get("/usuarios-por-genero", async (req, res) => {
  try {
    const match = buildMatchFilters(req.query);

    const data = await aggregateClicks([
      { $match: { ...match, userGenero: { $exists: true, $ne: "" } } },
      { $group: { _id: "$userGenero", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /usuarios-por-genero:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
// 6️⃣ USUARIOS POR REGIÓN (Colección users / usuarios)
// ======================================
router.get("/usuarios-por-region", async (req, res) => {
  try {
    const db = getDB();

    // Detectar nombre correcto en Atlas
    const colecciones = await db.listCollections().toArray();
    const nombre = colecciones.some(c => c.name === "usuarios")
      ? "usuarios"
      : "users";

    const match = {};
    if (req.query.genero) match.genero = req.query.genero;
    if (req.query.region) match.region = req.query.region;

    const data = await db.collection(nombre).aggregate([
      {
        $match: {
          ...match,
          region: { $exists: true, $ne: "" }
        }
      },
      { $group: { _id: "$region", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]).toArray();

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /usuarios-por-region:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
// 7️⃣ USUARIOS POR COMUNA
// ======================================
router.get("/usuarios-por-comuna", async (req, res) => {
  try {
    const match = buildMatchFilters(req.query);

    const data = await aggregateClicks([
      { $match: { ...match, userComuna: { $exists: true, $ne: "" } } },
      { $group: { _id: "$userComuna", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 15 },
    ]);

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /usuarios-por-comuna:", err);
    res.status(500).json({ error: err.message });
  }
});
// ======================================
// 🕒 PRODUCTOS POR TIEMPO (día / mes / año)
// ======================================
router.get("/productos-por-tiempo", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("clicks").aggregate([
      {
        $match: {
          ...match,
          createdAt: { $exists: true }
        }
      },
      {
        $addFields: {
          createdAtDate: {
            $cond: [
              { $isNumber: "$createdAt" },
              { $toDate: "$createdAt" },
              "$createdAt"
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            titulo: "$titulo",
            dia: { $dayOfMonth: "$createdAtDate" },
            mes: { $month: "$createdAtDate" },
            año: { $year: "$createdAtDate" },
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { "_id.año": 1, "_id.mes": 1, "_id.dia": 1 } }
    ]).toArray();

    // Agrupar por día → obtener el top producto del día
    const agrupado = {};
    data.forEach((d) => {
      const fecha = `${d._id.dia}/${d._id.mes}/${d._id.año}`;
      if (!agrupado[fecha]) agrupado[fecha] = [];
      agrupado[fecha].push({ producto: d._id.titulo, total: d.total });
    });

    const topPorDia = Object.entries(agrupado).map(([fecha, productos]) => {
      const top = productos.sort((a, b) => b.total - a.total)[0];
      return { _id: fecha, producto: top.producto, total: top.total };
    });

    res.json(topPorDia);

  } catch (err) {
    console.error("❌ Error en /productos-por-tiempo:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
// 9️⃣ TENDENCIA SEMANAL (clics por semana ISO)
// ======================================
router.get("/tendencia-semanal", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("clicks").aggregate([
      {
        $match: {
          ...match,
          createdAt: { $exists: true }
        }
      },
      {
        $addFields: {
          createdAtDate: {
            $cond: [
              { $isNumber: "$createdAt" },
              { $toDate: "$createdAt" },
              "$createdAt"
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            año: { $isoWeekYear: "$createdAtDate" },
            semana: { $isoWeek: "$createdAtDate" }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { "_id.año": 1, "_id.semana": 1 } }
    ]).toArray();

    const respuesta = data.map((d) => ({
      _id: `Semana ${d._id.semana}/${d._id.año}`,
      total: d.total
    }));

    res.json(respuesta);

  } catch (err) {
    console.error("❌ Error en /tendencia-semanal:", err);
    res.status(500).json({ error: err.message });
  }
});
// ======================================
// 🔍 TÉRMINOS DE BÚSQUEDA MÁS USADOS
// ======================================
router.get("/busquedas-top", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("busquedas").aggregate([
      { $match: { ...match, termino: { $exists: true, $ne: "" } } },
      { $group: { _id: "$termino", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]).toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /busquedas-top:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
// 📅 BÚSQUEDAS POR DÍA
// ======================================
router.get("/busquedas-por-dia", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("busquedas").aggregate([
      { $match: { ...match, fecha: { $exists: true } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$fecha" } },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /busquedas-por-dia:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
// 🗺️ BÚSQUEDAS POR REGIÓN
// ======================================
router.get("/busquedas-por-region", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("busquedas").aggregate([
      { $match: { ...match, userRegion: { $exists: true, $ne: "" } } },
      { $group: { _id: "$userRegion", total: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]).toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /busquedas-por-region:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
// 📊 COMPARATIVA ENTRE CLICS & BÚSQUEDAS
// ======================================
router.get("/comparativa", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    // CLICS POR DÍA
    const clics = await db.collection("clicks").aggregate([
      { $match: { ...match, createdAt: { $exists: true } } },
      {
        $addFields: {
          createdAtDate: {
            $cond: [
              { $isNumber: "$createdAt" },
              { $toDate: "$createdAt" },
              "$createdAt"
            ]
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAtDate" } },
          total: { $sum: 1 }
        }
      }
    ]).toArray();

    // BÚSQUEDAS POR DÍA
    const busquedas = await db.collection("busquedas").aggregate([
      { $match: { ...match, fecha: { $exists: true } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$fecha" } },
          total: { $sum: 1 }
        }
      }
    ]).toArray();

    // FUSIÓN DE RESULTADOS
    const mapa = {};

    clics.forEach((c) => {
      mapa[c._id] = {
        fecha: c._id,
        clics: c.total,
        busquedas: 0
      };
    });

    busquedas.forEach((b) => {
      if (!mapa[b._id]) {
        mapa[b._id] = { fecha: b._id, clics: 0, busquedas: 0 };
      }
      mapa[b._id].busquedas = b.total;
    });

    const data = Object.values(mapa)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((d) => ({
        _id: d.fecha,
        total: d.clics + d.busquedas,
        clics: d.clics,
        busquedas: d.busquedas
      }));

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /comparativa:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
// 1️⃣ USUARIOS ACTIVOS POR DÍA
// ======================================
router.get("/usuarios-activos-dia", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("clicks").aggregate([
      { $match: { ...match, createdAt: { $exists: true } } },
      {
        $addFields: {
          createdAtDate: {
            $cond: [
              { $isNumber: "$createdAt" },
              { $toDate: "$createdAt" },
              "$createdAt"
            ]
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAtDate" } },
          usuariosUnicos: { $addToSet: "$userCorreo" }
        }
      },
      { $project: { _id: 1, totalUsuarios: { $size: "$usuariosUnicos" } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /usuarios-activos-dia:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
// 2️⃣ ACTIVIDAD POR HORA DEL DÍA
// ======================================
router.get("/actividad-por-hora", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("clicks").aggregate([
      {
        $match: {
          ...match,
          createdAt: { $exists: true }
        }
      },
      {
        $addFields: {
          createdAtDate: {
            $cond: [
              { $isNumber: "$createdAt" },
              { $toDate: "$createdAt" },
              "$createdAt"
            ]
          }
        }
      },
      {
        $group: {
          _id: { $hour: "$createdAtDate" },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /actividad-por-hora:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
// 2️⃣ TOP PRODUCTOS POR GÉNERO
// ======================================
router.get("/top-productos-genero", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("clicks").aggregate([
      {
        $match: {
          ...match,
          userGenero: { $exists: true, $ne: "" },
          titulo: { $exists: true, $ne: "" }
        }
      },
      { $group: { _id: { genero: "$userGenero", producto: "$titulo" }, total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      {
        $group: {
          _id: "$_id.genero",
          productos: { $push: { producto: "$_id.producto", total: "$total" } }
        }
      },
      { $project: { productos: { $slice: ["$productos", 5] } } }
    ]).toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /top-productos-genero:", err);
    res.status(500).json({ error: err.message });
  }
});


// ======================================
// 3️⃣ TOP SUPERMERCADOS POR REGIÓN
// ======================================
router.get("/top-supermercados-region", async (req, res) => {
  try {
    const db = getDB();
    const match = buildMatchFilters(req.query);

    const data = await db.collection("clicks").aggregate([
      {
        $match: {
          ...match,
          userRegion: { $exists: true, $ne: "" },
          supermercado: { $exists: true, $ne: "" }
        }
      },
      { $group: { _id: { region: "$userRegion", supermercado: "$supermercado" }, total: { $sum: 1 } } },
      { $sort: { "_id.region": 1, total: -1 } },
      {
        $group: {
          _id: "$_id.region",
          topSupermercado: { $first: "$_id.supermercado" },
          total: { $first: "$total" }
        }
      },
      { $sort: { total: -1 } }
    ]).toArray();

    res.json(data);

  } catch (err) {
    console.error("❌ Error en /top-supermercados-region:", err);
    res.status(500).json({ error: err.message });
  }
});
// ======================================
// 🔚 EXPORTACIÓN DE RUTAS — CONTROLADORES EXTERNOS
// ======================================

// 📈 Productos con mayor crecimiento
router.get("/productos-crecimiento", productosCrecimiento);

// 🧠 Palabras en tendencia (Machine Learning básico)
router.get("/palabras-tendencia", palabrasTendencia);

// 🆕 Ranking de productos nuevos (últimos 30 días)
router.get("/ranking-productos-nuevos", rankingProductosNuevos);

// 💰 Índice de competitividad de precios
router.get("/indice-competitividad", indiceCompetitividad);

// 🌎 Cruce de género vs región
router.get("/cruce-genero-region", cruceGeneroRegion);

// 👥 Usuarios nuevos vs recurrentes
router.get("/usuarios-nuevos-recurrentes", usuariosNuevosRecurrentes);

// 📊 Insights del sistema
router.get("/insights", insights);

// 🗺️ Distribución de usuarios por región
router.get("/distribucion-usuarios-region", distribucionUsuariosRegion);

// 🔻 Productos con baja de precio
router.get("/bajas", obtenerBajasDePrecio);

export default router;
