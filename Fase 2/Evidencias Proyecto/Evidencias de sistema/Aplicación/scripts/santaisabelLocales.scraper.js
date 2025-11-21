// ======================================================================
//  SCRAPER LOCALES SANTA ISABEL — FINAL REAL (98 PÁGINAS)
// ======================================================================
import { chromium } from "playwright";
import { getDB, connectDB } from "../config/db.js";
import { obtenerGeoData } from "../utils/geocode.js";

const STORE = "locales_santaisabel";
const URL = "https://www.santaisabel.cl/locales";

// =============================================================
//  Aceptar cookies
// =============================================================
async function aceptarCookies(page) {
  try {
    const btn = await page.locator("#onetrust-accept-btn-handler");
    if ((await btn.count()) > 0 && (await btn.isVisible())) {
      await btn.click();
      console.log(" Cookies aceptadas");
      await page.waitForTimeout(1500);
    }
  } catch {}
}

// =============================================================
//  EXTRAER LOCALES VISIBLES DE LA PÁGINA
// =============================================================
async function scrapeLocales(page) {
  return await page.$$eval(
    ".localities-wrapper.bg-white.p-5.rounded-lg.cursor-pointer",
    cards => cards.map(card => {
      try {
        const name = card.querySelector(".title-with-bar-text")?.innerText?.trim() || null;
        const direccion = card.querySelector(".text-lg.leading-5.py-4")?.innerText?.trim() || null;
        const horario = card.querySelector(".text-base.leading-5")?.innerText?.replace(/Horario:/i,"").trim() || null;
        return { name, direccion, horario };
      } catch {
        return null;
      }
    }).filter(Boolean)
  );
}

// =============================================================
//  CAMBIAR A CADA PÁGINA DEL SELECTOR (1...98)
// =============================================================
async function irAPagina(page, numero) {
  // abrir el dropdown
  await page.click(".select-page-button");
  await page.waitForTimeout(500);

  // seleccionar el item
  const items = await page.$$(".select-page-dropdown-content .select-page-dropdown-item");
  if (items[numero - 1]) {
    await items[numero - 1].click();
  } else {
    console.log(` No existe la página ${numero}`);
  }

  await page.waitForTimeout(2000);
}

// =============================================================
//  MAIN
// =============================================================
async function main() {
  console.log("\n🟢 Iniciando SCRAPER SANTA ISABEL...");

  await connectDB();
  const db = getDB();
  const col = db.collection(STORE);

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(URL, { waitUntil: "networkidle" });
  await aceptarCookies(page);
  await page.waitForTimeout(2000);

  const TOTAL_PAGINAS = 98;
  let total = 0;

  for (let p = 1; p <= TOTAL_PAGINAS; p++) {
    console.log(`\n📍 Página ${p} de ${TOTAL_PAGINAS}`);
    await irAPagina(page, p);

    const locales = await scrapeLocales(page);
    console.log(`📦 Locales encontrados en página ${p}: ${locales.length}`);

    for (const loc of locales) {
      if (!loc.name || !loc.direccion) continue;

      // Obtener comuna, región y coords desde geocode
      const geo = await obtenerGeoData(loc.direccion);
      await new Promise(r => setTimeout(r, 1200)); // evitar bloqueo

      const doc = {
        name: loc.name,
        direccion: loc.direccion,
        horario: loc.horario,
        comuna: geo?.comuna || null,
        region: geo?.region || null,
        coords: geo ? { lat: geo.lat, lng: geo.lng } : null,
        lastUpdate: new Date()
      };

      await col.updateOne({ name: loc.name }, { $set: doc }, { upsert: true });
      total++;

      console.log(`💾 Guardado → ${loc.name}`);
    }
  }

  console.log(`\n🎉 FINALIZADO: SANTA ISABEL`);
  console.log(`🛒 Total locales guardados: ${total}`);

  await browser.close();
}

main().catch(err => console.error(err));
