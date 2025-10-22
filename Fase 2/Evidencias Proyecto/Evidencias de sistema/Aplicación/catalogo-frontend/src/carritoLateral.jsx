import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export default function CarritoLateral() {
  const [carritoLateral, setCarritoLateral] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  // Cargar carrito del usuario
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (!user) return setCarritoLateral({});

      const userRef = doc(db, "usuarios", user.email);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCarritoLateral(data.carritoLateral || {});
      } else {
        await setDoc(userRef, { carritoLateral: {} }, { merge: true });
      }
    });
    return () => unsubscribe();
  }, []);

  // Función que interpreta precios tipo "2 x $2000"
  const desglosarPrecio = (texto) => {
    if (!texto) return { cantidad: 1, totalPack: 0, unitario: 0 };
    const str = texto.toString().trim();

    // Detecta formato tipo "2 x $2000", "2x2000", "2 por 2000"
    const match = str.match(/(\d+)\s*(?:x|por)\s*\$?\s*([\d.,]+)/i);
    if (match) {
      const cantidad = parseInt(match[1], 10);
      const totalPack = parseInt(match[2].replace(/[^\d]/g, ""), 10);
      const unitario = cantidad > 0 ? Math.round(totalPack / cantidad) : totalPack;
      return { cantidad, totalPack, unitario };
    }

    // Si no tiene “x”, tomamos el número directo
    const valor = parseInt(str.replace(/[^\d]/g, ""), 10) || 0;
    return { cantidad: 1, totalPack: valor, unitario: valor };
  };

  // Agregar producto al carrito
  const handleAddToLateralCart = (product) => {
    const priceText = product.formattedPrice || product.price || product.currentPrice || "";
    const { cantidad, unitario } = desglosarPrecio(priceText);
    const store = (product.store || "").toLowerCase();

    setCarritoLateral((prev) => {
      const updated = { ...prev };
      if (!updated[store]) updated[store] = [];

      const idx = updated[store].findIndex((it) => it.title === product.title);

      if (idx !== -1) {
        updated[store][idx].quantity += cantidad;
      } else {
        updated[store].push({
          ...product,
          quantity: cantidad,
          displayPrice: unitario,
          precioTexto: `${cantidad} x $${unitario.toLocaleString("es-CL")}`,
        });
      }

      return updated;
    });
  };

  // Eliminar producto del carrito
  const handleRemoveFromLateralCart = (store, title) => {
    setCarritoLateral((prev) => {
      const updated = { ...prev };
      updated[store] = updated[store].filter((item) => item.title !== title);
      if (updated[store].length === 0) delete updated[store];
      return updated;
    });
  };

  // Guardar en Firestore (con un pequeño retraso)
  useEffect(() => {
    if (!currentUser) return;
    const saveCart = async () => {
      const userRef = doc(db, "usuarios", currentUser.email);
      await updateDoc(userRef, { carritoLateral });
    };
    const timeout = setTimeout(saveCart, 300);
    return () => clearTimeout(timeout);
  }, [carritoLateral]);

  // 🔹 Cálculo de subtotales y total
  const totalGeneral = useMemo(() => {
    return Object.values(carritoLateral).reduce(
      (acc, items) =>
        acc +
        items.reduce(
          (sum, item) => sum + (item.displayPrice || 0) * (item.quantity || 0),
          0
        ),
      0
    );
  }, [carritoLateral]);

  const subtotal = (items) =>
    items.reduce((sum, item) => sum + (item.displayPrice || 0) * (item.quantity || 0), 0);

  // Render del carrito
  return (
    <div className="CarritoLateral_container sticky-cart">
      <h3>Carrito Lateral</h3>

      {totalGeneral === 0 ? (
        <p>No hay productos agregados.</p>
      ) : (
        <>
          {Object.entries(carritoLateral).map(([store, items]) => (
            <div key={store} className="CarritoLateral_supermarket">
              <h4>{store}</h4>
              {items.map((item, i) => (
                <div key={i} className="CarritoLateral_item">
                  {item.image && <img src={item.image} alt={item.title} />}
                  <div className="CarritoLateral_item-info">
                    <p>{item.title}</p>
                    <p>
                      {item.precioTexto ||
                        `${item.quantity} x $${(item.displayPrice || 0).toLocaleString("es-CL")}`}
                    </p>
                    <a href={item.link} target="_blank" rel="noreferrer">
                      Ver producto
                    </a>
                  </div>
                </div>
              ))}
              <p>
                <strong>Subtotal {store}: </strong>$
                {subtotal(items).toLocaleString("es-CL")}
              </p>
            </div>
          ))}
          <hr />
          <p>
            <strong>Total: </strong>${totalGeneral.toLocaleString("es-CL")}
          </p>
        </>
      )}
    </div>
  );
}
