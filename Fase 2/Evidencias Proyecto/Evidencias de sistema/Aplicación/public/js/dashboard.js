// =============================
// 📊 DASHBOARD PRINCIPAL (Versión profesional)
// =============================
document.addEventListener("DOMContentLoaded", async () => {
  const fmt = (n) => (n != null ? n.toLocaleString("es-CL") : "—");
  const getEl = (id) => document.getElementById(id);

  try {
    const res = await fetch("/api/dashboard");
    const data = await res.json();

    /* ============================
       🔹 MÉTRICAS PRINCIPALES (KPIs)
    ============================ */
    const kpis = data.kpis || {};
    getEl("totalUsuarios").textContent = fmt(kpis.total_usuarios);
    getEl("totalNegocios").textContent = fmt(kpis.total_negocios);
    getEl("totalProductos").textContent = fmt(kpis.productos_total);

    // 🕒 Último scraping (más reciente)
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

    /* ============================
       📈 CONFIGURACIÓN GLOBAL DE CHARTS
    ============================ */
    Chart.defaults.font.family = "'Poppins', 'Segoe UI', sans-serif";
    Chart.defaults.font.size = 13;
    Chart.defaults.color = "#334155";
    Chart.defaults.plugins.legend.labels.boxWidth = 14;

    const palette = [
      "#00A7B5", "#009FB0", "#007E8C", "#5BC0BE",
      "#C5E4E7", "#64748B", "#94A3B8", "#CBD5E1"
    ];

    /* ============================
       🌎 GRÁFICO: DISTRIBUCIÓN POR REGIÓN
    ============================ */
    const regionData = data.charts?.region;
    const ctxRegion = getEl("porRegion")?.getContext("2d");
    if (regionData && ctxRegion) {
      new Chart(ctxRegion, {
        type: "bar",
        data: {
          labels: Object.keys(regionData),
          datasets: [
            {
              label: "Usuarios por Región",
              data: Object.values(regionData),
              backgroundColor: palette.map((c, i) => palette[i % palette.length] + "CC"),
              borderRadius: 8,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "#E5E7EB" },
              ticks: { stepSize: 1 },
            },
            x: {
              grid: { color: "transparent" },
            },
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
                label: (ctx) => ` ${ctx.label}: ${ctx.formattedValue} usuarios`,
              },
            },
          },
        },
      });
    }

    /* ============================
       👥 GRÁFICO: DISTRIBUCIÓN POR GÉNERO
    ============================ */
    const generoData = data.charts?.genero;
    const ctxGenero = getEl("porGenero")?.getContext("2d");
    if (generoData && ctxGenero) {
      new Chart(ctxGenero, {
        type: "doughnut",
        data: {
          labels: Object.keys(generoData),
          datasets: [
            {
              label: "Usuarios por género",
              data: Object.values(generoData),
              backgroundColor: ["#00A7B5", "#8EC9D0", "#D1D5DB"],
              borderColor: "#FFFFFF",
              borderWidth: 2,
              hoverOffset: 10,
            },
          ],
        },
        options: {
          cutout: "65%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                padding: 16,
                color: "#1E293B",
                font: { size: 14 },
              },
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
                label: (ctx) => `${ctx.label}: ${ctx.formattedValue} usuarios`,
              },
            },
          },
        },
      });
    }
  } catch (err) {
    console.error("❌ Error cargando dashboard:", err);
    const errBox = document.createElement("div");
    errBox.className = "error-msg";
    errBox.textContent = "Error al cargar el Dashboard. Intente nuevamente.";
    document.body.appendChild(errBox);
  }
});
