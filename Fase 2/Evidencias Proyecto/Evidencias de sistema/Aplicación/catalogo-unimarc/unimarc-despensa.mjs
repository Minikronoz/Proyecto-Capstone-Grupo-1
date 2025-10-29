// Archivo: Aplicación/catalogo-unimarc/unimarc-despensa.mjs

import { chromium } from 'playwright';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import conectarDB from '../config/db.js';
import Product from '../models/Product.js';
import PriceHistory from '../models/PriceHistory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const parsePrice = (priceString) => {
  if (!priceString) return null;
  // Remover $, puntos, espacios y c/u
  const cleanPrice = priceString.replace(/\$|\.|\s*c\/u/gi, '').trim();
  // Si es una oferta tipo "2 x $3.180", tomar solo el precio unitario
  if (cleanPrice.includes('x')) {
    const parts = cleanPrice.split('x');
    if (parts.length === 2) {
      const total = parseInt(parts[1], 10);
      const quantity = parseInt(parts[0], 10);
      return Math.round(total / quantity);
    }
  }
  return parseInt(cleanPrice, 10);
};

async function main() {
  console.log('Iniciando script de scraping para Unimarc...');
  await conectarDB();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const productos = [];
  
  let productosNuevos = 0;
  let productosActualizados = 0;
  let errores = 0;

  try {
    await page.goto('https://www.unimarc.cl/category/despensa', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.Pagination_item--base__fM7nj');

    const lastPage = await page.$$eval('.Pagination_item--base__fM7nj', els =>
      Math.max(...els.map(el => parseInt(el.innerText)).filter(n => !isNaN(n)))
    );

    const pagesToScrape = lastPage;
    for (let pageNumber = 1; pageNumber <= pagesToScrape; pageNumber++) {
      console.log(`Procesando página: ${pageNumber}`);
      await page.goto(`https://www.unimarc.cl/category/despensa?page=${pageNumber}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('a[href^="/product/"]');

      const productsInPage = await page.$$eval('a[href^="/product/"]', (links) => {
        const seen = new Set();
        return links.map(link => {
          const href = link.getAttribute('href');
          if (!href || seen.has(href)) return null;
          seen.add(href);

          const container = link.closest('div[style*="min-height: 300px"]');
          if (!container) return null;

          const title = container.querySelector('p.Shelf_nameProduct__CXI5M')?.innerText.trim() || '';
          const brand = container.querySelector('p.Shelf_brandText__sGfsS')?.innerText.trim() || null;
          const image = container.querySelector('picture img')?.getAttribute('src') || '';

          // Precio normal (siempre existe)
          const normalPriceElement = container.querySelector('.ListPrice_listPriceMuted__WML1q p');
          const normalPriceText = normalPriceElement?.innerText.trim().replace(/\s*c\/u/, '') || null;

          // Precio de oferta (puede no existir)
          const offerPriceElement = container.querySelector('p[id^="listPrice__offerPrice--discountprice-"]');
          const offerPriceText = offerPriceElement?.innerText.trim() || null;

          // Si no hay título o precios, ignorar el producto
          if (!title || (!normalPriceText && !offerPriceText)) return null;

          return {
            title,
            brand,
            price: normalPriceText,
            offerDescription: offerPriceText,
            image,
            link: `https://www.unimarc.cl${href}`,
            store: "unimarc"
          };
        }).filter(Boolean);
      });

      productos.push(...productsInPage);
    }

    console.log(`Scraping finalizado. ${productos.length} productos encontrados. Guardando en DB...`);
    
    for (const prod of productos) {
      try {
        const precioNumerico = parsePrice(prod.price);
        
        // Validación explícita del precio
        if (!precioNumerico || isNaN(precioNumerico) || precioNumerico <= 0) {
          console.log(`Saltando producto con precio inválido: ${prod.title} (${prod.price})`);
          errores++;
          continue;
        }

        if (!prod.link) {
          console.log(`Saltando producto sin link: ${prod.title}`);
          errores++;
          continue;
        }

        const productoExistente = await Product.findOne({ link: prod.link });

        if (productoExistente) {
          if (productoExistente.currentPrice !== precioNumerico) {
            productoExistente.currentPrice = precioNumerico;
            productoExistente.formattedPrice = prod.price;
            productoExistente.offerDescription = prod.offerDescription;
            productoExistente.lastUpdate = new Date();
            await productoExistente.save();
            
            // Validar precio antes de crear historial
            if (precioNumerico > 0) {
              const historial = new PriceHistory({ 
                productId: productoExistente._id, 
                price: precioNumerico,
                date: new Date()  // Aseguramos que tenga fecha
              });
              await historial.save();
              productosActualizados++;
            }
          }
        } else {
          const nuevoProducto = new Product({
            title: prod.title,
            brand: prod.brand,
            store: prod.store,
            currentPrice: precioNumerico,
            formattedPrice: prod.price,
            offerDescription: prod.offerDescription,
            image: prod.image,
            link: prod.link,
            lastUpdate: new Date()
          });
          const productoGuardado = await nuevoProducto.save();
          
          // Validar precio antes de crear historial
          if (precioNumerico > 0) {
            const historial = new PriceHistory({ 
              productId: productoGuardado._id, 
              price: precioNumerico,
              date: new Date()  // Aseguramos que tenga fecha
            });
            await historial.save();
            productosNuevos++;
          }
        }
      } catch (error) {
        console.error(`Error procesando producto ${prod.title}:`, error.message);
        errores++;
      }
    }

    console.log(`\n--- RESULTADO ---`);
    console.log(`Productos nuevos: ${productosNuevos}`);
    console.log(`Productos actualizados: ${productosActualizados}`);
    console.log(`Productos con errores: ${errores}`);
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