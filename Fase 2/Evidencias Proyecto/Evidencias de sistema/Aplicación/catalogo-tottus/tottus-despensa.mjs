// tottus-despensa.mjs
import { firefox } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Obtener la ruta del archivo actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Construir ruta relativa al directorio public/json-tottus
const outputDir = join(__dirname, '..', 'catalogo-frontend', 'public', 'json-tottus');

function waitForUserInput(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(message, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

function getDateString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const browser = await firefox.launch({ headless: true, slowMo: 150 });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  await page.setDefaultTimeout(120000);

  const productos = [];

  try {
    await page.goto('https://www.tottus.cl/tottus-cl/lista/CATG27055/Despensa', { waitUntil: 'networkidle' });

    // Esperar y manejar el diálogo de cookies
    try {
      console.log("Esperando banner de cookies...");
      const cookieButton = page.locator('#onetrust-accept-btn-handler');
      if (await cookieButton.count() > 0) {
        console.log("Banner de cookies detectado, aceptando...");
        await cookieButton.click();
        await page.waitForTimeout(2000); // Esperar a que se cierre el diálogo
      }
    } catch (error) {
      console.log("No se encontró banner de cookies o ya fue aceptado");
    }

    await page.waitForSelector('.pod.pod-4_GRID', { state: 'visible', timeout: 60000 });

    // Captcha
    if (await page.locator('iframe[title*="challenge"]').count() > 0) {
      console.log('Captcha detectado, resuélvelo y presiona Enter aquí.');
      await waitForUserInput('Presiona Enter cuando termines...');
    }

    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      console.log(`Procesando página ${currentPage}...`);

      // Scroll completo para lazy-load
      await page.evaluate(async () => {
        const distance = 500;
        const delay = 100;
        let totalHeight = 0;
        while (totalHeight < document.body.scrollHeight) {
          window.scrollBy(0, distance);
          totalHeight += distance;
          await new Promise(r => setTimeout(r, delay));
        }
      });

      // Esperar imágenes cargadas
      await page.waitForTimeout(1500);

      // Extraer productos
      const pageProducts = await page.$$eval('.pod.pod-4_GRID', items =>
        items.map(item => {
          try {
            const brand = item.querySelector('.pod-title')?.innerText?.trim() || '';
            const title = item.querySelector('.pod-subTitle')?.innerText?.trim() || '';
            const unit = item.querySelector('.pod-subtitle-unit')?.innerText?.trim() || '';
            const price = item.querySelector('.copy10.primary.medium')?.innerText?.trim().replace(/\s+/g, ' ') || '';

            // --- Imagen directamente del src renderizado ---
            let image = 'imagen no disponible';
            const imgEl = item.querySelector('picture img') || item.querySelector('img');
            if (imgEl) {
              image = imgEl.src || imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || 'imagen no disponible';
              // Si es media.falabella, forzar tamaño grande
              if (image.includes('media.falabella.com')) {
                image = image.replace(/w=\d+,h=\d+/i, 'w=1500,h=1500');
              }
              if (image.startsWith('//')) image = 'https:' + image;
            }

            // --- LINK robusto ---
            let raw = '';
            try { raw = item.getAttribute('href') || ''; } catch {}
            if (!raw) raw = item.getAttribute('data-pod') || item.getAttribute('data-product-url') || '';
            if (!raw) {
              const aInside = item.querySelector('a[href]');
              if (aInside) raw = aInside.getAttribute('href') || '';
            }
            if (!raw) {
              const anc = item.closest && item.closest('a[href]');
              if (anc) raw = anc.getAttribute('href') || '';
            }

            let link = '';
            if (raw) {
              raw = raw.trim();
              if (raw.startsWith('http://') || raw.startsWith('https://')) link = raw;
              else if (raw.startsWith('//')) link = 'https:' + raw;
              else {
                if (!raw.startsWith('/')) raw = '/' + raw;
                link = 'https://www.tottus.cl' + raw;
              }
            }

            if (!title || !price) return null;
            return { brand, title, unit, price, image, link, store: 'Tottus' };
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
          console.log('Captcha detectado durante navegación. Resuélvelo y presiona Enter aquí.');
          await waitForUserInput('Presiona Enter cuando termines...');
        }
        currentPage++;
      } else hasNextPage = false;
    }

    const dateStr = getDateString();
    await writeFile(join(outputDir, `despensa-tottus-${dateStr}.json`), JSON.stringify(productos, null, 2));
    await writeFile(join(outputDir, 'despensa-tottus-latest.json'), JSON.stringify(productos, null, 2));

    console.log(`Archivo guardado en ${outputDir} con ${productos.length} productos`);
  } catch (error) {
    console.error('Error:', error);
    try { 
      await page.screenshot({ path: join(outputDir, 'error-screenshot.png'), fullPage: true }); 
    } catch {}
  } finally {
    await browser.close();
  }
}

main().catch(err => console.error(err));
