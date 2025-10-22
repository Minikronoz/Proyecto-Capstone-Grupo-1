// App.js
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductCard from "./ProductCard";
import Formularioregistro from "./Formularioregistro";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import { signOut } from "firebase/auth";
import "./App.css";
import { Busquedas } from "./utils/Busquedas";
import { FaUserCircle, FaTachometerAlt, FaSignOutAlt } from "react-icons/fa";
import Usuario from "./Usuario";

function App() {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [userName, setUserName] = useState("Invitado");
  const [userRole, setUserRole] = useState(null);
  const [quantityFilters, setQuantityFilters] = useState([]);
  const [activeQuantities, setActiveQuantities] = useState(new Set());
  const [searchCount, setSearchCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedStores, setSelectedStores] = useState(new Set(['unimarc', 'tottus', 'jumbo', 'acuenta']));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasSearch, setHasSearch] = useState(false); // Flag para saber si hay búsqueda activa


  // Perfil / auth
  const [currentAuthUser, setCurrentAuthUser] = useState(null); // firebase auth user
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserDoc, setCurrentUserDoc] = useState(null); // firestore doc data
  const [currentUserDocId, setCurrentUserDocId] = useState(null); // firestore doc id
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Carrito separado por supermercado
  const [carritoUnimarc, setCarritoUnimarc] = useState([]);
  const [carritoTottus, setCarritoTottus] = useState([]);
  const [carritoJumbo, setCarritoJumbo] = useState([]);
  const [carritoAcuenta, setCarritoAcuenta] = useState([]);
// Carrito lateral general (panel izquierdo)
  const [carritoLateral, setCarritoLateral] = useState([]);

  // Agregar estos estados nuevos junto a los otros
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PRODUCTS_PER_PAGE = 300;

  const navigate = useNavigate();

  const getTodayDate = () => {
    const today = new Date();
    return today.toLocaleDateString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
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

  // --- AUTH: observar cambios en el estado de auth y cargar doc de usuario ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentAuthUser(user);
      setIsLoggedIn(!!user);
      if (!user) {
        setUserName("Invitado");
        setUserRole(null);
        setCurrentUserDoc(null);
        setCurrentUserDocId(null);
        return;
      }

      // buscar doc en collection 'usuarios' donde email === user.email
      try {
        // Intentar obtener datos del usuario de Firestore
        const q = query(collection(db, "usuarios"), where("email", "==", user.email));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const data = docSnap.data();
          setCurrentUserDoc(data);
          setCurrentUserDocId(docSnap.id);
          setUserName(data.nombre || data.email || "Usuario");
          setUserRole(data.role || "usuario");
          // opcional: persistencia local
          localStorage.setItem("ventana-emergente-usuario-nombre", data.nombre || "Usuario");
          localStorage.setItem("ventana-emergente-usuario-rol", data.role || "usuario");
        } else {
          // si no existe doc en 'usuarios', usar datos del auth
          setCurrentUserDoc({ email: user.email });
          setCurrentUserDocId(null);
          setUserName(user.email || "Usuario");
          setUserRole("usuario");
          console.log("Usuario no encontrado en Firestore, usando datos de autenticación.");
        }
      } catch (err) {
        // Si hay error de permisos, usar datos de la autenticación
        console.error("Error obteniendo datos de usuario:", err);
        
        // Obtener información del localStorage o utilizar datos de auth
        const nombreGuardado = localStorage.getItem("ventana-emergente-usuario-nombre");
        const rolGuardado = localStorage.getItem("ventana-emergente-usuario-rol");
        
        setCurrentUserDoc({ email: user.email });
        setCurrentUserDocId(null);
        setUserName(nombreGuardado || user.email || "Usuario");
        setUserRole(rolGuardado || "usuario");
        
        console.log("Usando datos de auth y localStorage debido a error de permisos.");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUserLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
    } catch (err) {
      console.error("Error cerrando sesión:", err);
    }
    localStorage.removeItem("ventana-emergente-usuario-nombre");
    localStorage.removeItem("ventana-emergente-usuario-rol");
    setUserName("Invitado");
    setUserRole(null);
    setCurrentUserDoc(null);
    setCurrentUserDocId(null);
    navigate("/formularioregistro");
  };

  const handleOpenProfile = () => {
    if (!currentAuthUser) {
      // si no está logueado, redirigir a la pantalla de registro/login
      navigate("/formularioregistro");
      return;
    }
    setShowProfileModal(true);
  };
  const handleCloseProfile = () => setShowProfileModal(false);

  // --- Cargar productos desde JSONs ---
  // Cargar productos
  const [sortedProducts, setSortedProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Obtener productos desde el API conectado a MongoDB
        const [unimarcRes, tottusRes, jumboRes, acuentaRes] = await Promise.all([
          fetch("http://localhost:3000/api/products?store=unimarc"),
          fetch("http://localhost:3000/api/products?store=tottus"),
          fetch("http://localhost:3000/api/products?store=jumbo"),
          fetch("http://localhost:3000/api/products?store=acuenta"),
        ]);

        const unimarcData = await unimarcRes.json();
        const tottusData = await tottusRes.json();
        const jumboData = await jumboRes.json();
        const acuentaData = await acuentaRes.json();

        const all = [
          ...unimarcData.map(p => ({ ...p, store: "unimarc", quantity: extractQuantity(p.title) })),
          ...tottusData.map(p => ({ ...p, store: "tottus", quantity: extractQuantity(p.title) })),
          ...jumboData.map(p => ({ ...p, store: "jumbo", quantity: extractQuantity(p.title) })),
          ...acuentaData.map(p => ({ ...p, store: "acuenta", quantity: extractQuantity(p.title) })),
        ];

        setAllProducts(all);
        const sorted = [...all].sort((a, b) => parsePrice(a.currentPrice) - parsePrice(b.currentPrice));
        setSortedProducts(sorted);
        setFilteredProducts(all);
        setDisplayedProducts(sorted.slice(0, PRODUCTS_PER_PAGE));
        setCurrentPage(1);

        setTimeout(() => setShowModal(true), 60000);
      } catch (err) {
        console.error("Error cargando productos desde MongoDB:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  // Agregar evento de scroll
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
        }, 60000); // 1 minuto
        return () => clearTimeout(timer);
      }
    }, [isLoggedIn]);
    
// --- Nuevo useEffect: actualizar filtro al cambiar supermercados ---
useEffect(() => {
  // SIEMPRE verificar hasSearch primero y forzar que no haya filtros si no hay búsqueda
  if (!hasSearch) {
    // Asegurarse de que no haya filtros de cantidad visibles
    setQuantityFilters([]);
    setActiveQuantities(new Set());
    
    // Si no hay supermercados seleccionados, no mostrar nada
    if (selectedStores.size === 0) {
      setFilteredProducts([]);
      setDisplayedProducts([]);
      return;
    }
    
    // Filtrar productos solo por supermercado (sin búsqueda activa)
    const filtered = allProducts.filter(product => selectedStores.has(product.store));
    const sorted = [...filtered].sort((a, b) => parsePrice(a.currentPrice) - parsePrice(b.currentPrice));
    setFilteredProducts(filtered);
    setDisplayedProducts(sorted.slice(0, PRODUCTS_PER_PAGE));
    setCurrentPage(1);
    return;
  }

  // Si hay búsqueda activa, continuamos con el comportamiento normal
  
  // Si no hay supermercados seleccionados, no mostrar nada
  if (selectedStores.size === 0) {
    setFilteredProducts([]);
    setDisplayedProducts([]);
    setQuantityFilters([]);
    setActiveQuantities(new Set());
    return;
  }

  // Aplicar el filtro usando los valores actuales
  const results = filterBySearch(selectedSuggestion || searchTerm);

  // Recalcular cantidades disponibles en base a resultados (solo con búsqueda activa)
  const uniqueQuantities = Array.from(new Set(results.map((p) => p.quantity).filter(Boolean))).sort(
    (a, b) => parseFloat(a) - parseFloat(b)
  );
  setQuantityFilters(uniqueQuantities);

  // Reiniciar selección de cantidades al cambiar supermercados
  setActiveQuantities(new Set());

  setFilteredProducts(results);
  setDisplayedProducts(results.slice(0, PRODUCTS_PER_PAGE));
  setCurrentPage(1);
}, [selectedStores, hasSearch, allProducts]);


  const parsePrice = (priceStr) => {
    if (!priceStr) return Infinity;
    const onlyNumbers = priceStr.toString().replace(/[^0-9]/g, "");
    return onlyNumbers ? parseInt(onlyNumbers, 10) : Infinity;
  };

  // Modificar la función filterBySearch
  const filterBySearch = (term) => {
    const trimmed = term.trim().toLowerCase();
    const filtered = allProducts.filter((product) => {
      // Primero verificar si la tienda está seleccionada
      if (!selectedStores.has(product.store.toLowerCase())) return false;
      
      // Luego aplicar filtro de búsqueda si existe
      if (!trimmed) return true;
      const firstWord = product.title.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .split(" ")[0];
      return firstWord && firstWord.startsWith(trimmed);
    });
    
    const sorted = [...filtered].sort((a, b) => parsePrice(a.currentPrice) - parsePrice(b.currentPrice));
    setSortedProducts(sorted);
    setFilteredProducts(filtered);
    // Resetear la paginación y mostrar los primeros productos
    setDisplayedProducts(sorted.slice(0, PRODUCTS_PER_PAGE));
    setCurrentPage(1);
    return filtered;
  };

  //función para refrescar catálogos
  const refreshCatalogs = async () => {
    setIsRefreshing(true);
    try {
      const stores = ['unimarc', 'tottus', 'jumbo', 'acuenta'];
      await Promise.all(stores.map(store => 
        fetch(`http://localhost:3000/api/scrape/${store}`, { method: 'POST' })
      ));
      // Recargar productos después de actualizar
      await fetchProducts();
    } catch (error) {
      console.error('Error actualizando catálogos:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Añadido funcion handleRefreshProducts 
  const handleRefreshProducts = async () => {
    setLoading(true);
    try {
      // Obtener productos desde el API conectado a MongoDB
      const [unimarcRes, tottusRes, jumboRes, acuentaRes] = await Promise.all([
        fetch("http://localhost:3000/api/products?store=unimarc"),
        fetch("http://localhost:3000/api/products?store=tottus"),
        fetch("http://localhost:3000/api/products?store=jumbo"),
        fetch("http://localhost:3000/api/products?store=acuenta"),
      ]);

      const unimarcData = await unimarcRes.json();
      const tottusData = await tottusRes.json();
      const jumboData = await jumboRes.json();
      const acuentaData = await acuentaRes.json();

      const all = [
        ...unimarcData.map(p => ({ ...p, store: "unimarc", quantity: extractQuantity(p.title) })),
        ...tottusData.map(p => ({ ...p, store: "tottus", quantity: extractQuantity(p.title) })),
        ...jumboData.map(p => ({ ...p, store: "jumbo", quantity: extractQuantity(p.title) })),
        ...acuentaData.map(p => ({ ...p, store: "acuenta", quantity: extractQuantity(p.title) })),
      ];

      setAllProducts(all);
      const sorted = [...all].sort((a, b) => parsePrice(a.currentPrice) - parsePrice(b.currentPrice));
      setSortedProducts(sorted);
      setFilteredProducts(all);
      setDisplayedProducts(sorted.slice(0, PRODUCTS_PER_PAGE));
      setCurrentPage(1);
      
      if (!hasSearch) {
        setQuantityFilters([]);
        setActiveQuantities(new Set());
      }
    } catch (error) {
      console.error('Error refreshing products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedSuggestion("");
    
    // Si el usuario borra todo el texto, reiniciar el estado de búsqueda
    if (!value.trim()) {
      setSuggestions([]);
      // Reiniciar el estado de búsqueda cada vez que se borra completamente el texto
      setHasSearch(false);
      setQuantityFilters([]); // Ocultar los filtros de cantidad
      
      // Mostrar todos los productos filtrados solo por supermercados seleccionados
      const filtered = allProducts.filter(product => selectedStores.has(product.store));
      const sorted = [...filtered].sort((a, b) => parsePrice(a.currentPrice) - parsePrice(b.currentPrice));
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
          .filter(word => word.startsWith(trimmed))
      )
    ).slice(0, 5);
    setSuggestions(firstWords);
  };

  const handleProductSearch = async (e) => {
    e.preventDefault();
    if (!selectedSuggestion) return;
    
    setHasSearch(true);
    const results = filterBySearch(selectedSuggestion);
    setFilteredProducts(results);
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
    
// Obtener datos del usuario si está logueado
let usuarioInfo = null;
if (currentAuthUser && currentUserDoc) {
  // Calcular edad si existe fechaNacimiento
  let edad = null;
  if (currentUserDoc.fechaNacimiento) {
    const nacimiento = new Date(currentUserDoc.fechaNacimiento);
    const hoy = new Date();
    edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
  }

  usuarioInfo = {
    usuarioRut: currentUserDoc.rut || null,
    nombre: currentUserDoc.nombre || null,
    apellido: currentUserDoc.apellido || null,
    edad: edad,
    sexo: currentUserDoc.sexo || null,
    region: currentUserDoc.negocios?.[0]?.region || currentUserDoc.region || null,
    comuna: currentUserDoc.negocios?.[0]?.comuna || currentUserDoc.comuna || null,
    sector: currentUserDoc.negocios?.[0]?.sector || currentUserDoc.sector || null
  };
}

// Registrar la búsqueda con la información del usuario
await Busquedas(selectedSuggestion.trim().toLowerCase(), usuarioInfo);

setSuggestions([]);

  };

  const handleGoToRegister = () => {
    setShowModal(false);
    navigate("/formularioregistro");
  };

  // Modificar handleQuantityFilter a multi-selección (toggle)
  const handleQuantityFilter = (qty) => {
    setActiveQuantities((prev) => {
      const next = new Set(prev);
      if (next.has(qty)) {
        next.delete(qty);
      } else {
        next.add(qty);
      }

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

  // Modificar handleClearQuantityFilter
  const handleClearQuantityFilter = () => {
    setActiveQuantities(new Set());
    
    if (!hasSearch) {
      // Si no hay búsqueda activa, no mostrar filtros de cantidad
      setQuantityFilters([]);
      
      // Solo filtrar por supermercado
      const filtered = allProducts.filter(product => selectedStores.has(product.store));
      const sorted = [...filtered].sort((a, b) => parsePrice(a.currentPrice) - parsePrice(b.currentPrice));
      setFilteredProducts(filtered);
      setDisplayedProducts(sorted.slice(0, PRODUCTS_PER_PAGE));
    } else {
      // Si hay búsqueda activa, aplicar filtro normal
      const results = filterBySearch(selectedSuggestion || searchTerm);
      setFilteredProducts(results);
      setDisplayedProducts(results.slice(0, PRODUCTS_PER_PAGE));
    }
    
    setCurrentPage(1);
  };

  // Modificar loadMoreProducts para usar filteredProducts en lugar de sortedProducts
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

//Funcion carrito zotizador


const handleAddToCart = (product) => {
  const stores = ["unimarc", "tottus", "jumbo", "acuenta"];
  const stopWords = ["de","con","sin","y","el","la","los","las","para","n°","fideos","pasta","por","del","al","en"];

  // Normaliza título y remueve palabras irrelevantes y cantidades
  const normalizeTitle = (title) => {
    return title.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g,"")
                .replace(/n\s*°\s*\d+/gi,"")
                .replace(/(\d+(?:[.,]?\d+)?)\s?(ml|l|kg|g|grs?)/gi,"") // remover cantidades
                .split(/\s+/)
                .filter(w => w.length>2 && !stopWords.includes(w));
  }

  // Extrae marca (última palabra significativa)
  const extractBrand = (title) => {
    const words = normalizeTitle(title);
    return words.reverse().find(w => w) || null;
  }

  // Extrae cantidad y la convierte a gramos/ml
  const extractQty = (title) => {
    const regex = /(\d+(?:[.,]?\d+)?)\s?(ml|l|kg|g|grs?)/i;
    const match = title.match(regex);
    if(!match) return null;
    let value = parseFloat(match[1].replace(",","."));
    let unit = match[2].toLowerCase();
    if(unit === "l") value *= 1000; // litros a ml
    if(unit === "kg") value *= 1000; // kg a g
    return value;
  }

  const extractDisplayPrice = (prod) => prod.formattedPrice || prod.currentPrice;

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

      // Coincidencia de palabras sin importar el orden
      const commonWords = productWords.filter(w => candWords.includes(w));
      const minWordsMatch = Math.min(6, productWords.length); // mínimo 6 palabras o menos si el nombre es corto
      const wordScore = commonWords.length / minWordsMatch;

      // Penalización por diferencia de cantidad (prioridad máxima)
      const qtyPenalty = productQty && candQty ? Math.abs(productQty - candQty)/Math.max(productQty, candQty) : 0;
      const qtyScore = 1 - qtyPenalty; // mayor peso si la cantidad coincide

      // Bonus por marca
      const brandBonus = productBrand && candWords.includes(productBrand.toLowerCase()) ? 0.5 : 0;

      // Score final
      const finalScore = wordScore * 0.5 + qtyScore * 0.4 + brandBonus * 0.1;

      if(finalScore > bestScore){
        bestScore = finalScore;
        bestMatch = cand;
      }
    });

    // Si no hay coincidencia suficiente, agregar el producto seleccionado tal cual
    const item = bestMatch
      ? {
          ...bestMatch,
          quantity: 1,
          displayPrice: extractDisplayPrice(bestMatch),
          link: bestMatch.link || "#"
        }
      : {
          ...product,
          quantity: 1,
          displayPrice: extractDisplayPrice(product),
          link: product.link || "#"
        };

    // Actualizar carrito
    if(store === "unimarc") setCarritoUnimarc([item]);
    if(store === "tottus") setCarritoTottus([item]);
    if(store === "jumbo") setCarritoJumbo([item]);
    if(store === "acuenta") setCarritoAcuenta([item]);
  });
}

    // Función para agregar al carrito lateral

const handleAddToLateralCart = (product) => {
  // --- parser robusto para extraer el precio correcto ---
  const parseUnitPrice = (prod) => {
    // 1) si currentPrice ya es razonable (>= 50), úsalo
    const cp = Number(prod.currentPrice);
    if (!isNaN(cp) && cp >= 50) return cp;

    // 2) armar un texto de donde parsear
    const text = [
      prod.formattedPrice,
      prod.price,
      prod.displayPriceStr,
      prod.title
    ].filter(Boolean).join(" ");

    // Buscar TODOS los números con o sin $, ejemplo: "2 x $2.000", "$1.490", "Precio: 3.590"
    const regex = /\$?\s*([\d]{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?)/g;
    const matches = [...text.matchAll(regex)];

    if (matches.length === 0) return cp || 0;

    // Separar en dos grupos: con $ y sin $
    const withDollar = [];
    const withoutDollar = [];
    for (const m of matches) {
      const full = m[0];     // ej: "$2.000" o "2.000" o "2"
      const num = m[1];      // parte numérica capturada
      const raw = (num || full).toString().trim();

      // normalizar separadores chilenos: "." de miles, "," (si apareciera) se ignora
      const normalized = raw.replace(/\./g, "").replace(/,/g, "");
      const val = parseInt(normalized, 10);

      if (!isNaN(val)) {
        if (/\$/.test(full)) withDollar.push(val);
        else withoutDollar.push(val);
      }
    }

    // Preferimos los que tienen $, si no hay, usamos los otros
    const candidates = withDollar.length ? withDollar : withoutDollar;

    if (candidates.length === 0) return cp || 0;

    // TOMAMOS EL ÚLTIMO candidato (en "2 x $2.000" el último es 2000, que queremos)
    const chosen = candidates[candidates.length - 1];

    // Si chosen es demasiado chico (1..49), probablemente es la cantidad "2" — intenta usar el mayor
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
      arr[idx] = {
        ...arr[idx],
        quantity: (arr[idx].quantity || 0) + 1,
        displayPrice: unitPrice,                     // numérico para cálculos
        formattedPrice: unitPriceFormatted,          // texto para mostrar
      };
      updated[store] = arr;
    } else {
      updated[store] = [
        ...updated[store],
        {
          ...product,
          quantity: 1,
          displayPrice: unitPrice,
          formattedPrice: unitPriceFormatted,
        },
      ];
    }

    // Debug útil:
    console.log("🛒 Agregado:", product.title, "| Detectado:", unitPrice, unitPriceFormatted);
    return updated;
  });
};






  return (
    <div className="App_container">
      {/* NAV PANEL */}
      <div className="App_nav-panel">
        <div className="App_nav-left">
          Última actualización: <strong>{getTodayDate()}</strong>
        </div>

        <div className="App_nav-right">
                {currentAuthUser ? (
                  <Link to="/usuario" className="App_user-info" style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}>
                    <FaUserCircle className="App_user-icon" /> {userName || "Usuario"}
                  </Link>
          ) : (
            // si no está logueado: mostrar link a registro/login (si quieres ocultarlo por completo, comenta esta línea)
            <Link to="/formularioregistro" className="App_dashboard-link">Iniciar / Registrar</Link>
          )}

          {userRole === "cliente" && currentAuthUser && (
            <Link to="/dashboard" className="App_dashboard-link" title="Ir al dashboard">
              <FaTachometerAlt />
            </Link>
          )}

          {currentAuthUser && (
            <button onClick={handleUserLogout} className="App_logout-button" title="Cerrar sesión">
              <FaSignOutAlt />
            </button>
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
              // Si presiona ESC, limpiar la búsqueda
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

{/* Contenedor principal: filtros + grilla + carrito rápido */}
<div className="App_main-content">

  {/* === PANEL IZQUIERDO === */}
  <div className="App_sidebar">

    {/* FILTROS */}
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


{/* CARRITO LATERAL */}
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
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="carrito-lateral__item-img"
                  />
                )}
                <div className="carrito-lateral__item-info">
                  <p className="carrito-lateral__item-title">{item.title}</p>
                  <p className="carrito-lateral__item-precio">
                    {item.quantity} x ${item.displayPrice?.toLocaleString() || item.currentPrice?.toLocaleString()}
                  </p>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="carrito-lateral__item-link"
                    >
                      Ver producto
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="carrito-lateral__subtotal">
            <strong>Subtotal {store}:</strong> $
            {carritoLateral[store].reduce(
              (acc, item) => acc + (item.displayPrice || item.currentPrice) * item.quantity,
              0
            ).toLocaleString()}
          </p>

          <hr className="carrito-lateral__divider" />
        </div>
      ))}

      {/* Total general */}
      <p className="carrito-lateral__total">
        <strong>Total:</strong> $
        {Object.values(carritoLateral).flat().reduce(
          (acc, item) => acc + (item.displayPrice || item.currentPrice) * item.quantity,
          0
        ).toLocaleString()}
      </p>
    </>
  )}
</div>



  </div>

  {/* === GRILLA DE PRODUCTOS === */}
  <div className="App_products-grid">
    {displayedProducts.length > 0 ? (
      <>
        {displayedProducts.map((product, index) => (
          <ProductCard
            key={`App-${product.store}-${index}`}
            product={product}
            onAdd={handleAddToCart}
            onAddToClientCart={handleAddToLateralCart}
          />
        ))}
        {isLoadingMore && (
          <div className="App_loading-more">Cargando más productos...</div>
        )}
      </>
    ) : (
      <p className="App_no-results">No se encontraron productos.</p>
    )}
  </div>

  {/* === CARRITO COTIZADOR RÁPIDO (DERECHA) === */}
  <div className="App_cart">
    <h2 className="App_cart-title">Carrito Cotizador Rápido</h2>

    {/* UNIMARC */}
    <div>
      <h3>Unimarc</h3>
      {carritoUnimarc.map((item, i) => (
        <div key={`u-${i}`} className="App_cart-item">
          {item.image && <img src={item.image} alt={item.title} />}
          <p>{item.title}</p>
          <p>Precio: {item.displayPrice || item.currentPrice} | Cant: {item.quantity}</p>
          <a href={item.link} target="_blank" rel="noopener noreferrer">Ver producto</a>
        </div>
      ))}
    </div>

    {/* TOTTUS */}
    <div>
      <h3>Tottus</h3>
      {carritoTottus.map((item, i) => (
        <div key={`t-${i}`} className="App_cart-item">
          {item.image && <img src={item.image} alt={item.title} />}
          <p>{item.title}</p>
          <p>Precio: {item.displayPrice || item.currentPrice} | Cant: {item.quantity}</p>
          <a href={item.link} target="_blank" rel="noopener noreferrer">Ver producto</a>
        </div>
      ))}
    </div>

    {/* JUMBO */}
    <div>
      <h3>Jumbo</h3>
      {carritoJumbo.map((item, i) => (
        <div key={`j-${i}`} className="App_cart-item">
          {item.image && <img src={item.image} alt={item.title} />}
          <p>{item.title}</p>
          <p>Precio: {item.displayPrice || item.currentPrice} | Cant: {item.quantity}</p>
          <a href={item.link} target="_blank" rel="noopener noreferrer">Ver producto</a>
        </div>
      ))}
    </div>

    {/* ACUENTA */}
    <div>
      <h3>Acuenta</h3>
      {carritoAcuenta.map((item, i) => (
        <div key={`a-${i}`} className="App_cart-item">
          {item.image && <img src={item.image} alt={item.title} />}
          <p>{item.title}</p>
          <p>Precio: {item.displayPrice || item.currentPrice} | Cant: {item.quantity}</p>
          <a href={item.link} target="_blank" rel="noopener noreferrer">Ver producto</a>
        </div>
      ))}
    </div>
  </div>
</div>


<div className="App_sidebar">
  <div className="App_filters">
    {/* Aquí van tus filtros */}
  </div>
</div>




        {/* Ventana emergente registro */}
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


      {/* Modal de edición de perfil */}
      {showProfileModal && currentAuthUser && (
        <div className="modal-overlay" onClick={handleCloseProfile}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseProfile}>X</button>
            <Formularioregistro
              mode="edit"
              initialData={currentUserDoc}
              docId={currentUserDocId}
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
