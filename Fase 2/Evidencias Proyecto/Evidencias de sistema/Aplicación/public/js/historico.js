// ================================
// 📊 Cargar datos del producto e historial
// ================================
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const contenedor = document.getElementById("productoDetalle");
  const graficoSection = document.querySelector(".grafico-section");
  const ctx = document.getElementById("graficoHistorico").getContext("2d");

  if (!id) {
    mostrarMensaje("❌ No se proporcionó ID del producto.");
    return;
  }

  try {
    const res = await fetch(`/api/productos/${id}/historico`);
    if (!res.ok) throw new Error("Error al obtener datos");

    const { producto, historial } = await res.json();

    if (!producto) {
      mostrarMensaje("Producto no encontrado.");
      return;
    }

    // ================================
    // 💰 Calcular cambio de precio
    // ================================
    let cambioTexto = "";
    if (historial && historial.length >= 2) {
      const ultimo = historial[historial.length - 1].price;
      const anterior = historial[historial.length - 2].price;
      const cambio = ((ultimo - anterior) / anterior) * 100;

      if (cambio > 0)
        cambioTexto = `<span class="price-change up">▲ +${cambio.toFixed(
          1
        )}%</span>`;
      else if (cambio < 0)
        cambioTexto = `<span class="price-change down">▼ ${cambio.toFixed(
          1
        )}%</span>`;
      else cambioTexto = `<span class="price-change same">— 0%</span>`;
    } else {
      cambioTexto = `<span class="price-change same">— Sin variaciones</span>`;
    }

    // ================================
    // 🧾 Mostrar información del producto
    // ================================
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
      <p class="price">
        ${
          producto.currentPrice
            ? "$" + producto.currentPrice.toLocaleString("es-CL")
            : "<span style='color:#9CA3AF;'>Sin precio disponible</span>"
        }
        ${cambioTexto}
      </p>
      ${
        producto.link
          ? `<a href="${producto.link}" target="_blank" class="btn-ver">Ver producto</a>`
          : ""
      }
    `;

    // ================================
    // 📅 Preparar datos del gráfico
    // ================================
    let labels = [];
    let precios = [];

    if (historial && historial.length > 0) {
      labels = historial.map((h) =>
        new Date(h.date).toLocaleDateString("es-CL", {
          day: "2-digit",
          month: "2-digit",
        })
      );
      precios = historial.map((h) => h.price);
    } else {
      // Si no hay historial: generar 7 días con el mismo precio
      const hoy = new Date();
      for (let i = 6; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() - i);
        labels.push(
          fecha.toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "2-digit",
          })
        );
        precios.push(producto.currentPrice || 0);
      }
    }

    // ================================
    // 📈 Crear gráfico con Chart.js
    // ================================
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
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
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
              callback: (v) => `$ ${v.toLocaleString("es-CL")}`,
              color: "#005B66",
            },
          },
          x: { ticks: { color: "#005B66" } },
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
  document.querySelector(".grafico-section").innerHTML = `
    <p style='color:#005b66; font-weight:500; text-align:center;'>${mensaje}</p>
  `;
}
