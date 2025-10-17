// tottus-despensa.mjs
import { firefox } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import mongoose from 'mongoose';

// Importar configuración de la base de datos y modelos
import conectarDB from '../config/db.js';
import Product from '../models/Product.js';
import PriceHistory from '../models/PriceHistory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Función para esperar input del usuario (captcha)
function waitForUserInput(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => { rl.question(message, answer => { rl.close(); resolve(answer); }); });
}

// Función para parsear precio y convertirlo a número
const parsePrice = (priceString) => {
  if (!priceString) return null;
  return parseInt(priceString.replace(/\$|\./g, '').trim(), 10);
};

async function main() {
  console.log('Iniciando script de scraping para Tottus...');
  await conectarDB(); // Se conecta a la base de datos

  const browser = await firefox.launch({ headless: true, slowMo: 150 });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  await page.setDefaultTimeout(120000);

  const productos = [];
  let productosNuevos = 0;
  let productosActualizados = 0;

  try {
    await page.goto('https://www.tottus.cl/tottus-cl/lista/CATG27055/Despensa', { waitUntil: 'networkidle' });

    // Manejo flexible de cookies
    const cookieSelectors = [
      '#onetrust-accept-btn-handler',
      'button:has-text("Aceptar")',
      'button:has-text("Acepto")'
    ];
    for (const sel of cookieSelectors) {
      const cookieButton = page.locator(sel);
      if (await cookieButton.count() > 0 && await cookieButton.isVisible()) {
        await cookieButton.click();
        console.log('Cookies aceptadas.');
        await page.waitForTimeout(2000);
        break;
      }
    }

    // Captcha inicial
    if (await page.locator('iframe[title*="challenge"]').count() > 0) {
      await waitForUserInput('Captcha detectado, presiona Enter cuando lo hayas resuelto...');
    }

    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      console.log(`Procesando página ${currentPage}...`);

      // Scroll para lazy-load
      await page.evaluate(async () => {
        const distance = 500; const delay = 100; let totalHeight = 0;
        while (totalHeight < document.body.scrollHeight) {
          window.scrollBy(0, distance); totalHeight += distance;
          await new Promise(r => setTimeout(r, delay));
        }
      });
      await page.waitForTimeout(1500);

      const pageProducts = await page.$$eval('.pod.pod-4_GRID', items =>
        items.map(item => {
          try {
            const brand = item.querySelector('.pod-title')?.innerText?.trim() || '';
            const title = item.querySelector('.pod-subTitle')?.innerText?.trim() || '';
            const unit = item.querySelector('.pod-subtitle-unit')?.innerText?.trim() || '';
            const price = item.querySelector('.copy10.primary.medium')?.innerText?.trim().replace(/\s+/g, ' ') || '';

            // Imagen
            let image = 'imagen no disponible';
            const imgEl = item.querySelector('picture img') || item.querySelector('img');
            if (imgEl) {
              image = imgEl.src || imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || 'imagen no disponible';
              if (image.startsWith('//')) image = 'https:' + image;
            }

            // Link
            let raw = item.getAttribute('href') || item.getAttribute('data-pod') || '';
            if (!raw) {
              const aInside = item.querySelector('a[href]');
              if (aInside) raw = aInside.getAttribute('href') || '';
            }
            let link = '';
            if (raw) {
              raw = raw.trim();
              if (!raw.startsWith('http')) {
                if (!raw.startsWith('/')) raw = '/' + raw;
                link = 'https://www.tottus.cl' + raw;
              } else link = raw;
            }

            // 🔹 Tottus NO muestra pricePerUnit en el listado
            // Se deja como null (se puede obtener desde la página del producto si es necesario)
            const pricePerUnit = null;
            const priceExtras = null;

            if (!title || !price) return null;
            return { brand, title, unit, price, pricePerUnit, priceExtras, image, link, store: 'tottus' };
          } catch {
            return null;
          }
        }).filter(p => p !== null)
      );

      productos.push(...pageProducts);
      console.log(`Productos encontrados en página ${currentPage}: ${pageProducts.length}`);

      // Paginación
      const nextButton = await page.locator('#testId-pagination-bottom-arrow-right');
      if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
        await nextButton.scrollIntoViewIfNeeded();
        const handle = await nextButton.elementHandle();
        if (handle) await page.evaluate(btn => btn.click(), handle);
        else await nextButton.click();
        await page.waitForTimeout(2500);

        if (await page.locator('iframe[title*="challenge"]').count() > 0) {
          await waitForUserInput('Captcha detectado durante navegación. Presiona Enter cuando termines...');
        }

        currentPage++;
      } else hasNextPage = false;
    }

    console.log(`Scraping finalizado. ${productos.length} productos encontrados. Guardando en DB...`);
    
    // Guardar productos en MongoDB
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
    console.log(`Productos actualizados: ${productosActualizados}`);
    console.log(`-----------------`);

  } catch (error) {
    console.error('Error:', error);
  } finally { 
    await browser.close();
    await mongoose.disconnect();
    console.log('Navegador y conexión a DB cerrados.');
  }
}

main().catch(err => console.error(err));
