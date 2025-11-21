// =============================================================
//  routes/dashboard.routes.js — Versión Final Optimizada 2025
// =============================================================
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDB } from "../config/db.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scrapingFile = path.join(__dirname, "../data/ultimoScraping.json");

// =============================================================
//  Leer archivo último scraping
// =============================================================
function obtenerScrapingData() {
  try {
    if (fs.existsSync(scrapingFile)) {
      return JSON.parse(fs.readFileSync(scrapingFile, "utf-8"));
    }
  } catch (err) {
    console.error("⚠️ Error leyendo archivo scraping:", err);
  }
  return {};
}

// =============================================================
//  GET /api/dashboard → KPIs + Charts + Scraping
// =============================================================
router.get("/", async (req, res) => {
  try {
    const db = getDB();

    //  Usuarios REALES desde MongoDB Atlas
    const usuarios = await db.collection("users").find().toArray();

    //  Productos totales
    let productosTotal = 0;
    try {
      productosTotal = await db.collection("productos").countDocuments();
    } catch (e) {
      console.warn("⚠️ No se pudo contar productos:", e.message);
    }

    // Scraping data
    const scraping = obtenerScrapingData();

    // ✔ Si no hay usuarios → responder una estructura mínima
    if (!usuarios.length) {
      return res.json({
        kpis: {
          total_usuarios: 0,
          total_negocios: 0,
          productos_total: productosTotal,
        },
        scraping,
        charts: {
          region: { "Sin datos": 1 },
          genero: { "Sin datos": 1 },
        },
        usuarios: [],
      });
    }

    //  Conteo real de negocios (incrustados)
    const totalNegocios = usuarios.reduce((acc, u) => {
      if (Array.isArray(u.negocios) && u.negocios.length > 0) {
        return acc + u.negocios.length;
      }
      return acc;
    }, 0);

    //  Distribución por región
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

    //  Respuesta final al dashboard
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
    console.error("❌ Error en /api/dashboard:", err);
    res.status(500).json({ error: "Error interno al cargar dashboard" });
  }
});

// =============================================================
//  GET /api/dashboard/scrape/ultimos → Último scraping directo
// =============================================================
router.get("/scrape/ultimos", (req, res) => {
  try {
    if (fs.existsSync(scrapingFile)) {
      return res.json(JSON.parse(fs.readFileSync(scrapingFile, "utf-8")));
    }
    res.json({});
  } catch (err) {
    console.error("❌ Error leyendo scraping:", err);
    res.status(500).json({ error: "Error al leer archivo de scraping" });
  }
});

export default router;
