import express from "express";
import {
  scrapeAcuenta,
  scrapeTottus,
  scrapeJumbo,
  scrapeUnimarc,
  obtenerUltimosScraping,
} from "../controllers/scrape.controller.js";

const router = express.Router();

// Scrapers reales
router.post("/acuenta", scrapeAcuenta);
router.post("/tottus", scrapeTottus);
router.post("/jumbo", scrapeJumbo);
router.post("/unimarc", scrapeUnimarc);

// Endpoint para el dashboard
router.get("/ultimos", obtenerUltimosScraping);

export default router;
