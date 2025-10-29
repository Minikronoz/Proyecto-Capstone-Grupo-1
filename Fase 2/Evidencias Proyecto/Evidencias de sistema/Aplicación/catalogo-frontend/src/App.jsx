import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductCard from "./ProductCard";
import Formularioregistro from "./Formularioregistro";
import "./App.css";
import { Busquedas } from "./utils/Busquedas";
import { FaUserCircle, FaTachometerAlt, FaSignOutAlt } from "react-icons/fa";

// CAMBIO: Se eliminan las importaciones de Firebase que ya no se usan para la sesión principal
// import { auth, db } from "./firebase";
// import { collection, getDocs, query, where } from "firebase/firestore";
// import { signOut } from "firebase/auth";

function App() {
  // --- Estados de productos y UI (se mantienen igual) ---
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [quantityFilters, setQuantityFilters] = useState([]);
  const [activeQuantities, setActiveQuantities] = useState(new Set());
  const [searchCount, setSearchCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedStores, setSelectedStores] = useState(new Set(['unimarc', 'tottus', 'jumbo', 'acuenta']));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasSearch, setHasSearch] = useState(false);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PRODUCTS_PER_PAGE = 300;

  // --- Estados de Carrito (se mantienen igual) ---
  const [carritoUnimarc, setCarritoUnimarc] = useState([]);
  const [carritoTottus, setCarritoTottus] = useState([]);
  const [carritoJumbo, setCarritoJumbo] = useState([]);
  const [carritoAcuenta, setCarritoAcuenta] = useState([]);
  const [carritoLateral, setCarritoLateral] = useState({}); // Cambiado a objeto para mejor manejo

  // --- ESTADOS DE AUTENTICACIÓN (AHORA MANEJADOS CON TOKEN) ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Invitado");
  const [userRole, setUserRole] = useState(null);
  const [currentUserDoc, setCurrentUserDoc] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  // (Se eliminan currentUserDocId y currentAuthUser que eran específicos de Firebase)

  const navigate = useNavigate();

  // --- CAMBIO: Nueva lógica para gestionar la sesión con Tokens ---
  useEffect(() => {
    const loadUserFromToken = async () => {
      setLoading(true); // Empezamos a cargar
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Si hay un token, le preguntamos al backend quién es el usuario
          const response = await fetch('http://localhost:3000/api/auth', {
            method: 'GET',
            headers: { 'x-auth-token': token },
          });

          if (response.ok) {
            const userData = await response.json();
            // Si el backend nos devuelve los datos, actualizamos el estado
            setIsLoggedIn(true);
            setUserName(userData.nombre || "Usuario");
            setUserRole(userData.role || "usuario");
            setCurrentUserDoc(userData);
          } else {
            // Si el token es inválido o expiró, lo borramos y reseteamos el estado
            localStorage.removeItem('token');
            setIsLoggedIn(false);
            setUserName("Invitado");
            setUserRole(null);
            setCurrentUserDoc(null);
          }
        } catch (error) {
          console.error("Error al cargar datos del usuario desde el token:", error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false); // Terminamos de cargar el estado de autenticación
    };

    loadUserFromToken();
  }, []);

  // --- CAMBIO: El logout ahora solo borra el token ---
  const handleUserLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUserName("Invitado");
    setUserRole(null);
    setCurrentUserDoc(null);
    navigate("/formularioregistro");
  };

  // --- El resto de tu código se mantiene igual, con pequeños ajustes ---

  const getTodayDate = () => {
    const today = new Date();
    return today.toLocaleDateString("es-CL", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  };

  const extractQuantity = (title) => {
    if (!title) return null;
    const regex = /(\d+(?:[.,]?\d+)?)\s?(ml|l|kg|g|gr|grs?)/i;
    const match = title.match(regex);
    if (!match) return null;
    let value = parseFloat(match[1].replace(",", "."));
    let unit = match[2].toLowerCase();
    if (unit === "l") value *= 1000;
    if (unit === "kg") value *= 1000;
    return unit === "ml" || unit === "l" ? `${value} ml` : `${value} g`;
  };

  const handleOpenProfile = () => {
    if (!isLoggedIn) {
      navigate("/formularioregistro");
      return;
    }
    setShowProfileModal(true);
  };
  const handleCloseProfile = () => setShowProfileModal(false);
  const handleProfileSaved = () => {
      // Opcional: Recargar los datos del usuario aquí si se editan en el modal
      setShowProfileModal(false);
      // loadUserFromToken(); // Podrías llamar a esta función de nuevo si la expones
  };


  useEffect(() => {
    const fetchProducts = async () => {
      // La carga de productos no debería controlar el loading principal ahora
      // setLoading(true); 
      try {
        const response = await fetch("http://localhost:3000/api/products");
        if (!response.ok) throw new Error('La respuesta de la red no fue correcta');
        const all = await response.json();

        setAllProducts(all);
        const sorted = [...all].sort((a, b) => a.price - b.price);
        setFilteredProducts(all);
        setDisplayedProducts(sorted.slice(0, PRODUCTS_PER_PAGE));
        setCurrentPage(1);

      } catch (err) {
        console.error("Error cargando productos desde MongoDB:", err);
      } 
      // finally {
      //   setLoading(false);
      // }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredProducts, currentPage, isLoadingMore]);

  const handleScroll = () => {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
      loadMoreProducts();
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn]);
  
  useEffect(() => {
    const currentPriceKey = 'price'; // Usar el campo 'price' que es el unitario

    if (!hasSearch) {
      setQuantityFilters([]);
      setActiveQuantities(new Set());
      if (selectedStores.size === 0) {
        setFilteredProducts([]);
        setDisplayedProducts([]);
        return;
      }
      const filtered = allProducts.filter(product => selectedStores.has(product.store));
      const sorted = [...filtered].sort((a, b) => parsePrice(a[currentPriceKey]) - parsePrice(b[currentPriceKey]));
      setFilteredProducts(filtered);
      setDisplayedProducts(sorted.slice(0, PRODUCTS_PER_PAGE));
      setCurrentPage(1);
      return;
    }
    if (selectedStores.size === 0) {
      setFilteredProducts([]);
      setDisplayedProducts([]);
      setQuantityFilters([]);
      setActiveQuantities(new Set());
      return;
    }
    const results = filterBySearch(selectedSuggestion || searchTerm);
    const uniqueQuantities = Array.from(new Set(results.map((p) => p.quantity).filter(Boolean))).sort((a, b) => parseFloat(a) - parseFloat(b));
    setQuantityFilters(uniqueQuantities);
    setActiveQuantities(new Set());
    setFilteredProducts(results);
    setDisplayedProducts(results.slice(0, PRODUCTS_PER_PAGE));
    setCurrentPage(1);
  }, [selectedStores, hasSearch, allProducts]);

  const parsePrice = (priceStr) => {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return Infinity;
    const onlyNumbers = priceStr.toString().replace(/[^0-9]/g, "");
    return onlyNumbers ? parseInt(onlyNumbers, 10) : Infinity;
  };

  const filterBySearch = (term) => {
    const currentPriceKey = 'price';
    const trimmed = term.trim().toLowerCase();
    const filtered = allProducts.filter((product) => {
      if (!selectedStores.has(product.store.toLowerCase())) return false;
      if (!trimmed) return true;
      const firstWord = product.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(" ")[0];
      return firstWord && firstWord.startsWith(trimmed);
    });
    
    const sorted = [...filtered].sort((a, b) => parsePrice(a[currentPriceKey]) - parsePrice(b[currentPriceKey]));
    setFilteredProducts(filtered);
    setDisplayedProducts(sorted.slice(0, PRODUCTS_PER_PAGE));
    setCurrentPage(1);
    return filtered;
  };
  
  const handleRefreshProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/products");
      if (!response.ok) throw new Error('La respuesta de la red no fue correcta');
      const all = await response.json();
      setAllProducts(all);
      const sorted = [...all].sort((a, b) => a.price - b.price);
      setFilteredProducts(all);
      setDisplayedProducts(sorted.slice(0, PRODUCTS_PER_PAGE));
      setCurrentPage(1);
    } catch (error) {
      console.error('Error refrescando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedSuggestion("");
    
    if (!value.trim()) {
      setSuggestions([]);
      setHasSearch(false);
      setQuantityFilters([]);
      const filtered = allProducts.filter(product => selectedStores.has(product.store));
      const sorted = [...filtered].sort((a, b) => a.price - b.price);
      setFilteredProducts(filtered);
      setDisplayedProducts(sorted.slice(0, PRODUCTS_PER_PAGE));
      setCurrentPage(1);
      return;
    }
    
    const trimmed = value.trim().toLowerCase();
    const firstWords = Array.from(
      new Set(
        allProducts
          .map(p => p.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(" ")[0])
          .filter(word => word && word.startsWith(trimmed))
      )
    ).slice(0, 5);
    setSuggestions(firstWords);
  };

  const handleProductSearch = async (e) => {
    e.preventDefault();
    if (!selectedSuggestion) return;
    setHasSearch(true);
    filterBySearch(selectedSuggestion);
    const results = filterBySearch(selectedSuggestion);
    const uniqueQuantities = Array.from(new Set(results.map((p) => p.quantity).filter(Boolean))).sort(
      (a, b) => parseFloat(a) - parseFloat(b)
    );
    setQuantityFilters(uniqueQuantities);
    setActiveQuantities(new Set());

    if (!isLoggedIn) {
      setSearchCount(prev => {
        const newCount = prev + 1;
        if (newCount >= 3) setShowModal(true);
        return newCount;
      });
    }
    
    await Busquedas(selectedSuggestion.trim().toLowerCase(), currentUserDoc);
    
    setSuggestions([]);
  };

  const handleGoToRegister = () => {
    setShowModal(false);
    navigate("/formularioregistro");
  };

  const handleQuantityFilter = (qty) => {
    setActiveQuantities((prev) => {
      const next = new Set(prev);
      if (next.has(qty)) next.delete(qty);
      else next.add(qty);
      const baseResults = filterBySearch(selectedSuggestion || searchTerm);
      const finalResults = next.size > 0
        ? baseResults.filter((p) => p.quantity && next.has(p.quantity))
        : baseResults;
      setFilteredProducts(finalResults);
      setDisplayedProducts(finalResults.slice(0, PRODUCTS_PER_PAGE));
      setCurrentPage(1);
      return next;
    });
  };

  const handleClearQuantityFilter = () => {
    setActiveQuantities(new Set());
    if (!hasSearch) {
      setQuantityFilters([]);
      const filtered = allProducts.filter(product => selectedStores.has(product.store));
      const sorted = [...filtered].sort((a, b) => a.price - b.price);
      setFilteredProducts(filtered);
      setDisplayedProducts(sorted.slice(0, PRODUCTS_PER_PAGE));
    } else {
      const results = filterBySearch(selectedSuggestion || searchTerm);
      setFilteredProducts(results);
      setDisplayedProducts(results.slice(0, PRODUCTS_PER_PAGE));
    }
    setCurrentPage(1);
  };

  const loadMoreProducts = () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    const startIndex = currentPage * PRODUCTS_PER_PAGE;
    const nextProducts = filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
    if (nextProducts.length > 0) {
      setDisplayedProducts(prev => [...prev, ...nextProducts]);
      setCurrentPage(prev => prev + 1);
    }
    setIsLoadingMore(false);
  };

  const handleAddToCart = (product) => {
    const stores = ["unimarc", "tottus", "jumbo", "acuenta"];
    const stopWords = ["de","con","sin","y","el","la","los","las","para","n°","fideos","pasta","por","del","al","en"];
    const normalizeTitle = (title) => title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/n\s*°\s*\d+/gi,"").replace(/(\d+(?:[.,]?\d+)?)\s?(ml|l|kg|g|grs?)/gi,"").split(/\s+/).filter(w => w.length>2 && !stopWords.includes(w));
    const extractBrand = (title) => {
      const words = normalizeTitle(title);
      return words.reverse().find(w => w) || null;
    };
    const extractQty = (title) => {
      const regex = /(\d+(?:[.,]?\d+)?)\s?(ml|l|kg|g|grs?)/i;
      const match = title.match(regex);
      if(!match) return null;
      let value = parseFloat(match[1].replace(",","."));
      let unit = match[2].toLowerCase();
      if(unit === "l") value *= 1000;
      if(unit === "kg") value *= 1000;
      return value;
    };
    const extractDisplayPrice = (prod) => prod.formattedPrice || prod.price;
    const productWords = normalizeTitle(product.title);
    const productQty = extractQty(product.title);
    const productBrand = extractBrand(product.title);
    stores.forEach((store) => {
      const candidates = allProducts.filter(p => p.store.toLowerCase() === store);
      let bestMatch = null;
      let bestScore = -Infinity;
      candidates.forEach((cand) => {
        const candWords = normalizeTitle(cand.title);
        const candQty = extractQty(cand.title);
        const commonWords = productWords.filter(w => candWords.includes(w));
        const minWordsMatch = Math.min(6, productWords.length);
        const wordScore = commonWords.length / minWordsMatch;
        const qtyPenalty = productQty && candQty ? Math.abs(productQty - candQty)/Math.max(productQty, candQty) : 0;
        const qtyScore = 1 - qtyPenalty;
        const brandBonus = productBrand && candWords.includes(productBrand.toLowerCase()) ? 0.5 : 0;
        const finalScore = wordScore * 0.5 + qtyScore * 0.4 + brandBonus * 0.1;
        if(finalScore > bestScore){
          bestScore = finalScore;
          bestMatch = cand;
        }
      });
      const item = bestMatch
        ? { ...bestMatch, quantity: 1, displayPrice: extractDisplayPrice(bestMatch), link: bestMatch.link || "#" }
        : { ...product, quantity: 1, displayPrice: extractDisplayPrice(product), link: product.link || "#" };
      if(store === "unimarc") setCarritoUnimarc([item]);
      if(store === "tottus") setCarritoTottus([item]);
      if(store === "jumbo") setCarritoJumbo([item]);
      if(store === "acuenta") setCarritoAcuenta([item]);
    });
  };

  const handleAddToLateralCart = (product) => {
    const parseUnitPrice = (prod) => {
      const cp = Number(prod.price);
      if (!isNaN(cp) && cp >= 50) return cp;
      const text = [prod.formattedPrice, prod.price, prod.title].filter(Boolean).join(" ");
      const regex = /\$?\s*([\d]{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?)/g;
      const matches = [...text.matchAll(regex)];
      if (matches.length === 0) return cp || 0;
      const withDollar = [];
      const withoutDollar = [];
      for (const m of matches) {
        const full = m[0];
        const num = m[1];
        const raw = (num || full).toString().trim();
        const normalized = raw.replace(/\./g, "").replace(/,/g, "");
        const val = parseInt(normalized, 10);
        if (!isNaN(val)) {
          if (/\$/.test(full)) withDollar.push(val);
          else withoutDollar.push(val);
        }
      }
      const candidates = withDollar.length ? withDollar : withoutDollar;
      if (candidates.length === 0) return cp || 0;
      const chosen = candidates[candidates.length - 1];
      if (chosen < 50) {
        const maxCandidate = Math.max(...candidates);
        if (maxCandidate >= 50) return maxCandidate;
      }
      return chosen;
    };
    setCarritoLateral((prev) => {
      const updated = { ...prev };
      const store = (product.store || "").toLowerCase();
      if (!updated[store]) updated[store] = [];
      const unitPrice = parseUnitPrice(product);
      const unitPriceFormatted = `$${unitPrice.toLocaleString()}`;
      const idx = updated[store].findIndex((it) => it.title === product.title);
      if (idx !== -1) {
        const arr = [...updated[store]];
        arr[idx] = { ...arr[idx], quantity: (arr[idx].quantity || 0) + 1, displayPrice: unitPrice, formattedPrice: unitPriceFormatted };
        updated[store] = arr;
      } else {
        updated[store] = [ ...updated[store], { ...product, quantity: 1, displayPrice: unitPrice, formattedPrice: unitPriceFormatted }];
      }
      console.log("🛒 Agregado:", product.title, "| Detectado:", unitPrice, unitPriceFormatted);
      return updated;
    });
  };

  return (
    <div className="App_container">
      <div className="App_nav-panel">
        <div className="App_nav-left">
          Última actualización: <strong>{getTodayDate()}</strong>
        </div>
        <div className="App_nav-right">
          {isLoggedIn ? (
            <>
              <Link to="/usuario" className="App_user-info" style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}>
                <FaUserCircle className="App_user-icon" /> {userName}
              </Link>
              {userRole === "cliente" && (
                <Link to="/dashboard" className="App_dashboard-link" title="Ir al dashboard">
                  <FaTachometerAlt />
                </Link>
              )}
              {userRole === "admin" && (
                 <Link to="/admin" className="App_dashboard-link" title="Ir a Administrador">
                    Admin
                 </Link>
              )}
              <button onClick={handleUserLogout} className="App_logout-button" title="Cerrar sesión">
                <FaSignOutAlt />
              </button>
            </>
          ) : (
            <Link to="/formularioregistro" className="App_dashboard-link">Iniciar / Registrar</Link>
          )}
        </div>
      </div>
      
      <h1 className="App_main-title">Catálogo de Productos</h1>

      <form className="App_search-container" onSubmit={handleProductSearch}>
        <div className="App_search-input-wrapper">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchTerm('');
                setSelectedSuggestion('');
                setHasSearch(false);
                setQuantityFilters([]);
                setSuggestions([]);
              }
            }}
            className="App_search-input"
          />
          {suggestions.length > 0 && (
            <div className="App_suggestions-list">
              {suggestions.map((sugg) => (
                <div
                  key={sugg}
                  className="App_suggestion-item"
                  onClick={() => {
                    setSearchTerm(sugg);
                    setSelectedSuggestion(sugg);
                    setSuggestions([]);
                  }}
                >
                  {sugg}
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className="App_search-button" disabled={!selectedSuggestion}>
          Buscar
        </button>
        <button type="button" className="App_refresh-button" onClick={handleRefreshProducts}>
          Refresh
        </button>
      </form>

      {quantityFilters.length > 0 && (
        <div className="App_quantity-filters-container">
          <div className="App_quantity-filters-scroll">
            {quantityFilters.map((qty) => (
              <button
                key={qty}
                className={`App_filter-button ${activeQuantities.has(qty) ? "active" : ""}`}
                onClick={() => handleQuantityFilter(qty)}
              >
                {qty}
              </button>
            ))}
          </div>
          <button className="App_clear-filter" onClick={handleClearQuantityFilter}>
            Limpiar filtro
          </button>
        </div>
      )}

      <div className="App_main-content">
        <div className="App_sidebar">
          {hasSearch && (
            <div className="App_filters-panel">
              <h3 className="App_filters-title">Filtrar por Supermercado</h3>
              <div className="App_store-filters">
                {['Unimarc', 'Tottus', 'Jumbo', 'Acuenta'].map(store => (
                  <label key={store} className="App_store-filter-item">
                    <input
                      type="checkbox"
                      checked={selectedStores.has(store.toLowerCase())}
                      onChange={() => {
                        setSelectedStores(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(store.toLowerCase())) newSet.delete(store.toLowerCase());
                          else newSet.add(store.toLowerCase());
                          return newSet;
                        });
                      }}
                    />
                    <span className="App_store-filter-label">{store}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="carrito-lateral">
            <h3 className="carrito-lateral__titulo">Carrito Lateral</h3>
            {Object.keys(carritoLateral).length === 0 ? (
              <p className="carrito-lateral__vacio">No hay productos agregados.</p>
            ) : (
              <>
                {Object.keys(carritoLateral).map((store) => (
                  <div key={store} className="carrito-lateral__store-section">
                    <h4 className="carrito-lateral__store-name">{store}</h4>
                    <div className="carrito-lateral__items">
                      {carritoLateral[store].map((item, i) => (
                        <div key={`lc-${store}-${i}`} className="carrito-lateral__item">
                          {item.image && <img src={item.image} alt={item.title} className="carrito-lateral__item-img" />}
                          <div className="carrito-lateral__item-info">
                            <p className="carrito-lateral__item-title">{item.title}</p>
                            <p className="carrito-lateral__item-precio">
                              {item.quantity} x ${item.displayPrice?.toLocaleString() || item.price?.toLocaleString()}
                            </p>
                            {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="carrito-lateral__item-link">Ver producto</a>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="carrito-lateral__subtotal">
                      <strong>Subtotal {store}:</strong> ${carritoLateral[store].reduce((acc, item) => acc + (item.displayPrice || item.price) * item.quantity, 0).toLocaleString()}
                    </p>
                    <hr className="carrito-lateral__divider" />
                  </div>
                ))}
                <p className="carrito-lateral__total">
                  <strong>Total:</strong> ${Object.values(carritoLateral).flat().reduce((acc, item) => acc + (item.displayPrice || item.price) * item.quantity, 0).toLocaleString()}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="App_products-grid">
          {loading ? <p>Cargando productos...</p> : displayedProducts.length > 0 ? (
            <>
              {displayedProducts.map((product, index) => (
                <ProductCard
                  key={product._id || `App-${product.store}-${index}`}
                  product={product}
                  onAdd={handleAddToCart}
                  onAddToClientCart={handleAddToLateralCart}
                />
              ))}
              {isLoadingMore && <div className="App_loading-more">Cargando más productos...</div>}
            </>
          ) : (
            <p className="App_no-results">No se encontraron productos.</p>
          )}
        </div>

        <div className="App_cart">
          <h2 className="App_cart-title">Carrito Cotizador Rápido</h2>
          <div>
            <h3>Unimarc</h3>
            {carritoUnimarc.map((item, i) => (
              <div key={`u-${i}`} className="App_cart-item">
                {item.image && <img src={item.image} alt={item.title} />}
                <p>{item.title}</p>
                <p>Precio: {item.displayPrice || item.price} | Cant: {item.quantity}</p>
                <a href={item.link} target="_blank" rel="noopener noreferrer">Ver producto</a>
              </div>
            ))}
          </div>
          <div>
            <h3>Tottus</h3>
            {carritoTottus.map((item, i) => (
              <div key={`t-${i}`} className="App_cart-item">
                {item.image && <img src={item.image} alt={item.title} />}
                <p>{item.title}</p>
                <p>Precio: {item.displayPrice || item.price} | Cant: {item.quantity}</p>
                <a href={item.link} target="_blank" rel="noopener noreferrer">Ver producto</a>
              </div>
            ))}
          </div>
          <div>
            <h3>Jumbo</h3>
            {carritoJumbo.map((item, i) => (
              <div key={`j-${i}`} className="App_cart-item">
                {item.image && <img src={item.image} alt={item.title} />}
                <p>{item.title}</p>
                <p>Precio: {item.displayPrice || item.price} | Cant: {item.quantity}</p>
                <a href={item.link} target="_blank" rel="noopener noreferrer">Ver producto</a>
              </div>
            ))}
          </div>
          <div>
            <h3>Acuenta</h3>
            {carritoAcuenta.map((item, i) => (
              <div key={`a-${i}`} className="App_cart-item">
                {item.image && <img src={item.image} alt={item.title} />}
                <p>{item.title}</p>
                <p>Precio: {item.displayPrice || item.price} | Cant: {item.quantity}</p>
                <a href={item.link} target="_blank" rel="noopener noreferrer">Ver producto</a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isLoggedIn && showModal && (
        <div className="ventana-emergente-overlay">
          <div className="ventana-emergente-modal">
            <h2>¡Mejora tu experiencia!</h2>
            <p>Regístrate para acceder a más funciones.</p>
            <button onClick={handleGoToRegister} className="ventana-emergente-boton">
              Ir al registro
            </button>
            <button onClick={() => setShowModal(false)} className="ventana-emergente-boton-cerrar">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showProfileModal && isLoggedIn && (
        <div className="modal-overlay" onClick={handleCloseProfile}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseProfile}>X</button>
            <Formularioregistro
              mode="edit"
              initialData={currentUserDoc}
              onClose={handleCloseProfile}
              onSave={handleProfileSaved}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;