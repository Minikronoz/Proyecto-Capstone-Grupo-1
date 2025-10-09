import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProductCard({ product, onAdd }) {
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();

  // Define clase CSS según el supermercado
  const storeClass =
    product.store.toLowerCase() === "tottus"
      ? "tottus"
      : product.store.toLowerCase() === "jumbo"
      ? "jumbo"
      : product.store.toLowerCase() === "acuenta"
      ? "acuenta"
      : "unimarc";

  // Navega a PriceHistoryPage.jsx pasando el producto y el supermercado
  const handleHistoricoClick = () => {
    const encodedName = encodeURIComponent(product.title);
    const encodedStore = encodeURIComponent(product.store.toLowerCase());
    navigate(`/price-history/${encodedStore}/${encodedName}`);
  };

  return (
    <div className={`productCard_card ${storeClass}`}>
      <div className={`productCard_storeLabel ${storeClass}`}>
        {product.store}
      </div>

      {product.image && !imgError ? (
        <img
          src={product.image}
          alt={product.title || "Producto"}
          className="productCard_image"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="productCard_noImage">Imagen no disponible</div>
      )}

      <h3 className={`productCard_title ${storeClass}`}>{product.title}</h3>

      <p className="productCard_price">
        {product.formattedPrice ?? product.price ?? "No disponible"}
      </p>

      {(product.pricePerKg || product.pricePerUnit) && (
        <p className="productCard_pricePerKg">
          {product.pricePerKg || product.pricePerUnit}
        </p>
      )}

      {product.link && (
        <a
          href={product.link}
          target="_blank"
          rel="noreferrer"
          className="productCard_link"
        >
          Ver producto
        </a>
      )}

      <div className="productCard_actions">
        <button
          className="productCard_actionButton"
          onClick={() => onAdd(product)}
        >
          Agregar
        </button>
        <button
          className="productCard_actionButton"
          onClick={handleHistoricoClick}
        >
          Historico
        </button>
      </div>
    </div>
  );
}
