// ===============================================
// 📁 routes/scrape.routes.js
// ===============================================
import express from "express";
import {
  scrapeAcuenta,
  scrapeTottus,
  scrapeJumbo,
  scrapeUnimarc,
  obtenerUltimosScraping,
  obtenerActividadSemanal,
} from "../controllers/scrape.controller.js";

const router = express.Router();

// Rutas de scraping reales
router.post("/acuenta", scrapeAcuenta);
router.post("/tottus", scrapeTottus);
router.post("/jumbo", scrapeJumbo);
router.post("/unimarc", scrapeUnimarc);

// Últimos registros
router.get("/ultimos", obtenerUltimosScraping);

// 📅 Actividad semanal (usa la del controlador)
router.get("/actividad-semanal", obtenerActividadSemanal);

export default router;
