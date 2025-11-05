import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "../data");
const scrapingFile = path.join(dataDir, "ultimoScraping.json");

// 🧩 Función que guarda los resultados del scraping en un JSON global
export async function actualizarScrapingArchivo({ store, nuevos, actualizados, totalProductos }) {
  try {
    // Crear carpeta si no existe
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    // Leer archivo actual si existe
    let data = {};
    if (fs.existsSync(scrapingFile)) {
      const contenido = fs.readFileSync(scrapingFile, "utf-8");
      data = contenido ? JSON.parse(contenido) : {};
    }

    // Actualizar los datos del supermercado
    data[store] = {
      fecha: new Date().toISOString(),
      nuevos,
      actualizados,
      total: totalProductos || 0,
    };

    // Guardar archivo actualizado
    fs.writeFileSync(scrapingFile, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[${store}] 🧾 Archivo de scraping actualizado correctamente.`);
  } catch (err) {
    console.error(`[${store}] ⚠️ Error al actualizar archivo de scraping:`, err.message);
  }
}
