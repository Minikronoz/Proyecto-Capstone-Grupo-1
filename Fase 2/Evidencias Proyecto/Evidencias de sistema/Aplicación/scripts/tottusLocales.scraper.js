import { chromium } from "playwright";
import fs from "fs";

async function scrapeTottus() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log("🌐 Cargando página Tottus...");
  await page.goto("https://www.tottus.cl/tottus-cl/content/horario-tiendas", {
    waitUntil: "domcontentloaded",
  });

  // =======================
  // 🟦 Aceptar Cookies
  // =======================
  try {
    await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 4000 });
    await page.click('#onetrust-accept-btn-handler');
    console.log("🍪 Cookies aceptadas");
    await page.waitForTimeout(500);
  } catch (e) {
    console.log("⚠️ No apareció botón de cookies, continuando...");
  }

  // Esperar que carguen los acordeones
  await page.waitForSelector('[data-testid="accordion-items"] span');

  const regiones = await page.$$('[data-testid="accordion-items"] span');

  let filas = [];

  for (let i = 0; i < regiones.length; i++) {
    const regionEl = regiones[i];
    const regionNombre = (await regionEl.textContent()).trim();

    await regionEl.click();
    await page.waitForTimeout(300);

    const comunas = await page.$$('.AccordeonItemsstyle__CardItem-sc-xzmhha-4');

    for (let j = 0; j < comunas.length; j++) {
      const comunaEl = comunas[j];

      const comunaNombre = await comunaEl.$eval(
        '.Accordionstyle__Toggler-sc-9v8lrh-0',
        el => el.textContent.trim()
      );

      await comunaEl.click();
      await page.waitForTimeout(300);

      const dataRaw = await comunaEl.$eval(
        ".Accordionstyle__ContentText-sc-9v8lrh-6",
        el => el.innerText.trim()
      );

      const partes = dataRaw.split("\n").map(x => x.trim()).filter(Boolean);

      const direccion = partes[0] || "";
      const horario = partes.slice(1).join(" | ").replace(/\s+/g, " ");

      filas.push(
        `tottus\t${comunaNombre}\t${direccion}\tAbierto\t${regionNombre}\t${horario}`
      );
    }
  }

  fs.writeFileSync("./data/locales_tottus_raw.txt", filas.join("\n"));
  console.log("📄 Archivo locales_tottus_raw.txt generado correctamente");

  await browser.close();
}

scrapeTottus();
