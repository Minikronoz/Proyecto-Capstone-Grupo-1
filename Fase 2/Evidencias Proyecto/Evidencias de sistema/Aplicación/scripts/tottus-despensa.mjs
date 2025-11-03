// scripts/tottus-despensa.mjs
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

// 🧮 Convierte precios tipo "$1.990" a 1990
const parsePrice = (priceString) => {
  if (!priceString) return null;
  return parseInt(priceString.replace(/\$|\./g, "").trim(), 10);
};

// 🔹 Esperar input del usuario (captcha)
function waitForUserInput(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(message, (ans) => { rl.close(); resolve(ans); }));
}

// 🔹 Detectar y aceptar cookies en cualquier momento
async function aceptarCookies(page, store) {
  try {
    const cookieButtons = [
      'button:has-text("Aceptar")',
      'button:has-text("Acepto")',
      '#onetrust-accept-btn-handler',
    ];

    for (const sel of cookieButtons) {
      const cookieBtn = page.locator(sel);
      if (await cookieBtn.count() > 0 && await cookieBtn.isVisible()) {
        await cookieBtn.click();
        console.log(`[${store}] [${store}] ✅ Cookies aceptadas (${sel})`);
        await page.waitForTimeout(2000);
        return;
      }
    }
  } catch (err) {
    console.log(`[${store}] [${store}] ⚠️ No se detectaron cookies (aún)`);
  }
}

async function main() {
  const store = "tottus";
  console.log(`[${store}] [${store}] Iniciando scraping...`);
  await conectarDB();

  const browser = await firefox.launch({ headless: true, slowMo: 100 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  await page.setDefaultTimeout(120000);

  let productos = [];
  let productosNuevos = 0;
  let productosActualizados = 0;

  try {
    console.log(`[${store}] [${store}] Cargando página principal...`);
    await page.goto("https://www.tottus.cl/tottus-cl/lista/CATG27055/Despensa", {
      waitUntil: "networkidle",
      timeout: 120000,
    });

    await aceptarCookies(page, store);

    // 🧩 Detectar captcha manual
    if (await page.locator('iframe[title*="challenge"]').count() > 0) {
      await waitForUserInput(`[${store}] Captcha detectado. Presiona Enter cuando lo hayas resuelto...`);
    }

    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      console.log(`[${store}] [${store}] Procesando página ${currentPage}...`);

      await aceptarCookies(page, store);

      // 🔁 Scroll infinito para cargar todos los productos visibles
      await page.evaluate(async () => {
        const delay = (ms) => new Promise((res) => setTimeout(res, ms));
        for (let i = 0; i < 10; i++) {
          window.scrollBy(0, window.innerHeight);
          await delay(300);
        }
      });
      await page.waitForTimeout(1500);

      // 🧠 Extraer productos de la página actual
      const pageProducts = await page.$$eval(".pod.pod-4_GRID", (items) =>
        items
          .map((item) => {
            try {
              const brand =
                item.querySelector(".pod-title")?.innerText?.trim() || "";
              const title =
                item.querySelector(".pod-subTitle")?.innerText?.trim() || "";
              const unit =
                item.querySelector(".pod-subtitle-unit")?.innerText?.trim() || "";
              const price =
                item
                  .querySelector(".copy10.primary.medium")
                  ?.innerText?.trim()
                  ?.replace(/\s+/g, " ") || "";

              let image = "";
              const imgEl = item.querySelector("picture img") || item.querySelector("img");
              if (imgEl) {
                image =
                  imgEl.src ||
                  imgEl.getAttribute("src") ||
                  imgEl.getAttribute("data-src") ||
                  "";
                if (image.startsWith("//")) image = "https:" + image;
              }

              let raw =
                item.getAttribute("href") ||
                item.getAttribute("data-pod") ||
                "";
              if (!raw) {
                const aInside = item.querySelector("a[href]");
                if (aInside) raw = aInside.getAttribute("href") || "";
              }

              let link = "";
              if (raw) {
                raw = raw.trim();
                if (!raw.startsWith("http")) {
                  if (!raw.startsWith("/")) raw = "/" + raw;
                  link = "https://www.tottus.cl" + raw;
                } else link = raw;
              }

              if (!title || !price) return null;
              return {
                brand,
                title,
                unit,
                price,
                pricePerUnit: null,
                image,
                link,
                store: "tottus",
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean)
      );

      productos.push(...pageProducts);
      console.log(`[${store}] [${store}] Página ${currentPage}: ${pageProducts.length} productos.`);

      // ▶ Siguiente página
      const nextButton = await page.locator("#testId-pagination-bottom-arrow-right");
      if (await nextButton.count() > 0 && (await nextButton.isEnabled())) {
        await nextButton.scrollIntoViewIfNeeded();
        await nextButton.click();
        await page.waitForTimeout(2500);
        currentPage++;
      } else {
        hasNextPage = false;
      }
    }

    console.log(`[${store}] [${store}] Total recolectados: ${productos.length}`);
    console.log(`[${store}] [${store}] Guardando productos en MongoDB...`);

    // 💾 Guardar / actualizar productos
    for (const prod of productos) {
      const precioNumerico = parsePrice(prod.price);
      if (isNaN(precioNumerico) || !prod.link) continue;

      const productoExistente = await Producto.findOne({ link: prod.link });

      if (productoExistente) {
        if (productoExistente.currentPrice !== precioNumerico) {
          productoExistente.currentPrice = precioNumerico;
          productoExistente.formattedPrice = prod.price;
          productoExistente.lastUpdate = new Date();
          await productoExistente.save();

          await PriceHistory.create({
            productId: productoExistente._id,
            price: precioNumerico,
          });
          productosActualizados++;
        }
      } else {
        await Producto.create({
          title: prod.title,
          brand: prod.brand,
          store: prod.store,
          currentPrice: precioNumerico,
          formattedPrice: prod.price,
          image: prod.image,
          link: prod.link,
          lastUpdate: new Date(),
        });
        productosNuevos++;
      }
    }

    console.log(`\n--- RESULTADO ---`);
    console.log(`[${store}] [${store}] Nuevos: ${productosNuevos}`);
    console.log(`[${store}] [${store}] Actualizados: ${productosActualizados}`);
    console.log(`[${store}] [${store}] ✅ Proceso finalizado correctamente.`);
  } catch (error) {
    console.error(`[${store}] [${store}] ❌ ERROR:`, error);
    await page.screenshot({
      path: join(__dirname, "error-tottus.png"),
      fullPage: true,
    });
  } finally {
    await browser.close();
    await mongoose.disconnect();
    console.log(`[${store}] [${store}] 🔒 Navegador y conexión a DB cerrados.`);
  }
}

main().catch((err) => console.error("[tottus ERROR GLOBAL]", err));
