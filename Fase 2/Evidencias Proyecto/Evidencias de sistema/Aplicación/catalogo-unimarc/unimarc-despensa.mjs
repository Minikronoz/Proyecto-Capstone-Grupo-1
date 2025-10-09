// unimarc-despensa.mjs
import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFile, mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputDir = join(__dirname, '..', 'catalogo-frontend', 'public', 'json-unimarc');

await mkdir(outputDir, { recursive: true });

// Función para guardar archivo JSON
async function saveJsonFile(data, filename) {
  try {
    const filePath = join(outputDir, filename);
    await writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Archivo ${filename} guardado con éxito (${data.length} productos)`);

    // Actualizar también el archivo latest
    const latestPath = join(outputDir, 'despensa-unimarc-latest.json');
    await writeFile(latestPath, JSON.stringify(data, null, 2));
    console.log('Archivo despensa-unimarc-latest.json actualizado');
  } catch (error) {
    console.error('Error al guardar el archivo:', error);
    throw error;
  }
}

// Función para obtener fecha y hora legible: DD-MM-YYYY_HH:MM
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
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const productos = [];

  await page.goto('https://www.unimarc.cl/category/despensa', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.Pagination_item--base__fM7nj');

  // Número de páginas
  const lastPage = await page.$$eval('.Pagination_item--base__fM7nj', els =>
    Math.max(...els.map(el => parseInt(el.innerText)).filter(n => !isNaN(n)))
  );

  for (let pageNumber = 1; pageNumber <= lastPage; pageNumber++) {
    console.log(`Accediendo a la página: ${pageNumber}`);
    await page.goto(`https://www.unimarc.cl/category/despensa?page=${pageNumber}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('a[href^="/product/"]');

    const products = await page.$$eval('a[href^="/product/"]', links => {
      const seen = new Set();
      return links.map(link => {
        const container = link.closest('div[style*="min-height: 300px"]');
        if (!container) return null;

        const title = container.querySelector('.Shelf_nameProduct__CXI5M')?.innerText.trim() || '';
        const brand = container.querySelector('.Shelf_brand__CXI5M')?.innerText.trim() || null;
        const unit = container.querySelector('.Shelf_unit__CXI5M')?.innerText.trim() || null;
        const price = container.querySelector('.Text_text--primary__OoK0C')?.innerText.trim() || '';
        let image = container.querySelector('picture img')?.getAttribute('src') || 'imagen no disponible';
        const href = link.getAttribute('href');
        if (!href || seen.has(href) || !title || !price) return null;
        seen.add(href);

        // pricePerKg
        let pricePerKg = null;
        const pricePerKgEl = container.querySelector('div.ListPrice_listPrice__mdFUB p');
        if (pricePerKgEl) {
          const text = pricePerKgEl.innerText.trim();
          const match = text.match(/(\d{1,3}(?:\.\d{3})*)/);
          if (match) pricePerKg = `$${match[1]} x kg`;
        }

        return {
          title,
          brand,
          unit,
          price,
          pricePerKg,
          image,
          link: `https://www.unimarc.cl${href}`,
          store: "Unimarc"
        };
      }).filter(Boolean);
    });

    productos.push(...products);
    console.log(`✔ Página ${pageNumber} → ${products.length} productos encontrados`);
  }

  const dateTimeStr = getDateTimeString();
  await writeFile(join(outputDir, `despensa-unimarc-${dateTimeStr}.json`), JSON.stringify(productos, null, 2));
  console.log(`Archivo con fecha y hora guardado: despensa-unimarc-${dateTimeStr}.json`);

  // Archivo latest
  await writeFile(join(outputDir, 'despensa-unimarc-latest.json'), JSON.stringify(productos, null, 2));
  console.log('Archivo latest actualizado: despensa-unimarc-latest.json');

  await browser.close();
}

main().catch(err => console.error(err));
