import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  console.log("\n Scrapeando locales de Acuenta...");
  
  const browser = await chromium.launch({ headless: false }); // headless: false para ver qué pasa
  const page = await browser.newPage();

  try {
    await page.goto("https://www.acuenta.cl/locales", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    // Tomar captura para ver qué tiene la página
    await page.screenshot({ path: path.join(__dirname, "../data/acuenta_debug.png") });
    console.log("📸 Captura guardada en data/acuenta_debug.png");

    const locales = await page.evaluate(() => {
      const tiendas = [];
      
      // Intentar diferentes selectores
      const selectors = [
        ".local-item",
        ".store-card",
        ".tienda-card",
        "[class*='local']",
        "[class*='store']"
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(` Encontrado selector: ${selector} (${elements.length} elementos)`);
          
          elements.forEach(el => {
            const nombre = el.textContent?.trim() || "Sin nombre";
            tiendas.push({ nombre, direccion: "Por definir", comuna: "Por definir", region: "Por definir" });
          });
          
          break;
        }
      }

      return tiendas;
    });

    // Guardar en JSON
    const outputPath = path.join(__dirname, "../data/acuenta_stores.json");
    fs.writeFileSync(outputPath, JSON.stringify(locales, null, 2), "utf-8");
    
    console.log(` Acuenta: ${locales.length} locales guardados en ${outputPath}`);

  } catch (error) {
    console.error(" Error:", error.message);
  } finally {
    await browser.close();
  }
})();
