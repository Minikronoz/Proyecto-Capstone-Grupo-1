import { chromium } from "playwright";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import conectarDB from "../config/db.mongoose.js";
import Producto from "../models/Producto.js";
import PriceHistory from "../models/PriceHistory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🧮 Convierte "$1.990" → 1990
const parsePrice = (s) => (s ? parseInt(s.replace(/\D/g, ""), 10) : null);

// 🔹 Barra de progreso
function renderProgressBar(current, total, prefix = "💾 Guardando productos") {
  const width = 30;
  const progress = Math.round((current / total) * width);
  const bar = "█".repeat(progress) + "░".repeat(width - progress);
  const percent = ((current / total) * 100).toFixed(1).padStart(5);
  process.stdout.write(`\r[${prefix}] [${bar}] ${percent}% (${current}/${total})`);
  if (current === total) process.stdout.write("\n");
}

async function main() {
  const store = "jumbo";
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

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
  });
  const page = await context.newPage();
  await page.setDefaultTimeout(120000);

  let nuevos = 0;
  let actualizados = 0;
  let revisados = 0;

  try {
    const url = "https://www.jumbo.cl/despensa";
    console.log(`[${store}] 🌐 Abriendo categoría: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });

    // 🍪 Aceptar cookies
    try {
      const cookieBtn = await page.locator("#onetrust-accept-btn-handler");
      if (await cookieBtn.count()) {
        await cookieBtn.click();
        console.log(`[${store}] ✅ Cookies aceptadas`);
      }
    } catch {
      console.log(`[${store}] ℹ️ No se mostraron cookies`);
    }

    await page.waitForSelector("[data-cnstrc-item-name]", { state: "visible", timeout: 30000 });
    console.log(`[${store}] ✅ Productos visibles detectados.`);

    let productos = [];
    let pagina = 1;
    let hasNextPage = true;
    console.log(`[${store}] 🔍 Iniciando recorrido de páginas...`);

    while (hasNextPage) {
      const products = await page.$$eval("[data-cnstrc-item-name]", (cards) =>
        cards
          .map((el) => {
            try {
              const title = el.getAttribute("data-cnstrc-item-name");
              const price = el.getAttribute("data-cnstrc-item-price");
              const image = el.querySelector("img")?.src || "";
              const link = el.querySelector("a")?.href || "";
              const brand =
                el.querySelector(".text-sm.text-gray-500")?.innerText?.trim() ||
                el.querySelector(".brand")?.innerText?.trim() ||
                "Sin marca";
              const pricePerUnit =
                el.querySelector(".text-sm.rounded-full.bg-grey")?.innerText?.trim() || null;
              if (!title || !price) return null;
              return {
                title,
                brand,
                price: `$${Number(price).toLocaleString("es-CL")}`,
                currentPrice: parseInt(price),
                pricePerUnit,
                image,
                link: link.startsWith("http") ? link : `https://www.jumbo.cl${link}`,
                store: "jumbo",
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean)
      );

      console.log(`[${store}] 📄 Página ${pagina}: ${products.length} productos encontrados`);
      productos.push(...products);

      // Paginación
      try {
        const nextBtn = await page.$(`button.page-number:has-text("${pagina + 1}")`);
        if (nextBtn) {
          pagina++;
          await nextBtn.scrollIntoViewIfNeeded();
          await nextBtn.click();
          await page.waitForTimeout(3000);
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

    console.log(`[${store}] 📦 Total productos únicos: ${productosUnicos.length}`);
    console.log(`[${store}] 💾 Guardando datos en MongoDB...`);

    // 💾 Guardar / actualizar productos
    for (const [i, prod] of productosUnicos.entries()) {
      const precioNum = parsePrice(prod.price);
      if (!precioNum || isNaN(precioNum)) continue;

      const existente = await Producto.findOne({ link: prod.link, store });
      if (existente) {
        if (existente.currentPrice !== precioNum) {
          existente.currentPrice = precioNum;
          existente.formattedPrice = prod.price;
          existente.lastUpdate = new Date();
          await existente.save();
          await PriceHistory.create({ productId: existente._id, price: precioNum });
          actualizados++;
        }
      } else {
        await Producto.create({
          title: prod.title,
          brand: prod.brand,
          store: prod.store,
          currentPrice: precioNum,
          formattedPrice: prod.price,
          image: prod.image,
          link: prod.link,
          lastUpdate: new Date(),
          categoria: "Despensa",
        });
        nuevos++;
      }
      revisados++;
      renderProgressBar(revisados, productosUnicos.length);
    }
    process.stdout.write("\n");

    // 📊 Total actual
    const totalDB = await Producto.countDocuments({ store });
    console.log(`\n📦 Total actual en MongoDB (${store}): ${totalDB} productos`);

    // 📈 Resultados finales
    console.log(`\n📈 RESULTADOS`);
    console.log(`[${store}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Nuevos: ${nuevos}, Actualizados: ${actualizados}`);
    console.log(`👁️ Revisados hoy: ${revisados}`);
    console.log(`✅ Scraping completado con éxito`);
  } catch (err) {
    console.error(`[${store}] ❌ ERROR durante el scraping:`, err.message);
    try {
      await page.screenshot({ path: join(__dirname, "error-jumbo.png"), fullPage: true });
      console.log(`[${store}] 📸 Screenshot guardado: error-jumbo.png`);
    } catch (e) {
      console.error(`[${store}] ⚠️ No se pudo capturar screenshot:`, e.message);
    }
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
  .then(() => console.log("[jumbo] ✅ Script completado sin reinicio."))
  .catch((err) => console.error("[jumbo ERROR GLOBAL]", err));
