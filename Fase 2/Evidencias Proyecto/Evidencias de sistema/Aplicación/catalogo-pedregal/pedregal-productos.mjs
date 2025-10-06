import { firefox } from 'playwright';
import { writeFile } from 'fs/promises';
import readline from 'readline';

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

const browser = await firefox.launch({
  headless: true,
  slowMo: 500,
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
});

const page = await context.newPage();
await page.setDefaultTimeout(120000);

const productos = [];

try {
  await page.goto('https://alimentosdelpedregal.com/la-dehesa/productos/', {
    waitUntil: 'domcontentloaded',
    timeout: 120000
  });

  console.log('Esperando a que los productos carguen...');
  await page.waitForSelector('.product.type-product', { state: 'visible', timeout: 60000 });

  // Verificar si hay captcha
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
      retries = 0; // resetear si sí cargó contenido
      previousHeight = newHeight;
    }
  }

  console.log('Extrayendo productos...');

  const pageProducts = await page.$$eval('.product-block', (items) => {
    return items.map((item) => {
      try {
        const title = item.querySelector('.woocommerce-loop-product__title')?.innerText?.trim() || '';
        const priceStr = item.querySelector('.woocommerce-Price-amount')?.innerText?.trim()?.replace(/\s+/g, ' ') || '';
        const image = item.querySelector('img')?.getAttribute('src') || '';
        const link = item.querySelector('a')?.getAttribute('href') || '';
  
        if (!title || !priceStr) return null;


        const parsePrice = (str) => parseInt(str.replace(/[^0-9]/g, ''), 10);
        const price = parsePrice(priceStr);
 

        return {
          title,
          price: priceStr,
          image,
          link,
          store: 'Pedregal'
        };
      } catch (error) {
        console.error('Error al procesar producto:', error);
        return null;
      }
    });
  });
  

  const validProducts = pageProducts.filter(product => product !== null);
  productos.push(...validProducts);

  if (!productos.length) {
    throw new Error('No se encontraron productos para guardar');
  }

  await writeFile('json-pedregal/productos.json', JSON.stringify(productos, null, 2));
  console.log(`\nProceso completado. Total productos guardados: ${productos.length}`);

} catch (error) {
  console.error('Error durante el scraping:', error);
  await page.screenshot({ path: 'error-pedregal.png', fullPage: true });
} finally {
  await browser.close();
}
