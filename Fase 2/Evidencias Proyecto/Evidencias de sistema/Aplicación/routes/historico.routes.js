// ============================================
//  routes/historico.routes.js
// ============================================

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

// Necesario para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 *  Muestra la vista historico.html
 * Se usa con:  /historico?id=XXXX
 */
router.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../views/historico.html"));
});

export default router;
