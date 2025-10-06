import { chromium } from 'playwright';
import { writeFile } from 'fs/promises';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const productos = [];
let pageNumber = 1;  // Comienza desde la primera página
let morePages = true; // Bandera para saber si hay más páginas

while (morePages) {
  // Accede a la página de bebidas con el número de página
  const url = `https://www.jumbo.cl/bebidas-aguas-y-jugos?page=${pageNumber}`;
  console.log(`Accediendo a la página: ${url}`);
  
  await page.goto(url);

  // Espera a que los productos se carguen
  await page.waitForSelector('.product-card');

  // Extrae los productos
  const products = await page.$$eval('.product-card', (results) => (
    results.map((el) => {
      // Obtener el nombre del producto
      const title = el.querySelector('.product-card-name')?.innerText;

      // Obtener la URL de la imagen
      const image = el.querySelector('.product-card-image-wrap img')?.getAttribute('src');

      // Obtener el precio
      const price = el.querySelector('.prices-main-price')?.innerText;

      // Obtener el enlace del producto directamente del elemento <a> con la clase 'product-card'
      const link = el.getAttribute('href');

      // Depuración: Verificar el enlace capturado
      console.log("Enlace del producto:", link);

      // Comprobar que se ha extraído el nombre del producto, si no, retornar null
      if (!title) return null;

      // Corregir el enlace si es relativo
      return { title, image, price, link: link ? `https://www.jumbo.cl${link}` : null };
    })
  ));

  // Filtrar productos no nulos
  const validProducts = products.filter(product => product !== null);

  // Agregar los productos extraídos
  productos.push(...validProducts);

  // Verificar si hay más páginas
  // En este caso, comprobamos si la cantidad de productos extraídos es menor a la cantidad esperada por página
  // Si es así, significa que no hay más productos y por lo tanto no hay más páginas
  if (validProducts.length < 40) { // Suponiendo que cada página tenga 24 productos
    morePages = false; // No hay más páginas
  } else {
    pageNumber++; // Si hay más páginas, incrementamos el número de página
  }
}

// Mostrar los productos extraídos en la consola
console.log("Productos extraídos:", productos);

// Guardar los productos extraídos en un archivo JSON
await writeFile('json-jumbo/bebidas.json', JSON.stringify(productos, null, 2));
console.log('Archivo bebidas.json guardado con éxito');

await browser.close();
