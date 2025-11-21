// ===============================================
//  routes/scrape.routes.js (VERSIÓN FINAL)
// ===============================================
import express from "express";
import {
  scrapeAcuenta,
  scrapeTottus,
  scrapeJumbo,
  scrapeUnimarc,
  scrapeSantaIsabel,
  obtenerUltimosScraping,
  obtenerActividadSemanal,
  registrarEstadoScraping 
} from "../controllers/scrape.controller.js";

const router = express.Router();

// ================================
//  RUTAS DE SCRAPING REALES
// ================================
router.post("/acuenta", scrapeAcuenta);
router.post("/tottus", scrapeTottus);
router.post("/jumbo", scrapeJumbo);
router.post("/unimarc", scrapeUnimarc);
router.post("/santaisabel", scrapeSantaIsabel);


// ================================
//  ÚLTIMOS REGISTROS PARA KPI
// ================================
router.get("/ultimos", obtenerUltimosScraping);

// ================================
//  ACTIVIDAD SEMANAL (TABLA 7 DÍAS)
// ================================
router.get("/actividad-semanal", obtenerActividadSemanal);

// ================================
//  Registrar el estado del scraping del DÍA
// success | fail | warning
// ================================
router.post("/registrar-estado", registrarEstadoScraping);

export default router;
