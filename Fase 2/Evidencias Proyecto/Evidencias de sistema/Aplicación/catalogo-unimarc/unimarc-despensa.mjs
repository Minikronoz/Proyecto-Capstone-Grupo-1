import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFile } from 'fs/promises';

// Obtener la ruta del archivo actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Construir ruta relativa al directorio public/json-unimarc desde la raíz del proyecto
const outputDir = join(__dirname, '..', 'catalogo-frontend', 'public', 'json-unimarc');

// Función para guardar el archivo JSON
async function saveJsonFile(data, filename) {
  try {
    const filePath = join(outputDir, filename);
    await writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Archivo ${filename} guardado con éxito (${data.length} productos en total)`);
    
    // También actualizar el archivo latest
    const latestPath = join(outputDir, 'despensa-unimarc-latest.json');
    await writeFile(latestPath, JSON.stringify(data, null, 2));
    console.log('Archivo despensa-unimarc-latest.json actualizado');
  } catch (error) {
    console.error('Error al guardar el archivo:', error);
    throw error;
  }
}

// 🕒 función para generar timestamp
function getDateString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const productos = [];

  // Ir a la categoría despensa
  await page.goto('https://www.unimarc.cl/category/despensa', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.Pagination_item--base__fM7nj');

  // Detectar páginas
  const lastPage = await page.$$eval('.Pagination_item--base__fM7nj', els => {
    return Math.max(...els.map(el => parseInt(el.innerText)).filter(n => !isNaN(n)));
  });

  for (let pageNumber = 1; pageNumber <= lastPage; pageNumber++) {
    console.log(`Accediendo a la página: ${pageNumber}`);

    await page.goto(`https://www.unimarc.cl/category/despensa?page=${pageNumber}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('a[href^="/product/"]');

    const products = await page.$$eval('a[href^="/product/"]', links => {
      const seen = new Set();
      return links.map(link => {
        const container = link.closest('div[style*="min-height: 300px"]');
        const title = container?.querySelector('.Shelf_nameProduct__CXI5M')?.innerText.trim() || '';
        const price = container?.querySelector('.Text_text--primary__OoK0C')?.innerText.trim() || '';
        let image = container?.querySelector('picture img')?.getAttribute('src') || '';
        const href = link.getAttribute('href');

        if (!href || seen.has(href) || !title || !price) return null;
        seen.add(href);

        if (!image) image = "imagen no disponible";

        return {
          title,
          price,
          image,
          link: `https://www.unimarc.cl${href}`,
          store: "Unimarc"
        };
      }).filter(Boolean);
    });

    productos.push(...products);
    console.log(`✔ Página ${pageNumber} → ${products.length} productos encontrados`);
  }

  // Usar la función saveJsonFile que ya está definida
  const dateStr = getDateString();
  await saveJsonFile(productos, `despensa-unimarc-${dateStr}.json`);

  await browser.close();
}

main().catch(err => console.error(err));
