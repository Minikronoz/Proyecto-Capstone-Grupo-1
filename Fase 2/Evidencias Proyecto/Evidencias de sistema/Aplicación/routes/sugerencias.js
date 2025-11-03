const inputBusqueda = document.getElementById("busqueda");
const contenedorSugerencias = document.querySelector(".sugerencias");

let timeout = null;

// Escuchar escritura del usuario
inputBusqueda.addEventListener("input", async (e) => {
  const texto = e.target.value.trim();

  // Si el usuario borra todo → limpiar
  if (!texto) {
    contenedorSugerencias.innerHTML = "";
    contenedorSugerencias.style.display = "none";
    return;
  }

  // Retrasar para no saturar el servidor
  clearTimeout(timeout);
  timeout = setTimeout(async () => {
    try {
      const resp = await fetch(`/api/productos/sugerencias?q=${encodeURIComponent(texto)}`);
      if (!resp.ok) throw new Error("Error al obtener sugerencias");
      const sugerencias = await resp.json();

      if (!sugerencias.length) {
        contenedorSugerencias.innerHTML = "<div class='sin-sugerencias'>Sin resultados</div>";
        contenedorSugerencias.style.display = "block";
        return;
      }

      // Generar sugerencias dinámicas
      contenedorSugerencias.innerHTML = sugerencias
        .map(s => `<div class="item-sugerencia" onclick="seleccionarSugerencia('${s}')">${s}</div>`)
        .join("");
      contenedorSugerencias.style.display = "block";
    } catch (err) {
      console.error(err);
    }
  }, 300);
});

// Al hacer clic en una sugerencia
function seleccionarSugerencia(valor) {
  inputBusqueda.value = valor;
  contenedorSugerencias.innerHTML = "";
  contenedorSugerencias.style.display = "none";
  buscar();
}

// Cerrar sugerencias al hacer clic fuera
document.addEventListener("click", (e) => {
  if (!e.target.closest(".buscador")) {
    contenedorSugerencias.style.display = "none";
  }
});
