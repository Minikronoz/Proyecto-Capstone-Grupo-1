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

// ==========================================
//  Normalizar peso/volumen desde título
// ==========================================
function normalizarPesoDesdeTitulo(title) {
  if (!title) return null;
  
  //  Detectar VOLUMEN (litros, ml, cc)
  const matchVolumen = title.match(/(\d+(?:[\.,]\d+)?)\s*(l|ml|cc)\b/i);
  if (matchVolumen) {
    let valor = parseFloat(matchVolumen[1].replace(",", "."));
    const unidad = matchVolumen[2].toLowerCase();
    
    // Convertir todo a mililitros
    if (unidad === "l") valor *= 1000;
    
    return { valor: Math.round(valor), tipo: "volumen", unidadOriginal: unidad };
  }
  
  //  Detectar PESO (gramos, kg)
  const matchPeso = title.match(/(\d+(?:[\.,]\d+)?)\s*(g|kg)\b/i);
  if (matchPeso) {
    let valor = parseFloat(matchPeso[1].replace(",", "."));
    const unidad = matchPeso[2].toLowerCase();
    
    // Convertir todo a gramos
    if (unidad === "kg") valor *= 1000;
    
    if (valor < 50 || valor > 50000) return null;
    return { valor: Math.round(valor), tipo: "peso", unidadOriginal: unidad };
  }
  
  return null;
}

// ==========================================
//  Detectar tipo de producto predominante
// ==========================================
function detectarTipoProducto(productos) {
  let volumen = 0;
  let peso = 0;
  
  productos.forEach((p) => {
    const medida = normalizarPesoDesdeTitulo(p.title);
    if (medida) {
      if (medida.tipo === "volumen") volumen++;
      else if (medida.tipo === "peso") peso++;
    }
  });
  
  // Si hay más productos con volumen, priorizar volumen
  if (volumen > peso) return "volumen";
  if (peso > volumen) return "peso";
  
  // Si no hay ninguno, no mostrar filtros
  if (volumen === 0 && peso === 0) return "ninguno";
  
  return "ambos";
}

// ==========================================
// Obtener marcas disponibles normalizadas
// ==========================================
function getAvailableBrands() {
  const marcasMap = new Map(); // Usar Map para almacenar marca normalizada → marca original
  
  productosGlobal.forEach((p) => {
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
//  Renderizar filtros inteligentes
// ==========================================
function renderizarFiltrosPeso(productos) {
  const cont = document.querySelector(".filtros-peso");
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
        data-nombre="${p.title || ""}"
        data-precio="${precioNum}"
        data-imagen="${p.image || ""}"
        data-url="${p.link || ""}"
        data-supermercado="${tienda}"
        onclick="agregarDesdeBoton(this)">
         Agregar al carrito
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

// ==========================================
//  Cargar productos
// ==========================================
async function cargarProductos(busqueda = "") {
  try {
    const res = await fetch(`/api/catalogo?q=${encodeURIComponent(busqueda)}`);
    const productos = await res.json();
    productosGlobal = productos;

    selectedWeights.clear();
    selectedBrands.clear(); //  Limpiar filtros de marcas
    currentPage = 1;
    
    renderizarProductos(getFilteredProducts());
    cargarMarcasSidebar(); //  Actualizar sidebar de marcas

    const huboBusqueda = busqueda.trim() !== "";
    if (huboBusqueda) {
      renderizarFiltrosPeso(productos);
      filtrosPesoVisibles = true;
    } else if (filtrosPesoVisibles) {
      document.querySelector(".filtros-peso").innerHTML = "";
      filtrosPesoVisibles = false;
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
