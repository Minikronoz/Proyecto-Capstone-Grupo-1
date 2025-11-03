import express from "express";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Usuario from "../models/Usuario.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scrapingFile = path.join(__dirname, "../data/ultimoScraping.json");

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

router.get("/", async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    let totalNegocios = 0;
    usuarios.forEach((u) => {
      if (Array.isArray(u.negocios)) totalNegocios += u.negocios.length;
    });

    let productosActualizados = 0;
    try {
      const col = mongoose.connection.db.collection("productos");
      productosActualizados = await col.countDocuments({});
    } catch {
      productosActualizados = 0;
    }

    const scraping = obtenerScrapingData();

    res.json({
      kpis: {
        productos_total: productosActualizados,
        scraping,
        total_usuarios: usuarios.length,
        total_negocios: totalNegocios,
      },
      usuarios,
    });
  } catch (err) {
    console.error("Error en dashboard:", err);
    res.status(500).json({ error: "Error al cargar dashboard" });
  }
});

export default router;
