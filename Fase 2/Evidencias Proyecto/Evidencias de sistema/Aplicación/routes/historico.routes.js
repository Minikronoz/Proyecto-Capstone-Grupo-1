// ============================================
// 📁 routes/historico.routes.js
// ============================================
import express from "express";
import { obtenerHistoricoPorTienda } from "../controllers/historico.controller.js";

const router = express.Router();

/**
 * 📅 Obtiene el historial de precios de una tienda específica
 * Ejemplo: GET /api/historico/acuenta?dias=7
 */
router.get("/:store", async (req, res, next) => {
  try {
    // Validar parámetro obligatorio
    const { store } = req.params;
    if (!store) {
      return res.status(400).json({ error: "Debe especificar el nombre de la tienda." });
    }

    // Limitar días a un rango razonable (por seguridad)
    const dias = parseInt(req.query.dias) || 7;
    if (dias < 1 || dias > 90) {
      return res.status(400).json({ error: "El parámetro 'dias' debe estar entre 1 y 90." });
    }

    // Pasar control al controlador original
    await obtenerHistoricoPorTienda(req, res);
  } catch (err) {
    console.error("❌ Error en ruta /historico/:store:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
