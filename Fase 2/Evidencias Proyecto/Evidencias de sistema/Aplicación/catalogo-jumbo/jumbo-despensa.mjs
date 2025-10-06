// jumbo-despensa.mjs
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta del archivo actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Construir ruta relativa al directorio public/json-jumbo
const outputDir = join(__dirname, '..', 'catalogo-frontend', 'public', 'json-jumbo');

function getDateString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const productos = [];

  await page.goto('https://www.jumbo.cl/despensa');

  // Esperar a que aparezca el diálogo de cookies (máximo 10 segundos)
  try {
    console.log("Esperando el banner de cookies...");
    await page.waitForSelector('div[role="dialog"][aria-label="Privacidad"]', { timeout: 10000 });
    
    // Si llegamos aquí, el diálogo está presente
    const cookieButton = page.locator('#onetrust-accept-btn-handler');
    console.log("Banner de cookies detectado en Jumbo, aceptando...");
    await cookieButton.click();
    
    // Esperar a que el diálogo desaparezca
    await page.waitForSelector('div[role="dialog"][aria-label="Privacidad"]', { state: 'hidden' });
    console.log("Banner de cookies aceptado y cerrado correctamente");
  } catch (error) {
    console.log("No se detectó el banner de cookies, continuando...");
  }

  // Esperar a que los productos estén visibles
  console.log("Esperando a que los productos se carguen...");
  await page.waitForSelector('[data-cnstrc-item-name]', { state: 'visible' });

  let hasNextPage = true;
  let pageCounter = 1;

  while (hasNextPage) {
    console.log(`Procesando página ${pageCounter}`);

    await page.waitForSelector('[data-cnstrc-item-name]', { timeout: 10000 });

    const noResults = await page.$('[data-cnstrc-num-results="0"]');
    if (noResults) {
      console.log('No se encontraron más productos. Finalizando búsqueda...');
      break;
    }

    const products = await page.$$eval('[data-cnstrc-item-name]', (results) =>
      results.map((el) => {
        const title = el.getAttribute('data-cnstrc-item-name');
        const price = el.getAttribute('data-cnstrc-item-price');
        const image = el.querySelector('img')?.getAttribute('src');
        const link = el.querySelector('a')?.getAttribute('href');

        const offerPill = el.querySelector('.icon-pill-product-card');
        const isOffer = offerPill?.innerText.trim() === 'Oferta';

        const offerDetailsEl = el.querySelector('.bg-bgflagoferta span');
        const offerDetails = offerDetailsEl ? offerDetailsEl.innerText.trim() : null;

        const brand = el.querySelector('.text-sm.text-gray-500')?.innerText.trim();
        const unitPrice = el.querySelector('.text-sm.rounded-full.bg-grey')?.innerText.trim();
        const rating = el.querySelector('.average-quantity')?.innerText.trim();

        if (!title) return null;

        return {
          title,
          brand,
          price: price ? parseFloat(price) : null,
          formattedPrice: price ? `$${Number(price).toLocaleString('es-CL')}` : null,
          unitPrice,
          image,
          link: link ? `https://www.jumbo.cl${link}` : null,
          isOffer,
          offerDetails,
          rating: rating ? parseFloat(rating) : null,
          store: 'Jumbo'
        };
      })
    );

    const validProducts = products.filter((p) => p !== null);

    if (validProducts.length === 0) {
      console.log('No se encontraron productos en esta página. Finalizando búsqueda...');
      break;
    }

    productos.push(...validProducts);

    try {
      const nextPageButton = await page.$(`button.page-number:has-text("${pageCounter + 1}")`);
      if (nextPageButton) {
        await nextPageButton.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        await nextPageButton.click();
        await page.waitForTimeout(2000);

        const currentPageButton = await page.$('button.page-number.active');
        const currentPage = await currentPageButton.textContent();

        if (parseInt(currentPage) === pageCounter + 1) {
          pageCounter++;
          console.log(`Avanzando a la página ${pageCounter}...`);
        } else {
          console.log('Error al cambiar de página. Finalizando búsqueda...');
          hasNextPage = false;
        }
      } else {
        console.log('No se encontró el botón de la siguiente página. Finalizando búsqueda...');
        hasNextPage = false;
      }
    } catch (error) {
      console.log('Error al navegar a la siguiente página:', error.message);
      hasNextPage = false;
    }
  }

  console.log(`Total de productos encontrados: ${productos.length}`);

  // Eliminar duplicados
  const productosUnicos = productos.reduce((acc, current) => {
    const exists = acc.find(item => item.link === current.link);
    if (!exists) acc.push(current);
    return acc;
  }, []);

  console.log(`Total productos únicos: ${productosUnicos.length}`);

  // 📂 Guardar archivos igual que en Tottus
  const dateStr = getDateString();
  await writeFile(join(outputDir, `despensa-jumbo-${dateStr}.json`), JSON.stringify(productosUnicos, null, 2));
  await writeFile(join(outputDir, 'despensa-jumbo-latest.json'), JSON.stringify(productosUnicos, null, 2));

  console.log(`Archivos guardados en ${outputDir} con ${productosUnicos.length} productos`);

  await browser.close();
}

main().catch(err => console.error(err));
