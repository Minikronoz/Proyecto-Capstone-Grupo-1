import { useState } from "react";

export default function ProductCard({ product, onAdd }) {
  const [imgError, setImgError] = useState(false);

  const storeClass =
    product.store.toLowerCase() === "tottus"
      ? "tottus"
      : product.store.toLowerCase() === "jumbo"
      ? "jumbo"
      : product.store.toLowerCase() === "acuenta"
      ? "acuenta"
      : "unimarc";

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
        {product.formattedPrice || `${product.price}`}
      </p>
      <a href={product.link} target="_blank" className="productCard_link">
        Ver producto
      </a>

      <div className="productCard_actions">
        <button
          className="productCard_actionButton"
          onClick={() => onAdd(product)}
        >
          Agregar
        </button>
        <button className="productCard_actionButton">Favorito</button>
      </div>
    </div>
  );
}
