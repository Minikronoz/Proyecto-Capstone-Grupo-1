// =============================================
// 📁 routes/negocios.routes.js (versión Atlas nativa)
// =============================================
import express from "express";
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// ===================================================
// 🟢 1. Obtener todos los negocios con datos del dueño
// ===================================================
router.get("/negocios-con-duenio", async (req, res) => {
  try {
    const db = getDB();
    const users = await db.collection("users").find().toArray();

    // 🔹 Aplana los negocios de cada usuario
    const negocios = users.flatMap((u) =>
      (u.negocios || []).map((n) => ({
        _id: n._id || new ObjectId(),
        nombre: n.nombre || "Negocio sin nombre",
        giro: n.giro || "—",
        comuna: n.comuna || "—",
        sector: n.sector || "—",
        duenioId: u._id,
        duenioNombre: u.nombre || "—",
        duenioCorreo: u.correo || "—",
      }))
    );

    res.json(negocios);
  } catch (err) {
    console.error("❌ Error en GET /negocios-con-duenio:", err);
    res.status(500).json({ error: "Error al obtener negocios con dueño" });
  }
});

// ===================================================
// 🟡 2. Editar negocio dentro de un usuario
// ===================================================
router.put("/negocios/:id", async (req, res) => {
  try {
    const db = getDB();
    const idNegocio = new ObjectId(req.params.id);
    const { nombre, giro, comuna, sector } = req.body;

    const result = await db.collection("users").updateOne(
      { "negocios._id": idNegocio },
      {
        $set: {
          "negocios.$.nombre": nombre,
          "negocios.$.giro": giro,
          "negocios.$.comuna": comuna,
          "negocios.$.sector": sector,
        },
      }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ error: "Negocio no encontrado" });

    res.json({ ok: true, mensaje: "✅ Negocio actualizado correctamente" });
  } catch (err) {
    console.error("❌ Error en PUT /negocios/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===================================================
// 🔴 3. Eliminar negocio dentro de un usuario
// ===================================================
router.delete("/negocios/:id", async (req, res) => {
  try {
    const db = getDB();
    const idNegocio = new ObjectId(req.params.id);

    const result = await db.collection("users").updateOne(
      { "negocios._id": idNegocio },
      { $pull: { negocios: { _id: idNegocio } } }
    );

    if (result.modifiedCount === 0)
      return res.status(404).json({ error: "Negocio no encontrado" });

    res.json({ ok: true, mensaje: "🗑️ Negocio eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error en DELETE /negocios/:id:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
