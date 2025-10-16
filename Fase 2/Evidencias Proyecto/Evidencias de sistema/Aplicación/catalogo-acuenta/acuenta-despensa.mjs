// acuenta-despensa.mjs
import { firefox } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import mongoose from 'mongoose';

// Importar configuración de la base de datos y modelos
import conectarDB from '../config/db.js';
import Product from '../models/Product.js';
import PriceHistory from '../models/PriceHistory.js';

// Obtener la ruta del archivo actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



// Carpeta de salida
const outputDir = join(__dirname, '..', 'catalogo-frontend', 'public', 'json-acuenta');


// Función para esperar input del usuario (captcha)
function waitForUserInput(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(message, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// Función para parsear precio numérico
const parsePrice = (priceStr) => {
  if (!priceStr) return null;
  return parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
};

async function main() {
  console.log('Iniciando script de scraping para Acuenta...');
  await conectarDB(); // Se conecta a la base de datos
  
  const browser = await firefox.launch({ headless: true, slowMo: 500 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  await page.setDefaultTimeout(120000);

  const productos = [];
  let productosNuevos = 0;
  let productosActualizados = 0;

  try {
    await page.goto('https://www.acuenta.cl/ca/despensa/05', { waitUntil: 'domcontentloaded', timeout: 120000 });

    console.log('Esperando a que los productos carguen...');
    await page.waitForSelector('.card-product-vertical', { state: 'visible', timeout: 60000 });

    // Verificar captcha
    const hasCaptcha = await page.locator('iframe[title*="challenge"]').count() > 0;
    if (hasCaptcha) {
      console.log('Captcha detectado...');
      await waitForUserInput('Por favor, resuelve el captcha y presiona Enter cuando termines...');
    }

    // Scroll infinito
    let previousHeight = 0;
    let retries = 0;
    const maxRetries = 5;
    while (retries < maxRetries) {
      console.log('Desplazando hacia abajo...');
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(2000);

      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === previousHeight) {
        retries++;
        console.log(`No se detectó nuevo contenido. Intento ${retries}/${maxRetries}`);
      } else {
        retries = 0;
        previousHeight = newHeight;
      }
    }

    console.log('Extrayendo productos...');

    const pageProducts = await page.$$eval('.card-product-vertical', (items) => {
      return items.map((item) => {
        try {
          const title = item.querySelector('.prod__name')?.innerText?.trim() || '';
          const priceStr = item.querySelector('.base__price')?.innerText?.trim()?.replace(/\s+/g, ' ') || '';
          const normalPriceStr = item.querySelector('.prod-crossed-out__price__old')?.innerText?.trim()?.replace(/\s+/g, ' ').replace(/[()]/g, '') || '';
          const saving = item.querySelector('.prod-crossed-out__price__special-off')?.innerText?.trim() || '';
          const image = item.querySelector('img')?.getAttribute('src') || '';

          if (!title || !priceStr) return null;

          // Construir link del producto
          const productCode = image.match(/productos\/(\d+)/)?.[1];
          const link = productCode ? `https://www.acuenta.cl/p/${title.toLowerCase().replace(/\s+/g, '-')}-${productCode}` : '';

          // Función para extraer precio numérico
          const parsePrice = (str) => parseInt(str.replace(/[^0-9]/g, ''), 10);
          const price = parsePrice(priceStr);
          const normalPrice = normalPriceStr ? parsePrice(normalPriceStr) : null;

          // Descuento
          let discountPercent = null;
          if (normalPrice && price && normalPrice > price) {
            discountPercent = Math.round(((normalPrice - price) / normalPrice) * 100);
          }

          // EXTRAER pricePerUnit (kg, g, l, ml)
          let pricePerUnit = null;
          const priceUnitEl = Array.from(item.querySelectorAll('p span')).find(span => /\/(kg|g|l|ml)/i.test(span.innerText));
          if (priceUnitEl) {
            pricePerUnit = priceUnitEl.innerText.trim();
          }

          return {
            title,
            price: priceStr,
            normalPrice: normalPriceStr || null,
            discount: discountPercent !== null ? `${discountPercent}%` : null,
            discountPercent,
            saving: saving || null,
            image,
            link,
            store: 'acuenta',
            pricePerUnit
          };
        } catch (error) {
          console.error('Error al procesar producto:', error);
          return null;
        }
      });
    });

    const validProducts = pageProducts.filter(p => p !== null);
    productos.push(...validProducts);

    if (!productos.length) throw new Error('No se encontraron productos');
    
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
          brand: null, // Acuenta generalmente no muestra marca en listado
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
    console.log(`✅ Productos nuevos: ${productosNuevos}`);
    console.log(`🔄 Productos actualizados: ${productosActualizados}`);
    console.log(`-----------------`);

  } catch (error) {
    console.error('Error durante el scraping:', error);
    await page.screenshot({ path: join(__dirname, 'error-acuenta.png'), fullPage: true });
  } finally {
    await browser.close();
    await mongoose.disconnect();
    console.log('Navegador y conexión a DB cerrados.');
  }
}

main().catch(err => console.error(err));
