// ================================
// 📊 Cargar datos del producto e historial
// ================================
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const contenedor = document.getElementById("productoDetalle");

  if (!id) {
    mostrarMensaje("❌ No se proporcionó ID del producto.");
    return;
  }

  try {
    const res = await fetch(`/api/productos/${id}/historico`);
    if (!res.ok) throw new Error("Error al obtener datos");

    const { producto, historial } = await res.json();

    // ✅ Mostrar información del producto SIEMPRE, aunque no haya historial
    if (!producto) {
      mostrarMensaje("Producto no encontrado.");
      return;
    }

    contenedor.innerHTML = `
      <div class="store-container">
        <span class="store-label" style="background:${
          producto.store === "jumbo"
            ? "#00695c"
            : producto.store === "tottus"
            ? "#388e3c"
            : producto.store === "unimarc"
            ? "#d32f2f"
            : "#f57c00"
        }">${producto.store?.toUpperCase() || "DESCONOCIDO"}</span>
      </div>
      <img src="${producto.image}" alt="${producto.title}" loading="lazy" />
      <h3>${producto.title}</h3>
      <p class="brand">${producto.brand || ""}</p>
      <p class="price">${
        producto.currentPrice
          ? "$" + producto.currentPrice.toLocaleString("es-CL")
          : "<span style='color:#9CA3AF;'>Sin precio disponible</span>"
      }</p>
      ${
        producto.link
          ? `<a href="${producto.link}" target="_blank" class="btn-ver">Ver producto</a>`
          : ""
      }
    `;

    // ⚠️ Si no hay historial, solo muestra el producto sin gráfico
    if (!historial || historial.length === 0) {
      const graficoSection = document.querySelector(".grafico-section");
      graficoSection.innerHTML =
        "<p style='color:#005b66; font-weight:500;'>No hay historial de precios disponible.</p>";
      return;
    }

    // ✅ Generar gráfico si hay historial
    const labels = historial.map((h) =>
      new Date(h.date).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
      })
    );
    const precios = historial.map((h) => h.price);

    const ctx = document.getElementById("graficoHistorico").getContext("2d");
    const gradiente = ctx.createLinearGradient(0, 0, 0, 300);
    gradiente.addColorStop(0, "#00A7B5");
    gradiente.addColorStop(1, "#005B66");

    new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Precio",
            data: precios,
            borderColor: "#00A7B5",
            backgroundColor: "rgba(0,167,181,0.15)",
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: "#00A7B5",
            pointHoverRadius: 6,
            showLine: historial.length > 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: "Histórico de Precios",
            color: "#006666",
            font: { size: 18, family: "Segoe UI", weight: "bold" },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `💰 $${ctx.parsed.y.toLocaleString("es-CL")} (${ctx.label})`,
            },
          },
        },
        scales: {
          y: {
            ticks: {
              callback: (value) => `$ ${value.toLocaleString("es-CL")}`,
              color: "#006666",
            },
          },
          x: { ticks: { color: "#006666" } },
        },
      },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    mostrarMensaje("Error al cargar el historial de precios.");
  }
});

// ================================
// 🧩 Función auxiliar
// ================================
function mostrarMensaje(mensaje) {
  const contenedor = document.getElementById("productoDetalle");
  contenedor.innerHTML = `
    <div class="no-data">${mensaje}</div>
  `;
}
