// scripts/jumbo-despensa.mjs
import { chromium } from "playwright";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import conectarDB from "../config/db.mongoose.js";
import Producto from "../models/Producto.js";
import PriceHistory from "../models/PriceHistory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const parsePrice = (priceStr) => {
  if (!priceStr) return null;
  return parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
};

async function main() {
  const store = "jumbo";
  console.log(`[${store}] [${store}] Iniciando scraping...`);
  await conectarDB();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  await page.setDefaultTimeout(120000);

  let productosNuevos = 0;
  let productosActualizados = 0;

  try {
    await page.goto("https://www.jumbo.cl/despensa", {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    // Aceptar cookies si aparecen
    try {
      await page.waitForSelector("#onetrust-accept-btn-handler", { timeout: 8000 });
      await page.click("#onetrust-accept-btn-handler");
    } catch {}

    await page.waitForSelector("[data-cnstrc-item-name]", { state: "visible" });

    const productos = [];
    let pageCounter = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const products = await page.$$eval("[data-cnstrc-item-name]", (cards) =>
        cards
          .map((el) => {
            try {
              const title = el.getAttribute("data-cnstrc-item-name");
              const price = el.getAttribute("data-cnstrc-item-price");
              const image = el.querySelector("img")?.getAttribute("src");
              const link = el.querySelector("a")?.getAttribute("href");
              const brand =
                el.querySelector(".text-sm.text-gray-500")?.innerText.trim() ||
                el.querySelector(".brand")?.innerText.trim() ||
                null;
              const pricePerUnit =
                el.querySelector(".text-sm.rounded-full.bg-grey")?.innerText.trim() || null;

              if (!title || !price) return null;

              return {
                title,
                brand,
                price: parseFloat(price),
                formattedPrice: `$${Number(price).toLocaleString("es-CL")}`,
                pricePerUnit,
                image,
                link: link ? `https://www.jumbo.cl${link}` : null,
                store: "jumbo",
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean)
      );

      productos.push(...products);

      // Paginación
      try {
        const nextPage = await page.$(`button.page-number:has-text("${pageCounter + 1}")`);
        if (nextPage) {
          await nextPage.scrollIntoViewIfNeeded();
          await nextPage.click();
          await page.waitForTimeout(2500);
          pageCounter++;
        } else {
          hasNextPage = false;
        }
      } catch {
        hasNextPage = false;
      }
    }

    // Eliminar duplicados
    const productosUnicos = productos.reduce((acc, curr) => {
      if (!acc.find((p) => p.link === curr.link)) acc.push(curr);
      return acc;
    }, []);

    console.log(`[${store}] [${store}] Total recolectados: ${productosUnicos.length}`);

    // Guardar en MongoDB
    for (const prod of productosUnicos) {
      if (!prod.price || !prod.link) continue;
      const precioNumerico = prod.price;
      const productoExistente = await Producto.findOne({ link: prod.link });

      if (productoExistente) {
        if (productoExistente.currentPrice !== precioNumerico) {
          productoExistente.currentPrice = precioNumerico;
          productoExistente.formattedPrice = prod.formattedPrice;
          productoExistente.lastUpdate = new Date();
          await productoExistente.save();

          await PriceHistory.create({
            productId: productoExistente._id,
            price: precioNumerico,
          });
          productosActualizados++;
        }
      } else {
        const nuevo = await Producto.create({
          title: prod.title,
          brand: prod.brand,
          store: prod.store,
          currentPrice: precioNumerico,
          formattedPrice: prod.formattedPrice,
          image: prod.image,
          link: prod.link,
          lastUpdate: new Date(),
        });

        await PriceHistory.create({
          productId: nuevo._id,
          price: precioNumerico,
        });

        productosNuevos++;
      }
    }

    console.log(`[${store}] [${store}] Nuevos: ${productosNuevos} | Actualizados: ${productosActualizados}`);
    console.log(`[${store}] [${store}] Proceso finalizado correctamente.`);
  } catch (err) {
    console.error(`[${store}] [${store}] ERROR:`, err.message);
    await page.screenshot({ path: join(__dirname, "error-jumbo.png"), fullPage: true });
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

main().catch((err) => console.error("[jumbo ERROR GLOBAL]", err));
