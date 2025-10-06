import { firefox } from 'playwright';
import { writeFile } from 'fs/promises';
import readline from 'readline';

// Función para esperar input del usuario
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



// URLs de las categorías
const categories = [
  { name: 'Bebidas', url: 'Bebidas' },
  { name: 'Jugos', url: 'Jugos' },
  { name: 'Bebidas Funcionales', url: 'Bebidas_Funcionales' },
  { name: 'Aguas', url: 'Aguas' },
  { name: 'Hielo', url: 'Hielo' }
];


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
  for (const category of categories) {
    console.log(`\nProcesando categoría: ${category.name}`);
    
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const url = `https://www.lider.cl/supermercado/category/Bebidas_y_Snacks/${category.url}?page=${currentPage}&hitsPerPage=100`;
      console.log(`Procesando página ${currentPage}`);

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 120000
      });

      // Esperar a que los productos sean visibles
      await page.waitForSelector('.shop-content', { 
        state: 'visible',
        timeout: 60000 
      });

      // Extraer productos
      const pageProducts = await page.$$eval('.ais-Hits-item', (items) => {
        return items.map((item) => {
          try {
            // Extraer marca y título
            const titleElement = item.querySelector('.product-description');
            const brandElement = titleElement.querySelector('span[style*="font-weight: bold"]');
            const titleSpan = titleElement.querySelector('span:not([style*="font-weight: bold"])');
            
            const brand = brandElement?.textContent?.trim() || '';
            const titleText = titleSpan?.textContent?.trim() || '';
            
            // Extraer precio
            const priceElement = item.querySelector('.product-card__sale-price span');
            const price = priceElement?.textContent?.trim() || '';
            
            // Extraer precio regular si existe (para ofertas 2x)
            const regularPrice = item.querySelector('.regular-unit-price__price-product-card span')?.textContent?.trim() || null;
            
            // Verificar si está agotado
            const isOutOfStock = item.querySelector('.tags[data-testid="without-stock-attribute-tag-test-id"]') !== null;
            
            // Extraer link e imagen
            const link = item.querySelector('a[data-testid="product-card-nav-test-id"]')?.getAttribute('href') || '';
            const image = item.querySelector('#lazy-img')?.getAttribute('src') || '';

            // Extraer SKU del link
            const skuMatch = link.match(/sku\/(\d+)/);
            const sku = skuMatch ? skuMatch[1] : null;

            return {
              brand,
              title: titleText,
              fullName: `${brand}${titleText}`,
              price,
              regularPrice,
              isOutOfStock,
              image,
              link: `https://www.lider.cl${link}`,
              sku,
              category: category.name,
              store: 'Lider'
            };
          } catch (error) {
            console.error('Error al procesar producto:', error);
            return null;
          }
        });
      });


      // Filtrar productos válidos
      const validProducts = pageProducts.filter(product => product !== null);
      productos.push(...validProducts);
      console.log(`Productos encontrados en página ${currentPage}: ${validProducts.length}`);

      
      // Verificar si hay más páginas usando la paginación correcta
      const hasNext = await page.evaluate(() => {
        // Buscar el botón "siguiente" en la paginación
        const nextButton = document.querySelector('.ais-Pagination-item--nextPage a');
        
        // Verificar si existe y no está deshabilitado
        const isEnabled = nextButton && 
                         nextButton.getAttribute('aria-disabled') !== 'true' &&
                         !nextButton.closest('.pagination-disabled-arrows');
        
        // También podemos obtener el total de páginas
        const pageItems = document.querySelectorAll('.ais-Pagination-item--page');
        const totalPages = pageItems.length > 0 ? pageItems.length : 1;
        
        console.log(`Página actual: ${currentPage}, Total páginas: ${totalPages}`);
        
        return isEnabled;
      });

      if (!hasNext) {
        console.log('No hay más páginas disponibles');
        hasNextPage = false;
      } else {
        console.log('Avanzando a la siguiente página...');
        currentPage++;
      }
    }
  }


  // Guardar resultados
  await writeFile('json-lider/bebidas.json', JSON.stringify(productos, null, 2));
  console.log(`\nProceso completado. Total productos guardados: ${productos.length}`);


} catch (error) {
  console.error('Error durante el scraping:', error);
  await page.screenshot({ path: 'error-lider.png', fullPage: true });
} finally {
  await browser.close();
}