// =============================================================
// 📊 DASHBOARD PRINCIPAL — Versión Atlas Limpia
// =============================================================

document.addEventListener("DOMContentLoaded", async () => {
  const getEl = (id) => document.getElementById(id);
  const fmt = (n) => (n != null ? n.toLocaleString("es-CL") : "—");

  try {
    const res = await fetch("/api/dashboard");
    const data = await res.json();

    // =============================
    // 🔹 KPIs PRINCIPALES
    // =============================
    const kpis = data.kpis || {};
    getEl("totalUsuarios").textContent = fmt(kpis.total_usuarios);
    getEl("totalNegocios").textContent = fmt(kpis.total_negocios);
    getEl("totalProductos").textContent = fmt(kpis.productos_total);

    // 🕒 Último scraping
    const scrapingData = kpis.scraping || {};
    const ultimo = Object.entries(scrapingData)
      .map(([supermercado, info]) => ({
        supermercado,
        fecha: info?.fecha ? new Date(info.fecha) : null,
      }))
      .filter((x) => x.fecha)
      .sort((a, b) => b.fecha - a.fecha)[0];

    getEl("ultimoScraping").textContent = ultimo
      ? `${ultimo.supermercado.toUpperCase()} (${ultimo.fecha.toLocaleString("es-CL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })})`
      : "—";

    // =============================
    // 🎨 CONFIGURACIÓN GLOBAL CHART.JS
    // =============================
    Chart.defaults.font.family = "'Poppins','Segoe UI',sans-serif";
    Chart.defaults.font.size = 13;
    Chart.defaults.color = "#334155";
    Chart.defaults.plugins.legend.labels.boxWidth = 14;

    const palette = [
      "#00A7B5", "#009FB0", "#007E8C", "#5BC0BE",
      "#C5E4E7", "#64748B", "#94A3B8", "#CBD5E1"
    ];

    // Cargar visualizaciones
    await Promise.all([
      cargarIndiceCompetitividad(),
      cargarRankingProductosNuevos(),
      cargarCruceGeneroRegion(),
      cargarUsuariosNuevosRecurrentes(),
      cargarBusquedasPorRegion()
    ]);

    // Render regiones y género
    renderPorRegion(data.charts?.region, palette);
    renderPorGenero(data.charts?.genero);

  } catch (err) {
    console.error("❌ Error cargando dashboard:", err);
    const errBox = document.createElement("div");
    errBox.className = "error-msg";
    errBox.textContent = "Error al cargar el Dashboard. Intente nuevamente.";
    document.body.appendChild(errBox);
  }
});
// 💰 Índice de competitividad de precios
async function cargarIndiceCompetitividad() {
  const res = await fetch("/api/estadisticas/indice-competitividad");
  const data = await res.json();

  const labels = data.map(d => d._id);
  const valores = data.map(d => d.promedio.toFixed(2));

  new Chart(document.getElementById("indiceCompetitividad"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Precio promedio (menor = más competitivo)",
        data: valores,
        backgroundColor: "#00A7B5",
        borderRadius: 8
      }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// 👥 Usuarios nuevos vs recurrentes
async function cargarUsuariosNuevosRecurrentes() {
  const res = await fetch("/api/estadisticas/usuarios-nuevos-recurrentes");
  const data = await res.json();

  new Chart(document.getElementById("usuariosNuevosRecurrentes"), {
    type: "pie",
    data: {
      labels: ["Nuevos", "Recurrentes"],
      datasets: [{
        data: [data.nuevos, data.recurrentes],
        backgroundColor: ["#00A7B5", "#CBD5E1"]
      }]
    },
    options: { responsive: true }
  });
}

// 🗺️ Búsquedas por región
async function cargarBusquedasPorRegion() {
  const res = await fetch("/api/estadisticas/busquedas-por-region");
  const data = await res.json();

  const labels = data.map(d => d._id);
  const valores = data.map(d => d.total);

  new Chart(document.getElementById("chartBusquedasRegion"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Total de búsquedas",
        data: valores,
        backgroundColor: "#74b9ff"
      }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}
// 🏪 Ranking de supermercados por productos nuevos
async function cargarRankingProductosNuevos() {
  const res = await fetch("/api/estadisticas/ranking-productos-nuevos");
  const data = await res.json();

  const labels = data.map(d => d._id);
  const valores = data.map(d => d.total);

  new Chart(document.getElementById("rankingProductosNuevos"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Productos nuevos (últimos 30 días)",
        data: valores,
        backgroundColor: "#5BC0BE",
        borderRadius: 8
      }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// 🌎 Cruce entre género y región
async function cargarCruceGeneroRegion() {
  const res = await fetch("/api/estadisticas/cruce-genero-region");
  const data = await res.json();

  const regiones = [...new Set(data.map(d => d.region))];
  const generos = [...new Set(data.map(d => d.genero))];

  const datasets = generos.map(g => ({
    label: g || "Sin género",
    data: regiones.map(r => {
      const item = data.find(d => d.region === r && d.genero === g);
      return item ? item.total : 0;
    }),
    borderWidth: 1,
  }));

  new Chart(document.getElementById("cruceGeneroRegion"), {
    type: "bar",
    data: { labels: regiones, datasets },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}
// ============================
// 🌎 Distribución por región
// ============================
function renderPorRegion(regionData, palette) {
  const ctx = document.getElementById("porRegion")?.getContext("2d");
  if (!regionData || !ctx) return;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(regionData),
      datasets: [{
        label: "Usuarios por Región",
        data: Object.values(regionData),
        backgroundColor: palette.map((c, i) => palette[i % palette.length] + "CC"),
        borderRadius: 8,
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, grid: { color: "#E5E7EB" }, ticks: { stepSize: 1 } },
        x: { grid: { color: "transparent" } }
      },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Distribución de usuarios por región",
          color: "#1E293B",
          font: { size: 16, weight: "bold" },
        },
        tooltip: {
          backgroundColor: "#1E293B",
          titleColor: "#fff",
          bodyColor: "#fff",
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.formattedValue} usuarios`
          }
        }
      }
    }
  });
}

// ============================
// 👥 Distribución por género
// ============================
function renderPorGenero(generoData) {
  const ctx = document.getElementById("porGenero")?.getContext("2d");
  if (!generoData || !ctx) return;

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(generoData),
      datasets: [{
        label: "Usuarios por género",
        data: Object.values(generoData),
        backgroundColor: ["#00A7B5", "#8EC9D0", "#D1D5DB"],
        borderColor: "#FFFFFF",
        borderWidth: 2,
        hoverOffset: 10,
      }]
    },
    options: {
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 16, color: "#1E293B", font: { size: 14 } }
        },
        title: {
          display: true,
          text: "Distribución de usuarios por género",
          color: "#1E293B",
          font: { size: 16, weight: "bold" },
          padding: { bottom: 10 },
        },
        tooltip: {
          backgroundColor: "#1E293B",
          titleColor: "#fff",
          bodyColor: "#fff",
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.formattedValue} usuarios`
          }
        }
      }
    }
  });
}
