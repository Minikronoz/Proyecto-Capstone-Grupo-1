// =============================================================
// 🛒 Catálogo de Productos — Versión limpia para Atlas
// =============================================================

let productosGlobal = [];
let selectedWeight = null;
let filtrosPesoVisibles = false;
const ALL_STORES = ["unimarc", "tottus", "jumbo", "acuenta","santaisabel"];
let selectedStores = new Set(ALL_STORES);

let currentPage = 1;
let pageSize = 200; // 👉 Aquí defines cuántos productos por página
let totalPages = 1;


// ---------- Utils ----------
function normalizarPesoDesdeTitulo(title) {
  if (!title) return null;
  const m = title.match(/(\d+(?:[\.,]\d+)?)(\s?)(g|kg)\b/i);
  if (!m) return null;
  let valor = parseFloat(m[1].replace(",", "."));
  const unidad = m[3].toLowerCase();
  if (unidad === "kg") valor *= 1000;
  if (valor < 50 || valor > 50000) return null;
  return Math.round(valor);
}

function getFilteredProducts() {
  let lista = [...productosGlobal];

  if (selectedStores.size > 0 && selectedStores.size < ALL_STORES.length) {
    lista = lista.filter((p) => selectedStores.has((p.store || "").toLowerCase()));
  } else if (selectedStores.size === 0) {
    return [];
  }

  if (selectedWeight !== null) {
    lista = lista.filter((p) => {
      const w = normalizarPesoDesdeTitulo(p.title);
      return w !== null && Math.abs(w - selectedWeight) < 10;
    });
  }
  return lista;
}


function paginar(lista, page, size) {
  const start = (page - 1) * size;
  return lista.slice(start, start + size);
}

function renderizarProductos(lista) {
  const contenedor = document.getElementById("contenedorProductos");
  contenedor.innerHTML = "";

  if (!lista.length) {
    contenedor.innerHTML = "<p>No se encontraron productos.</p>";
    return;
  }

// 🔥 aplicar paginación
const listaPaginada = paginar(lista, currentPage, pageSize);

// actualizar total de páginas
totalPages = Math.ceil(lista.length / pageSize);

listaPaginada.forEach((p) => {
  const card = document.createElement("div");
  card.className = "producto-card";

  // ==========================================
  // 🎨 COLOR DE TIENDA + Soporte Santa Isabel
  // ==========================================
  const tienda = (p.store || "").toLowerCase();

  const colorTienda =
    tienda === "unimarc"
      ? "#d32f2f"
      : tienda === "tottus"
      ? "#388e3c"
      : tienda === "jumbo"
      ? "#00695c"
      : tienda === "acuenta"
      ? "#f57c00"
      : tienda === "santaisabel"
      ? "#c2185b"
      : "#616161";

  const storeLabel = `
    <span class="store-label" style="background:${colorTienda}">
      ${(p.store || "SIN TIENDA").toUpperCase()}
    </span>`;

  // ============================
  // 🏷 Marca
  // ============================
  const marca =
    p.brand && p.brand.trim() && p.brand !== "null"
      ? p.brand
      : "Sin marca";

  // ===============================
  // 💰 Normalizar precio a número
  // ===============================
  let precioNum = 0;
  if (typeof p.currentPrice === "number") precioNum = p.currentPrice;
  else if (typeof p.currentPrice === "string")
    precioNum =
      parseFloat(
        p.currentPrice.replace(/[^\d.,]/g, "").replace(",", ".")
      ) || 0;
  else if (p.formattedPrice) {
    const m = p.formattedPrice.match(/([\d\.,]+)/);
    if (m)
      precioNum =
        parseFloat(m[1].replace(/\./g, "").replace(",", ".")) || 0;
  }

  // ============================
  // 🗓 Fecha
  // ============================
  const fecha =
    p.lastUpdate && !isNaN(new Date(p.lastUpdate))
      ? new Date(p.lastUpdate).toLocaleDateString("es-CL", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "-";

  // =====================================
  // 📌 Render del card HTML COMPLETO
  // =====================================
  card.innerHTML = `
    <div class="store-container">${storeLabel}</div>
    <img src="${p.image || "/img/no-image.png"}" alt="${p.title}" loading="lazy">
    <h3 class="product-title">${p.title}</h3>
    <p class="brand"><strong>${marca}</strong></p>
    <div class="price-box">
      <p class="price-actual">${p.formattedPrice || "$ -"}</p>
      ${p.priceNormal ? `<p class="price-normal">Normal: ${p.priceNormal}</p>` : ""}
      ${p.pricePerUnit ? `<p class="price-unit"><small>${p.pricePerUnit}</small></p>` : ""}
      ${p.offerDescription ? `<p class="price-offer"> ${p.offerDescription}</p>` : ""}
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

function renderizarPaginacion() {
  const cont = document.getElementById("paginacion");
  if (!cont) return;

  cont.innerHTML = "";

  let html = `<div class="paginacion-container">`;

  // 🔹 Botón anterior
  html += `
    <button class="btn-pag" onclick="cambiarPagina(currentPage - 1)" 
      ${currentPage === 1 ? "disabled" : ""}>
      ⟵ Anterior
    </button>
  `;

  // ---- SISTEMA DE POCAS PÁGINAS ----
  const paginas = [];

  // Siempre mostrar las 3 primeras
  paginas.push(1, 2, 3);

  // Páginas alrededor de la actual
  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
    if (i > 3 && i < totalPages - 2) paginas.push(i);
  }

  // Siempre mostrar últimas 3
  paginas.push(totalPages - 2, totalPages - 1, totalPages);

  // Quita duplicados y valores inválidos
  const paginasFiltradas = [...new Set(paginas.filter(n => n >= 1 && n <= totalPages))];

  // ---- Render de páginas con saltos ("…") ----
  let ultima = 0;
  paginasFiltradas.forEach((p) => {
    if (p !== ultima + 1) {
      html += `<span class="puntos">…</span>`;
    }

    html += `
      <button class="btn-pag ${p === currentPage ? "activo" : ""}" 
        onclick="cambiarPagina(${p})">
        ${p}
      </button>
    `;

    ultima = p;
  });

  // 🔹 Botón siguiente
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
  renderizarPaginacion();
} 

async function registrarClickProducto(btn) {
  let precioRaw = btn.getAttribute("data-precio") || "";
  let precioFinal = 0;

  if (precioRaw) {
    if (!isNaN(precioRaw)) precioFinal = parseFloat(precioRaw);
    else {
      const match = precioRaw.match(/([\d\.,]+)/);
      if (match)
        precioFinal =
          parseFloat(match[1].replace(/\./g, "").replace(",", ".")) || 0;
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

function agregarCarrito(id) {
  alert(`🧺 Agregar al carrito pendiente para producto ID: ${id}`);
}
function renderizarFiltrosPeso(productos) {
  const cont = document.querySelector(".filtros-peso");
  cont.innerHTML = "";

  const pesos = new Set();
  productos.forEach((p) => {
    const w = normalizarPesoDesdeTitulo(p.title);
    if (w !== null) pesos.add(w);
  });

  const ordenados = Array.from(pesos).sort((a, b) => a - b);
  ordenados.forEach((peso) => {
    const chip = document.createElement("div");
    chip.className = "chip-filtro";
    chip.textContent = peso >= 1000 ? `${peso / 1000} kg` : `${peso} g`;
    chip.onclick = () => {
      selectedWeight = peso;
      renderizarProductos(getFilteredProducts());
    };
    cont.appendChild(chip);
  });

  const limpiar = document.createElement("button");
  limpiar.textContent = "Limpiar filtro";
  limpiar.className = "btn-limpiar-filtro";
  limpiar.onclick = () => {
    selectedWeight = null;
    renderizarProductos(getFilteredProducts());
  };
  cont.appendChild(limpiar);
}

async function cargarProductos(busqueda = "") {
  try {
    const res = await fetch(`/api/catalogo?q=${encodeURIComponent(busqueda)}`);
    const productos = await res.json();
    productosGlobal = productos;

    selectedWeight = null;
    renderizarProductos(getFilteredProducts());

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

  renderizarProductos(getFilteredProducts());
renderizarPaginacion();
}


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
      contenedorSugerencias.innerHTML =
        "<div class='sin-sugerencias'>Escribe al menos 3 caracteres…</div>";
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
          contenedorSugerencias.innerHTML =
            "<div class='sin-sugerencias'>Sin resultados</div>";
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
