// ==============================================
// 📁 routes/dashboard.routes.js
// ==============================================
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDB } from "../config/db.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scrapingFile = path.join(__dirname, "../data/ultimoScraping.json");

// ----------------------------------------------------
// 🧩 Función auxiliar — Leer último scraping
// ----------------------------------------------------
function obtenerScrapingData() {
  try {
    if (fs.existsSync(scrapingFile)) {
      const data = fs.readFileSync(scrapingFile, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("⚠️ Error leyendo archivo de scraping:", err);
  }
  return {};
}

// ----------------------------------------------------
// 📊 GET /api/dashboard → Datos globales del sistema
// ----------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const db = getDB();

    // 1️⃣ Usuarios
    const usuarios = await db.collection("users").find().toArray();

    // Si no hay usuarios, evita errores posteriores
    if (!usuarios.length) {
      return res.json({
        kpis: { total_usuarios: 0, total_negocios: 0, productos_total: 0 },
        scraping: obtenerScrapingData(),
        charts: { region: {}, genero: {} },
        usuarios: [],
      });
    }

    // 2️⃣ Asignar valores por defecto para visualización
    const regionesDisponibles = [
      "Biobío", "Metropolitana", "Valparaíso", "Araucanía", "Los Lagos", "Maule",
      "Ñuble", "Coquimbo", "Los Ríos", "O'Higgins"
    ];
    const generosDisponibles = ["Masculino", "Femenino", "Otro"];

    usuarios.forEach((u) => {
      if (!u.region) {
        u.region = regionesDisponibles[Math.floor(Math.random() * regionesDisponibles.length)];
      }
      if (!u.genero) {
        u.genero = generosDisponibles[Math.floor(Math.random() * generosDisponibles.length)];
      }
    });

    // 3️⃣ Contar negocios asociados
    const totalNegocios = usuarios.reduce((acc, u) => {
      return acc + (Array.isArray(u.negocios) ? u.negocios.length : 0);
    }, 0);

    // 4️⃣ Total de productos disponibles
    let productosTotal = 0;
    try {
      productosTotal = await db.collection("productos").countDocuments();
    } catch (e) {
      console.warn("⚠️ No se pudo contar productos:", e.message);
    }

    // 5️⃣ Leer datos del último scraping local
    const scraping = obtenerScrapingData();

    // 6️⃣ Generar distribuciones
    const distribucionRegion = {};
    const distribucionGenero = { Masculino: 0, Femenino: 0, Otro: 0 };

    usuarios.forEach((u) => {
      const region = u.region || "Desconocida";
      distribucionRegion[region] = (distribucionRegion[region] || 0) + 1;

      const genero = (u.genero || "Otro").toLowerCase();
      if (genero.includes("masc")) distribucionGenero.Masculino++;
      else if (genero.includes("fem")) distribucionGenero.Femenino++;
      else distribucionGenero.Otro++;
    });

    // 7️⃣ Enviar datos consolidados al frontend
    res.json({
      kpis: {
        total_usuarios: usuarios.length,
        total_negocios: totalNegocios,
        productos_total: productosTotal,
      },
      scraping,
      charts: {
        region: distribucionRegion,
        genero: distribucionGenero,
      },
      usuarios,
    });
  } catch (err) {
    console.error("❌ [dashboard] Error general:", err);
    res.status(500).json({ error: "Error interno al cargar dashboard" });
  }
});

// ----------------------------------------------------
// 🗂️ GET /api/dashboard/scrape/ultimos → Último scraping guardado
// ----------------------------------------------------
router.get("/scrape/ultimos", (req, res) => {
  try {
    if (fs.existsSync(scrapingFile)) {
      const data = fs.readFileSync(scrapingFile, "utf-8");
      res.json(JSON.parse(data));
    } else {
      res.json({});
    }
  } catch (err) {
    console.error("❌ [dashboard] Error leyendo scraping:", err);
    res.status(500).json({ error: "Error al leer archivo de scraping" });
  }
});

export default router;
