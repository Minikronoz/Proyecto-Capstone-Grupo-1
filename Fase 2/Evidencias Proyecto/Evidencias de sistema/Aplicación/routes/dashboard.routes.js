import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDB } from "../config/db.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scrapingFile = path.join(__dirname, "../data/ultimoScraping.json");

// 📂 Leer archivo con datos de scraping
function obtenerScrapingData() {
  try {
    if (fs.existsSync(scrapingFile)) {
      return JSON.parse(fs.readFileSync(scrapingFile, "utf-8"));
    }
  } catch (err) {
    console.error("Error leyendo scraping data:", err);
  }
  return {};
}

// =====================================================
// 📊 Endpoint principal del Dashboard
// =====================================================
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const usuarios = await db.collection("users").find().toArray();

    // 🟦 Asignar valores temporales si faltan
    const regionesDisponibles = [
      "Biobío",
      "Metropolitana",
      "Valparaíso",
      "Araucanía",
      "Los Lagos",
      "Maule",
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

    // 📦 Contar negocios asociados
    let totalNegocios = 0;
    usuarios.forEach((u) => {
      if (Array.isArray(u.negocios)) totalNegocios += u.negocios.length;
    });

    // 🧮 Total productos en BD
    let productosTotal = 0;
    try {
      productosTotal = await db.collection("productos").countDocuments({});
    } catch {
      productosTotal = 0;
    }

    // 📅 Datos de scraping
    const scraping = obtenerScrapingData();

    // 📊 Distribución por Región
    const distribucionRegion = {};
    usuarios.forEach((u) => {
      distribucionRegion[u.region] = (distribucionRegion[u.region] || 0) + 1;
    });

    // ⚧ Distribución por Género
    const distribucionGenero = { Masculino: 0, Femenino: 0, Otro: 0 };
    usuarios.forEach((u) => {
      const g = String(u.genero).toLowerCase();
      if (g.includes("masc")) distribucionGenero.Masculino++;
      else if (g.includes("fem")) distribucionGenero.Femenino++;
      else distribucionGenero.Otro++;
    });

    // 🧾 Enviar datos al frontend
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
    console.error("Error en dashboard:", err);
    res.status(500).json({ error: "Error al cargar dashboard" });
  }
});

// =====================================================
// 📁 Alias para compatibilidad con frontend
// =====================================================
router.get("/scrape/ultimos", (req, res) => {
  try {
    if (fs.existsSync(scrapingFile)) {
      const data = JSON.parse(fs.readFileSync(scrapingFile, "utf-8"));
      res.json(data);
    } else {
      res.json({});
    }
  } catch (err) {
    console.error("Error leyendo scraping:", err);
    res.status(500).json({ error: "Error al leer scraping" });
  }
});

export default router;
