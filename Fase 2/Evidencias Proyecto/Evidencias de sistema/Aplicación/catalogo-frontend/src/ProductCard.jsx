import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase"; //  Importa Firebase Auth para obtener el usuario logueado

export default function ProductCard({ product, onAdd, onAddToClientCart }) {
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();

  const storeClass =
    product.store.toLowerCase() === "tottus"
      ? "tottus"
      : product.store.toLowerCase() === "jumbo"
      ? "jumbo"
      : product.store.toLowerCase() === "acuenta"
      ? "acuenta"
      : "unimarc";

  // 🔹 Registrar clic en Mongo con datos del usuario autenticado
  const handleProductClick = async (event) => {
    event.preventDefault(); //  Evita que se abra el enlace antes de enviar el clic

    try {
      const user = auth.currentUser; // obtiene usuario autenticado
      const userEmail = user?.email || "anonimo@sinregistro.com";

      console.log(" Enviando clic con usuario:", userEmail, product);

      const response = await fetch("http://localhost:3000/api/clicks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...product, userEmail }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error guardando clic");

      console.log(" Clic guardado correctamente:", data);
    } catch (error) {
      console.error(" Error guardando clic:", error);
    }

    //  Abrir enlace del producto después de guardar el clic
    if (product.link) {
      window.open(product.link, "_blank");
    }
  };

  const handleHistoricoClick = () => {
    const encodedName = encodeURIComponent(product.title);
    const encodedStore = encodeURIComponent(product.store.toLowerCase());
    navigate(`/price-history/${encodedStore}/${encodedName}`);
  };

  const handleQuickCart = () => {
    if (onAdd) onAdd(product);
  };

  const handleAddToClientCart = () => {
    if (onAddToClientCart) onAddToClientCart(product);
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
          onClick={handleProductClick} //  ahora registra clics con usuario y abre el link luego
        >
          Ver producto
        </a>
      )}

      <div className="productCard_actions">
        <button className="productCard_actionButton" onClick={handleQuickCart}>
          Carrito rápido
        </button>
        <button
          className="productCard_actionButton"
          onClick={handleHistoricoClick}
        >
          Histórico
        </button>
        <button
          className="productCard_actionButton"
          onClick={handleAddToClientCart}
        >
          Agregar al Carrito
        </button>
      </div>
    </div>
  );
}
