import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function aceptarCookies(page) {
  try {
    // Esperar a que aparezca el botón
    await page.waitForSelector("#onetrust-accept-btn-handler", { timeout: 5000 });
    
    // Hacer clic en el botón
    await page.click("#onetrust-accept-btn-handler");
    console.log(" Cookies aceptadas");
    
    // Esperar a que desaparezca el banner
    await page.waitForTimeout(2000);
  } catch (error) {
    console.log(" No se encontró el botón de cookies (puede que ya estén aceptadas)");
  }
}

async function scrapeCards(page) {
  return await page.$$eval(
    ".localities-wrapper.bg-white.p-5.rounded-lg.cursor-pointer",
    (cards) =>
      cards.map(card => {
        try {
          const nombre = card.querySelector(".title-with-bar-text")?.innerText?.trim() || "Sin nombre";
          const direccion = card.querySelector(".text-lg.leading-5.py-4")?.innerText?.trim() || "Sin dirección";
          const horario = card.querySelector(".text-base.leading-5")?.innerText?.trim() || "Sin horario";
          
          return { nombre, direccion, horario };
        } catch {
          return null;
        }
      }).filter(Boolean)
  );
}

(async () => {
  console.log("\n Scrapeando locales de Jumbo...");
  
  const browser = await chromium.launch({ headless: false }); // Cambiar a true después de probar
  const page = await browser.newPage();

  try {
    await page.goto("https://www.jumbo.cl/locales", { waitUntil: "domcontentloaded", timeout: 60000 });
    
    // Aceptar cookies ANTES de scrapear
    await aceptarCookies(page);
    
    // Esperar a que carguen las tarjetas
    await page.waitForTimeout(3000);

    let todosLosLocales = [];
    let paginaActual = 1;

    while (true) {
      console.log(` Scrapeando página ${paginaActual}...`);
      
      const locales = await scrapeCards(page);
      todosLosLocales.push(...locales);
      
      console.log(` Página ${paginaActual}: ${locales.length} locales`);

      const botones = await page.$$(".page-number");
      if (botones.length === 0) break;

      let activeIndex = -1;
      for (let i = 0; i < botones.length; i++) {
        const cls = await botones[i].getAttribute("class");
        if (cls && cls.includes("active")) {
          activeIndex = i;
          break;
        }
      }

      const nextIndex = activeIndex + 1;
      if (nextIndex >= botones.length) {
        console.log("🏁 Última página alcanzada");
        break;
      }

      await botones[nextIndex].click();
      await page.waitForTimeout(2500);
      paginaActual++;
    }

    const localesUnicos = todosLosLocales.filter(
      (v, i, arr) => arr.findIndex(x => x.nombre === v.nombre) === i
    );

    const outputPath = path.join(__dirname, "../data/jumbo_stores.json");
    fs.writeFileSync(outputPath, JSON.stringify(localesUnicos, null, 2), "utf-8");
    
    console.log(`\n Jumbo: ${localesUnicos.length} locales guardados`);

  } catch (error) {
    console.error(" Error:", error.message);
  } finally {
    await browser.close();
  }
})();

