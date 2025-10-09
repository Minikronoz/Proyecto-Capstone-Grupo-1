// acuenta-despensa.mjs
import { firefox } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

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

// Función para obtener fecha solo: YYYY-MM-DD
function getDateString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const browser = await firefox.launch({ headless: true, slowMo: 500 });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
});
const page = await context.newPage();
await page.setDefaultTimeout(120000);

const productos = [];

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
          store: 'ACuenta',
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

  // Crear carpeta si no existe
  await mkdir(outputDir, { recursive: true });

  // Guardar archivos
  const dateOnly = getDateString(); // solo fecha
  const latestFile = join(outputDir, 'despensa-acuenta-latest.json');
  const datedFile = join(outputDir, `despensa-acuenta-${dateOnly}.json`);

  await writeFile(datedFile, JSON.stringify(productos, null, 2));   // archivo con fecha
  await writeFile(latestFile, JSON.stringify(productos, null, 2));  // latest

  console.log(`\nProceso completado. Total productos guardados: ${productos.length}`);
  console.log(`Archivos generados:\n- ${datedFile}\n- ${latestFile}`);

} catch (error) {
  console.error('Error durante el scraping:', error);
  await page.screenshot({ path: join(outputDir, 'error-acuenta.png'), fullPage: true });
} finally {
  await browser.close();
}
