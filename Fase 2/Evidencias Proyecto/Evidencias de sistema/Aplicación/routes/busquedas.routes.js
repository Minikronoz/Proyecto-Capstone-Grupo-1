// ==============================
//  routes/busquedas.routes.js
// ==============================
import express from "express";
import { getDB } from "../config/db.js";

const router = express.Router();

// -------------------------------------------------------------
//  Palabras clave principales (ampliadas)
// -------------------------------------------------------------
const PALABRAS_CLAVE = [
  "azucar", "harina", "pasta", "fideos", "leche", "cafe", "arroz",
  "aceite", "sal", "pan", "queso", "yogurt", "pollo", "carne",
  "atun", "sopa", "galletas", "mantequilla", "detergente",
  "jabon", "shampoo", "papel", "higienico", "toalla", "limón",
  "cereal", "mermelada", "mayonesa", "arvejas", "porotos", "lentejas",
  "vino", "cerveza", "bebida", "agua", "jugos", "huevo", "tomate",
  "manteca", "manjar", "crema", "margarina"
];

// -------------------------------------------------------------
//  POST /api/busquedas → Registrar búsqueda
// -------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const db = getDB();
    const { usuarioEmail, termino } = req.body;

    // Validaciones básicas
    if (!termino || typeof termino !== "string") {
      return res.status(400).json({ msg: "Debe ingresar un término válido." });
    }

    const terminoLimpio = termino.toLowerCase().trim();
    if (terminoLimpio.length < 3) {
      return res.status(400).json({ msg: "El término es demasiado corto." });
    }

    // Detectar coincidencias con palabras clave conocidas
    const palabras = terminoLimpio.split(/\s+/);
    const coincidencias = palabras.filter(p => PALABRAS_CLAVE.includes(p));

    // Guardar igual aunque no tenga coincidencias → sirve para analítica
    const busqueda = {
      usuarioEmail: usuarioEmail || "invitado@anonimo.cl",
      termino: terminoLimpio,
      palabrasClave: coincidencias,
      fecha: new Date()
    };

    await db.collection("busquedas").insertOne(busqueda);
    console.log("🔎 Nueva búsqueda registrada:", terminoLimpio);

    res.json({
      ok: true,
      msg: coincidencias.length
        ? "Búsqueda registrada con coincidencias."
        : "Búsqueda registrada sin coincidencias relevantes.",
    });
  } catch (error) {
    console.error("❌ Error al registrar búsqueda:", error);
    res.status(500).json({ msg: "Error interno del servidor." });
  }
});

// -------------------------------------------------------------
//  GET /api/busquedas → Obtener últimas búsquedas (para admin o dashboard)
// -------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const recientes = await db
      .collection("busquedas")
      .find()
      .sort({ fecha: -1 })
      .limit(50)
      .toArray();

    res.json(recientes);
  } catch (error) {
    console.error("❌ Error al listar búsquedas:", error);
    res.status(500).json({ msg: "Error al obtener búsquedas." });
  }
});

export default router;
