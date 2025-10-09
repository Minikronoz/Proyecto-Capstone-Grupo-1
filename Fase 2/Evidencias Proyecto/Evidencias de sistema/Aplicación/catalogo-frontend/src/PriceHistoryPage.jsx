// PriceHistoryPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function PriceHistoryPage() {
  const { productName, storeName } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);

  // Obtiene los últimos N días
  const getLastNDates = (n = 30) => {
    const dates = [];
    for (let i = 0; i < n; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
  };

  // Normaliza el precio y devuelve valor unitario
  const parsePrice = (p) => {
    if (!p) return 0;
    let priceStr = p.price ?? p.formattedPrice ?? "";
    if (!priceStr) return 0;
    if (typeof priceStr === "number") return priceStr;

    const match = priceStr.toString().match(/(?:(\d+)\s*x\s*)?\$?\s*([\d.]+)/i);
    if (match && match[2]) {
      const quantity = match[1] ? Number(match[1]) : 1;
      const value = Number(match[2].replace(/\./g, ""));
      return value / quantity;
    }
    return 0;
  };

  useEffect(() => {
    async function fetchProducts() {
      try {
        const allProducts = [];
        const dates = getLastNDates(30);
        const normalizedName = decodeURIComponent(productName).toLowerCase().trim();
        const normalizedStore = decodeURIComponent(storeName).toLowerCase();

        // Primero intentar latest
        const latestFile = `/json-${normalizedStore}/despensa-${normalizedStore}-latest.json`;
        try {
          const res = await fetch(latestFile);
          if (res.ok) {
            const latestData = await res.json();
            const filteredLatest = latestData.filter(
              (p) => p.title.toLowerCase().trim() === normalizedName
            );
            if (filteredLatest.length) {
              filteredLatest.forEach((p) => (p.date = new Date().toISOString().split("T")[0]));
              filteredLatest.forEach((p) => (p.store = storeName));
              allProducts.push(...filteredLatest);
            }
          }
        } catch (err) {
          console.log("No se pudo cargar latest:", err.message);
        }

        // Luego cargar los diarios
        for (const date of dates) {
          const fileName = `/json-${normalizedStore}/despensa-${normalizedStore}-${date}.json`;
          try {
            const res = await fetch(fileName);
            if (!res.ok) continue;
            const data = await res.json();
            const filtered = data.filter(
              (p) => p.title.toLowerCase().trim() === normalizedName
            );
            if (filtered.length) {
              filtered.forEach((p) => (p.date = date));
              filtered.forEach((p) => (p.store = storeName));
              allProducts.push(...filtered);
            }
          } catch (err) {
            console.log(`Error cargando ${fileName}:`, err.message);
          }
        }

        setProducts(allProducts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [productName, storeName]);

  const handleImgError = () => setImgError(true);

  if (loading) return <p className="PriceHistoryPage_loading">Cargando historial...</p>;
  if (error) return <p className="PriceHistoryPage_error">Error: {error}</p>;

  const latestProduct =
    products[0] || {
      title: decodeURIComponent(productName),
      store: storeName.toUpperCase(),
      price: "No disponible",
      date: new Date().toISOString().split("T")[0],
      image: null,
    };

  const validProducts = products.filter((p) => parsePrice(p) > 0);

  const chartData = validProducts.length
    ? {
        labels: validProducts
          .map((p) => {
            const d = new Date(p.date);
            return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          })
          .reverse(),
        datasets: [
          {
            label: "Precio",
            data: validProducts.map((p) => parsePrice(p)).reverse(),
            borderColor: "rgba(75, 192, 192, 1)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            tension: 0.3,
            fill: true,
            pointRadius: 5,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: validProducts.length ? "Historial de precios" : "No hay historial de precios",
      },
      tooltip: { callbacks: { label: (context) => `$ ${context.formattedValue}` } },
    },
    scales: { y: { ticks: { callback: (value) => `$ ${value}` } } },
  };

  return (
    <div
      className="PriceHistoryPage_container"
      style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <button
        onClick={() => navigate(-1)}
        style={{
          alignSelf: "flex-start",
          marginBottom: "20px",
          padding: "8px 16px",
          borderRadius: "5px",
          border: "none",
          backgroundColor: "#007bff",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        ← Atrás
      </button>

      <h2 className="PriceHistoryPage_title">Historial de precios de “{latestProduct.title}”</h2>

      {/* Tarjeta producto */}
      <div className={`PriceHistoryPage_card productCard_card ${latestProduct.store}`}>
        <div className={`PriceHistoryPage_storeLabel productCard_storeLabel ${latestProduct.store}`}>
          {latestProduct.store} - {latestProduct.date}
        </div>

        {latestProduct.image && !imgError ? (
          <img
            src={latestProduct.image}
            alt={latestProduct.title || "Producto"}
            className="PriceHistoryPage_image productCard_image"
            onError={handleImgError}
          />
        ) : (
          <div className="PriceHistoryPage_noImage">Imagen no disponible</div>
        )}

        <h3 className={`PriceHistoryPage_productTitle productCard_title ${latestProduct.store}`}>
          {latestProduct.title}
        </h3>

        <p className="PriceHistoryPage_price productCard_price">{latestProduct.price}</p>

        {(latestProduct.pricePerKg || latestProduct.pricePerUnit) && (
          <p className="PriceHistoryPage_pricePerKg productCard_pricePerKg">
            {latestProduct.pricePerKg || latestProduct.pricePerUnit}
          </p>
        )}

        {latestProduct.link && (
          <a
            href={latestProduct.link}
            target="_blank"
            rel="noreferrer"
            className="PriceHistoryPage_link productCard_link"
          >
            Ver producto
          </a>
        )}
      </div>

      {/* Mensaje si no hay histórico */}
      {validProducts.length === 0 && (
        <p style={{ marginTop: "40px", fontSize: "18px", color: "#555" }}>
          No hay historial de precios disponible para este producto en {latestProduct.store}.
        </p>
      )}

      {/* Gráfico solo si hay histórico */}
      {validProducts.length > 0 && (
        <div className="PriceHistoryPage_chart" style={{ maxWidth: "700px", width: "100%", height: "400px" }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      )}
    </div>
  );
}
