import { firefox } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import readline from 'readline';
import path from 'path';

// Función para esperar input del usuario (por si hay captcha)
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

// Para generar nombre con fecha
function getTodayDateString() {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0'); // Enero = 0
  const yyyy = today.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

// Carpeta donde se guardarán los JSON
const outputFolder = path.join(
  'D:',
  'Carlos',
  'Desktop',
  'proyecto',
  'catalogo-frontend',
  'public',
  'json-lider'
);

await mkdir(outputFolder, { recursive: true });

const browser = await firefox.launch({
  headless: true,
  slowMo: 500
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
});

const page = await context.newPage();
await page.setDefaultTimeout(120000);

const productos = [];

try {
  const category = 'Alimentacion'; // CORREGIDO: categoría correcta
  console.log(`\nProcesando categoría: ${category}`);

  let currentPage = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const url = `https://www.lider.cl/supermercado/category/${category}?page=${currentPage}&hitsPerPage=100`;
    console.log(`Procesando página ${currentPage}`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });

    // Esperar que carguen productos
    await page.waitForSelector('.ais-Hits-item', { state: 'visible', timeout: 60000 });

    // Scroll infinito
    let previousHeight = 0;
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(2000);
      const newHeight = await page.evaluate(() => document.body.scrollHeight);
      if (newHeight === previousHeight) retries++;
      else {
        retries = 0;
        previousHeight = newHeight;
      }
    }

    // Extraer productos
    const pageProducts = await page.$$eval('.ais-Hits-item', (items) => {
      return items.map((item) => {
        try {
          const titleElement = item.querySelector('.product-description');
          const brandElement = titleElement.querySelector('span[style*="font-weight: bold"]');
          const titleSpan = titleElement.querySelector('span:not([style*="font-weight: bold"])');

          const brand = brandElement?.textContent?.trim() || '';
          const titleText = titleSpan?.textContent?.trim() || '';
          const price = item.querySelector('.product-card__sale-price span')?.textContent?.trim() || '';
          const regularPrice = item.querySelector('.regular-unit-price__price-product-card span')?.textContent?.trim() || null;
          const isOutOfStock = item.querySelector('.tags[data-testid="without-stock-attribute-tag-test-id"]') !== null;
          const link = item.querySelector('a[data-testid="product-card-nav-test-id"]')?.getAttribute('href') || '';
          const image = item.querySelector('#lazy-img')?.getAttribute('src') || '';

          const skuMatch = link.match(/sku\/(\d+)/);
          const sku = skuMatch ? skuMatch[1] : null;

          return {
            brand,
            title: titleText,
            fullName: `${brand} ${titleText}`,
            price,
            regularPrice,
            isOutOfStock,
            image,
            link: `https://super.lider.cl${link}`,
            sku,
            category,
            store: 'Lider'
          };
        } catch (error) {
          console.error('Error al procesar producto:', error);
          return null;
        }
      });
    });

    const validProducts = pageProducts.filter(p => p !== null);
    productos.push(...validProducts);
    console.log(`Productos encontrados en página ${currentPage}: ${validProducts.length}`);

    // Verificar siguiente página
    const hasNext = await page.evaluate(() => {
      const nextButton = document.querySelector('.ais-Pagination-item--nextPage a');
      return nextButton && nextButton.getAttribute('aria-disabled') !== 'true';
    });

    if (!hasNext) hasNextPage = false;
    else currentPage++;
  }

  // Guardar JSON
  const todayStr = getTodayDateString();
  const latestPath = path.join(outputFolder, 'despensa-lider-latest.json');
  const datedPath = path.join(outputFolder, `despensa-lider-${todayStr}.json`);

  await writeFile(latestPath, JSON.stringify(productos, null, 2));
  await writeFile(datedPath, JSON.stringify(productos, null, 2));

  console.log(`\nProceso completado. Total productos guardados: ${productos.length}`);
  console.log(`Archivos generados en carpeta: ${outputFolder}`);

} catch (error) {
  console.error('Error durante el scraping:', error);
  await page.screenshot({ path: path.join(outputFolder, 'error-lider.png'), fullPage: true });
} finally {
  await browser.close();
}
