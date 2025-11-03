// scripts/acuenta-despensa.mjs
import { firefox } from "playwright";
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

// 🔹 Lista completa de marcas conocidas
const MARCAS_CONOCIDAS = [
  "Gourmet", "Nestlé", "Colún", "Soprole", "Watts", "Carozzi",
  "Lucchetti", "Ideal", "Coca-Cola", "Pepsi", "Costa", "Loncoleche",
  "Savory", "Ambrosoli", "PF", "Nescafé", "Hellmann’s", "Livean",
  "Maggi", "Daily", "Natura", "Dos Caballos", "Tres Montes", "Knorr",
  "Maruchan", "Nature Valley", "Portal del Sur", "Nuestra Cocina",
  "Lipton", "Pancho Villa", "Arcor", "Acuenta", "Lider",
  "Bimbo", "Oroweat", "Parmalat", "San José", "Agrosuper", "Carozzi Selecta",
  "Winny", "Nova", "Svelty", "Danone", "Kellogg’s", "Hershey’s",
  "Maruchan", "Quaker", "Bonafide", "Danko", "Vital", "Kraf-Foods",
  "Unilever", "Soprole", "Colombina", "La Serenisima", "La Lechera",
  "Dolce", "Savoy", "Cremochoco", "Oreo", "ChipsAhoy", "Flynn",
  "Galletas Santiago", "Castaño", "Grido", "Anglo", "Mott’s", "Del Monte",
  "Santiago", "Bonafide", "Bresler", "Milka", "Lays", "Pringles"
];

async function main() {
  const store = "acuenta";
  console.log(`[${store}] [${store}] Iniciando scraping...`);
  await conectarDB();

  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  await page.setDefaultTimeout(120000);

  let productosNuevos = 0;
  let productosActualizados = 0;
  const productos = [];

  try {
    console.log(`[${store}] [${store}] Cargando página de Despensa...`);
    await page.goto("https://www.acuenta.cl/ca/despensa/05", {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    await page.waitForSelector(".card-product-vertical", { timeout: 60000 });

    console.log(`[${store}] [${store}] Cargando todos los productos (scroll)...`);
    let prevHeight = 0;
    let retries = 0;
    while (retries < 5) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(2000);
      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === prevHeight) retries++;
      else retries = 0;
      prevHeight = newHeight;
    }

    const pageProducts = await page.$$eval(".card-product-vertical", (items, MARCAS_CONOCIDAS) =>
      items
        .map((item) => {
          try {
            const title = item.querySelector(".prod__name")?.innerText?.trim() || "";
            if (!title) return null;

            let brand =
              item.querySelector(".prod__brand")?.innerText?.trim() ||
              item.querySelector(".prod__brand-name")?.innerText?.trim() ||
              item.querySelector(".prod__header span")?.innerText?.trim() ||
              item.querySelector(".prod__name strong")?.innerText?.trim() ||
              null;

            // 🧠 1️⃣ Si no hay brand explícito, buscar si el título termina con una marca conocida
            if (!brand) {
              const matchFinal = MARCAS_CONOCIDAS.find((m) =>
                title.toLowerCase().endsWith(m.toLowerCase())
              );
              if (matchFinal) brand = matchFinal;
            }

            // 🧠 2️⃣ Si no termina, buscar cualquier coincidencia dentro del título
            if (!brand) {
              const matchInterno = MARCAS_CONOCIDAS.find((m) =>
                title.toLowerCase().includes(m.toLowerCase())
              );
              if (matchInterno) brand = matchInterno;
            }

            // 🧠 3️⃣ Si no hay marca, tomar la primera palabra con mayúscula significativa
            if (!brand) {
              const palabras = title.split(" ");
              const capitalizada = palabras.find(
                (p) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(p)
              );
              if (capitalizada && !["Base", "Producto", "Bolsa", "Botella", "Endulzante"].includes(capitalizada))
                brand = capitalizada;
            }

            const priceStr = item.querySelector(".base__price")?.innerText?.trim() || "";
            const image = item.querySelector("img")?.getAttribute("src") || "";
            if (!priceStr || !image) return null;

            const productCode = image.match(/productos\/(\d+)/)?.[1];
            const link = productCode
              ? `https://www.acuenta.cl/p/${title
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9\-]/g, "")}-${productCode}`
              : "";

            let pricePerUnit = null;
            const priceUnitEl = Array.from(item.querySelectorAll("p span")).find((span) =>
              /\/(kg|g|l|ml)/i.test(span.innerText)
            );
            if (priceUnitEl) pricePerUnit = priceUnitEl.innerText.trim();

            return {
              title,
              brand: brand || "Sin marca",
              price: priceStr,
              image,
              link,
              store: "acuenta",
              pricePerUnit,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean),
      MARCAS_CONOCIDAS
    );

    if (!pageProducts.length) throw new Error("No se encontraron productos.");
    productos.push(...pageProducts);
    console.log(`[${store}] [${store}] Total recolectados: ${productos.length}`);

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
          await PriceHistory.create({ productId: productoExistente._id, price: precioNumerico });
          productosActualizados++;
        }
        continue;
      }

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

    console.log(
      `[${store}] [${store}] Nuevos: ${productosNuevos} | Actualizados: ${productosActualizados}`
    );
    console.log(`[${store}] [${store}] Proceso finalizado correctamente.`);
  } catch (err) {
    console.error(`[${store}] [${store}] ERROR:`, err.message);
    await page.screenshot({ path: join(__dirname, "error-acuenta.png"), fullPage: true });
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

main().catch((err) => console.error("[acuenta ERROR GLOBAL]", err));
