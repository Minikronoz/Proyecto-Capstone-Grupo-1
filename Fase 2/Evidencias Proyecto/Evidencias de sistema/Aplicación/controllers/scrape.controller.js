import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "../data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const scrapingFile = path.join(dataDir, "ultimoScraping.json");

// Utilidad para leer y escribir los registros
function leerFechas() {
  try {
    if (fs.existsSync(scrapingFile)) {
      return JSON.parse(fs.readFileSync(scrapingFile, "utf-8"));
    }
  } catch (err) {
    console.error("❌ Error leyendo archivo scraping:", err);
  }
  return {};
}

function guardarScraping(supermercado, { actualizados = 0, nuevos = 0 }) {
  const data = leerFechas();
  data[supermercado] = {
    fecha: new Date().toLocaleString("es-CL", { hour12: false }),
    actualizados,
    nuevos,
  };

  fs.writeFileSync(scrapingFile, JSON.stringify(data, null, 2));
  console.log(`💾 Registro actualizado: ${supermercado} → ${nuevos} nuevos / ${actualizados} actualizados`);
}

/**
 * Ejecuta el script real y guarda resultados
 */
function ejecutarScraping(nombreScript, io) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, `../scripts/${nombreScript}-despensa.mjs`);
    console.log(`▶ Ejecutando scraping real: ${scriptPath}`);

    const proceso = exec(`node "${scriptPath}"`, { cwd: process.cwd() });

    let nuevos = 0;
    let actualizados = 0;

    proceso.stdout.on("data", (data) => {
      const msg = data.toString().trim();
      console.log(`[${nombreScript}] ${msg}`);
      io.emit("scrape-progress", { store: nombreScript, message: msg });

      // Detecta valores si los scripts imprimen algo como:
      // "Nuevos: 20, Actualizados: 100"
      const match = msg.match(/Nuevos:\s*(\d+).*Actualizados:\s*(\d+)/i);
      if (match) {
        nuevos = parseInt(match[1], 10);
        actualizados = parseInt(match[2], 10);
      }
    });

    proceso.stderr.on("data", (data) => {
      const msg = data.toString().trim();
      console.error(`[${nombreScript} ERROR] ${msg}`);
      io.emit("scrape-error", { store: nombreScript, message: msg });
    });

    proceso.on("exit", (code) => {
      const success = code === 0;
      io.emit("scrape-complete", { store: nombreScript, success });
      if (success) {
        guardarScraping(nombreScript, { nuevos, actualizados });
        resolve();
      } else {
        reject(new Error(`${nombreScript} terminó con código ${code}`));
      }
    });
  });
}

// Handlers individuales
export const scrapeAcuenta = async (req, res) => {
  const io = req.app.get("io");
  ejecutarScraping("acuenta", io)
    .then(() => res.json({ ok: true, message: "Scraping Acuenta iniciado" }))
    .catch((err) => res.status(500).json({ error: err.message }));
};

export const scrapeTottus = async (req, res) => {
  const io = req.app.get("io");
  ejecutarScraping("tottus", io)
    .then(() => res.json({ ok: true, message: "Scraping Tottus iniciado" }))
    .catch((err) => res.status(500).json({ error: err.message }));
};

export const scrapeJumbo = async (req, res) => {
  const io = req.app.get("io");
  ejecutarScraping("jumbo", io)
    .then(() => res.json({ ok: true, message: "Scraping Jumbo iniciado" }))
    .catch((err) => res.status(500).json({ error: err.message }));
};

export const scrapeUnimarc = async (req, res) => {
  const io = req.app.get("io");
  ejecutarScraping("unimarc", io)
    .then(() => res.json({ ok: true, message: "Scraping Unimarc iniciado" }))
    .catch((err) => res.status(500).json({ error: err.message }));
};

// GET /api/scrape/ultimos
export const obtenerUltimosScraping = (req, res) => {
  res.json(leerFechas());
};
