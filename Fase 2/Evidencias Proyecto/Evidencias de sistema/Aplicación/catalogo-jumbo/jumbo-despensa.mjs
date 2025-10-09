// jumbo-despensa.mjs
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputDir = join(__dirname, '..', 'catalogo-frontend', 'public', 'json-jumbo');

// Función para generar fecha y hora legible: DD-MM-YYYY_HH:MM
function getDateTimeString() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy}_${hh}:${min}`;
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const productos = [];

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
          store: 'Jumbo'
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

  const dateTimeStr = getDateTimeString();
  await writeFile(join(outputDir, `despensa-jumbo-${dateTimeStr}.json`), JSON.stringify(productosUnicos, null, 2));
  await writeFile(join(outputDir, 'despensa-jumbo-latest.json'), JSON.stringify(productosUnicos, null, 2));

  console.log(`Archivos guardados con ${productosUnicos.length} productos`);

  await browser.close();
}

main().catch(err => console.error(err));
