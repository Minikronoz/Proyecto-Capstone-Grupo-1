import { firefox } from "playwright";
import mongoose from "mongoose";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import readline from "readline";

import conectarDB from "../config/db.mongoose.js";
import Producto from "../models/Producto.js";
import PriceHistory from "../models/PriceHistory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🔹 Convierte "$1.990" → 1990
const parsePrice = (priceString) =>
  priceString ? parseInt(priceString.replace(/\$|\./g, "").trim(), 10) : null;

// 🔹 Espera del usuario para resolver captcha manual
function waitForUserInput(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(message, (ans) => { rl.close(); resolve(ans); }));
}

// 🔹 Aceptar cookies automáticamente
async function aceptarCookies(page, store) {
  try {
    const selectors = [
      'button:has-text("Aceptar")',
      'button:has-text("Acepto")',
      '#onetrust-accept-btn-handler',
    ];
    for (const sel of selectors) {
      const btn = page.locator(sel);
      if ((await btn.count()) > 0 && (await btn.isVisible())) {
        await btn.click();
        console.log(`[${store}] ✅ Cookies aceptadas (${sel})`);
        await page.waitForTimeout(1000);
        return;
      }
    }
  } catch {
    console.log(`[${store}] ⚠️ No se detectaron cookies`);
  }
}

// 🔹 Cerrar pop-up de encuesta Medallia
async function cerrarEncuestaMedallia(page, store) {
  try {
    const declineButton = page.locator("#kplDeclineButton, button[isdeclinebutton='true']");
    const container = page.locator("#invitationApp, .neb-invite-container");

    if ((await container.count()) > 0 || (await declineButton.count()) > 0) {
      await page.evaluate(() => {
        const btn = document.querySelector("#kplDeclineButton, button[isdeclinebutton='true']");
        if (btn) btn.click();
      });
      console.log(`[${store}] 🧩 Encuesta Medallia detectada — se cerró correctamente.`);
      await page.waitForTimeout(1000);
    }
  } catch {
    console.log(`[${store}] ⚠️ No se detectó encuesta o ya fue cerrada.`);
  }
}

// 🔹 Render barra de progreso
function renderProgressBar(current, total, prefix = "Progreso") {
  const width = 30;
  const progress = Math.round((current / total) * width);
  const bar = "█".repeat(progress) + "░".repeat(width - progress);
  const percent = ((current / total) * 100).toFixed(1).padStart(5);
  process.stdout.write(`\r[${prefix}] [${bar}] ${percent}% (${current}/${total})`);
  if (current === total) process.stdout.write("\n");
}

async function main() {
  const store = "tottus";
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🛒 Iniciando scraping: ${store.toUpperCase()}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // 🧠 Conexión a MongoDB Atlas
  try {
    await conectarDB();
    console.log(`[${store}] ✅ Conectado correctamente a MongoDB Atlas`);
  } catch (err) {
    console.error(`[${store}] ❌ Error conectando a MongoDB:`, err.message);
    return;
  }

  // 🧩 Inicializar navegador Firefox
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
  });
  const page = await context.newPage();
  await page.setDefaultTimeout(120000);

  let productos = [];
  let nuevos = 0;
  let actualizados = 0;
  let revisados = 0;

  try {
    const url = "https://www.tottus.cl/tottus-cl/lista/CATG27055/Despensa";
    console.log(`[${store}] 🌐 Abriendo categoría: ${url}`);
    await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });

    await aceptarCookies(page, store);
    await cerrarEncuestaMedallia(page, store);

    // Captcha manual si aparece
    if (await page.locator('iframe[title*="challenge"]').count() > 0) {
      await waitForUserInput(`[${store}] ⚠️ Captcha detectado. Presiona ENTER cuando lo resuelvas...`);
    }

    let currentPage = 1;
    let hasNextPage = true;
    console.log(`[${store}] 🔍 Iniciando recorrido de páginas...`);

    // 🔁 Recorrido con paginación
    while (hasNextPage) {
      console.log(`[${store}] 📄 Página ${currentPage}: cargando productos...`);
      await aceptarCookies(page, store);
      await cerrarEncuestaMedallia(page, store);

      // Scroll gradual
      await page.evaluate(async () => {
        const delay = (ms) => new Promise((res) => setTimeout(res, ms));
        for (let i = 0; i < 10; i++) {
          window.scrollBy(0, window.innerHeight);
          await delay(300);
        }
      });
      await page.waitForTimeout(1500);

      const pageProducts = await page.$$eval(".pod.pod-4_GRID", (items) =>
        items
          .map((item) => {
            try {
              const brand = item.querySelector(".pod-title")?.innerText?.trim() || "";
              const title = item.querySelector(".pod-subTitle")?.innerText?.trim() || "";
              const price =
                item.querySelector(".copy10.primary.medium")?.innerText?.trim()?.replace(/\s+/g, " ") || "";
              const image = item.querySelector("img")?.src || "";
              let raw = item.getAttribute("href") || "";
              const aInside = item.querySelector("a[href]");
              if (aInside) raw = aInside.getAttribute("href") || "";
              let link = raw.startsWith("http") ? raw : "https://www.tottus.cl" + raw;
              if (!title || !price) return null;
              return { brand, title, price, image, link, store: "tottus" };
            } catch {
              return null;
            }
          })
          .filter(Boolean)
      );

      console.log(`[${store}] 📦 Página ${currentPage}: ${pageProducts.length} productos encontrados`);
      productos.push(...pageProducts);

      // Pasar a la siguiente página
      const nextButton = await page.locator("#testId-pagination-bottom-arrow-right");
      if ((await nextButton.count()) > 0 && (await nextButton.isEnabled())) {
        await nextButton.scrollIntoViewIfNeeded();
        await nextButton.click();
        await page.waitForTimeout(2500);
        currentPage++;
      } else {
        hasNextPage = false;
      }
    }

    console.log(`[${store}] 🧾 Total recolectados: ${productos.length}`);
    console.log(`[${store}] 💾 Guardando en MongoDB...`);

    // 💾 Guardar / actualizar productos
    for (const [i, prod] of productos.entries()) {
      const precioNumerico = parsePrice(prod.price);
      if (isNaN(precioNumerico) || !prod.link) continue;

      const existente = await Producto.findOne({ link: prod.link, store });
      if (existente) {
        if (existente.currentPrice !== precioNumerico) {
          existente.currentPrice = precioNumerico;
          existente.formattedPrice = prod.price;
          existente.lastUpdate = new Date();
          await existente.save();
          await PriceHistory.create({ productId: existente._id, price: precioNumerico });
          actualizados++;
        }
      } else {
        await Producto.create({
          title: prod.title,
          brand: prod.brand,
          store,
          currentPrice: precioNumerico,
          formattedPrice: prod.price,
          image: prod.image,
          link: prod.link,
          lastUpdate: new Date(),
          categoria: "Despensa",
        });
        nuevos++;
      }
      revisados++;
      renderProgressBar(revisados, productos.length, "💾 Guardando productos");
    }
    process.stdout.write("\n");

    // 📊 Consulta de total guardado
    const totalDB = await Producto.countDocuments({ store });
    console.log(`\n📦 Total actual en MongoDB (${store}): ${totalDB} productos`);

    // 📈 Resultados finales
    console.log(`\n📈 RESULTADOS`);
    console.log(`[${store}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Nuevos: ${nuevos}, Actualizados: ${actualizados}`);
    console.log(`👁️ Revisados hoy: ${revisados}`);
    console.log(`✅ Scraping completado con éxito`);
  } catch (error) {
    console.error(`[${store}] ❌ ERROR durante el scraping:`, error.message);
    await page.screenshot({ path: join(__dirname, "error-tottus.png"), fullPage: true });
    console.log(`[${store}] 📸 Screenshot de error guardado: error-tottus.png`);
  } finally {
    // ✅ Guardar resumen del scraping
    try {
      const totalProductos = await Producto.countDocuments({ store });
      await actualizarScrapingArchivo({
        store,
        nuevos,
        actualizados,
        totalProductos,
      }); 
    } catch (err) {
      console.error(`[${store}] ⚠️ No se pudo registrar scraping:`, err.message);
    }

    await browser.close();
    await mongoose.disconnect();
    console.log(`[${store}] 🔒 Conexión cerrada correctamente.`);
    console.log(`[${store}] 🚀 Proceso finalizado (${store.toUpperCase()})`);
  }
}

main()
  .then(() => console.log("[tottus] ✅ Script completado sin reinicio."))
  .catch((err) => console.error("[tottus ERROR GLOBAL]", err));
