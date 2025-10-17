import { chromium } from 'playwright';
import { writeFile } from 'fs/promises';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

const productos = [];
let pageNumber = 1;  
let morePages = true; 

while (morePages) {
  const url = `https://www.unimarc.cl/category/bebidas-y-licores?page=${pageNumber}`;
  console.log(`Accediendo a la página: ${url}`);
  
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.baseContainer_container__TSgMX');

  const products = await page.$$eval('a[href^="/product/"]', (links) => {
    const seen = new Set();
    return links
      .map((link) => {
        const container = link.closest('div[style*="min-height: 300px"]');
        const title = container?.querySelector('.Shelf_nameProduct__CXI5M')?.innerText.trim();
        const price = container?.querySelector('.Text_text--primary__OoK0C')?.innerText.trim();
        const image = container?.querySelector('picture img')?.getAttribute('src');
        const href = link.getAttribute('href');

        if (!href || seen.has(href)) return null; // saltar duplicados
        seen.add(href);

        return {
          title,
          price,
          image,
          link: `https://www.unimarc.cl${href}`,
        };
      })
      .filter(Boolean); // limpiar nulls
  });


  const validProducts = products.filter(product => product.title && product.price);

  validProducts.forEach(product => {
    if (!productos.some(p => p.title === product.title && p.link === product.link)) {
      productos.push(product);
    }
  });

  // Validación
  console.log(`✔ Página ${pageNumber} → ${validProducts.length} productos encontrados`);
  if (validProducts.length > 0) {
    console.log("Ejemplo producto:", validProducts[0]);
  }

  if (validProducts.length < 50) {
    morePages = false;
  } else {
    pageNumber++;
  }
}

await writeFile('json-unimarc/bebidas.json', JSON.stringify(productos, null, 2));
console.log(`Archivo bebidas.json guardado con éxito. Total productos: ${productos.length}`);

await browser.close();
