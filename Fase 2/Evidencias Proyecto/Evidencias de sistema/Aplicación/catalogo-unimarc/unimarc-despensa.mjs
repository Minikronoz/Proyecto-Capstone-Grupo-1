// Archivo: Aplicación/catalogo-unimarc/unimarc-despensa.mjs

import { chromium } from 'playwright';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Usamos '../' para "subir un nivel" y encontrar las carpetas correctas
import conectarDB from '../config/db.js';
import Product from '../models/Product.js';
import PriceHistory from '../models/PriceHistory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const parsePrice = (priceString) => {
  if (!priceString) return null;
  return parseInt(priceString.replace(/\$|\./g, '').trim(), 10);
};

// Esta es la función principal que se ejecutará
async function main() {
  console.log('Iniciando script de scraping para Unimarc...');
  await conectarDB(); // Se conecta a la base de datos

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const productos = [];
  
  let productosNuevos = 0;
  let productosActualizados = 0;

  try {
    await page.goto('https://www.unimarc.cl/category/despensa', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.Pagination_item--base__fM7nj');

    const lastPage = await page.$$eval('.Pagination_item--base__fM7nj', els =>
      Math.max(...els.map(el => parseInt(el.innerText)).filter(n => !isNaN(n)))
    );


    // const pagesToScrape = 2; // Aumenté a 2 páginas para prueba
    const pagesToScrape = lastPage;
    for (let pageNumber = 1; pageNumber <= pagesToScrape; pageNumber++) {
      console.log(`Procesando página: ${pageNumber}`);
      await page.goto(`https://www.unimarc.cl/category/despensa?page=${pageNumber}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('a[href^="/product/"]');

      const productsInPage = await page.$$eval('a[href^="/product/"]', (links) => {
        const seen = new Set();
        return links.map(link => {
          const container = link.closest('div[style*="min-height: 300px"]');
          if (!container) return null;
          const title = container.querySelector('.Shelf_nameProduct__CXI5M')?.innerText.trim() || '';
          const brand = container.querySelector('.Shelf_brand__CXI5M')?.innerText.trim() || null;
          const price = container.querySelector('.Text_text--primary__OoK0C')?.innerText.trim() || '';
          const image = container.querySelector('picture img')?.getAttribute('src') || '';
          const href = link.getAttribute('href');
          if (!href || seen.has(href) || !title || !price) return null;
          seen.add(href);
          return { title, brand, price, image, link: `https://www.unimarc.cl${href}`, store: "unimarc" };
        }).filter(Boolean);
      });
      productos.push(...productsInPage);
    }

    console.log(`Scraping finalizado. ${productos.length} productos encontrados. Guardando en DB...`);
    
    for (const prod of productos) {
      const precioNumerico = parsePrice(prod.price);
      if (isNaN(precioNumerico) || !prod.link) continue;

      const productoExistente = await Product.findOne({ link: prod.link });

      if (productoExistente) {
        if (productoExistente.currentPrice !== precioNumerico) {
          productoExistente.currentPrice = precioNumerico;
          productoExistente.formattedPrice = prod.price;
          productoExistente.lastUpdate = new Date();
          await productoExistente.save();
          
          const historial = new PriceHistory({ productId: productoExistente._id, price: precioNumerico });
          await historial.save();
          productosActualizados++;
        }
      } else {
        const nuevoProducto = new Product({
          title: prod.title, 
          brand: prod.brand, 
          store: prod.store,
          currentPrice: precioNumerico, 
          formattedPrice: prod.price,
          image: prod.image, 
          link: prod.link, 
          lastUpdate: new Date()
        });
        const productoGuardado = await nuevoProducto.save();
        
        const historial = new PriceHistory({ productId: productoGuardado._id, price: precioNumerico });
        await historial.save();
        productosNuevos++;
      }
    }

    console.log(`\n--- RESULTADO ---`);
    console.log(`Productos nuevos: ${productosNuevos}`);
    console.log(` Productos actualizados: ${productosActualizados}`);
    console.log(`-----------------`);

  } catch (error) {
    console.error("Error durante el scraping:", error);
  } finally {
    await browser.close();
    await mongoose.disconnect();
    console.log('Navegador y conexión a DB cerrados.');
  }
}

main().catch(err => console.error(err));