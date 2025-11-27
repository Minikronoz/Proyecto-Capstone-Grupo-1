// ==============================
//  routes/busquedas.routes.js
// ==============================
import express from "express";
import { getDB } from "../config/db.js";

const router = express.Router();

// -------------------------------------------------------------
//  Palabras clave principales (ampliadas)
// -------------------------------------------------------------
const CATEGORIAS = {
  "Despensa": [
    "azucar","harina","pasta","fideos","arroz","aceite","sal","pan","porotos","lentejas","arvejas",
    "sopa","galletas","cereal","mayonesa","mermelada","atun","conserva","manteca"
  ],
  "Lácteos": [
    "leche","queso","yogurt","crema","mantequilla","margarina","manjar"
  ],
  "Carnes": [
    "pollo","carne","pescado","cerdo","hamburguesa","trutro"
  ],
  "Bebidas": [
    "bebida","agua","jugo","coca","cola","fanta","sprite","te","cafe","cerveza","vino"
  ],
  "Hogar": [
    "detergente","jabon","shampoo","papel","higienico","toalla"
  ]
};


// -------------------------------------------------------------
//  POST /api/busquedas → Registrar búsqueda
// -------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const db = getDB();
    const { usuarioEmail, termino } = req.body;

    if (!termino || typeof termino !== "string") {
      return res.status(400).json({ msg: "Debe ingresar un término válido." });
    }

    // 🧼 Normalizar búsqueda (minúsculas y sin acentos)
    const clean = termino
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim();

    if (clean.length < 3)
      return res.status(400).json({ msg: "El término es demasiado corto." });

    const palabras = clean.split(/\s+/);

    // 📌 Detectar categoría principal
    let categoria = "Sin categoría";
    for (const [nombreCategoria, lista] of Object.entries(CATEGORIAS)) {
      if (palabras.some(p => lista.includes(p))) {
        categoria = nombreCategoria;
        break;
      }
    }

    // 📌 Detectar palabra clave específica para estudios
    const coincidencia = palabras.find(p =>
      Object.values(CATEGORIAS).flat().includes(p)
    );

    await db.collection("busquedas").insertOne({
      usuarioEmail: usuarioEmail || "invitado@anonimo.cl",
      termino: clean,
      categoria,
      palabraClave: coincidencia || null,
      fecha: new Date()
    });

    res.json({
      ok: true,
      msg: `Búsqueda registrada como categoría: ${categoria}`,
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
