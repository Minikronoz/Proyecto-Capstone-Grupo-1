import express from "express";
import { getDB } from "../config/db.js";

const router = express.Router();

// ✅ Función genérica para agregar
async function aggregateClicks(pipeline) {
  const db = getDB();
  return await db.collection("clicks").aggregate(pipeline).toArray();
}

// ==============================
// 1️⃣ Productos más clickeados
// ==============================
router.get("/productos-mas-clickeados", async (req, res) => {
  try {
    const data = await aggregateClicks([
      { $group: { _id: "$titulo", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// 2️⃣ Clics por supermercado
// ==============================
router.get("/clics-por-supermercado", async (req, res) => {
  try {
    const data = await aggregateClicks([
      { $group: { _id: "$supermercado", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// 3️⃣ Clics por día
// ==============================
router.get("/clics-por-dia", async (req, res) => {
  try {
    const data = await aggregateClicks([
      {
        $group: {
          _id: "$fecha",
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// 4️⃣ Usuarios por edad
// ==============================
router.get("/usuarios-por-edad", async (req, res) => {
  try {
    const data = await aggregateClicks([
      { $match: { userEdad: { $exists: true } } },
      { $group: { _id: "$userEdad", total: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// 5️⃣ Usuarios por género
// ==============================
router.get("/usuarios-por-genero", async (req, res) => {
  try {
    const data = await aggregateClicks([
      { $match: { userGenero: { $exists: true, $ne: "" } } },
      { $group: { _id: "$userGenero", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// 6️⃣ Usuarios por región
// ==============================
router.get("/usuarios-por-region", async (req, res) => {
  try {
    const data = await aggregateClicks([
      { $match: { userRegion: { $exists: true, $ne: "" } } },
      { $group: { _id: "$userRegion", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// 7️⃣ Usuarios por comuna
// ==============================
router.get("/usuarios-por-comuna", async (req, res) => {
  try {
    const data = await aggregateClicks([
      { $match: { userComuna: { $exists: true, $ne: "" } } },
      { $group: { _id: "$userComuna", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 15 },
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// 8️⃣ Productos por día/mes/año
// ==============================
router.get("/productos-por-tiempo", async (req, res) => {
  try {
    const data = await aggregateClicks([
      {
        $group: {
          _id: {
            año: { $year: { $toDate: "$createdAt" } },
            mes: { $month: { $toDate: "$createdAt" } },
            dia: { $dayOfMonth: { $toDate: "$createdAt" } },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { "_id.año": 1, "_id.mes": 1, "_id.dia": 1 } },
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
