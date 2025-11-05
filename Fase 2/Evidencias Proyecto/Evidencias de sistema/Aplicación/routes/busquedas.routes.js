// ==============================
// 📁 routes/busquedas.routes.js
// ==============================
import express from "express";
import { getDB } from "../config/db.js";

const router = express.Router();

// Palabras clave válidas
const PALABRAS_CLAVE = [
  "azucar", "harina", "pasta", "fideos", "leche", "cafe", "arroz",
  "aceite", "sal", "pan", "queso", "yogurt", "pollo", "carne",
  "atun", "sopa", "galletas", "mantequilla", "detergente",
  "jabon", "shampoo"
];

// 🔹 Registrar búsqueda
router.post("/", async (req, res) => {
  try {
    const db = getDB();
    const { usuarioEmail, termino } = req.body;

    if (!termino || termino.trim().length < 3)
      return res.status(400).json({ msg: "Búsqueda demasiado corta." });

    const terminoLimpio = termino.toLowerCase().trim();
    const palabras = terminoLimpio.split(/\s+/);
    const coincidencias = palabras.filter(p => PALABRAS_CLAVE.includes(p));

    if (!coincidencias.length)
      return res.status(200).json({ msg: "Sin palabras clave relevantes." });

    const busqueda = {
      usuarioEmail: usuarioEmail || "invitado@anonimo.cl",
      termino: terminoLimpio,
      palabrasClave: coincidencias,
      fecha: new Date(),
    };

    await db.collection("busquedas").insertOne(busqueda);
    console.log("✅ Búsqueda registrada:", terminoLimpio);
    res.json({ ok: true, msg: "Búsqueda registrada con éxito." });
  } catch (error) {
    console.error("❌ Error al guardar búsqueda:", error);
    res.status(500).json({ msg: "Error interno del servidor." });
  }
});

export default router;
