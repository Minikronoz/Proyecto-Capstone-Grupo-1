// scripts/unimarc-despensa.mjs
import { chromium } from "playwright";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import conectarDB from "../config/db.mongoose.js";
import Producto from "../models/Producto.js";
import PriceHistory from "../models/PriceHistory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Convierte "$3.990" → 3990
const parsePrice = (priceString) => {
  if (!priceString) return null;
  return parseInt(priceString.replace(/\$|\./g, "").trim(), 10);
};

// Lista ampliada de marcas comunes
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
  const store = "unimarc";
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
  const productos = [];

  try {
    console.log(`[${store}] [${store}] Cargando página de Despensa...`);
    await page.goto("https://www.unimarc.cl/category/despensa", {
      waitUntil: "domcontentloaded",
    });

    // Detectar cantidad de páginas
    let totalPaginas = 1;
    try {
      await page.waitForSelector(".Pagination_item--base__fM7nj", { timeout: 8000 });
      totalPaginas = await page.$$eval(".Pagination_item--base__fM7nj", (els) =>
        Math.max(...els.map((el) => parseInt(el.innerText)).filter((n) => !isNaN(n)))
      );
    } catch {
      console.log(`[${store}] [${store}] No se detectó paginación, 1 página única.`);
    }

    console.log(`[${store}] [${store}] Total de páginas detectadas: ${totalPaginas}`);

    // Iterar sobre todas las páginas
    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      await page.goto(`https://www.unimarc.cl/category/despensa?page=${pagina}`, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });

      await page.waitForSelector('a[href^="/product/"]', { timeout: 15000 });

      const pageProducts = await page.$$eval(
        'a[href^="/product/"]',
        (links, MARCAS_CONOCIDAS) => {
          const seen = new Set();
          return links
            .map((link) => {
              const container = link.closest('div[style*="min-height: 300px"]');
              if (!container) return null;

              const title =
                container.querySelector(".Shelf_nameProduct__CXI5M")?.innerText?.trim() || "";

              // 🧠 Detección inteligente de marca
              let brand =
                container.querySelector(".Shelf_brand__CXI5M")?.innerText?.trim() ||
                container.querySelector(".Shelf_brand__e2X0G")?.innerText?.trim() ||
                container.querySelector(".brand")?.innerText?.trim() ||
                container.querySelector(".productBrand")?.innerText?.trim() ||
                container.querySelector(".vtex-product-summary-2-x-productBrand")?.innerText?.trim() ||
                null;

              // Si no hay marca en etiquetas, buscar dentro del título
              if (!brand && title) {
                const coincidencia = MARCAS_CONOCIDAS.find((m) =>
                  title.toLowerCase().includes(m.toLowerCase())
                );
                if (coincidencia) brand = coincidencia;
              }

              // Si no detecta marca conocida, intenta detectar patrones tipo "marca de dos palabras"
              if (!brand && title) {
                const palabras = title.split(" ");
                if (palabras.length >= 2) {
                  const posibles = palabras.slice(0, 2).join(" ");
                  if (/^[A-ZÁÉÍÓÚÑa-záéíóúñ]{3,}/.test(posibles)) {
                    brand = posibles;
                  }
                }
              }

              const price =
                container.querySelector(".Text_text--primary__OoK0C")?.innerText?.trim() || "";
              const image = container.querySelector("picture img")?.getAttribute("src") || "";
              const href = link.getAttribute("href");

              if (!href || seen.has(href) || !title || !price) return null;
              seen.add(href);

              return {
                title,
                brand: brand || "Sin marca",
                price,
                image,
                link: `https://www.unimarc.cl${href}`,
                store: "unimarc",
              };
            })
            .filter(Boolean);
        },
        MARCAS_CONOCIDAS
      );

      productos.push(...pageProducts);
    }

    console.log(`[${store}] [${store}] Total recolectados: ${productos.length}`);

    // Guardar nuevos o actualizados
    for (const prod of productos) {
      const precioNumerico = parsePrice(prod.price);
      if (isNaN(precioNumerico) || !prod.link) continue;

      const existente = await Producto.findOne({ link: prod.link });
      if (existente) {
        if (existente.currentPrice !== precioNumerico) {
          existente.currentPrice = precioNumerico;
          existente.formattedPrice = prod.price;
          existente.lastUpdate = new Date();
          await existente.save();
          await PriceHistory.create({
            productId: existente._id,
            price: precioNumerico,
          });
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
  } catch (error) {
    console.error(`[${store}] [${store}] ERROR:`, error.message);
    await page.screenshot({
      path: join(__dirname, "error-unimarc.png"),
      fullPage: true,
    });
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

main().catch((err) => console.error("[unimarc ERROR GLOBAL]", err));
