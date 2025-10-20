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
        setLoading(true);
        const normalizedName = decodeURIComponent(productName).toLowerCase().trim();
        const normalizedStore = decodeURIComponent(storeName).toLowerCase();
        
        // Obtener el producto actual y su historial de precios desde MongoDB
        const response = await fetch(`http://localhost:3000/api/products/history?title=${encodeURIComponent(normalizedName)}&store=${normalizedStore}`);
        
        if (!response.ok) {
          throw new Error(`Error al obtener historial: ${response.status} ${response.statusText}`);
        }
        
        const historyData = await response.json();
        
        // Si no hay datos, establecer un array vacío
        if (!historyData || historyData.length === 0) {
          setProducts([]);
          return;
        }
        
        // Formatear los datos para mostrar en la interfaz
        const formattedProducts = historyData.map(item => ({
          title: item.title || normalizedName,
          store: item.store || normalizedStore,
          price: item.formattedPrice || `$${item.currentPrice}`,
          currentPrice: item.currentPrice,
          formattedPrice: item.formattedPrice,
          date: new Date(item.date || item.lastUpdate).toISOString().split('T')[0],
          image: item.image,
          link: item.link
        }));
        
        setProducts(formattedProducts);
      } catch (err) {
        console.error("Error obteniendo historial de precios:", err);
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
          // Primero eliminar duplicados basados en la fecha (día)
          .filter((item, index, self) => {
            return index === self.findIndex((t) => {
              const d1 = new Date(item.date);
              const d2 = new Date(t.date);
              return d1.getDate() === d2.getDate() && 
                     d1.getMonth() === d2.getMonth() && 
                     d1.getFullYear() === d2.getFullYear();
            });
          })
          .map((p) => {
            const d = new Date(p.date);
            return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          })
          .reverse(),
        datasets: [
          {
            label: "Precio",
            // Aplicamos el mismo filtro para los datos
            data: validProducts
              .filter((item, index, self) => {
                return index === self.findIndex((t) => {
                  const d1 = new Date(item.date);
                  const d2 = new Date(t.date);
                  return d1.getDate() === d2.getDate() && 
                         d1.getMonth() === d2.getMonth() && 
                         d1.getFullYear() === d2.getFullYear();
                });
              })
              .map((p) => parsePrice(p))
              .reverse(),
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
