// =============================================================
// ⚙️ CONTROLADOR: Scraping de Supermercados (versión actualizada)
// =============================================================
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDB } from "../config/db.js"; // ✅ agrega esta línea

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📁 Carpeta donde se guarda el registro del último scraping
const dataDir = path.join(__dirname, "../data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const scrapingFile = path.join(dataDir, "ultimoScraping.json");

// =============================================================
// 📘 UTILIDADES
// =============================================================

/** 🔹 Lee el archivo local con las fechas y métricas de scraping previas */
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

/** 🔹 Guarda el resultado de un scraping (fecha, nuevos, actualizados, revisados) */
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
// 🚀 FUNCIÓN CENTRAL: Ejecutar scraping con logs en vivo
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
    
    // ✅ Enviar mensaje de inicio al cliente
    io.emit("scrape-progress", { 
      store: nombreScript, 
      message: `🚀 Iniciando scraping de ${nombreScript}...` 
    });

    const proceso = exec(`node "${scriptPath}"`, { cwd: process.cwd() });

    let nuevos = 0;
    let actualizados = 0;
    let revisados = 0;

    // ✅ Capturar STDOUT línea por línea
    proceso.stdout.on("data", (data) => {
      const msg = data.toString();
      console.log(msg); // Log en consola del servidor
      
      // ✅ Enviar cada línea al cliente web
      const lineas = msg.split('\n').filter(l => l.trim());
      lineas.forEach(linea => {
        // ✅ Enviar con el evento correcto
        io.emit("scrape-progress", { 
          store: nombreScript, 
          message: linea 
        });
      });

      // Detectar conteos en logs
      const match = msg.match(/Nuevos:\s*(\d+).*Actualizados:\s*(\d+).*Revisados.*?:\s*(\d+)/i);
      if (match) {
        nuevos = parseInt(match[1], 10);
        actualizados = parseInt(match[2], 10);
        revisados = parseInt(match[3], 10);
      }
    });

    // ✅ Capturar STDERR
    proceso.stderr.on("data", (data) => {
      const msg = data.toString();
      console.error(`[${nombreScript} ERROR] ${msg}`);
      io.emit("scrape-error", { 
        store: nombreScript, 
        message: msg 
      });
    });

    // ✅ Capturar finalización
    proceso.on("exit", (code) => {
      const success = code === 0;
      const mensaje = success 
        ? `✅ Scraping de ${nombreScript} completado exitosamente` 
        : `❌ Scraping de ${nombreScript} terminó con código ${code}`;
      
      console.log(mensaje);
      
      io.emit("scrape-complete", { 
        store: nombreScript, 
        success, 
        message: mensaje 
      });

      if (success) {
        guardarScraping(nombreScript, { nuevos, actualizados, revisados });
        resolve();
      } else {
        reject(new Error(`${nombreScript} terminó con código ${code}`));
      }
    });

    // ✅ Capturar errores del proceso
    proceso.on("error", (err) => {
      console.error(`[${nombreScript}] Error al ejecutar proceso:`, err);
      io.emit("scrape-error", { 
        store: nombreScript, 
        message: `Error al ejecutar: ${err.message}` 
      });
      reject(err);
    });
  });
}

// =============================================================
// 📡 HANDLERS API
// =============================================================
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

// =============================================================
// 📅 GET /api/scrape/ultimos
// =============================================================
export const obtenerUltimosScraping = (req, res) => {
  const data = leerFechas();
  res.json(data || {});
};

// ===============================================
// 📅 ACTIVIDAD SEMANAL (profesional, con fechas reales)
// ===============================================
export async function obtenerActividadSemanal(req, res) {
  try {
    const db = getDB();

    // 🗓️ Calcular semana actual (lunes → domingo)
    const hoy = new Date();
    const primerDia = new Date(hoy);
    primerDia.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    const semana = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(primerDia);
      d.setDate(primerDia.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const fechasISO = semana.map(d => d.toISOString().split("T")[0]);
    const tiendas = ["unimarc", "tottus", "jumbo", "acuenta"];
    const actividad = {};

    // 🧠 Si existe colección scraping_logs, la usamos
    const colecciones = await db.listCollections().toArray();
    const tieneLogs = colecciones.some(c => c.name === "scraping_logs");

    if (tieneLogs) {
      const logs = await db
        .collection("scraping_logs")
        .find({ fecha: { $gte: primerDia } })
        .toArray();

      // Inicializar todas las fechas con "fail"
      tiendas.forEach(store => {
        actividad[store] = {};
        fechasISO.forEach(f => (actividad[store][f] = "fail"));
      });

      // Marcar los días donde hay scraping exitoso
      logs.forEach(log => {
        const fecha = new Date(log.fecha);
        const fechaISO = fecha.toISOString().split("T")[0];
        if (actividad[log.store] && actividad[log.store][fechaISO] !== undefined) {
          actividad[log.store][fechaISO] = "success";
        }
      });

      console.log("🟢 Datos enviados desde MongoDB (scraping_logs)");
      return res.json({ actividad });
    }

    // 🟡 Si no hay colección, devolver todo en rojo
    tiendas.forEach(store => {
      actividad[store] = {};
      fechasISO.forEach(f => (actividad[store][f] = "fail"));
    });

    console.log("🟡 No hay datos, enviando todo en rojo");
    return res.json({ actividad });

  } catch (err) {
    console.error("❌ Error en obtenerActividadSemanal:", err);
    return res.status(500).json({ error: err.message });
  }
}
