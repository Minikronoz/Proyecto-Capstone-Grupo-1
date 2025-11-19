// ======================================================================
// 🏬 SCRAPER LOCALES UNIMARC — 2025
// ======================================================================
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB, getDB } from "../config/db.js";
import { REGIONES_COMUNAS } from "../data/regionesComunas.js"; // 👈 asegúrate de tenerlo igual que Jumbo

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🌐 Abriendo navegador…");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("📌 Navegando a Unimarc Locales…");
  await page.goto("https://www.unimarc.cl/locales-y-horarios", {
    waitUntil: "domcontentloaded",
  });

  await page.waitForSelector("h6"); // asegura carga de tarjetas

  console.log("🔍 Extrayendo tiendas…");

  const data = await page.evaluate(() => {
    const locales = [];
    document.querySelectorAll("h6").forEach($title => {
      const name = $title.innerText.trim();

      // 👇 Siguiente <p> es la dirección completa
      const p = $title.parentElement.querySelector("p");
      if (!p) return;

      const fullAddress = p.innerText.trim(); // ej: "Vivar 786, Iquique"
      const [direccion, comuna] = fullAddress.split(",").map(x => x.trim());

      locales.push({
        name,
        direccion,
        comuna,
      });
    });
    return locales;
  });

  // ======================================================================
  // 📌 Agregar Región automática con REGIONES_COMUNAS
  // ======================================================================
  const localesFinal = data.map(l => {
    let regionEncontrada = null;
    for (const region in REGIONES_COMUNAS) {
      if (REGIONES_COMUNAS[region].includes(l.comuna)) {
        regionEncontrada = region;
        break;
      }
    }

    return {
      ...l,
      region: regionEncontrada || "SIN REGIÓN",
      lastUpdate: new Date(),
    };
  });

  console.log(`📍 Locales encontrados: ${localesFinal.length}`);

  // ======================================================================
  // 💾 Guardar JSON local (opcional)
  // ======================================================================
  const filePath = path.join(__dirname, "../data/unimarc_stores.json");
  fs.writeFileSync(filePath, JSON.stringify(localesFinal, null, 2));
  console.log(`💾 Archivo guardado: ${filePath}`);

  // ======================================================================
  // 🗃️ GUARDAR EN MONGODB (colección: supermercados_locales)
  // ======================================================================
  await connectDB();
  const db = getDB();
  const collection = db.collection("locales_unimarc");

  // Limpia solo los locales de UNIMARC
  await collection.deleteMany({ tienda: "UNIMARC" });

  // Inserta nueva data
  const withStoreName = localesFinal.map(l => ({ tienda: "UNIMARC", ...l }));
  await collection.insertMany(withStoreName);

  console.log("🚀 DATOS DE UNIMARC GUARDADOS EN MONGO");

  await browser.close();
}

main()
  .catch(err => console.error("❌ Error:", err))
  .finally(() => {
    console.log("🏁 Finalizado.");
    process.exit();
  });
