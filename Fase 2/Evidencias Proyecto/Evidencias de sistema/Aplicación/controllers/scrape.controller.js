// =============================================================
// ⚙️ CONTROLADOR: Scraping de Supermercados (MongoClient Only)
// =============================================================
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDB } from "../config/db.js"; // ✔ conexión MongoClient correcta

async function logScraping(store, estado) {
  const db = getDB();

  await db.collection("scraping_logs").insertOne({
    store,
    estado,
    fecha: new Date()
  });
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📁 Carpeta donde se guarda el registro del último scraping
const dataDir = path.join(__dirname, "../data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const scrapingFile = path.join(dataDir, "ultimoScraping.json");

// =============================================================
// 📘 UTILIDADES PARA REGISTROS LOCALES
// =============================================================
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

function guardarScraping(supermercado, { actualizados = 0, nuevos = 0, revisados = 0 }) {
  const data = leerFechas();

  const ahora = new Date();
  const fechaFormateada = ahora.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Santiago",
  });

  data[supermercado] = {
    fecha: fechaFormateada,
    nuevos,
    actualizados,
    revisados,
  };

  fs.writeFileSync(scrapingFile, JSON.stringify(data, null, 2), "utf-8");

  console.log(
    `💾 Registro actualizado: ${supermercado.toUpperCase()} | Fecha: ${fechaFormateada} | Nuevos: ${nuevos} | Actualizados: ${actualizados} | Revisados: ${revisados}`
  );
}

// =============================================================
// 🚀 EJECUTAR SCRIPT DE SCRAPING
// =============================================================


function ejecutarScraping(nombreScript, io) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, `../scripts/${nombreScript}-despensa.mjs`);

    if (!fs.existsSync(scriptPath)) {
      const errMsg = `❌ Script no encontrado: ${scriptPath}`;
      console.error(errMsg);
      io.emit("scrape-error", { store: nombreScript, message: errMsg });
      return reject(new Error(errMsg));
    }

    console.log(`▶ Ejecutando scraping: ${scriptPath}`);

    io.emit("scrape-progress", {
      store: nombreScript,
      message: `🚀 Iniciando scraping de ${nombreScript}...`,
    });

    const proceso = exec(`node "${scriptPath}"`, { cwd: process.cwd() });

    let nuevos = 0;
    let actualizados = 0;
    let revisados = 0;

    proceso.stdout.on("data", (data) => {
      const msg = data.toString();

      const lineas = msg.split("\n").filter((l) => l.trim());
      lineas.forEach((linea) => {
        io.emit("scrape-progress", { store: nombreScript, message: linea });
      });

      const match = msg.match(/Nuevos:\s*(\d+).*Actualizados:\s*(\d+).*Revisados.*?:\s*(\d+)/i);
      if (match) {
        nuevos = parseInt(match[1], 10);
        actualizados = parseInt(match[2], 10);
        revisados = parseInt(match[3], 10);
      }
    });

    proceso.stderr.on("data", (data) => {
      io.emit("scrape-error", {
        store: nombreScript,
        message: data.toString(),
      });
    });

    // =============================================================
    // 🔥 AHORA ESTA FUNCIÓN ES async → YA PODEMOS USAR await
    // =============================================================
    proceso.on("exit", async (code) => {
  const success = code === 0;

  // Emitimos al frontend
  io.emit("scrape-complete", {
    store: nombreScript,
    success,
    message: success
      ? `✅ Scraping de ${nombreScript} completado exitosamente`
      : `❌ Scraping de ${nombreScript} terminó con código ${code}`,
  });

  // 🟩 REGISTRO COMPATIBLE CON ACTIVIDAD SEMANAL
  await logScraping(nombreScript, success ? "success" : "fail");

  // Guardado normal
  if (success) {
    guardarScraping(nombreScript, { nuevos, actualizados, revisados });
    return resolve();
  } else {
    return reject(new Error(`${nombreScript} terminó con código ${code}`));
  }
});

    proceso.on("error", (err) => {
      io.emit("scrape-error", {
        store: nombreScript,
        message: `Error al ejecutar: ${err.message}`,
      });
      reject(err);
    });
  });
}

export default ejecutarScraping;


// =============================================================
// 📡 HANDLERS API (Acuenta / Tottus / Jumbo / Unimarc)
// =============================================================
export const scrapeAcuenta = (req, res) =>
  ejecutarScraping("acuenta", req.app.get("io"))
    .then(() => res.json({ ok: true, message: "Scraping Acuenta iniciado" }))
    .catch((err) => res.status(500).json({ error: err.message }));

export const scrapeTottus = (req, res) =>
  ejecutarScraping("tottus", req.app.get("io"))
    .then(() => res.json({ ok: true, message: "Scraping Tottus iniciado" }))
    .catch((err) => res.status(500).json({ error: err.message }));

export const scrapeJumbo = (req, res) =>
  ejecutarScraping("jumbo", req.app.get("io"))
    .then(() => res.json({ ok: true, message: "Scraping Jumbo iniciado" }))
    .catch((err) => res.status(500).json({ error: err.message }));

export const scrapeUnimarc = (req, res) =>
  ejecutarScraping("unimarc", req.app.get("io"))
    .then(() => res.json({ ok: true, message: "Scraping Unimarc iniciado" }))
    .catch((err) => res.status(500).json({ error: err.message }));

// =============================================================
// 📅 GET /api/scrape/ultimos
// =============================================================
export const obtenerUltimosScraping = (req, res) => {
  res.json(leerFechas());
};

// =============================================================
// 📊 ACTIVIDAD SEMANAL (MongoClient Only)
// =============================================================
export async function obtenerActividadSemanal(req, res) {
  try {
    const db = getDB();

    const hoy = new Date();
    const primerDia = new Date(hoy);
    primerDia.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    primerDia.setHours(0, 0, 0, 0);

    const semana = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(primerDia);
      d.setDate(primerDia.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const fechasISO = semana.map((d) => d.toISOString().split("T")[0]);
    const tiendas = ["unimarc", "tottus", "jumbo", "acuenta"];

    const actividad = {};
    tiendas.forEach((store) => {
      actividad[store] = {};
      fechasISO.forEach((f) => (actividad[store][f] = "fail"));
    });

    const colecciones = await db.listCollections().toArray();
    const tieneLogs = colecciones.some((c) => c.name === "scraping_logs");

    if (tieneLogs) {
      const logs = await db
        .collection("scraping_logs")
        .find({ fecha: { $gte: primerDia } })
        .toArray();

      logs.forEach((log) => {
        const fechaISO = new Date(log.fecha).toISOString().split("T")[0];
        if (actividad[log.store] && actividad[log.store][fechaISO] !== undefined) {
          actividad[log.store][fechaISO] = "success";
        }
      });
    }

    res.json({ actividad });
  } catch (err) {
    console.error("❌ Error en obtenerActividadSemanal:", err);
    res.status(500).json({ error: err.message });
  }
}
// ===============================================
// 📌 REGISTRAR ESTADO DEL SCRAPING PARA LA TABLA SEMANAL
// ===============================================
export const registrarEstadoScraping = async (req, res) => {
  try {
    const { tienda, estado } = req.body;

    // Convertir día actual (0 Domingo → 6, Lunes → 0)
    const day = (new Date().getDay() + 6) % 7;

    let registro = await ScrapingSemana.findOne({ tienda });
    if (!registro) {
      registro = new ScrapingSemana({ tienda });
    }

    registro.semana[day] = estado;
    await registro.save();

    res.json({ ok: true, semana: registro.semana });
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
};
