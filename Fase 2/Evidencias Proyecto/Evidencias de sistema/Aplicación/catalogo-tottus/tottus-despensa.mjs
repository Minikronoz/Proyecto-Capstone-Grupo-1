// tottus-despensa.mjs
import { firefox } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputDir = join(__dirname, '..', 'catalogo-frontend', 'public', 'json-tottus');

// Función para esperar input del usuario (captcha)
function waitForUserInput(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => { rl.question(message, answer => { rl.close(); resolve(answer); }); });
}

// Función para obtener fecha solo: YYYY-MM-DD
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
            return { brand, title, unit, price, pricePerUnit, priceExtras, image, link, store: 'Tottus' };
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

    // Guardar JSON con **solo fecha** y archivo latest
    const dateOnly = getDateString();
    await writeFile(join(outputDir, `despensa-tottus-${dateOnly}.json`), JSON.stringify(productos, null, 2));
    await writeFile(join(outputDir, 'despensa-tottus-latest.json'), JSON.stringify(productos, null, 2));

    console.log(`Archivos guardados en ${outputDir} con ${productos.length} productos`);
    console.log(`Archivos generados:\n- despensa-tottus-${dateOnly}.json\n- despensa-tottus-latest.json`);

  } catch (error) {
    console.error('Error:', error);
    try { await page.screenshot({ path: join(outputDir, 'error-screenshot.png'), fullPage: true }); } catch {}
  } finally { await browser.close(); }
}

main().catch(err => console.error(err));
