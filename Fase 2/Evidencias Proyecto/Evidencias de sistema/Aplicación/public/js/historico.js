// ================================
// 📊 Cargar datos del producto e historial
// ================================
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) return mostrarMensaje("❌ ID no recibido.");

  try {
    const res = await fetch(`/api/productos/${id}/historico`);
    if (!res.ok) throw new Error("Error en la respuesta del servidor");

    const data = await res.json();
    if (!data.ok) return mostrarMensaje("Producto no encontrado.");

    const { producto, historial } = data;

    // =====================================================
    // 📌 ORDENAR historial por fecha
    // =====================================================
    historial.sort((a, b) => new Date(a.date) - new Date(b.date));

    // =====================================================
    // 📌 Calcular variación (últimos 7 días)
    // =====================================================
    let precioHoy = historial[historial.length - 1].price;
    let precio7dias = null;

    if (historial.length >= 7) {
      precio7dias = historial[historial.length - 7].price;
    } else {
      precio7dias = historial[0].price;
    }

    let variacion7d = 0;
    if (precio7dias > 0) {
      variacion7d = (((precioHoy - precio7dias) / precio7dias) * 100).toFixed(1);
    }

    // Color + emoji según la variación
    let emoji = "➖";
    let colorVariacion = "#00A7B5";

    if (variacion7d > 0) {
      emoji = "📈";
      colorVariacion = "#d32f2f"; // rojo
    } else if (variacion7d < 0) {
      emoji = "📉";
      colorVariacion = "#2e7d32"; // verde
    }

    // =====================================================
    // 🧾 Render del producto
    // =====================================================
    const contenedor = document.getElementById("productoDetalle");

    contenedor.innerHTML = `
      <div class="store-label">
        ${(producto.store || "Desconocido").toUpperCase()}
      </div>

      <img src="${producto.image}" alt="${producto.title}" loading="lazy" />
      
      <h3>${producto.title}</h3>
      <p class="brand">${producto.brand || ""}</p>

      <p class="price">
        $${(producto.currentPrice || 0).toLocaleString("es-CL")}
        <span class="variacion" style="color:${colorVariacion}">
          ${emoji} ${variacion7d}% (7 días)
        </span>
      </p>

      ${
        producto.link
          ? `<a href="${producto.link}" target="_blank" class="btn-ver">Ver producto</a>`
          : ""
      }
    `;

    // =====================================================
    // 📈 Gráfico principal (evolución)
    // =====================================================
    const labels = historial.map((h) =>
      new Date(h.date || h.fecha).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
      })
    );

    const precios = historial.map((h) => h.price);

    const ctx = document.getElementById("graficoHistorico").getContext("2d");

    // Fondo suave según tendencia
    let bgColor = "rgba(0,167,181,0.16)";
    if (colorVariacion === "#d32f2f") bgColor = "rgba(211,47,47,0.16)";
    if (colorVariacion === "#2e7d32") bgColor = "rgba(46,125,50,0.16)";

    new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Precio",
            data: precios,
            borderColor: colorVariacion,
            backgroundColor: bgColor,
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: colorVariacion,
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
              callback: (v) => "$ " + v.toLocaleString("es-CL"),
              color: "#005B66",
            },
          },
          x: {
            ticks: {
              color: "#005B66",
            },
          },
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
function mostrarMensaje(msg) {
  const grafico = document.querySelector(".grafico-section");
  if (grafico) {
    grafico.innerHTML = `<p class="no-data">${msg}</p>`;
  }
}
