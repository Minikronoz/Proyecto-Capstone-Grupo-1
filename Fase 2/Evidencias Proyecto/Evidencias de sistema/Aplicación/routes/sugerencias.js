// =======================================================
// 🔍 Buscador con sugerencias dinámicas (autocompletado)
// =======================================================
const inputBusqueda = document.getElementById("busqueda");
const contenedorSugerencias = document.querySelector(".sugerencias");
let timeout = null;

// =======================================================
//  Evento: cada vez que el usuario escribe
// =======================================================
inputBusqueda.addEventListener("input", async (e) => {
  const texto = e.target.value.trim();

  //  Si el usuario borra todo → limpiar sugerencias
  if (!texto) {
    limpiarSugerencias();
    return;
  }

  //  Evita múltiples peticiones seguidas (debounce)
  clearTimeout(timeout);
  timeout = setTimeout(async () => {
    try {
      const url = `/api/productos/sugerencias?q=${encodeURIComponent(texto)}`;
      const resp = await fetch(url);

      if (!resp.ok) throw new Error("Error al obtener sugerencias");
      const sugerencias = await resp.json();

      //  Sin resultados
      if (!sugerencias.length) {
        contenedorSugerencias.innerHTML =
          "<div class='sin-sugerencias'>Sin resultados</div>";
        contenedorSugerencias.style.display = "block";
        return;
      }

      //  Generar lista de sugerencias dinámicas
      contenedorSugerencias.innerHTML = sugerencias
        .map(
          (s) => `
            <div class="item-sugerencia" data-valor="${s}">
              🔎 ${s}
            </div>
          `
        )
        .join("");

      contenedorSugerencias.style.display = "block";
    } catch (err) {
      console.error("❌ Error cargando sugerencias:", err);
      limpiarSugerencias();
    }
  }, 250); //  respuesta rápida sin saturar
});

// =======================================================
//  Selección de una sugerencia (delegación de eventos)
// =======================================================
contenedorSugerencias.addEventListener("click", (e) => {
  const item = e.target.closest(".item-sugerencia");
  if (!item) return;

  const valor = item.getAttribute("data-valor");
  seleccionarSugerencia(valor);
});

// =======================================================
//  Función: aplicar la sugerencia seleccionada
// =======================================================
function seleccionarSugerencia(valor) {
  inputBusqueda.value = valor;
  limpiarSugerencias();
  if (typeof buscar === "function") {
    buscar(); // ejecuta la búsqueda principal
  } else {
    console.warn("⚠️ La función 'buscar()' no está definida todavía.");
  }
}

// =======================================================
//  Cerrar sugerencias al hacer clic fuera del buscador
// =======================================================
document.addEventListener("click", (e) => {
  if (!e.target.closest(".buscador")) {
    contenedorSugerencias.style.display = "none";
  }
});

// =======================================================
//  Helper: limpiar contenedor de sugerencias
// =======================================================
function limpiarSugerencias() {
  contenedorSugerencias.innerHTML = "";
  contenedorSugerencias.style.display = "none";
}
