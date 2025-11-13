// =============================================
// 📁 routes/negocios.routes.js
// =============================================
import express from "express";
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// ==============================================
// 🟢 OBTENER NEGOCIOS CON DATOS DEL DUEÑO
// ==============================================
router.get("/negocios-con-duenio", async (req, res) => {
  try {
    const db = getDB();
    const users = await db.collection("users").find().toArray();

    const negocios = [];

    users.forEach((u) => {
      if (Array.isArray(u.negocios) && u.negocios.length > 0) {
        u.negocios.forEach((n, i) => {

          // Si no tiene _id → lo creamos y lo guardamos en BD
          if (!n._id) {
            n._id = new ObjectId();
            db.collection("users").updateOne(
              { _id: u._id },
              { $set: { [`negocios.${i}._id`]: n._id } }
            );
          }

          negocios.push({
            _id: n._id,
            nombre: n.nombre || "—",
            giro: n.giro || "—",
            comuna: n.comuna || "—",
            sector: n.sector || "—",
            duenioNombre: `${u.nombre} ${u.apellido || ""}`.trim(),
            duenioCorreo: u.correo || u.email || "—",
            duenioId: u._id,
          });
        });
      }
    });

    res.json(negocios);
  } catch (err) {
    console.error("❌ Error en negocios-con-duenio:", err);
    res.status(500).json({ error: "Error al obtener negocios" });
  }
});

// ==============================================
// ✏️ EDITAR NEGOCIO
// ==============================================
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

    res.json({ ok: true, mensaje: "Negocio actualizado correctamente" });
  } catch (err) {
    console.error("❌ PUT negocio error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==============================================
// 🗑 ELIMINAR NEGOCIO
// ==============================================
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

    res.json({ ok: true, mensaje: "Negocio eliminado correctamente" });
  } catch (err) {
    console.error("❌ DELETE negocio error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
