// routes/estadisticas.routes.js
import express from "express";
import { getDB } from "../config/db.js";

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
    const { supermercado, genero, fecha } = req.query;
    const match = {};

    if (supermercado) match.supermercado = supermercado;
    if (genero) match.userGenero = genero;
    if (fecha) match.fecha = fecha;

    const data = await aggregateClicks([
      { $match: match },
      { $group: { _id: "$titulo", total: { $sum: 1 } } },
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
    const { genero, fecha } = req.query;
    const match = {};
    if (genero) match.userGenero = genero;
    if (fecha) match.fecha = fecha;

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
// 3️⃣ CLICS POR DÍA (EVOLUCIÓN DIARIA)
// ======================================
router.get("/clics-por-dia", async (req, res) => {
  try {
    const { supermercado, genero } = req.query;
    const match = {};
    if (supermercado) match.supermercado = supermercado;
    if (genero) match.userGenero = genero;

    const data = await aggregateClicks([
      { $match: match },
      { $group: { _id: "$fecha", total: { $sum: 1 } } },
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
    const { supermercado, genero } = req.query;
    const match = { userEdad: { $ne: null } };
    if (supermercado) match.supermercado = supermercado;
    if (genero) match.userGenero = genero;

    const data = await aggregateClicks([
      { $match: match },
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
    const { supermercado, fecha } = req.query;
    const match = { userGenero: { $exists: true, $ne: "" } };
    if (supermercado) match.supermercado = supermercado;
    if (fecha) match.fecha = fecha;

    const data = await aggregateClicks([
      { $match: match },
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
// 6️⃣ USUARIOS POR REGIÓN
// ======================================
router.get("/usuarios-por-region", async (req, res) => {
  try {
    const { supermercado, genero } = req.query;
    const match = { userRegion: { $exists: true, $ne: "" } };
    if (supermercado) match.supermercado = supermercado;
    if (genero) match.userGenero = genero;

    const data = await aggregateClicks([
      { $match: match },
      { $group: { _id: "$userRegion", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

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
    const { supermercado, genero } = req.query;
    const match = { userComuna: { $exists: true, $ne: "" } };
    if (supermercado) match.supermercado = supermercado;
    if (genero) match.userGenero = genero;

    const data = await aggregateClicks([
      { $match: match },
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
// 8️⃣ PRODUCTOS POR DÍA / MES / AÑO
// ======================================
router.get("/productos-por-tiempo", async (req, res) => {
  try {
    const db = getDB();
    const { supermercado, genero } = req.query;
    const match = {};
    if (supermercado) match.supermercado = supermercado;
    if (genero) match.userGenero = genero;

    const data = await db.collection("clicks").aggregate([
      { $match: { ...match, createdAt: { $exists: true } } },
      {
        $group: {
          _id: {
            titulo: "$titulo",
            dia: { $dayOfMonth: "$createdAt" },
            mes: { $month: "$createdAt" },
            año: { $year: "$createdAt" },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { "_id.año": 1, "_id.mes": 1, "_id.dia": 1, total: -1 } },
    ]).toArray();

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
// 9️⃣ TENDENCIA SEMANAL
// ======================================
router.get("/tendencia-semanal", async (req, res) => {
  try {
    const db = getDB();
    const { supermercado, genero } = req.query;
    const match = {};
    if (supermercado) match.supermercado = supermercado;
    if (genero) match.userGenero = genero;

    const data = await db.collection("clicks").aggregate([
      { $match: { ...match, createdAt: { $exists: true } } },
      {
        $addFields: {
          createdAtDate: {
            $cond: [
              { $isNumber: "$createdAt" },
              { $toDate: "$createdAt" },
              "$createdAt",
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            año: { $isoWeekYear: "$createdAtDate" },
            semana: { $isoWeek: "$createdAtDate" },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { "_id.año": 1, "_id.semana": 1 } },
    ]).toArray();

    if (!data.length) return res.json([{ _id: "Sin datos", total: 0 }]);

    const formateado = data.map((d) => ({
      _id: `Semana ${d._id.semana}/${d._id.año}`,
      total: d.total,
    }));

    res.json(formateado);
  } catch (err) {
    console.error("❌ Error en /tendencia-semanal:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// 🔟 PRODUCTOS CON MAYOR CRECIMIENTO
// ======================================
router.get("/productos-crecimiento", async (req, res) => {
  try {
    const db = getDB();
    const { supermercado, genero } = req.query;
    const match = {};
    if (supermercado) match.supermercado = supermercado;
    if (genero) match.userGenero = genero;

    const data = await db.collection("clicks").aggregate([
      { $match: { ...match, createdAt: { $exists: true } } },
      {
        $addFields: {
          createdAtDate: {
            $cond: [
              { $isNumber: "$createdAt" },
              { $toDate: "$createdAt" },
              "$createdAt",
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            titulo: "$titulo",
            año: { $year: "$createdAtDate" },
            mes: { $month: "$createdAtDate" },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { "_id.titulo": 1, "_id.año": 1, "_id.mes": 1 } },
    ]).toArray();

    const series = {};
    data.forEach((d) => {
      const titulo = d._id.titulo || "Sin título";
      if (!series[titulo]) series[titulo] = [];
      series[titulo].push(d.total);
    });

    const crecimiento = Object.entries(series)
      .map(([titulo, valores]) => {
        if (valores.length < 2) return { _id: titulo, crecimiento: 0, porcentaje: 0 };
        const diff = valores[valores.length - 1] - valores[0];
        const porc = valores[0] > 0 ? ((diff / valores[0]) * 100).toFixed(1) : 0;
        return { _id: titulo, crecimiento: diff, porcentaje: Number(porc) };
      })
      .filter((x) => x.crecimiento > 0)
      .sort((a, b) => b.crecimiento - a.crecimiento)
      .slice(0, 10);

    res.json(crecimiento.length ? crecimiento : [{ _id: "Sin crecimiento detectado", crecimiento: 0, porcentaje: 0 }]);
  } catch (err) {
    console.error("❌ Error en /productos-crecimiento:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// 1️⃣1️⃣ INSIGHTS DEL SISTEMA
// ======================================
router.get("/insights", async (req, res) => {
  try {
    const db = getDB();

    const totalClicks = await db.collection("clicks").countDocuments();
    const usuariosUnicos = await db.collection("clicks").distinct("userCorreo");
    const topProducto = await db.collection("clicks").aggregate([
      { $group: { _id: "$titulo", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
    ]).toArray();
    const topSuper = await db.collection("clicks").aggregate([
      { $group: { _id: "$supermercado", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
    ]).toArray();
    const topRegion = await db.collection("clicks").aggregate([
      { $group: { _id: "$userRegion", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
    ]).toArray();

    // 🔍 Integración: término más buscado
    const topBusqueda = await db.collection("busquedas").aggregate([
      { $group: { _id: "$termino", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
    ]).toArray();

    const promedio = usuariosUnicos.length
      ? Number((totalClicks / usuariosUnicos.length).toFixed(1))
      : 0;

    res.json({
      totalClicks,
      usuariosUnicos: usuariosUnicos.length,
      promedioClicksPorUsuario: promedio,
      topProducto: topProducto[0]?._id || "Sin datos",
      topSupermercado: topSuper[0]?._id || "Sin datos",
      topRegion: topRegion[0]?._id || "Sin datos",
      topBusqueda: topBusqueda[0]?._id || "Sin datos",
    });
  } catch (err) {
    console.error("❌ Error en /insights:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================
// 🔍 NUEVOS ENDPOINTS DE BÚSQUEDAS
// ======================================

// 🔹 Términos de búsqueda más usados
router.get("/busquedas-top", async (req, res) => {
  try {
    const db = getDB();
    const data = await db.collection("busquedas").aggregate([
      { $group: { _id: "$termino", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]).toArray();
    res.json(data);
  } catch (err) {
    console.error("❌ Error en /busquedas-top:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Búsquedas por día
router.get("/busquedas-por-dia", async (req, res) => {
  try {
    const db = getDB();
    const data = await db.collection("busquedas").aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$fecha" } },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();
    res.json(data);
  } catch (err) {
    console.error("❌ Error en /busquedas-por-dia:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Búsquedas por región
router.get("/busquedas-por-region", async (req, res) => {
  try {
    const db = getDB();
    const data = await db.collection("busquedas").aggregate([
      { $match: { userRegion: { $exists: true, $ne: "" } } },
      { $group: { _id: "$userRegion", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]).toArray();
    res.json(data);
  } catch (err) {
    console.error("❌ Error en /busquedas-por-region:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Comparativa entre consultas (clicks) y búsquedas
router.get("/comparativa", async (req, res) => {
  try {
    const db = getDB();

    const clics = await db.collection("clicks").aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: 1 },
        },
      },
    ]).toArray();

    const busquedas = await db.collection("busquedas").aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$fecha" } },
          total: { $sum: 1 },
        },
      },
    ]).toArray();

    // Combinar ambos datasets por fecha
    const mapa = {};

    clics.forEach((c) => {
      mapa[c._id] = { fecha: c._id, clics: c.total, busquedas: 0 };
    });

    busquedas.forEach((b) => {
      if (!mapa[b._id]) mapa[b._id] = { fecha: b._id, clics: 0, busquedas: 0 };
      mapa[b._id].busquedas = b.total;
    });

    // Convertir a array ordenado por fecha
    const combinado = Object.values(mapa).sort((a, b) =>
      a.fecha.localeCompare(b.fecha)
    );

    // Formato compatible con Chart.js
    const data = combinado.map((d) => ({
      _id: d.fecha,
      total: d.clics + d.busquedas,
      clics: d.clics,
      busquedas: d.busquedas,
    }));

    res.json(data);
  } catch (err) {
    console.error("❌ Error en /comparativa:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
