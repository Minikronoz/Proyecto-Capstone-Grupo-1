// jumbo-despensa.mjs
import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

// Importar configuración de la base de datos y modelos
import conectarDB from '../config/db.js';
import Product from '../models/Product.js';
import PriceHistory from '../models/PriceHistory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('Iniciando script de scraping para Jumbo...');
  await conectarDB(); // Se conecta a la base de datos
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const productos = [];
  
  let productosNuevos = 0;
  let productosActualizados = 0;

  try {
    await page.goto('https://www.jumbo.cl/despensa');

    // Aceptar cookies
    try {
      await page.waitForSelector('div[role="dialog"][aria-label="Privacidad"]', { timeout: 10000 });
      const cookieButton = page.locator('#onetrust-accept-btn-handler');
      await cookieButton.click();
      await page.waitForSelector('div[role="dialog"][aria-label="Privacidad"]', { state: 'hidden' });
    } catch {}

    await page.waitForSelector('[data-cnstrc-item-name]', { state: 'visible' });

    let hasNextPage = true;
    let pageCounter = 1;

    while (hasNextPage) {
      console.log(`Procesando página ${pageCounter}`);

      const products = await page.$$eval('[data-cnstrc-item-name]', (cards) =>
        cards.map((el) => {
          const title = el.getAttribute('data-cnstrc-item-name');
          const price = el.getAttribute('data-cnstrc-item-price');
          const image = el.querySelector('img')?.getAttribute('src');
          const link = el.querySelector('a')?.getAttribute('href');
          const brand = el.querySelector('.text-sm.text-gray-500')?.innerText.trim();
          const unitPrice = el.querySelector('.text-sm.rounded-full.bg-grey')?.innerText.trim();
          const rating = el.querySelector('.average-quantity')?.innerText.trim();

          // --- pricePerKg exacto tal cual aparece en la página ---
          let pricePerKg = null;
          const pricePerKgEl = el.querySelector('div.ppum-price-container span');
          if (pricePerKgEl) {
            pricePerKg = pricePerKgEl.innerText.trim(); // Ej: "$53 x 10g"
          }

          if (!title) return null;

          return {
            title,
            brand,
            price: price ? parseFloat(price) : null,
            formattedPrice: price ? `$${Number(price).toLocaleString('es-CL')}` : null,
            unitPrice,
            pricePerKg,
            image,
            link: link ? `https://www.jumbo.cl${link}` : null,
            rating: rating ? parseFloat(rating) : null,
            store: 'jumbo'
          };
        }).filter(p => p !== null)
      );

      productos.push(...products);

      // Paginación
      try {
        const nextPageButton = await page.$(`button.page-number:has-text("${pageCounter + 1}")`);
        if (nextPageButton) {
          await nextPageButton.scrollIntoViewIfNeeded();
          await nextPageButton.click();
          await page.waitForTimeout(2000);
          pageCounter++;
        } else hasNextPage = false;
      } catch {
        hasNextPage = false;
      }
    }

    // Eliminar duplicados por link
    const productosUnicos = productos.reduce((acc, curr) => {
      if (!acc.find(p => p.link === curr.link)) acc.push(curr);
      return acc;
    }, []);

    console.log(`Scraping finalizado. ${productosUnicos.length} productos encontrados. Guardando en DB...`);
    
    // Guardar productos en MongoDB
    for (const prod of productosUnicos) {
      if (!prod.price || !prod.link) continue;
      
      const precioNumerico = prod.price;
      
      const productoExistente = await Product.findOne({ link: prod.link });

      if (productoExistente) {
        if (productoExistente.currentPrice !== precioNumerico) {
          productoExistente.currentPrice = precioNumerico;
          productoExistente.formattedPrice = prod.formattedPrice;
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
          formattedPrice: prod.formattedPrice,
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
    console.log(`Productos actualizados: ${productosActualizados}`);
    console.log(`-----------------`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
    await mongoose.disconnect();
    console.log('Navegador y conexión a DB cerrados.');
  }
}

main().catch(err => console.error(err));
