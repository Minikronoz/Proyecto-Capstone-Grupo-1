// =============================================================
// 🛒 Catálogo de Productos — Versión con filtros inteligentes
// =============================================================

let productosGlobal = [];
let selectedWeights = new Set(); // ✅ Cambiar a Set para múltiples valores
let filtrosPesoVisibles = false;
const ALL_STORES = ["unimarc", "tottus", "jumbo", "acuenta", "santaisabel"];
let selectedStores = new Set(ALL_STORES);

let currentPage = 1;
let pageSize = 200;
let totalPages = 1;

// ==========================================
// 🔢 Normalizar peso/volumen desde título
// ==========================================
function normalizarPesoDesdeTitulo(title) {
  if (!title) return null;
  
  // 🔥 Detectar VOLUMEN (litros, ml, cc)
  const matchVolumen = title.match(/(\d+(?:[\.,]\d+)?)\s*(l|ml|cc)\b/i);
  if (matchVolumen) {
    let valor = parseFloat(matchVolumen[1].replace(",", "."));
    const unidad = matchVolumen[2].toLowerCase();
    
    // Convertir todo a mililitros
    if (unidad === "l") valor *= 1000;
    
    return { valor: Math.round(valor), tipo: "volumen", unidadOriginal: unidad };
  }
  
  // 🔥 Detectar PESO (gramos, kg)
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
// 🎯 Detectar tipo de producto predominante
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
// 🏷️ Renderizar filtros inteligentes
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
      cargarMarcasSidebar();
    };
    cont.appendChild(limpiar);
  }
}

// ==========================================
// 🔄 Toggle filtro (seleccionar/deseleccionar)
// ==========================================
function toggleFiltro(valor, tipo) {
  // Buscar si ya existe
  const filtroExistente = Array.from(selectedWeights).find(
    sw => sw.valor === valor && sw.tipo === tipo
  );
  
  if (filtroExistente) {
    // ❌ Deseleccionar
    selectedWeights.delete(filtroExistente);
  } else {
    // ✅ Seleccionar
    selectedWeights.add({ valor, tipo });
  }
  
  currentPage = 1;
  renderizarProductos(getFilteredProducts());
  renderizarFiltrosPeso(productosGlobal); 
  cargarMarcasSidebar(); // 🟢 ACTUALIZA MARCAS SEGÚN PESO// Refrescar para actualizar clases "seleccionado"
}

// ==========================================
// 🎯 Filtrar productos
// ==========================================
function getFilteredProducts() {
  let lista = [...productosGlobal];

  // 🛒 Filtrar por supermercado (CORREGIDO)
  if (selectedStores.size > 0 && selectedStores.size < ALL_STORES.length) {
    lista = lista.filter((p) => {
      const tienda = (p.store || "").toLowerCase().trim();
      return selectedStores.has(tienda);
    });
  }
  // ❌ NO devolver [], sino mostrar todo si no hay filtros.
  // Antes lo bloqueabas aquí.

  // 🔥 Filtrar por peso/volumen (múltiples valores)
  if (selectedWeights.size > 0) {
    lista = lista.filter((p) => {
      const medida = normalizarPesoDesdeTitulo(p.title);
      if (!medida) return false;
      
      // Verificar si el producto coincide con ALGUNO de los filtros seleccionados
      return Array.from(selectedWeights).some(filtro => {
        if (medida.tipo !== filtro.tipo) return false;
        
        // Tolerancia de ±10%
        const tolerancia = filtro.valor * 0.1;
        return Math.abs(medida.valor - filtro.valor) <= tolerancia;
      });
    });
  }
  
  return lista;
}

// ==========================================
// 🏷️ Obtener marcas disponibles según filtros actuales
// ==========================================
function getAvailableBrands() {
  const productosFiltrados = getFilteredProducts();

  const marcas = new Set();
  productosFiltrados.forEach(p => {
    if (p.brand && p.brand !== "null" && p.brand !== "") {
      marcas.add(p.brand.trim());
    }
  });

  return [...marcas].sort();
}


// 🧽 Limpia el precio y deja solo el primero que aparezca (evita $14450$16990)
function limpiarPrecioFormulario(precio = "") {
  if (!precio) return null;
  let txt = precio.toString().replace(/\s+/g, "");
  const m = txt.match(/\$[\d\.]+/);
  return m ? m[0] : precio;
}


// 🔢 Extrae solo números para comparar precios correctamente
function extraerNumero(precio = "") {
  if (!precio) return null;
  return parseInt(precio.toString().replace(/\D/g, ""), 10);
}


// 🧽 Limpia un precio y lo convierte a número
function parsePrecio(valor) {
  if (!valor) return null;
  if (typeof valor === "number") return valor;

  let txt = valor.toString().trim();

  // Detecta formato tipo: "2 x $2.200" o "3x$4.500"
  const promo = txt.match(/(\d+)\s*x\s*\$?\s*([\d\.,]+)/i);
  if (promo) {
    const cantidad = parseFloat(promo[1]);
    const precioTotal = parseFloat(promo[2].replace(/[^\d.,]/g, "").replace(",", "."));
    return cantidad > 0 ? Math.round(precioTotal / cantidad) : precioTotal;
  }

  // Limpieza general para precios normales
  const limpio = txt.replace(/[^\d.,]/g, "").replace(",", ".");
  return parseFloat(limpio) || null;
}

// 🧼 Limpia solo para mostrar en HTML (sin cambiar valor numérico)
function limpiarPrecioMostrar(valor) {
  if (!valor) return "$ -";
  return valor.toString().replace(/\s+/g, "").replace("$", "$");
}

// ==========================================
// 🎨 Renderizar productos
// ==========================================
function renderizarProductos(lista) {
  const contenedor = document.getElementById("contenedorProductos");
  contenedor.innerHTML = "";

  if (!lista.length) {
    contenedor.innerHTML = "<p>No se encontraron productos.</p>";
    document.getElementById("paginacion").innerHTML = "";
    return;
  }

  // 📌 Paginación
  totalPages = Math.ceil(lista.length / pageSize);
  const listaPaginada = lista.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  listaPaginada.forEach((p) => {
    const card = document.createElement("div");
    card.className = "producto-card";

    // 🎨 Color del supermercado (NORMALIZADO: trim + lowercase)
    const tienda = (p.store || "").toLowerCase().trim();
    const colorTienda =
      tienda === "unimarc" ? "#d32f2f" :
      tienda === "tottus" ? "#388e3c" :
      tienda === "jumbo" ? "#00695c" :
      tienda === "acuenta" ? "#f57c00" :
      tienda === "santaisabel" ? "#c2185b" : "#616161";

    const storeLabel = `<span class="store-label" style="background:${colorTienda}">${(p.store || "SIN TIENDA").toUpperCase().trim()}</span>`;

    // 🏷️ Marca
    const marca = p.brand && p.brand.trim() && p.brand !== "null" ? p.brand : "Sin marca";

    // 🧮 Calcular precios
    const precioActualNum = parsePrecio(p.formattedPrice);
    const precioNormalNum = parsePrecio(p.priceNormal);

    // 📌 Precio numérico final para carrito/clic
    let precioNum = 0;
    if (typeof p.currentPrice === "number") {
      precioNum = p.currentPrice;
    } else if (typeof p.currentPrice === "string") {
      precioNum = parseFloat(p.currentPrice.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    } else {
      precioNum = precioActualNum ?? 0;
    }

    // 👁️ Solo mostramos el precio normal si es mayor que el actual
    const mostrarPrecioNormal =
      precioNormalNum &&
      limpiarPrecioMostrar(p.priceNormal) !== limpiarPrecioMostrar(p.formattedPrice) &&
      (!precioActualNum || precioNormalNum > precioActualNum);

    // 🖼️ Render de la tarjeta
    card.innerHTML = `
      <div class="store-container">${storeLabel}</div>
      <img src="${p.image || "/img/no-image.png"}" alt="${p.title}" loading="lazy">
      <h3 class="product-title">${p.title}</h3>
      <p class="brand"><strong>${marca}</strong></p>

      <div class="price-box">
        <p class="price-actual">${limpiarPrecioMostrar(p.formattedPrice) || "$ -"}</p>

        ${mostrarPrecioNormal ? `
          <p class="price-normal"><span class="tachado">${limpiarPrecioMostrar(p.priceNormal)}</span></p>
        ` : ""}

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
        🛒 Agregar al carrito
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




async function cargarMarcas() {
  const texto = document.getElementById("busqueda").value.trim();
  const tiendas = Array.from(selectedStores).join(",");
  // Serializa los filtros de peso/volumen seleccionados (ej: "volumen:1000,peso:500")
  const pesoSeleccionado = serializeSelectedWeights();

  const res = await fetch(`/api/productos/marcas?q=${texto}&tiendas=${tiendas}&peso=${pesoSeleccionado}`);
  const data = await res.json();

  const lista = document.getElementById("listaMarcas");

  if (!data.ok || !data.marcas.length) {
    lista.innerHTML = "<p style='font-size:13px;color:#777;'>Sin marcas disponibles</p>";
    return;
  }

  lista.innerHTML = data.marcas.map(m => `
    <label><input type="checkbox" class="chkMarca" value="${m}"> ${m}</label>
  `).join("");
const totalMarcas = data.marcas.length;
const sidebar = document.querySelector(".sidebar-marcas");

if (totalMarcas <= 5) {
  sidebar.classList.add("pocas-marcas");
} else {
  sidebar.classList.remove("pocas-marcas");
}

  document.querySelectorAll(".chkMarca").forEach(cb => {
    cb.addEventListener("change", () => cargarProductos(texto));
  });
}


// Buscar dentro del filtro lateral
document.addEventListener("input", (e) => {
  if (e.target.id === "filtroMarcasBuscar") cargarMarcas();
});

// Recargar productos al seleccionar marcas
document.addEventListener("change", (e) => {
  if (e.target.classList.contains("chkMarca")) {
    currentPage = 1;
    cargarProductos(document.getElementById("busqueda").value.trim());
  }
});

function obtenerMarcasSeleccionadas() {
  return [...document.querySelectorAll(".chkMarca:checked")].map(el => el.value);
}
// Serializa los filtros de peso/volumen seleccionados (ej: "volumen:1000,peso:500")
function serializeSelectedWeights() {
  if (!selectedWeights || selectedWeights.size === 0) return "";
  try {
    return Array.from(selectedWeights)
      .map(sw => `${sw.tipo}:${sw.valor}`)
      .join(",");
  } catch (e) {
    return "";
  }
}

// Función auxiliar que recarga las marcas del sidebar. Antes estaba siendo
// invocada pero no definida, lo que rompía el flujo.
function cargarMarcasSidebar() {
  cargarMarcas();
}

document.addEventListener("click", (e) => {
  const drop = document.getElementById("dropdownMarcas");
  const btn = document.getElementById("btnMarcas");
  if (drop && !drop.contains(e.target) && !btn.contains(e.target)) {
    drop.classList.add("oculto");
  }
});


// ==========================================
// 📄 Renderizar paginación
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

async function cargarProductos(busqueda = "") {
  try {
    let url = `/api/catalogo?q=${encodeURIComponent(busqueda)}`;

    const marcas = obtenerMarcasSeleccionadas();
    if (marcas.length) url += `&marcas=${marcas.join(",")}`;

    const res = await fetch(url);
    const productos = await res.json();

    productosGlobal = productos || [];

    selectedWeights.clear();
    currentPage = 1;

    renderizarProductos(getFilteredProducts());

    const huboBusqueda = busqueda.trim() !== "";
    if (huboBusqueda) {
      renderizarFiltrosPeso(productosGlobal);
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
// 🖱️ Registrar clic en producto
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
    console.log("✅ Click guardado:", data.msg);
  } catch (error) {
    console.error("❌ Error registrando clic:", error);
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
        console.error("❌ Error sugerencias:", err);
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
    console.warn("⚠️ No se pudo registrar la búsqueda:", e.message);
  }

  await cargarProductos(termino);
  cargarMarcasSidebar();  // 👈 NUEVO: recargar SOLO marcas que existan en este resultado

  contenedorSugerencias.innerHTML = "";
  contenedorSugerencias.style.display = "none";
}



function leerCheckboxesSuper() {
  const cbs = document.querySelectorAll(".filtro-super");
  selectedStores = new Set(
    Array.from(cbs)
      .filter(c => c.checked)
      .map(c => c.value.toLowerCase().trim())
  );
}


function aplicarFiltroSupermercado() {
  leerCheckboxesSuper();
  currentPage = 1;
  renderizarProductos(getFilteredProducts());
  cargarMarcasSidebar(); // 🟢 ACTUALIZA
}


function wireSuperCheckboxes() {
  const cbs = document.querySelectorAll(".filtro-super");
  cbs.forEach((cb) => cb.addEventListener("change", aplicarFiltroSupermercado));
}

window.addEventListener("DOMContentLoaded", () => {
  wireSuperCheckboxes();
  cargarProductos();

  const btnMarcas = document.getElementById("btnMarcas");
  if (btnMarcas) btnMarcas.addEventListener("click", cargarMarcas);
});

