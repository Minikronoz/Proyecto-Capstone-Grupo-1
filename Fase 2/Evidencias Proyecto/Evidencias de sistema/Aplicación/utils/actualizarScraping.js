// ======================================================
// Actualiza el archivo global de scraping (ultimoScraping.json)
// ======================================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "../data");
const scrapingFile = path.join(dataDir, "ultimoScraping.json");

/**
 *  Guarda los resultados del scraping de un supermercado
 * @param {Object} params
 * @param {string} params.store - Nombre del supermercado ("acuenta", "jumbo", etc.)
 * @param {number} params.nuevos - Cantidad de productos nuevos
 * @param {number} params.actualizados - Cantidad de productos actualizados
 * @param {number} params.totalProductos - Total procesado en el scraping
 */
export async function actualizarScrapingArchivo({ store, nuevos = 0, actualizados = 0, totalProductos = 0 }) {
  try {
    //  Crear carpeta /data si no existe
    await fs.promises.mkdir(dataDir, { recursive: true });

    //  Leer archivo actual si existe
    let data = {};
    try {
      if (fs.existsSync(scrapingFile)) {
        const contenido = await fs.promises.readFile(scrapingFile, "utf-8");
        data = contenido.trim() ? JSON.parse(contenido) : {};
      }
    } catch (err) {
      console.warn(`⚠️ Archivo de scraping corrupto. Se regenerará.`);
      data = {};
    }

    //  Fecha actual local (Chile)
    const fechaLocal = new Date().toLocaleString("es-CL", {
      timeZone: "America/Santiago",
    });

    //  Actualizar registro del supermercado
    data[store] = {
      fecha: new Date().toISOString(), // formato ISO (para análisis)
      fechaLocal,                         // formato local legible
      nuevos,                                 
      actualizados,
      total: totalProductos,
    };

    //  Guardar archivo actualizado
    await fs.promises.writeFile(scrapingFile, JSON.stringify(data, null, 2), "utf-8");

    console.log(`✅ [${store}] Archivo de scraping actualizado (${nuevos} nuevos, ${actualizados} actualizados, total: ${totalProductos}).`);
  } catch (err) {
    console.error(`❌ [${store}] Error al actualizar archivo de scraping:`, err);
  }
}
