import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function aceptarCookies(page) {
  try {
    await page.waitForSelector("#onetrust-accept-btn-handler", { timeout: 5000 });
    await page.click("#onetrust-accept-btn-handler");
    console.log(" Cookies aceptadas");
    await page.waitForTimeout(2000);
  } catch (error) {
    console.log(" No se encontró el botón de cookies");
  }
}

async function scrapeLocales(page) {
  return await page.$$eval(
    ".localities-wrapper.bg-white.p-5.rounded-lg.cursor-pointer",
    cards => cards.map(card => {
      try {
        const nombre = card.querySelector(".title-with-bar-text")?.innerText?.trim() || "Sin nombre";
        const direccion = card.querySelector(".text-lg.leading-5.py-4")?.innerText?.trim() || "Sin dirección";
        const horario = card.querySelector(".text-base.leading-5")?.innerText?.replace(/Horario:/i,"").trim() || "Sin horario";
        return { nombre, direccion, horario };
      } catch {
        return null;
      }
    }).filter(Boolean)
  );
}

(async () => {
  console.log("\n Scrapeando locales de Santa Isabel...");
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto("https://www.santaisabel.cl/locales", { waitUntil: "domcontentloaded", timeout: 60000 });
    
    // Aceptar cookies
    await aceptarCookies(page);
    
    // Esperar que cargue el contenido
    await page.waitForTimeout(3000);

    let todosLosLocales = [];
    let paginaActual = 1;

    // Scrapear todas las páginas
    while (true) {
      console.log(` Scrapeando página ${paginaActual}...`);
      
      const locales = await scrapeLocales(page);
      todosLosLocales.push(...locales);
      
      console.log(` Página ${paginaActual}: ${locales.length} locales`);

      // Buscar botones de paginación
      const botones = await page.$$(".page-number");
      if (botones.length === 0) {
        console.log(" No hay más páginas");
        break;
      }

      // Encontrar el botón activo
      let activeIndex = -1;
      for (let i = 0; i < botones.length; i++) {
        const cls = await botones[i].getAttribute("class");
        if (cls && cls.includes("active")) {
          activeIndex = i;
          break;
        }
      }

      // Ir a la siguiente página
      const nextIndex = activeIndex + 1;
      if (nextIndex >= botones.length) {
        console.log(" Última página alcanzada");
        break;
      }

      await botones[nextIndex].click();
      await page.waitForTimeout(2500);
      paginaActual++;
    }

    // Eliminar duplicados
    const localesUnicos = todosLosLocales.filter(
      (v, i, arr) => arr.findIndex(x => x.nombre === v.nombre) === i
    );

    const outputPath = path.join(__dirname, "../data/santaisabel_stores.json");
    fs.writeFileSync(outputPath, JSON.stringify(localesUnicos, null, 2), "utf-8");
    
    console.log(`\n Santa Isabel: ${localesUnicos.length} locales guardados`);

  } catch (error) {
    console.error(" Error:", error.message);
  } finally {
    await browser.close();
  }
})();


