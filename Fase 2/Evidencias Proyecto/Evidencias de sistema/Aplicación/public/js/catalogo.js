// =============================================================
//  Catálogo de Productos — Versión con filtros inteligentes
// =============================================================

let productosGlobal = [];
let selectedWeights = new Set();
let filtrosPesoVisibles = false;
const ALL_STORES = ["unimarc", "tottus", "jumbo", "acuenta", "santaisabel"];
let selectedStores = new Set(ALL_STORES);
let selectedBrands = new Set();

let currentPage = 1;
let pageSize = 200;
let totalPages = 1;


/// ===============================
// 🔢 CARRITO COTIZADOR - VARIABLES GLOBALES
// ===============================
const TIENDAS_COMPARACION = ["unimarc", "tottus", "jumbo", "acuenta", "santaisabel"];
const STORAGE_KEY_CARRITO = "carritoCotizadorV1";

// Universo de productos global
window.__todosLosProductos = [];
let carritoCotizador = [];

// Registrar productos cargados
window.registrarProductosGlobales = function (lista) {
  if (Array.isArray(lista)) window.__todosLosProductos = lista;
};

// ===============================
// 🔤 NORMALIZACIÓN TEXTO
// ===============================
function normalizarTexto(str = "") {
  return str
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ===============================
// 🧾 FORMATEAR CLP
// ===============================
function formatearCLP(valor) {
  if (typeof valor !== "number" || isNaN(valor)) return "-";
  return valor.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

// ===============================
// 💵 OBTENER PRECIO NÚMERO
// ===============================
function precioNumeroDesdeProducto(p) {
  if (!p) return null;
  const campo = p.currentPrice ?? p.price;
  if (typeof campo === "number") return campo;
  if (typeof campo === "string") {
    const limpio = campo.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
    const num = parseFloat(limpio);
    return isNaN(num) ? null : num;
  }
  return null;
}

// ===============================
// ⚖️ NORMALIZAR PESO / VOLUMEN
// ===============================
function normalizarPesoDesdeTitulo(title) {
  if (!title) return null;

  const matchVol = title.match(/(\d+(?:[\.,]\d+)?)\s*(l|ml|cc)\b/i);
  if (matchVol) {
    let valor = parseFloat(matchVol[1].replace(",", "."));
    const unidad = matchVol[2].toLowerCase();
    if (unidad === "l") valor *= 1000;
    return { valor: Math.round(valor), tipo: "volumen" };
  }

  const matchPeso = title.match(/(\d+(?:[\.,]\d+)?)\s*(g|kg)\b/i);
  if (matchPeso) {
    let valor = parseFloat(matchPeso[1].replace(",", "."));
    const unidad = matchPeso[2].toLowerCase();
    if (unidad === "kg") valor *= 1000;
    if (valor < 50 || valor > 50000) return null;
    return { valor: Math.round(valor), tipo: "peso" };
  }

  return null;
}

// Convertir peso en texto
function pesoToText(m) {
  if (!m || !m.valor) return "";
  return `${m.valor}${m.tipo === "peso" ? "g" : "ml"}`;
}

// ===============================
// 🔍 STOPWORDS Y LIMPIEZA DE TÍTULO
// ===============================
const STOPWORDS = ["de","para","sin","con","azucar","harina","selecta","fina","light","sal",
  "azúcar","blanca","iodada","lobos","pasta","polvos","sin polvos","producto","500","1kg","sucralosa"];

function limpiarTextoClave(str = "") {
  let txt = normalizarTexto(str);
  STOPWORDS.forEach(sw => txt = txt.replace(new RegExp("\\b" + sw + "\\b", "g"), " "));
  return txt.replace(/\s+/g, " ").trim();
}
function normalizarMarca(m = "") {
  return m
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")   // deja solo letras y números, quita espacios
    .trim();
}
function levenshtein(a, b) {
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? m[i - 1][j - 1]
        : 1 + Math.min(
            m[i - 1][j],
            m[i][j - 1],
            m[i - 1][j - 1]
          );
    }
  }

  return m[b.length][a.length];
}

// ===============================
// 📌 SIMILITUDES
// ===============================
function similitudMarca(m1 = "", m2 = "") {
  const a = normalizarMarca(m1);
  const b = normalizarMarca(m2);

  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 95;

  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return (1 - dist / maxLen) * 100;
}

function similitudPalabras(a, b) {
  const A = new Set(a.split(" "));
  const B = new Set(b.split(" "));
  const inter = [...A].filter(p => B.has(p));
  return (inter.length * 2) / (A.size + B.size || 1) * 100;
}

function compararPesos(p1, p2) {
  if (!p1 || !p2 || p1.tipo !== p2.tipo) return 0;
  const dif = Math.abs(p1.valor - p2.valor);
  return dif <= p1.valor * 0.12 ? 100 : 0; // 12% tolerancia
}

// ===============================
// 🧠 BUSCAR SIMILAR EN TODAS LAS TIENDAS (versión estricta)
// ===============================
function encontrarSimilaresEnTodasLasTiendas(prod) {
  const res = {};
  const pesoBase = normalizarPesoDesdeTitulo(prod.titulo);
  const claveBase = limpiarTextoClave(prod.titulo);
  const atributosBase = extraerAtributosCriticos(prod.titulo);

  TIENDAS_COMPARACION.forEach(tienda => {
    let mejor = null, mejorScore = 0;

    window.__todosLosProductos
      .filter(p => (p.store || "").toLowerCase() === tienda)
      .forEach(p => {
        const claveP = limpiarTextoClave(p.title);
        const pesoP = normalizarPesoDesdeTitulo(p.title);
        const atributosP = extraerAtributosCriticos(p.title);

        let scoreMarca = similitudMarca(prod.marca, p.brand);    // 0–100
        let scoreNombre = similitudPalabras(claveBase, claveP);  // 0–100
        let scorePeso = compararPesos(pesoBase, pesoP);          // 0–100


        // ❌ Penalizar diferencias en atributos críticos
        let penalizacion = penalizarDiferenciasAtributos(atributosBase, atributosP);

        // 🎯 Score final con ponderaciones mejoradas
        const scoreFinal =
          (scoreMarca * 0.45) +
          (scoreNombre * 0.30) +
          (scorePeso * 0.25) -
          penalizacion;

        if (scoreFinal > mejorScore) {
          mejorScore = scoreFinal;
          mejor = p;
        }
      });

    // ✔ Mínimo 65 para aceptar coincidencia
    if (!mejor || mejorScore < 65) {
      res[tienda] = { porcentaje: Math.round(mejorScore), precio: null };
    } else {
      res[tienda] = {
        porcentaje: Math.round(mejorScore),
        precio: precioNumeroDesdeProducto(mejor),
        imagen: mejor.image || "/img/placeholder.png",
        link: mejor.link || "#",
        titulo: mejor.title,
        marca: mejor.brand
      };
    }
  });

  return res;
}


// ==========================================
// Cargar marcas en el sidebar
// ==========================================
function cargarMarcasSidebar() {
  const lista = document.getElementById("listaMarcas");
  const marcas = getAvailableBrands();

  if (marcas.length === 0) {
    lista.innerHTML = "<p style='color:#888;font-size:13px;'>Sin marcas disponibles</p>";
    return;
  }

  lista.innerHTML = marcas.map(m => `
    <label>
      <input type="checkbox" class="chkMarca" value="${m}" ${selectedBrands.has(m) ? 'checked' : ''}> 
      ${m}
    </label>
  `).join("");

  //  Agregar event listeners
  document.querySelectorAll(".chkMarca").forEach(cb => {
    cb.addEventListener("change", aplicarFiltroMarcas);
  });
}

function extraerAtributosCriticos(texto) {
  const t = texto.toLowerCase();

  return {
    conPolvos: /con polvos/.test(t),
    sinPolvos: /sin polvos/.test(t),
    vegetal: /vegetal/.test(t),
    oliva: /oliva/.test(t),
    maravilla: /maravilla/.test(t),
    canola: /canola/.test(t),
    entera: /entera/.test(t),
    descremada: /descremada|light|baja en grasa/.test(t)
  };
}
function penalizarDiferenciasAtributos(a, b) {
  let p = 0;

  if (a.conPolvos !== b.conPolvos) p += 25;
  if (a.sinPolvos !== b.sinPolvos) p += 25;

  if (a.vegetal !== b.vegetal) p += 20;
  if (a.oliva !== b.oliva) p += 20;
  if (a.maravilla !== b.maravilla) p += 20;

  if (a.entera !== b.entera) p += 20;
  if (a.descremada !== b.descremada) p += 20;

  return p;
}

// ==========================================
//  Aplicar filtro de marcas
// ==========================================
function aplicarFiltroMarcas() {
  selectedBrands.clear();
  
  document.querySelectorAll(".chkMarca:checked").forEach(cb => {
    selectedBrands.add(cb.value);
  });

  currentPage = 1;
  renderizarProductos(getFilteredProducts());
}
// ==========================================
// 🧠 Detectar si hay productos con peso, volumen o ambos
// ==========================================
function detectarTipoProducto(productos) {
  let tienePeso = false;
  let tieneVolumen = false;

  productos.forEach((p) => {
    const medida = normalizarPesoDesdeTitulo(p.title);
    if (!medida) return;

    if (medida.tipo === "peso") tienePeso = true;
    if (medida.tipo === "volumen") tieneVolumen = true;
  });

  if (tienePeso && tieneVolumen) return "ambos";
  if (tienePeso) return "peso";
  if (tieneVolumen) return "volumen";
  return "ninguno";
}

// ==========================================
//  Renderizar filtros inteligentes
// ==========================================
function renderizarFiltrosPeso(productos) {
  const cont = document.querySelector("#filtros-peso");

  cont.innerHTML = "";

  const pesosVolumen = new Map();
  const pesosPeso = new Map();
  
  productos.forEach((p) => {
    const medida = normalizarPesoDesdeTitulo(p.title);
    if (!medida) return;
    
    if (medida.tipo === "volumen") {
      pesosVolumen.set(medida.valor, medida.unidadOriginal);
    } else if (medida.tipo === "peso") {
      pesosPeso.set(medida.valor, medida.unidadOriginal);
    }
  });

  const tipoProducto = detectarTipoProducto(productos);
  
  if (tipoProducto === "ninguno") {
    cont.innerHTML = "";
    return;
  }
  
  // Mostrar VOLUMEN
  if ((tipoProducto === "volumen" || tipoProducto === "ambos") && pesosVolumen.size > 0) {
    const titulo = document.createElement("h4");
    titulo.textContent = "Filtrar por volumen";
    titulo.className = "filtro-titulo";
    cont.appendChild(titulo);
    
    const ordenados = Array.from(pesosVolumen.keys()).sort((a, b) => a - b);
    ordenados.forEach((valor) => {
      const chip = document.createElement("div");
      chip.className = "chip-filtro";
      chip.dataset.valor = valor;
      chip.dataset.tipo = "volumen";
      
      if (valor >= 1000) {
        chip.textContent = `${(valor / 1000).toFixed(1).replace('.0', '')} L`;
      } else {
        chip.textContent = `${valor} ml`;
      }
      
      const estaSeleccionado = Array.from(selectedWeights).some(
        sw => sw.valor === valor && sw.tipo === "volumen"
      );
      if (estaSeleccionado) {
        chip.classList.add("seleccionado");
      }
      
      chip.onclick = () => toggleFiltro(valor, "volumen");
      cont.appendChild(chip);
    });
  }
  
  // Mostrar PESO
  if ((tipoProducto === "peso" || tipoProducto === "ambos") && pesosPeso.size > 0) {
    const titulo = document.createElement("h4");
    titulo.textContent = "Filtrar por peso";
    titulo.className = "filtro-titulo";
    cont.appendChild(titulo);
    
    const ordenados = Array.from(pesosPeso.keys()).sort((a, b) => a - b);
    ordenados.forEach((valor) => {
      const chip = document.createElement("div");
      chip.className = "chip-filtro";
      chip.dataset.valor = valor;
      chip.dataset.tipo = "peso";
      
      if (valor >= 1000) {
        chip.textContent = `${(valor / 1000).toFixed(1).replace('.0', '')} kg`;
      } else {
        chip.textContent = `${valor} g`;
      }
      
      const estaSeleccionado = Array.from(selectedWeights).some(
        sw => sw.valor === valor && sw.tipo === "peso"
      );
      if (estaSeleccionado) {
        chip.classList.add("seleccionado");
      }
      
      chip.onclick = () => toggleFiltro(valor, "peso");
      cont.appendChild(chip);
    });
  }

  // Boton limpiar al FINAL
  if (pesosVolumen.size > 0 || pesosPeso.size > 0) {
    const limpiar = document.createElement("button");
    limpiar.textContent = "Limpiar todos los filtros";
    limpiar.className = "btn-limpiar-filtro";
    limpiar.onclick = () => {
      selectedWeights.clear();
      currentPage = 1;
      renderizarProductos(getFilteredProducts());
      renderizarFiltrosPeso(productosGlobal);
    };
    cont.appendChild(limpiar);
  }
}
// ==========================================
// Obtener marcas disponibles normalizadas
// ==========================================
function getAvailableBrands() {
  const marcasMap = new Map(); // Usar Map para almacenar marca normalizada → marca original
  
  window.__todosLosProductos.forEach((p) => {
    const marca = p.brand && p.brand.trim() && p.brand !== "null" && p.brand !== "Sin marca" 
      ? p.brand.trim() 
      : null;
    
    if (marca) {
      // Normalizar: primera letra mayúscula, resto minúscula
      const marcaNormalizada = marca.charAt(0).toUpperCase() + marca.slice(1).toLowerCase();
      
      // Si ya existe, mantener la primera aparición (evita duplicados)
      if (!marcasMap.has(marcaNormalizada)) {
        marcasMap.set(marcaNormalizada, marcaNormalizada);
      }
    }
  });

  return Array.from(marcasMap.values()).sort((a, b) => a.localeCompare(b));
}

// ==========================================
//  Toggle filtro (seleccionar/deseleccionar)
// ==========================================
function toggleFiltro(valor, tipo) {
  // Buscar si ya existe
  const filtroExistente = Array.from(selectedWeights).find(
    sw => sw.valor === valor && sw.tipo === tipo
  );
  
  if (filtroExistente) {
    //  Deseleccionar
    selectedWeights.delete(filtroExistente);
  } else {
    //  Seleccionar
    selectedWeights.add({ valor, tipo });
  }
  
  currentPage = 1;
  renderizarProductos(getFilteredProducts());
  renderizarFiltrosPeso(productosGlobal); // Refrescar para actualizar clases "seleccionado"
}

// ==========================================
//  Filtrar productos
// ==========================================
function getFilteredProducts() {
  let lista = [...productosGlobal];

  // 1. Filtrar por supermercado
  if (selectedStores.size > 0 && selectedStores.size < ALL_STORES.length) {
    lista = lista.filter((p) => selectedStores.has((p.store || "").toLowerCase()));
  } else if (selectedStores.size === 0) {
    return [];
  }

  // 2. Filtrar por MARCAS (comparación normalizada)
  if (selectedBrands.size > 0) {
    lista = lista.filter((p) => {
      const marca = p.brand && p.brand.trim() && p.brand !== "null" ? p.brand.trim() : null;
      
      if (!marca) return false;
      
      // Normalizar la marca del producto
      const marcaNormalizada = marca.charAt(0).toUpperCase() + marca.slice(1).toLowerCase();
      
      // Comparar con las marcas seleccionadas (también normalizadas)
      return Array.from(selectedBrands).some(selectedMarca => {
        const selectedNormalizada = selectedMarca.charAt(0).toUpperCase() + selectedMarca.slice(1).toLowerCase();
        return marcaNormalizada === selectedNormalizada;
      });
    });
  }

  // 3. Filtrar por peso/volumen (múltiples valores)
  if (selectedWeights.size > 0) {
    lista = lista.filter((p) => {
      const medida = normalizarPesoDesdeTitulo(p.title);
      if (!medida) return false;
      
      return Array.from(selectedWeights).some(filtro => {
        if (medida.tipo !== filtro.tipo) return false;
        
        const tolerancia = filtro.valor * 0.1;
        return Math.abs(medida.valor - filtro.valor) <= tolerancia;
      });
    });
  }
  
  return lista;
}

// ==========================================
//  Renderizar productos
// ==========================================
function renderizarProductos(lista) {
  const contenedor = document.getElementById("contenedorProductos");
  contenedor.innerHTML = "";

  if (!lista.length) {
    contenedor.innerHTML = "<p>No se encontraron productos.</p>";
    document.getElementById("paginacion").innerHTML = "";
    return;
  }

  // Paginación
  totalPages = Math.ceil(lista.length / pageSize);
  const listaPaginada = lista.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  listaPaginada.forEach((p) => {
    const card = document.createElement("div");
    card.className = "producto-card";

    const tienda = (p.store || "").toLowerCase();
    const colorTienda =
      tienda === "unimarc" ? "#d32f2f" :
      tienda === "tottus" ? "#388e3c" :
      tienda === "jumbo" ? "#00695c" :
      tienda === "acuenta" ? "#f57c00" :
      tienda === "santaisabel" ? "#c2185b" : "#616161";

    const storeLabel = `<span class="store-label" style="background:${colorTienda}">${(p.store || "SIN TIENDA").toUpperCase()}</span>`;
    const marca = p.brand && p.brand.trim() && p.brand !== "null" ? p.brand : "Sin marca";

    let precioNum = 0;
    if (typeof p.currentPrice === "number") precioNum = p.currentPrice;
    else if (typeof p.currentPrice === "string") {
      precioNum = parseFloat(p.currentPrice.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    } else if (p.formattedPrice) {
      const m = p.formattedPrice.match(/([\d\.,]+)/);
      if (m) precioNum = parseFloat(m[1].replace(/\./g, "").replace(",", ".")) || 0;
    }

    card.innerHTML = `
      <div class="store-container">${storeLabel}</div>
      <img src="${p.image || "/img/no-image.png"}" alt="${p.title}" loading="lazy">
      <h3 class="product-title">${p.title}</h3>
      <p class="brand"><strong>${marca}</strong></p>
      <div class="price-box">
        <p class="price-actual">${p.formattedPrice || "$ -"}</p>
        ${p.priceNormal ? `<p class="price-normal">Normal: ${p.priceNormal}</p>` : ""}
        ${p.pricePerUnit ? `<p class="price-unit"><small>${p.pricePerUnit}</small></p>` : ""}
      </div>

      <button class="btn-ver"
        data-id="${p._id || p.id || ""}"
        data-titulo="${p.title || ""}"
        data-marca="${p.brand || ""}"
        data-precio="${precioNum}"
        data-supermercado="${tienda}"
        data-link="${p.link || ""}"
        data-imagen="${p.image || ""}"
        onclick="registrarClickProducto(this)">
        Ver producto
      </button>

          <button class="btn-carrito"
            data-id="${p._id || p.id || ""}"
            data-titulo="${p.title || ""}"
            data-marca="${marca || ""}"
            data-precio="${precioNum}"
            data-supermercado="${tienda}"
            data-link="${p.link || ""}"
            data-imagen="${p.image || ""}"
            onclick="agregarAlCarrito(this)">
            🧮 Cotizar
          </button>



      <div class="botones-extra">
        <button class="btn-secundario"
          onclick="verHistorico('${p._id}', '${p.title}', '${p.brand}', '${p.image}', '${p.store}')">
          Histórico
        </button>
      </div>
    `;

    contenedor.appendChild(card);
  });

  renderizarPaginacion();
}

// ==========================================
//  Renderizar paginación
// ==========================================
function renderizarPaginacion() {
  const cont = document.getElementById("paginacion");
  if (!cont) return;

  cont.innerHTML = "";

  if (totalPages <= 1) return;

  let html = `<div class="paginacion-container">`;

  html += `
    <button class="btn-pag" onclick="cambiarPagina(currentPage - 1)" 
      ${currentPage === 1 ? "disabled" : ""}>
      ⟵ Anterior
    </button>
  `;

  const paginas = [];
  paginas.push(1, 2, 3);
  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
    if (i > 3 && i < totalPages - 2) paginas.push(i);
  }
  paginas.push(totalPages - 2, totalPages - 1, totalPages);

  const paginasFiltradas = [...new Set(paginas.filter(n => n >= 1 && n <= totalPages))];

  let ultima = 0;
  paginasFiltradas.forEach((p) => {
    if (p !== ultima + 1) html += `<span class="puntos">…</span>`;
    html += `<button class="btn-pag ${p === currentPage ? "activo" : ""}" onclick="cambiarPagina(${p})">${p}</button>`;
    ultima = p;
  });

  html += `
    <button class="btn-pag" onclick="cambiarPagina(currentPage + 1)" 
      ${currentPage === totalPages ? "disabled" : ""}>
      Siguiente ⟶
    </button>
  `;

  html += `</div>`;
  cont.innerHTML = html;
}

function cambiarPagina(nuevaPagina) {
  if (nuevaPagina < 1 || nuevaPagina > totalPages) return;
  currentPage = nuevaPagina;
  renderizarProductos(getFilteredProducts());
  window.scrollTo({ top: 0, behavior: "smooth" });
}
// ===============================
// 🛒 CARRITO COTIZADOR - CORE
// ===============================

// Guarda en localStorage
function guardarCarritoEnStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_CARRITO, JSON.stringify(carritoCotizador));
  } catch (e) {
    console.warn("No se pudo guardar el carrito en localStorage", e);
  }
}
// ❌ Cerrar Modal sin vaciar
function cerrarModalVaciar() {
  document.getElementById("modalVaciarCarrito").style.display = "none";
}

function confirmarVaciarCarrito() {
  carritoCotizador = [];
  guardarCarritoEnStorage();
  renderCarritoCotizador();
  cerrarModalVaciar();
  mostrarToast("Carrito limpiado (cotizaciones guardadas)");
}

// Carga desde localStorage
function cargarCarritoDesdeStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CARRITO);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      carritoCotizador = data;
      renderCarritoCotizador();
    }
  } catch (e) {
    console.warn("No se pudo leer el carrito desde localStorage", e);
  }
}

// Llamamos al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  cargarCarritoDesdeStorage();
});

// Agregar producto al carrito (desde el botón en la tarjeta)
async function agregarAlCarrito(btn) {
  const producto = {
    idProducto: btn.getAttribute("data-id"),
    titulo: btn.getAttribute("data-titulo"),
    marca: btn.getAttribute("data-marca"),
    precio: parseFloat(btn.getAttribute("data-precio")),
    supermercado: (btn.getAttribute("data-supermercado") || "").toLowerCase(),
    imagen: btn.getAttribute("data-imagen"),
    link: btn.getAttribute("data-link")
  };

  // 1️⃣ Buscar si YA existe en el carrito (mismo nombre y marca)
  const existente = carritoCotizador.find(
    i => i.titulo === producto.titulo && i.marca === producto.marca
  );

  if (existente) {
    existente.cantidad += 1;
    guardarCarritoEnStorage();
    renderCarritoCotizador();

    // Guardar cotización actualizada en el servidor
    guardarCotizacionEnServidor().catch(err =>
      console.warn("No se pudo guardar cotización:", err)
    );

    return;
  }

  // 2️⃣ Si es nuevo, buscar similares
  const similares = encontrarSimilaresEnTodasLasTiendas(producto);

  // 3️⃣ Crear registro nuevo en el carrito
  const item = {
    uid: `${producto.idProducto || producto.titulo}`,
    titulo: producto.titulo,
    marca: producto.marca,
    cantidad: 1,
    pesoTexto: (typeof normalizarPesoDesdeTitulo === "function"
      ? pesoToText(normalizarPesoDesdeTitulo(producto.titulo))
      : ""),
    imagen: producto.imagen,
    link: producto.link,
    similares
  };

  carritoCotizador.push(item);
  guardarCarritoEnStorage();
  renderCarritoCotizador();

  // Guardar cotización completa en el servidor
  guardarCotizacionEnServidor().catch(err =>
    console.warn("No se pudo guardar cotización:", err)
  );
}
let ultimaCotizacionJSON = "";

async function guardarCotizacionEnServidor() {
  const json = JSON.stringify(carritoCotizador);
  if (json === ultimaCotizacionJSON) return; // ⚠ Evita guardar duplicado

  ultimaCotizacionJSON = json;

  try {
    await fetch("/api/cotizaciones/guardar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ carrito: carritoCotizador })
    });
  } catch (e) {
    console.warn("⚠ No se pudo guardar la cotización:", e);
  }
}


// Eliminar un item por uid
function eliminarDelCarrito(uid) {
  carritoCotizador = carritoCotizador.filter(i => i.uid !== uid);
  guardarCarritoEnStorage();
  renderCarritoCotizador();
}

// Vaciar carrito completo
function vaciarCarrito() {
  if (!carritoCotizador.length) return;
  if (!confirm("¿Seguro que deseas vaciar toda la cotización?")) return;
  carritoCotizador = [];
  guardarCarritoEnStorage();
  renderCarritoCotizador();
}
function mostrarModalVaciar() {
  if (!carritoCotizador.length) return;
  document.getElementById("modalVaciarCarrito").style.display = "flex";
}
function mostrarModalVaciar() {
  document.getElementById("modalVaciarCarrito").style.display = "flex";
}

function cerrarModalVaciar() {
  document.getElementById("modalVaciarCarrito").style.display = "none";
}

function confirmarVaciarCarrito() {
  carritoCotizador = [];
  guardarCarritoEnStorage();
  renderCarritoCotizador();
  cerrarModalVaciar();
  mostrarToast("Cotización vaciada");
}
function mostrarToast(msg) {
  const toast = document.getElementById("toast-notificacion");
  toast.textContent = msg;
  toast.classList.add("mostrar");
  setTimeout(() => toast.classList.remove("mostrar"), 2200);
}
// Renderizar el carrito completo
function renderCarritoCotizador() {
  const cont = document.getElementById("carritoRapidoContenido");
  const panel = document.getElementById("carritoRapidoPanel");
  if (!cont || !panel) return;

  if (!carritoCotizador.length) {
    cont.innerHTML = `
      <p>🧮 Aún no has agregado productos.</p>
      <p style="font-size:12px;color:#64748b;">
        Usa el botón <strong>"Cotizar"</strong> en las tarjetas para comparar precios entre supermercados.
      </p>`;
    return;
  }

  let html = "";
  const totalesPorTienda = {};
  TIENDAS_COMPARACION.forEach(t => totalesPorTienda[t] = 0);

  carritoCotizador.forEach(item => {
    const qty = item.cantidad || 1;

    html += `
      <div class="carrito-item">
        <div class="carrito-item-header">
          <img src="${item.imagen || "/img/placeholder.png"}" alt="Producto" class="carrito-img" onerror="this.src='/img/placeholder.png'">
          <div class="carrito-info">
            <div class="carrito-titulo" title="${item.titulo}">
              ${item.titulo} <span style="color:#007bff;">x${qty}</span>
            </div>
            <div class="carrito-detalle">
              ${item.marca ? `<strong>${item.marca}</strong>` : "Sin marca"}
              ${item.pesoTexto ? " • " + item.pesoTexto : ""}
            </div>
          </div>
          <button class="carrito-eliminar" onclick="eliminarDelCarrito('${item.uid}')">✖</button>
        </div>
        <div class="carrito-precios">
    `;

    // Precios por tienda
    TIENDAS_COMPARACION.forEach(t => {
      const det = item.similares && item.similares[t];
      if (!det || typeof det.precio !== "number") return;

      const precioTotalItem = det.precio * qty;
      totalesPorTienda[t] += precioTotalItem;

      const nombreTienda =
        t === "unimarc" ? "Unimarc" :
        t === "tottus" ? "Tottus" :
        t === "jumbo" ? "Jumbo" :
        t === "acuenta" ? "Acuenta" :
        t === "santaisabel" ? "Santa Isabel" : t;

      // Mostrar similitud baja
      if (det.porcentaje < 80) {
        html += `
          <div class="carrito-precio-tienda" style="color:#b91c1c;font-size:12px;">
            <span>${nombreTienda}</span>
            <span>❗ Sin coincidencia compatible</span>
          </div>
        `;
      } else {
        html += `
          <div class="carrito-precio-tienda">
            <span>
              <img src="${det.imagen}" style="width:18px;height:18px;border-radius:4px;vertical-align:middle;margin-right:4px;" onerror="this.src='/img/placeholder.png'">
              <a href="${det.link}" target="_blank" style="text-decoration:none;color:#0ea5e9;">
                ${nombreTienda}
              </a>
            </span>
            <span>${formatearCLP(det.precio)} c/u</span>
          </div>
        `;
      }
    });

    html += `
        </div>
      </div>
    `;
  });

  // Totales por supermercado
  let totalGeneral = 0;
  let htmlTotales = `
    <div class="carrito-totales">
      <h4>Totales por supermercado</h4>
  `;

  // Detectar el más barato
  let minPrecio = Infinity;
  let mejorSuper = null;

  TIENDAS_COMPARACION.forEach(t => {
    const totalT = totalesPorTienda[t] || 0;
    if (totalT <= 0) return;
    if (totalT < minPrecio) {
      minPrecio = totalT;
      mejorSuper = t;
    }
  });

  TIENDAS_COMPARACION.forEach(t => {
    const totalT = totalesPorTienda[t] || 0;
    if (totalT <= 0) return;

    const nombreTienda =
      t === "unimarc" ? "Unimarc" :
      t === "tottus" ? "Tottus" :
      t === "jumbo" ? "Jumbo" :
      t === "acuenta" ? "Acuenta" :
      t === "santaisabel" ? "Santa Isabel" : t;

    totalGeneral += totalT;

    htmlTotales += `
      <div class="carrito-total-linea" style="${t === mejorSuper ? "background:#dcfce7;font-weight:700;border-radius:6px;" : ""}">
        <span>${nombreTienda}${t === mejorSuper ? " 🏆" : ""}</span>
        <span>${formatearCLP(totalT)}</span>
      </div>
    `;
  });

  htmlTotales += `
      <div class="carrito-total-general">
        <span>Total 5 supermercados</span>
        <span>${formatearCLP(totalGeneral)}</span>
      </div>
    </div>
  `;

  html += htmlTotales;
// ==============================
// ⚠ DETECTAR SUPERMERCADOS INCOMPLETOS
// ==============================
let alertasFaltantes = {};

TIENDAS_COMPARACION.forEach(tienda => {
  alertasFaltantes[tienda] = [];
});

carritoCotizador.forEach(item => {
  const qty = item.cantidad || 1;
  TIENDAS_COMPARACION.forEach(tienda => {
    const det = item.similares && item.similares[tienda];
    if (!det || det.porcentaje < 80) {
      alertasFaltantes[tienda].push(item.titulo);
    }
  });
});

// Construir mensaje de alerta
let mensajeAdvertencia = "";
let supermercadosAfectados = Object.keys(alertasFaltantes).filter(t => alertasFaltantes[t].length > 0);

if (supermercadosAfectados.length > 0) {
  mensajeAdvertencia += `
  <div class="alerta-carrito">
    ⚠ Algunos supermercados no tienen todos los productos comparables.
    <br><small style="color:#475569;">El total podría no reflejar una compra completa.</small>
  </div>
  `;
}

cont.innerHTML = html + mensajeAdvertencia;

}

// ==========================================
//  Cargar productos (filtro solo si se busca)
// ==========================================
async function cargarProductos(busqueda = "") {
  try {
    const res = await fetch(`/api/catalogo?q=${encodeURIComponent(busqueda)}`);
    const productos = await res.json();
    productosGlobal = productos;
    window.registrarProductosGlobales(productos);
    selectedWeights.clear();
    selectedBrands.clear(); // Limpiar filtros de marcas
    currentPage = 1;
    
    renderizarProductos(getFilteredProducts());
    cargarMarcasSidebar(); // Actualizar marcas dinámicamente

    const huboBusqueda = busqueda.trim() !== "";
    const contFiltros = document.querySelector("#filtros-peso");
      if (huboBusqueda) {
        const cont = document.querySelector("#filtros-peso");
        cont.innerHTML = "";                     // ← limpia cualquier filtro anterior
        renderizarFiltrosPeso(productos);        // ← pinta solo el del nuevo producto
        filtrosPesoVisibles = true;
      }

  } catch (err) {
    console.error("Error cargando productos:", err);
  }
}


// ==========================================
//  Registrar clic en producto
// ==========================================
async function registrarClickProducto(btn) {
  let precioRaw = btn.getAttribute("data-precio") || "";
  let precioFinal = 0;

  if (precioRaw) {
    if (!isNaN(precioRaw)) precioFinal = parseFloat(precioRaw);
    else {
      const match = precioRaw.match(/([\d\.,]+)/);
      if (match) precioFinal = parseFloat(match[1].replace(/\./g, "").replace(",", ".")) || 0;
    }
  }

  const producto = {
    idProducto: btn.getAttribute("data-id"),
    titulo: btn.getAttribute("data-titulo"),
    marca: btn.getAttribute("data-marca"),
    precio: precioFinal,
    supermercado: btn.getAttribute("data-supermercado"),
    link: btn.getAttribute("data-link"),
    imagen: btn.getAttribute("data-imagen"),
  };

  try {
    const res = await fetch("/api/clicks/registrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ producto }),
      credentials: "include",
    });
    const data = await res.json();
    console.log(" Click guardado:", data.msg);
  } catch (error) {
    console.error(" Error registrando clic:", error);
  }

  window.open(producto.link, "_blank");
}

function verHistorico(id, titulo, marca, imagen, tienda) {
  const params = new URLSearchParams({ id, titulo, marca, imagen, tienda });
  window.location.href = `/historico?${params.toString()}`;
}

// Búsqueda y sugerencias
const inputBusqueda = document.getElementById("busqueda");
const contenedorSugerencias = document.getElementById("sugerencias");
let sugerenciasTimeout = null;

if (inputBusqueda && contenedorSugerencias) {
  inputBusqueda.addEventListener("input", () => {
    const texto = inputBusqueda.value.trim();
    if (!texto) {
      contenedorSugerencias.innerHTML = "";
      contenedorSugerencias.style.display = "none";
      return;
    }
    if (texto.length < 3) {
      contenedorSugerencias.innerHTML = "<div class='sin-sugerencias'>Escribe al menos 3 caracteres…</div>";
      contenedorSugerencias.style.display = "block";
      return;
    }

    clearTimeout(sugerenciasTimeout);
    sugerenciasTimeout = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/productos/sugerencias?q=${encodeURIComponent(texto)}`);
        if (!resp.ok) throw new Error("Error al obtener sugerencias");
        const sugerencias = await resp.json();

        if (!sugerencias.length) {
          contenedorSugerencias.innerHTML = "<div class='sin-sugerencias'>Sin resultados</div>";
          contenedorSugerencias.style.display = "block";
          return;
        }

        contenedorSugerencias.innerHTML = sugerencias
          .map((s) => `<div class="item-sugerencia" onclick="seleccionarSugerencia('${s.replace(/'/g, "\\'").replace(/"/g, "&quot;")}')">${s}</div>`)
          .join("");
        contenedorSugerencias.style.display = "block";
      } catch (err) {
        console.error(" Error sugerencias:", err);
        contenedorSugerencias.style.display = "none";
      }
    }, 300);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".buscador")) {
      contenedorSugerencias.innerHTML = "";
      contenedorSugerencias.style.display = "none";
    }
  });
}

function seleccionarSugerencia(valor) {
  inputBusqueda.value = valor;
  contenedorSugerencias.innerHTML = "";
  contenedorSugerencias.style.display = "none";
  buscar();
}

async function buscar() {
  const termino = inputBusqueda.value.trim();
  if (termino.length < 3) {
    alert("Escribe al menos 3 caracteres para buscar.");
    return;
  }

  try {
    await fetch("/api/busquedas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termino }),
    });
  } catch (e) {
    console.warn(" No se pudo registrar la búsqueda:", e.message);
  }

  await cargarProductos(termino);
  contenedorSugerencias.innerHTML = "";
  contenedorSugerencias.style.display = "none";
}

function leerCheckboxesSuper() {
  const cbs = document.querySelectorAll(".filtro-super");
  selectedStores = new Set(
    Array.from(cbs)
      .filter((c) => c.checked)
      .map((c) => c.value.toLowerCase())
  );
}

function aplicarFiltroSupermercado() {
  leerCheckboxesSuper();
  currentPage = 1;
  renderizarProductos(getFilteredProducts());
}

function wireSuperCheckboxes() {
  const cbs = document.querySelectorAll(".filtro-super");
  cbs.forEach((cb) => cb.addEventListener("change", aplicarFiltroSupermercado));
}

window.addEventListener("DOMContentLoaded", () => {
  wireSuperCheckboxes();
  cargarProductos();
});

// ==========================================
//  Buscador LOCAL dentro de marcas
// ==========================================
const inputBuscarMarca = document.getElementById("filtroMarcasBuscar");
if (inputBuscarMarca) {
  inputBuscarMarca.addEventListener("keyup", () => {
    const filtro = inputBuscarMarca.value.toLowerCase();
    document.querySelectorAll("#listaMarcas label").forEach(el => {
      const textoMarca = el.textContent.toLowerCase();
      el.style.display = textoMarca.includes(filtro) ? "flex" : "none";
    });
  });
}
