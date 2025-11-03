// public/js/catalogo.js

let productosGlobal = [];
let selectedWeight = null; // en gramos (null = sin filtro)
let filtrosPesoVisibles = false;
const ALL_STORES = ["unimarc", "tottus", "jumbo", "acuenta"];
let selectedStores = new Set(ALL_STORES); // por defecto todos activos

// ---------- Utils ----------
function normalizarPesoDesdeTitulo(title) {
  if (!title) return null;
  const m = title.match(/(\d+(?:[\.,]\d+)?)(\s?)(g|kg)\b/i);
  if (!m) return null;
  let valor = parseFloat(m[1].replace(",", "."));
  const unidad = m[3].toLowerCase();
  if (unidad === "kg") valor *= 1000;
  if (valor < 50 || valor > 50000) return null; // descarta raros (<50g o >50kg)
  return Math.round(valor);
}

function getFilteredProducts() {
  let lista = [...productosGlobal];

  // 1) Filtro por supermercado
  if (selectedStores.size > 0 && selectedStores.size < ALL_STORES.length) {
    lista = lista.filter((p) => selectedStores.has((p.store || "").toLowerCase()));
  } else if (selectedStores.size === 0) {
    // si el usuario desmarca todos, no mostramos nada
    return [];
  }

  // 2) Filtro por peso (si hay)
  if (selectedWeight !== null) {
    lista = lista.filter((p) => {
      const w = normalizarPesoDesdeTitulo(p.title);
      if (w === null) return false;
      return Math.abs(w - selectedWeight) < 10; // tolerancia ±10g
    });
  }

  return lista;
}

// ---------- Render ----------
function renderizarProductos(lista) {
  const contenedor = document.getElementById("contenedorProductos");
  contenedor.innerHTML = "";

  if (!lista.length) {
    contenedor.innerHTML = "<p>No se encontraron productos.</p>";
    return;
  }

  console.log("🧩 Productos recibidos desde API:", lista.slice(0, 3)); // Muestra 3 para revisar estructura

  lista.forEach((p) => {
    const card = document.createElement("div");
    card.className = "producto-card";

    const colorTienda =
      p.store === "unimarc"
        ? "#d32f2f"
        : p.store === "tottus"
        ? "#388e3c"
        : p.store === "jumbo"
        ? "#00695c"
        : p.store === "acuenta"
        ? "#f57c00"
        : "#616161";

    const storeLabel = `
      <span class="store-label" style="background:${colorTienda}">
        ${(p.store || "SIN TIENDA").toUpperCase()}
      </span>
    `;

    const marca =
      p.brand && p.brand.trim() !== "" && p.brand !== "null" ? p.brand : "Sin marca";

    // 🧩 Detectar el precio correctamente
    let precioNum = 0;
    if (typeof p.currentPrice === "number") {
      precioNum = p.currentPrice;
    } else if (typeof p.currentPrice === "string") {
      precioNum = parseFloat(p.currentPrice.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    } else if (p.formattedPrice) {
      const m = p.formattedPrice.match(/([\d\.,]+)/);
      if (m) precioNum = parseFloat(m[1].replace(/\./g, "").replace(",", ".")) || 0;
    }

    // ---------- 🆕 HTML DE LA CARD CON BOTONES NUEVOS ----------
    card.innerHTML = `
      <div class="store-container">${storeLabel}</div>
      <img src="${p.image}" alt="${p.title}" loading="lazy">
      <h3 class="product-title">${p.title}</h3>
      <p class="brand"><strong>${marca}</strong></p>
      <p class="price">
        ${p.formattedPrice || "$ -"}
        ${p.pricePerUnit ? `<br><small>${p.pricePerUnit}</small>` : ""}
      </p>

      <button
        class="btn-ver"
        data-id="${p._id || p.id || ""}"
        data-titulo="${p.title || ""}"
        data-marca="${p.brand || ""}"
        data-precio="${precioNum}"
        data-supermercado="${p.store || ""}"
        data-link="${p.link || ""}"
        data-imagen="${p.image || ""}"
        onclick="registrarClickProducto(this)">
        Ver producto
      </button>

      <!-- 🔹 NUEVOS BOTONES DE ACCIÓN -->
      <div class="botones-extra">
          <button
    class="btn-carrito-rapido"
    data-titulo="${p.title}"
    onclick="abrirCarritoRapido('${p.title.replace(/'/g, "\\'")}')">🛒 Carrito rápido</button>
        <button class="btn-secundario" onclick="verHistorico('${p._id}', '${p.title}', '${p.brand}', '${p.image}', '${p.store}')">Histórico</button>
        <button class="btn-secundario" onclick="agregarCarrito('${p._id}')">Agregar al Carrito</button>
      </div>
    `;

    contenedor.appendChild(card);
  });
}

// ---------- Registrar clic ----------
async function registrarClickProducto(btn) {
  console.log("🟢 Datos en el botón:", {
    id: btn.getAttribute("data-id"),
    titulo: btn.getAttribute("data-titulo"),
    marca: btn.getAttribute("data-marca"),
    precioRaw: btn.getAttribute("data-precio"),
    supermercado: btn.getAttribute("data-supermercado"),
    link: btn.getAttribute("data-link"),
  });

  let precioRaw = btn.getAttribute("data-precio") || "";
  let precioFinal = 0;

  if (precioRaw) {
    if (!isNaN(precioRaw)) {
      precioFinal = parseFloat(precioRaw);
    } else {
      const match = precioRaw.match(/([\d\.,]+)/);
      if (match) {
        precioFinal = parseFloat(match[1].replace(/\./g, "").replace(",", ".")) || 0;
      }
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

// ---------- BOTONES NUEVOS (acciones futuras) ----------
function carritoRapido(id) {
  alert(`🛒 Carrito rápido pendiente para producto ID: ${id}`);
}

function verHistorico(id, titulo, marca, imagen, tienda) {
  const params = new URLSearchParams({
    id,
    titulo,
    marca,
    imagen,
    tienda,
  });


  window.location.href = `/historico?${params.toString()}`;
}

function agregarCarrito(id) {
  alert(`🧺 Agregar al carrito pendiente para producto ID: ${id}`);
}

// ---------- Filtros de peso ----------
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

// ---------- Data flow ----------
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
}


// ---------- Búsqueda ----------
async function buscar() {
  const input = document.getElementById("busqueda");
  const query = input?.value?.trim() || "";
  await cargarProductos(query);
}

/// ==============================
// 🔍 SUGERENCIAS DE BÚSQUEDA
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("busqueda");
  const cont = document.getElementById("sugerencias");
  if (!input || !cont) return;

  let timer;

  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();

    if (q.length < 2) {
      cont.innerHTML = "";
      cont.style.display = "none";
      return;
    }

    timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/catalogo/sugerencias?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const sugerencias = await res.json();

        cont.innerHTML = "";
        if (!sugerencias.length) {
          cont.style.display = "none";
          return;
        }

        cont.innerHTML = sugerencias.slice(0, 8).map(t => `
          <div>${t}</div>
        `).join("");

        cont.querySelectorAll("div").forEach(div => {
          div.addEventListener("click", () => {
            input.value = div.textContent;
            cont.style.display = "none";
            buscar();
          });
        });

        cont.style.display = "block";
      } catch (e) {
        console.error("❌ Error sugerencias:", e);
        cont.style.display = "none";
      }
    }, 300);
  });

  // cerrar al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (e.target !== input && !cont.contains(e.target)) {
      cont.innerHTML = "";
      cont.style.display = "none";
    }
  });
});



// ---------- Filtro por supermercado ----------
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
  renderizarProductos(getFilteredProducts());
}

function wireSuperCheckboxes() {
  const cbs = document.querySelectorAll(".filtro-super");
  cbs.forEach((cb) => cb.addEventListener("change", aplicarFiltroSupermercado));
}

// ---------- Inicio ----------
window.addEventListener("DOMContentLoaded", () => {
  wireSuperCheckboxes();
  cargarProductos();
});




// ---------- Carrito Rápido ----------
// ---------- Utils para carrito rápido ----------
function _norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function extraerCantidadDesdeTitulo(title) {
  if (!title) return "";
  const m = title.match(/(\d+(?:[\.,]\d+)?)\s*(kg|g|ml|l)\b/i);
  if (!m) return "";
  let val = m[1].replace(",", ".");
  const uni = m[2].toLowerCase();
  // lo mostramos “bonito”
  if (uni === "kg" || uni === "l") return `${val} ${uni}`;
  // g o ml sin decimales innecesarios
  return `${parseFloat(val)} ${uni}`;
}

function formateaPrecio(p) {
  if (typeof p === "number") return `$ ${p.toLocaleString("es-CL")}`;
  if (typeof p === "string" && p.trim()) return p;
  return "$ -";
}

function similitudTitulo(a, b) {
  const ta = new Set(_norm(a).split(/\s+/).filter(Boolean));
  const tb = new Set(_norm(b).split(/\s+/).filter(Boolean));
  const inter = [...ta].filter(t => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size || 1;
  return inter / union; // Jaccard simple
}
// ---------- Helpers de normalización y propiedades del producto ----------
const STOPWORDS = new Set(["harina","de","la","el","kg","g","gr","gramos","bolsa","paquete","con","sin","y","a","para"]);

function norm(t) {
  return (t || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9\s]/g, " ")                     // deja letras/números/espacios
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(t) {
  const arr = norm(t).split(" ");
  return arr.filter(w => w && !STOPWORDS.has(w));
}

// Detecta el “grano/base” principal (centeno, trigo, sarraceno, etc.)
function extraerBaseHarina(title) {
  const t = norm(title);
  const claves = ["centeno","trigo","sarraceno","avena","maiz","arroz","almendra","coco","garbanzo","multicereal","multicereales","espelta","quinoa"];
  for (const k of claves) if (t.includes(k)) return k;
  return null;
}

// “integral” sí/no
function esIntegral(title) {
  return /\bintegral(es)?\b/i.test(title);
}

// polvos de hornear: "con" / "sin" / null (no menciona)
function polvosStatus(title) {
  const t = (title || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const sinPolvos = /\bsin(\s+polvo(s)?(\s+de)?\s*hornear)?\b/i.test(t);
  const conPolvos = /\bcon(\s+polvo(s)?(\s+de)?\s*hornear)?\b/i.test(t);

  if (sinPolvos && !conPolvos) return "sin";
  if (conPolvos && !sinPolvos) return "con";
  return null; // no menciona
}
// marca (del campo brand o intentando deducir del título)
function extraerMarca(p) {
  if (p.brand && p.brand !== "null" && p.brand !== "NULL") return norm(p.brand);
  // Heurística simple: primera palabra si parece marca conocida
  const t = tokens(p.title || "");
  if (t.length && !/^\d+$/.test(t[0])) return t[0];
  return null;
}

// similitud muy simple (Jaccard) entre sets de tokens
function similitudTitulo(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter || 1;
  return inter / union;
}

// cantidad (para mostrar)
function extraerCantidadDesdeTitulo(title) {
  const m = norm(title).match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/);
  if (!m) return null;
  let v = parseFloat(m[1].replace(",", "."));
  if (m[2] === "kg") v = v * 1000;
  return v >= 1000 ? `${(v/1000).toFixed(v%1000?2:0)} kg` : `${Math.round(v)} g`;
}

function formateaPrecio(p) {
  if (typeof p === "number") {
    return `$ ${p.toLocaleString("es-CL")}`;
  }
  if (typeof p === "string") {
    const n = parseFloat(p.replace(/[^\d,\.]/g,"").replace(/\./g,"").replace(",","."));
    if (!isNaN(n) && isFinite(n)) return `$ ${Math.round(n).toLocaleString("es-CL")}`;
  }
  return "$ -";
}
function detectarMarca(titulo) {
  const marcas = [
    "carozzi", "lucchetti", "molitalia", "barilla", "reggia", "talliani",
    "selecta", "ideal", "molino", "rosario", "tres estrellas", "el puente",
    "tucapel", "dos caballos", "miraflores", "cristal", "san jorge",
    "colun", "soprole", "quillayes", "loncoleche", "surlat", "nestle",
    "danone", "chilolac", "costa", "mckay", "super ocho", "triton", "vizzio",
    "fruna", "terrabusi", "morocha", "milo", "sahne nuss", "mccain",
    "bon o bon", "coca-cola", "sprite", "fanta", "bilz", "pap", "kem", "pepsi",
    "watts", "livean", "necta", "capri", "andina del valle", "nescafe", "dolca",
    "juan valdez", "supremo", "starbucks", "lavazza", "illy", "nespresso",
    "maggi", "prego", "toscana", "clemente jacques", "costanza", "wasil",
    "helmanns", "pomarola", "clorox", "poett", "virutex", "omo", "drive",
    "ariel", "ace", "comfort", "soft", "downy", "dove", "rinso", "pf",
    "super pollo", "super cerdo", "la crianza", "sopraval", "cecinas san jorge",
    "agrosuper", "bredenmaster", "super pan", "doña maría",
    "tottus", "jumbo", "unimarc", "acuenta", "lider", "santa isabel", "spid"
  ];

  const t = (titulo || "").toLowerCase();
  let mejorCoincidencia = "";
  let mejorLongitud = 0;

  for (const marca of marcas) {
    if (t.includes(marca.toLowerCase()) && marca.length > mejorLongitud) {
      mejorCoincidencia = marca;
      mejorLongitud = marca.length;
    }
  }
  return mejorCoincidencia;
}

function extraerPesoYUnidad(titulo) {
  const match = titulo.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|ml|l)/i);
  if (!match) return null;
  const valor = parseFloat(match[1].replace(",", "."));
  const unidad = match[2].toLowerCase();
  return { valor, unidad };
}

function normalizarPesoEnGramos({ valor, unidad }) {
  if (!valor || !unidad) return null;
  if (unidad.includes("kg")) return valor * 1000;
  if (unidad.includes("l") && !unidad.includes("ml")) return valor * 1000;
  return valor;
}

function extraerPalabrasClave(titulo, marca) {
  return titulo
    .toLowerCase()
    .replace(marca, "")
    .replace(/\d+(?:[.,]\d+)?\s*(kg|g|gr|ml|l)/gi, "")
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        !["de", "sin", "con", "para", "al", "la", "el", "por", "del", "los"].includes(w)
    );
}

function analizarAtributosEspeciales(titulo) {
  const t = titulo.toLowerCase();
  return {
    sinPolvos: t.includes("sin polvos") || t.includes("sin polvo"),
    conPolvos: t.includes("con polvos") || t.includes("con polvo"),
    light: t.includes("light"),
    integral: t.includes("integral"),
    zero: t.includes("zero") || t.includes("sin azúcar") || t.includes("sin azucar"),
  };
}

function extraerCantidadDesdeTitulo(titulo) {
  const match = titulo.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|ml|l)/i);
  if (!match) return "";
  return `${match[1]} ${match[2]}`;
}

function formateaPrecio(precio) {
  if (!precio) return "$0";
  if (typeof precio === "number") return `$${precio.toLocaleString("es-CL")}`;
  if (typeof precio === "string") {
    const limpio = precio.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(limpio);
    return isNaN(num) ? precio : `$${num.toLocaleString("es-CL")}`;
  }
  return "$0";
}

function abrirCarritoRapido(nombreProducto) {
  const panel = document.getElementById("carritoRapidoPanel");
  const contenido = document.getElementById("carritoRapidoContenido");
  panel.classList.remove("oculto");
  panel.classList.add("activo");
  contenido.innerHTML = "";

  const nombreBase = (nombreProducto || "").trim();
  if (!nombreBase) {
    contenido.innerHTML = "<p>Producto inválido.</p>";
    return;
  }

  const baseMarca = detectarMarca(nombreBase);
  const basePesoObj = extraerPesoYUnidad(nombreBase);
  const basePeso = basePesoObj ? normalizarPesoEnGramos(basePesoObj) : null;
  const baseUnidad = basePesoObj ? basePesoObj.unidad : null;
  const basePalabras = extraerPalabrasClave(nombreBase, baseMarca);
  const baseAtributos = analizarAtributosEspeciales(nombreBase);

  const candidatos = productosGlobal
    .map((p) => {
      const titulo = (p.title || "").toLowerCase();
      const marca = detectarMarca(titulo);
      const pesoObj = extraerPesoYUnidad(titulo);
      const peso = pesoObj ? normalizarPesoEnGramos(pesoObj) : null;
      const unidad = pesoObj ? pesoObj.unidad : null;
      const atributos = analizarAtributosEspeciales(titulo);
      const palabras = extraerPalabrasClave(titulo, marca);

      // ❌ Rechazar contradicciones semánticas
      if (baseAtributos.sinPolvos && atributos.conPolvos) return null;
      if (baseAtributos.conPolvos && atributos.sinPolvos) return null;
      if (baseAtributos.light && !atributos.light && titulo.includes("normal")) return null;
      if (baseAtributos.integral && !atributos.integral && titulo.includes("blanca")) return null;

      // ⚖️ Nueva regla: si el producto base tiene peso,
      // solo aceptar productos con peso igual y misma unidad
      if (basePeso && baseUnidad) {
        if (!peso || !unidad) return null; // descarta sin peso
        if (baseUnidad !== unidad) return null;
        if (Math.abs(peso - basePeso) > 1e-6) return null;
      }

      let score = 0;
      if (baseMarca && marca === baseMarca) score += 5;

      const coincidencias = basePalabras.filter((w) =>
        palabras.includes(w)
      ).length;
      score += coincidencias * 0.8;

      const baseInicio = basePalabras.slice(0, 2).join(" ");
      if (titulo.startsWith(baseInicio)) score += 1.5;

      return { p, score };
    })
    .filter(Boolean)
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);

  const supermercados = ["unimarc", "tottus", "jumbo", "acuenta"];
  const porSuper = {};

  supermercados.forEach((s) => {
    const delSuper = candidatos.filter(
      (p) => (p.store || "").toLowerCase() === s
    );
    if (!delSuper.length) return;
    porSuper[s] = delSuper[0];
  });

  const head = document.createElement("div");
  head.innerHTML = `<h4>Comparando: <em>${nombreBase}</em></h4>`;
  contenido.appendChild(head);

  supermercados.forEach((s) => {
    const p = porSuper[s];
    const seccion = document.createElement("div");
    seccion.className = "carrito-super-section";
    const tituloSuper = s.charAt(0).toUpperCase() + s.slice(1);
    seccion.innerHTML = `<h5>${tituloSuper}</h5>`;

    if (p) {
      const cantidad = extraerCantidadDesdeTitulo(p.title);
      const precio = formateaPrecio(p.currentPrice || p.formattedPrice);
      seccion.innerHTML += `
        <div class="carrito-mini">
          <img src="${p.image || ""}" alt="${p.title || ""}">
          <div class="info">
            <div class="titulo">${p.title}</div>
            <div class="meta">
              <span class="store-tag">${tituloSuper}</span>
              ${cantidad ? `<span>${cantidad}</span>` : ""}
            </div>
            <div class="precio">${precio}</div>
            <a href="${p.link || "#"}" target="_blank">Ver en tienda →</a>
          </div>
        </div>`;
    } else {
      seccion.innerHTML += `<p class="sin-comparacion">Sin comparación disponible.</p>`;
    }

    contenido.appendChild(seccion);
  });
}
