import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, ReferenceLine, Legend
} from "recharts";
import { auth, db } from './firebase';
import { doc, getDoc, query, collection, where, getDocs } from "firebase/firestore";

// Componente para mostrar actividad en todas las regiones del usuario
function RegionActivityCards({ busquedas, userBusinessLocations, filtrosPersonalizados }) {
  if (!busquedas || !userBusinessLocations || userBusinessLocations.length === 0) {
    return <p>No hay datos de ubicación disponibles</p>;
  }

  // Agrupar búsquedas por región
  const busquedasPorRegion = userBusinessLocations.map(location => {
    // Filtrar búsquedas por región y comuna
    const busquedasFiltradas = busquedas.filter(b => {
      if (!filtrosPersonalizados) return true;
      return (
        b.usuarioInfo && 
        b.usuarioInfo.region === location.region && 
        (!location.comuna || b.usuarioInfo.comuna === location.comuna)
      );
    });
    
    return {
      region: location.region,
      comuna: location.comuna,
      count: busquedasFiltradas.length
    };
  });

  return (
    <div className="dashboard-region-cards">
      {busquedasPorRegion.map((item, index) => (
        <div key={index} className="card small">
          <h2>Actividad en {item.region}</h2>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#e67e22", textAlign: "center" }}>
            {item.count} búsquedas
            <span style={{ display: 'block', fontSize: '1rem', color: '#7f8c8d' }}>
              en {item.comuna || "toda la región"}
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  const [busquedas, setBusquedas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [busquedasPorDia, setBusquedasPorDia] = useState([]);
  const [terminosMasBuscados, setTerminosMasBuscados] = useState([]);
  const [terminosFiltrados, setTerminosFiltrados] = useState([]);
  const [busquedasPorRegion, setBusquedasPorRegion] = useState([]);
  const [regionesFiltradas, setRegionesFiltradas] = useState(new Set());
  const [comunasFiltradas, setComunasFiltradas] = useState(new Set());
  const [sectoresFiltrados, setSectoresFiltrados] = useState(new Set());
  const [buscadorTermino, setBuscadorTermino] = useState("");
  const [terminoSeleccionado, setTerminoSeleccionado] = useState(null);
  const [detallesTermino, setDetallesTermino] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userBusinessLocation, setUserBusinessLocation] = useState([]);
  const [filtrosPersonalizados, setFiltrosPersonalizados] = useState(false);
  const [demographicData, setDemographicData] = useState({
    sexDistribution: [
      { name: 'Hombres', value: 0 },
      { name: 'Mujeres', value: 0 },
      { name: 'Otro', value: 0 }
    ],
    businessUsers: 0,
    ageDistribution: [
      { name: '18-24', value: 0 },
      { name: '25-34', value: 0 },
      { name: '35-44', value: 0 },
      { name: '45-54', value: 0 },
      { name: '55+', value: 0 }
    ]
  });
  const [productosPorUbicacion, setProductosPorUbicacion] = useState([]);
  const [prediccionBusquedas, setPrediccionBusquedas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const navigate = useNavigate();

  const COLORS = ["#3498db", "#e67e22", "#2ecc71", "#9b59b6", "#e74c3c", "#16a085", "#f39c12", "#34495e"];

  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById("terminos-dropdown");
      if (dropdown && !dropdown.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const savedFilters = localStorage.getItem('dashboardFilters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setFiltrosPersonalizados(filters.filtrosPersonalizados ?? false);
        if (filters.regiones) setRegionesFiltradas(new Set(filters.regiones));
        if (filters.comunas) setComunasFiltradas(new Set(filters.comunas));
        if (filters.sectores) setSectoresFiltrados(new Set(filters.sectores));
        if (filters.userBusinessLocation) setUserBusinessLocation(filters.userBusinessLocation);
      } catch (error) {
        console.error('Error cargando filtros guardados:', error);
      }
    }
  }, []);

  // Cargar datos de usuario y dashboard
  useEffect(() => {
    let isMounted = true;
    
    const verificarAutenticacion = async () => {
      try {
        setLoading(true);
        
        // Utilizamos persistencia local para evitar pérdida de estado al refrescar
        await new Promise(resolve => {
          // Mecanismo de reintento con tiempo de espera
          let intentos = 0;
          const maxIntentos = 5;
          
          const verificar = () => {
            intentos++;
            
            // Verificar el estado actual directamente
            const user = auth.currentUser;
            
            if (user) {
              resolve(user);
              return;
            }
            
            // Si no hay usuario pero ya intentamos varias veces
            if (intentos >= maxIntentos) {
              if (isMounted) {
                navigate("/formularioregistro");
              }
              resolve(null);
              return;
            }
            
            // Esperar un poco más en cada intento
            setTimeout(verificar, 300 * intentos);
          };
          
          // Iniciar verificación
          verificar();
        });
        
        // Si llegamos aquí y tenemos usuario, cargamos sus datos
        const user = auth.currentUser;
        if (user && isMounted) {
          try {
            // Usar el mismo método que en App.jsx para obtener datos del usuario por email
            const q = query(collection(db, "usuarios"), where("email", "==", user.email));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
              const userDoc = snap.docs[0];
              const userData = userDoc.data();
              console.log("Datos del usuario cargados desde Firebase:", userData);
              setCurrentUser(userData);
              
              // Verificamos si el usuario tiene negocios registrados
              if (userData.tieneNegocio && userData.negocios?.length > 0) {
                console.log("Usuario tiene negocios:", userData.negocios);
                
                // Extraer ubicaciones de los negocios
                const businessLocations = userData.negocios
                  .filter(n => n && typeof n === 'object') // Asegurarse de que son objetos válidos
                  .map(n => ({
                    region: n.region || '',
                    comuna: n.comuna || '',
                    sector: n.sector || ''
                  }))
                  .filter(loc => loc.region); // Filtramos ubicaciones sin región
                
                console.log("Ubicaciones de negocio extraídas:", businessLocations);
                
                if (businessLocations.length > 0) {
                  setUserBusinessLocation(businessLocations);
                  console.log("Ubicaciones de negocio cargadas:", businessLocations);
                } else {
                  console.warn("El usuario tiene negocios pero no tienen ubicaciones válidas");
                }
              } else {
                console.log("El usuario no tiene negocios registrados");
              }
            } else {
              // Si no se encuentra el usuario, usar los datos básicos de autenticación
              console.warn("No se encontró información del usuario en la base de datos");
              setCurrentUser({
                email: user.email,
                nombre: user.displayName || user.email.split('@')[0],
                tieneNegocio: false,
              });
            }
          } catch (error) {
            console.error("Error obteniendo datos del usuario:", error);
            if (isMounted) {
              setCurrentUser({
                email: user.email,
                nombre: user.displayName || user.email.split('@')[0],
                tieneNegocio: false,
              });
            }
          }
          
          // Cargar datos del dashboard
          if (isMounted) {
            try {
              const response = await fetch('http://localhost:3000/api/dashboard/data');
              
              if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
              }
              
              const data = await response.json();
              
              // Guardar los datos de búsquedas de MongoDB
              setBusquedas(data.busquedas || []);
              
              // Cargar usuarios de Firebase para completar los datos
              const firebaseUsers = await cargarUsuariosFirebase();
              
              // Combinar usuarios de MongoDB con usuarios de Firebase
              const usuariosCombinados = [...(data.usuarios || [])];
              
              // Actualizar datos demográficos con todos los usuarios
              if (usuariosCombinados.length > 0) {
                procesarDatosDemograficos(usuariosCombinados);
              }
            } catch (error) {
              console.error("Error cargando datos del dashboard:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error verificando autenticación:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setAuthInitialized(true);
        }
      }
    };
    
    verificarAutenticacion();
    
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Función para procesar los datos demográficos
  const procesarDatosDemograficos = (usuarios) => {
    // Distribución por sexo
    const sexCounts = { 'Masculino': 0, 'Femenino': 0, 'Otro': 0 };
    usuarios.forEach(u => {
      if (u.sexo === 'Masculino') sexCounts.Masculino++;
      else if (u.sexo === 'Femenino') sexCounts.Femenino++;
      else sexCounts.Otro++;
    });
    
    // Usuarios con negocios
    const businessUsers = usuarios.filter(u => 
      u.region && u.comuna && u.sector
    ).length;
    
    // Distribución por edad
    const ageCounts = { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };
    usuarios.forEach(u => {
      if (!u.edad) return;
      const age = parseInt(u.edad);
      if (age >= 18 && age <= 24) ageCounts['18-24']++;
      else if (age >= 25 && age <= 34) ageCounts['25-34']++;
      else if (age >= 35 && age <= 44) ageCounts['35-44']++;
      else if (age >= 45 && age <= 54) ageCounts['45-54']++;
      else if (age >= 55) ageCounts['55+']++;
    });
    
    // Actualizar el estado
    setDemographicData({
      sexDistribution: [
        { name: 'Hombres', value: sexCounts.Masculino },
        { name: 'Mujeres', value: sexCounts.Femenino },
        { name: 'Otro', value: sexCounts.Otro }
      ],
      businessUsers,
      ageDistribution: [
        { name: '18-24', value: ageCounts['18-24'] },
        { name: '25-34', value: ageCounts['25-34'] },
        { name: '35-44', value: ageCounts['35-44'] },
        { name: '45-54', value: ageCounts['45-54'] },
        { name: '55+', value: ageCounts['55+'] }
      ]
    });
  };

  // Efecto para procesar datos cuando cambien los filtros
  useEffect(() => {
    procesarDatos(busquedas);
    // Guardar configuración de filtros en localStorage
    try {
      localStorage.setItem('dashboardFilters', JSON.stringify({
        filtrosPersonalizados,
        regiones: Array.from(regionesFiltradas),
        comunas: Array.from(comunasFiltradas),
        sectores: Array.from(sectoresFiltrados),
        userBusinessLocation
      }));
    } catch (error) {
      console.error('Error guardando filtros:', error);
    }
  }, [busquedas, regionesFiltradas, comunasFiltradas, sectoresFiltrados, filtrosPersonalizados, buscadorTermino, userBusinessLocation]);

  const procesarDatos = useCallback((data) => {
    if (!data || data.length === 0) return;
    
    let datosFiltrados = data;
    
    // Aplicar filtros si están activados
    if (filtrosPersonalizados) {
      if (regionesFiltradas.size > 0) {
        datosFiltrados = datosFiltrados.filter(b => 
          b.usuarioInfo && b.usuarioInfo.region && 
          regionesFiltradas.has(b.usuarioInfo.region)
        );
      }
      if (comunasFiltradas.size > 0) {
        datosFiltrados = datosFiltrados.filter(b => 
          b.usuarioInfo && b.usuarioInfo.comuna && 
          comunasFiltradas.has(b.usuarioInfo.comuna)
        );
      }
      if (sectoresFiltrados.size > 0) {
        datosFiltrados = datosFiltrados.filter(b => 
          b.usuarioInfo && b.usuarioInfo.sector && 
          sectoresFiltrados.has(b.usuarioInfo.sector)
        );
      }
    }
    
    // Contar búsquedas por día
    const countsDia = {};
    datosFiltrados.forEach(b => {
      if (!b.fechaBusqueda) return;
      
      let fecha;
      try {
        // MongoDB devuelve fechas en formato ISO
        if (typeof b.fechaBusqueda === 'string') {
          fecha = new Date(b.fechaBusqueda).toISOString().split('T')[0];
        } else if (b.fechaBusqueda.$date) {
          // Si es un objeto con formato MongoDB
          fecha = new Date(b.fechaBusqueda.$date).toISOString().split('T')[0];
        } else {
          fecha = new Date(b.fechaBusqueda).toISOString().split('T')[0];
        }
        countsDia[fecha] = (countsDia[fecha] || 0) + 1;
      } catch (error) {
        console.error("Error procesando fecha:", error, b.fechaBusqueda);
      }
    });

    let datosOrdenados = Object.entries(countsDia)
      .map(([date, total]) => {
        const parts = date.split('-');
        let dateObj;
        if (parts.length === 3) {
          dateObj = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`); // Formato correcto YYYY-MM-DD
        } else {
          dateObj = new Date(date);
        }
        return { date, dateObj, total };
      })
      .sort((a, b) => a.dateObj - b.dateObj)
      .map(({ date, total }) => ({ date, total }));

    if (datosOrdenados.length > 7) {
      datosOrdenados = datosOrdenados.slice(-7);
    }
    
    setBusquedasPorDia(datosOrdenados);

    // Contar términos
    const countsTermino = {};
    datosFiltrados.forEach(b => {
      if (!b.busqueda) return;
      const terminoNormalizado = normalizarTexto(b.busqueda);
      countsTermino[terminoNormalizado] = (countsTermino[terminoNormalizado] || 0) + 1;
    });

    const terminosOrdenados = Object.entries(countsTermino)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    setTerminosMasBuscados(terminosOrdenados);
    setTerminosFiltrados(terminosOrdenados);

    // Contar por región
    const countsRegion = {};
    datosFiltrados.forEach(b => {
      if (!b.usuarioInfo || !b.usuarioInfo.region) return;
      countsRegion[b.usuarioInfo.region] = (countsRegion[b.usuarioInfo.region] || 0) + 1;
    });

    const regionesOrdenadas = Object.entries(countsRegion)
      .map(([region, total]) => ({ region, total }))
      .sort((a, b) => b.total - a.total);

    setBusquedasPorRegion(regionesOrdenadas);

    // Productos por ubicación
    const productosPorLoc = {};
    datosFiltrados.forEach(b => {
      if (!b.busqueda || !b.usuarioInfo || !b.usuarioInfo.region) return;
      const terminoNormalizado = normalizarTexto(b.busqueda);
      const ubicacion = b.usuarioInfo.comuna ? 
        `${b.usuarioInfo.region}, ${b.usuarioInfo.comuna}` : 
        b.usuarioInfo.region;
      
      if (!productosPorLoc[terminoNormalizado]) {
        productosPorLoc[terminoNormalizado] = {};
      }
      productosPorLoc[terminoNormalizado][ubicacion] = 
        (productosPorLoc[terminoNormalizado][ubicacion] || 0) + 1;
    });

    const productosArray = Object.entries(productosPorLoc)
      .map(([producto, ubicaciones]) => {
        const total = Object.values(ubicaciones).reduce((sum, val) => sum + val, 0);
        return { producto, ubicaciones, total };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const ubicacionesUnicas = new Set();
    productosArray.forEach(p => {
      Object.keys(p.ubicaciones).forEach(ub => ubicacionesUnicas.add(ub));
    });

    const datosProductosUbicacion = productosArray.map(p => {
      const item = { producto: p.producto };
      ubicacionesUnicas.forEach(ub => {
        item[ub] = p.ubicaciones[ub] || 0;
      });
      return item;
    });

    setProductosPorUbicacion({
      datos: datosProductosUbicacion,
      ubicaciones: Array.from(ubicacionesUnicas)
    });

    const ultimosDias = 30;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const busquedasPorDiaCompleto = {};
    for (let i = ultimosDias - 1; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().split('T')[0];
      busquedasPorDiaCompleto[fechaStr] = 0;
    }

    datosFiltrados.forEach(b => {
      if (!b.fechaBusqueda) return;
      
      let dateObj;
      try {
        if (typeof b.fechaBusqueda === 'string') {
          dateObj = new Date(b.fechaBusqueda);
        } else if (b.fechaBusqueda.$date) {
          dateObj = new Date(b.fechaBusqueda.$date);
        } else {
          dateObj = new Date(b.fechaBusqueda);
        }
        
        if (dateObj >= new Date(hoy.getTime() - (ultimosDias * 24 * 60 * 60 * 1000))) {
          const fechaStr = dateObj.toISOString().split('T')[0];
          busquedasPorDiaCompleto[fechaStr] = (busquedasPorDiaCompleto[fechaStr] || 0) + 1;
        }
      } catch (error) {
        console.error('Error procesando fecha para predicción:', error);
      }
    });

    const datosHistoricos = Object.entries(busquedasPorDiaCompleto)
      .map(([fecha, total]) => ({ fecha, total, tipo: 'Histórico' }));

    // Verificar si hay datos históricos reales
    const hayDatosHistoricos = Object.values(busquedasPorDiaCompleto).some(val => val > 0);

    // Solo calcular predicción si hay datos históricos
    if (hayDatosHistoricos) {
      const ventana = 7;
      const ultimosValores = datosHistoricos.slice(-ventana).map(d => d.total);
      const promedio = ultimosValores.reduce((sum, val) => sum + val, 0) / ventana;

      const valorPrediccion = Math.max(Math.round(promedio), 1);

      const predicciones = [];
      for (let i = 1; i <= 7; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() + i);
        const fechaStr = fecha.toISOString().split('T')[0];
        
        const variacion = Math.random() * 0.2 + 0.9;
        
        predicciones.push({ 
          fecha: fechaStr, 
          total: Math.round(valorPrediccion * variacion),
          tipo: 'Predicción' 
        });
      }

      setPrediccionBusquedas([...datosHistoricos, ...predicciones]);
    } else {
      // Si no hay datos históricos, generar algunos datos de ejemplo
      const datosEjemplo = [];
      for (let i = ultimosDias - 1; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - i);
        const fechaStr = fecha.toISOString().split('T')[0];
        // Generar valores aleatorios entre 1 y 5 para ejemplo
        datosEjemplo.push({ 
          fecha: fechaStr, 
          total: Math.floor(Math.random() * 5) + 1,
          tipo: 'Histórico' 
        });
      }
      
      // Generar predicciones basadas en estos datos
      const valorPrediccion = 3; // Valor promedio para ejemplo
      const prediccionesEjemplo = [];
      for (let i = 1; i <= 7; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() + i);
        const fechaStr = fecha.toISOString().split('T')[0];
        const variacion = Math.random() * 0.2 + 0.9;
        prediccionesEjemplo.push({ 
          fecha: fechaStr, 
          total: Math.round(valorPrediccion * variacion),
          tipo: 'Predicción' 
        });
      }
      
      setPrediccionBusquedas([...datosEjemplo, ...prediccionesEjemplo]);
    }

    if (terminoSeleccionado) {
      const busquedasTermino = datosFiltrados.filter(b => 
        normalizarTexto(b.busqueda) === normalizarTexto(terminoSeleccionado)
      );

      const porRegion = {};
      busquedasTermino.forEach(b => {
        if (!b.usuarioInfo || !b.usuarioInfo.region) return;
        porRegion[b.usuarioInfo.region] = (porRegion[b.usuarioInfo.region] || 0) + 1;
      });
      const regionesData = Object.entries(porRegion)
        .map(([region, total]) => ({ region, total }))
        .sort((a, b) => b.total - a.total);

      const evolucionTemporal = {};
      const hace30Dias = new Date();
      hace30Dias.setDate(hace30Dias.getDate() - 30);

      busquedasTermino.forEach(b => {
        if (!b.fechaBusqueda) return;
        let dateObj;
        try {
          if (typeof b.fechaBusqueda === 'string') {
            dateObj = new Date(b.fechaBusqueda);
          } else if (b.fechaBusqueda.$date) {
            dateObj = new Date(b.fechaBusqueda.$date);
          } else {
            dateObj = new Date(b.fechaBusqueda);
          }

          if (dateObj >= hace30Dias) {
            const fechaStr = dateObj.toLocaleDateString("es-CL");
            evolucionTemporal[fechaStr] = (evolucionTemporal[fechaStr] || 0) + 1;
          }
        } catch (error) {
          console.error('Error procesando fecha:', error);
        }
      });

      const evolucionData = Object.entries(evolucionTemporal)
        .map(([fecha, total]) => {
          const parts = fecha.split('-');
          let dateObj;
          if (parts.length === 3) {
            dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else {
            dateObj = new Date(fecha);
          }
          return { fecha, dateObj, total };
        })
        .sort((a, b) => a.dateObj - b.dateObj)
        .map(({ fecha, total }) => ({ fecha, total }));

      setDetallesTermino({
        termino: terminoSeleccionado,
        totalBusquedas: busquedasTermino.length,
        porRegion: regionesData,
        evolucion: evolucionData
      });
    } else {
      setDetallesTermino(null);
    }
  }, [regionesFiltradas, comunasFiltradas, sectoresFiltrados, filtrosPersonalizados, terminoSeleccionado]);

  const normalizarTexto = (texto) => {
    if (!texto) return '';
    return texto.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  useEffect(() => {
    if (buscadorTermino.trim() === "") {
      setTerminosFiltrados(terminosMasBuscados);
    } else {
      setTerminosFiltrados(
        terminosMasBuscados.filter(t =>
          normalizarTexto(t.name).includes(normalizarTexto(buscadorTermino))
        )
      );
    }
  }, [buscadorTermino, terminosMasBuscados]);

  // Funciones para manejar los filtros
  const quitarFiltrosPersonalizados = () => {
    console.log("Desactivando filtros personalizados");
    setFiltrosPersonalizados(false);
    setRegionesFiltradas(new Set());
    setComunasFiltradas(new Set());
    setSectoresFiltrados(new Set());
  };

  const restaurarFiltrosPersonalizados = () => {
    console.log("Activando filtros personalizados");
    
    // Verificar si hay datos de usuario
    if (!currentUser) {
      alert("Necesitas iniciar sesión para usar filtros personalizados.");
      return;
    }
    
    // Comprobación de negocios directamente desde currentUser
    if (!currentUser.negocios || !Array.isArray(currentUser.negocios) || currentUser.negocios.length === 0) {
      alert("No se detectaron ubicaciones de negocio para filtrar. Por favor, configura tus ubicaciones en tu perfil.");
      return;
    }
    
    const businessLocations = currentUser.negocios
      .filter(n => n && typeof n === 'object') // Filtrar objetos válidos
      .map(n => ({
        region: n.region || '',
        comuna: n.comuna || '',
        sector: n.sector || ''
      }))
      .filter(loc => loc.region); // Solo considerar los que tengan región
    
    // Si no hay ubicaciones después de filtrar
    if (businessLocations.length === 0) {
      alert("No se detectaron ubicaciones de negocio válidas. Por favor, verifica que has configurado región y comuna.");
      return;
    }

    setUserBusinessLocation(businessLocations);
    setFiltrosPersonalizados(true);
    
    // Crear nuevos conjuntos para regiones y comunas
    const regiones = new Set();
    const comunas = new Set();
    const sectores = new Set();
    
    // Añadir cada ubicación de negocio
    businessLocations.forEach(location => {
      if (location.region) regiones.add(location.region);
      if (location.comuna) comunas.add(location.comuna);
      if (location.sector) sectores.add(location.sector);
    });
    
    console.log("Aplicando filtros:", {
      regiones: Array.from(regiones),
      comunas: Array.from(comunas),
      sectores: Array.from(sectores)
    });
    
    // Actualizar los estados
    setRegionesFiltradas(regiones);
    setComunasFiltradas(comunas);
    setSectoresFiltrados(sectores);
  };

  const totalUsuarios = new Set(usuarios.map(u => u.rut || u.email)).size;

  // Para depuración
  console.log("Estado de filtro:", {
    filtrosPersonalizados, 
    userBusinessLocation,
    regiones: Array.from(regionesFiltradas),
    comunas: Array.from(comunasFiltradas)
  });

  // Dentro del componente Dashboard, añade esta nueva función
  const obtenerUsuariosFirebase = async () => {
    try {
      // Esta función requiere que añadas admin-sdk de Firebase
      // o alternativamente usar una API específica
      // Aquí vamos a usar una solución más simple para el dashboard
      const response = await fetch('http://localhost:3000/api/firebase/users');
      if (!response.ok) {
        throw new Error(`Error obteniendo usuarios de Firebase: ${response.status}`);
      }
      const firebaseUsers = await response.json();
      console.log("Usuarios obtenidos de Firebase:", firebaseUsers);
      return firebaseUsers;
    } catch (error) {
      console.error("Error al obtener usuarios de Firebase:", error);
      return [];
    }
  };

  // Añade una nueva función para cargar todos los usuarios de Firebase
  const cargarUsuariosFirebase = async () => {
    try {
      const usersSnap = await getDocs(collection(db, "usuarios"));
      const firebaseUsuarios = usersSnap.docs.map(doc => ({...doc.data(), id: doc.id}));
      console.log("Usuarios cargados desde Firebase:", firebaseUsuarios.length);
      
      // Actualizar el estado de usuarios con los datos de Firebase
      setUsuarios(prevUsuarios => {
        // Crear un mapa de usuarios existentes por email para eliminar duplicados
        const usuariosMap = new Map();
        prevUsuarios.forEach(u => {
          if (u.email) usuariosMap.set(u.email.toLowerCase(), u);
        });
        
        // Añadir usuarios de Firebase que no estén ya en MongoDB
        firebaseUsuarios.forEach(u => {
          if (u.email && !usuariosMap.has(u.email.toLowerCase())) {
            usuariosMap.set(u.email.toLowerCase(), u);
          }
        });
        
        // Convertir el mapa de vuelta a array
        return Array.from(usuariosMap.values());
      });
      
      return firebaseUsuarios;
    } catch (error) {
      console.error("Error cargando usuarios de Firebase:", error);
      return [];
    }
  };

  return (
    <div className="dashboard-container">
      {!authInitialized ? (
        <div className="auth-loading">
          <h2>Verificando sesión...</h2>
          <div className="loading-spinner"></div>
          <p style={{marginTop: '15px', fontSize: '0.9rem', color: '#666'}}>
            Si la verificación tarda demasiado, <a href="#" onClick={() => navigate('/formularioregistro')}>haz clic aquí para ir al login</a>
          </p>
        </div>
      ) : loading ? (
        <div className="dashboard-loading">
          <h2>Cargando datos del dashboard...</h2>
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <>
          <h1>Dashboard de Análisis</h1>
          
          {/* BOTÓN DE FILTRO - Colocado al inicio de la página y siempre visible */}
          <div className="filters-control" style={{ gridColumn: 'span 12', marginBottom: '20px' }}>
            <button 
              className={`filter-toggle-btn ${filtrosPersonalizados ? 'active' : ''}`}
              onClick={filtrosPersonalizados ? quitarFiltrosPersonalizados : restaurarFiltrosPersonalizados}
              style={{ padding: '12px 20px', fontSize: '1rem', fontWeight: 'bold' }}
            >
              {filtrosPersonalizados 
                ? "Ver datos globales" 
                : "Ver solo mis ubicaciones"
              }
            </button>
          </div>

          {/* MUESTRA DE FILTROS ACTIVOS */}
          {filtrosPersonalizados && (
            <div className="active-filters card small" style={{ gridColumn: 'span 12', backgroundColor: '#e3f2fd', borderLeft: '4px solid #3498db' }}>
              <h3>Filtros activos</h3>
              <div>
                <strong>Regiones:</strong> {Array.from(regionesFiltradas).join(', ') || 'Ninguna'}
              </div>
              <div>
                <strong>Comunas:</strong> {Array.from(comunasFiltradas).join(', ') || 'Ninguna'}
              </div>
              {sectoresFiltrados.size > 0 && (
                <div>
                  <strong>Sectores:</strong> {Array.from(sectoresFiltrados).join(', ')}
                </div>
              )}
            </div>
          )}

          <div className="card small">
            <h2>Total Usuarios</h2>
            <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#2c3e50", textAlign: "center" }}>{totalUsuarios}</p>
          </div>

          <div className="card small">
            <h2>Distribución por Sexo</h2>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={demographicData.sexDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {demographicData.sexDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} usuarios`, 'Cantidad']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card small">
            <h2>Usuarios con Negocios</h2>
            <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#e67e22", textAlign: "center" }}>
              {demographicData.businessUsers}
            </p>
            <p style={{ fontSize: "1rem", color: "#7f8c8d", textAlign: "center" }}>
              de {totalUsuarios} usuarios totales
            </p>
          </div>

          <div className="card small">
            <h2>Distribución por Edad</h2>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={demographicData.ageDistribution}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2ecc71" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {userBusinessLocation && userBusinessLocation.length > 0 && (
            <div className="card small">
              <h2>Actividad en tus Ubicaciones</h2>
              {(() => {
                const hoy = new Date().toLocaleDateString("es-CL");
                const busquedasHoy = busquedas.filter(b => {
                  if (!b.fechaBusqueda) return false;
                  let fechaStr;
                  try {
                    fechaStr = new Date(b.fechaBusqueda).toLocaleDateString("es-CL");
                  } catch (error) {
                    return false;
                  }
                  return fechaStr === hoy;
                });

                return userBusinessLocation.map((location, idx) => {
                  const busquedasEnRegion = busquedasHoy.filter(b => 
                    b.usuarioInfo && b.usuarioInfo.region === location.region
                  );
                  const busquedasEnComuna = location.comuna ? 
                    busquedasEnRegion.filter(b => 
                      b.usuarioInfo && b.usuarioInfo.comuna === location.comuna
                    ) : [];

                  return (
                    <div key={idx} style={{marginBottom: '10px', padding: '8px', borderBottom: idx < userBusinessLocation.length - 1 ? '1px solid #eee' : 'none'}}>
                      <p style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#9b59b6", margin: '4px 0' }}>
                        {location.region}
                      </p>
                      <p style={{ fontSize: "0.9rem", color: "#7f8c8d", margin: '2px 0' }}>
                        {location.comuna} {location.sector && `- ${location.sector}`}
                      </p>
                      <p style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#e67e22", margin: '4px 0' }}>
                        {busquedasEnRegion.length} búsquedas hoy
                        {busquedasEnComuna.length > 0 && (
                          <span style={{ display: 'block', fontSize: '0.9rem', color: '#95a5a6' }}>
                            ({busquedasEnComuna.length} en tu comuna)
                          </span>
                        )}
                      </p>
                    </div>
                  );
                });
              })()}
            </div>
          )}
          
          <div className="card small">
            <h2>Total Búsquedas</h2>
            <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#3498db", textAlign: "center" }}>
              {(() => {
                let busquedasFiltradas = busquedas;
                if (filtrosPersonalizados) {
                  if (regionesFiltradas.size > 0) {
                    busquedasFiltradas = busquedasFiltradas.filter(b => b.usuarioInfo && regionesFiltradas.has(b.usuarioInfo.region));
                  }
                  if (comunasFiltradas.size > 0) {
                    busquedasFiltradas = busquedasFiltradas.filter(b => b.usuarioInfo && comunasFiltradas.has(b.usuarioInfo.comuna));
                  }
                  if (sectoresFiltrados.size > 0) {
                    busquedasFiltradas = busquedasFiltradas.filter(b => b.usuarioInfo && sectoresFiltrados.has(b.usuarioInfo.sector));
                  }
                }
                return busquedasFiltradas.length;
              })()}
            </p>
          </div>

          <div className="card small">
            <h2>Término Más Buscado Hoy</h2>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2ecc71", textAlign: "center" }}>
              {(() => {
                const hoy = new Date().toLocaleDateString("es-CL");
                const busquedasHoy = busquedas.filter(b => {
                  if (!b.fechaBusqueda) return false;
                  if (filtrosPersonalizados && regionesFiltradas.size > 0 && (!b.usuarioInfo || !b.usuarioInfo.region || !regionesFiltradas.has(b.usuarioInfo.region))) return false;
                  
                  let fechaStr;
                  try {
                    fechaStr = new Date(b.fechaBusqueda).toLocaleDateString("es-CL");
                  } catch (error) {
                    return false;
                  }
                  
                  return fechaStr === hoy;
                });
                
                const terminosHoy = {};
                busquedasHoy.forEach(b => {
                  if (!b.busqueda) return;
                  terminosHoy[b.busqueda] = (terminosHoy[b.busqueda] || 0) + 1;
                });

                const terminosArray = Object.entries(terminosHoy)
                  .sort(([,a], [,b]) => b - a);
                  
                const masBuscadoHoy = terminosArray.length > 0 ? terminosArray[0] : null;

                return masBuscadoHoy ? (
                  <>
                    {masBuscadoHoy[0]}
                    <span style={{ display: 'block', fontSize: '1rem', color: '#7f8c8d' }}>
                      ({masBuscadoHoy[1]} veces hoy)
                    </span>
                  </>
                ) : "Sin búsquedas hoy";
              })()}
            </p>
          </div>

          <div className="card small">
            <h2>Región Más Activa Hoy</h2>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#e67e22", textAlign: "center" }}>
              {(() => {
                const hoy = new Date().toLocaleDateString("es-CL");
                let busquedasHoy = busquedas.filter(b => {
                  if (!b.fechaBusqueda) return false;
                  if (filtrosPersonalizados && regionesFiltradas.size > 0 && (!b.usuarioInfo || !b.usuarioInfo.region || !regionesFiltradas.has(b.usuarioInfo.region))) return false;
                  
                  let fechaStr;
                  try {
                    fechaStr = new Date(b.fechaBusqueda).toLocaleDateString("es-CL");
                  } catch (error) {
                    return false;
                  }
                  
                  return fechaStr === hoy;
                });

                const regionesHoy = {};
                busquedasHoy.forEach(b => {
                  if (!b.usuarioInfo || !b.usuarioInfo.region) return;
                  regionesHoy[b.usuarioInfo.region] = (regionesHoy[b.usuarioInfo.region] || 0) + 1;
                });

                const regionesArray = Object.entries(regionesHoy)
                  .sort(([,a], [,b]) => b - a);
                  
                const masActivaHoy = regionesArray.length > 0 ? regionesArray[0] : null;

                return masActivaHoy ? (
                  <>
                    {masActivaHoy[0]}
                    <span style={{ display: 'block', fontSize: '1rem', color: '#7f8c8d' }}>
                      ({masActivaHoy[1]} búsquedas hoy)
                    </span>
                  </>
                ) : "Sin actividad hoy";
              })()}
            </p>
          </div>

          <div className="card large">
            <h2>Búsquedas por día {filtrosPersonalizados && regionesFiltradas.size > 0 && `(${regionesFiltradas.size} ${regionesFiltradas.size === 1 ? 'Región' : 'Regiones'} seleccionadas)`}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={busquedasPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tick={{ fontSize: 14 }}
                  tickFormatter={(value) => {
                    const parts = value.split('-');
                    if (parts.length === 3) {
                      return `${parts[2]}/${parts[1]}`;
                    }
                    return value;
                  }}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label) => `Fecha: ${label}`}
                  formatter={(value) => [`${value} búsquedas`, 'Total']}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3498db" 
                  strokeWidth={3}
                  dot={{ fill: '#3498db', strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card large">
            <h2>Términos Más Buscados {filtrosPersonalizados && regionesFiltradas.size > 0 && `(${regionesFiltradas.size} ${regionesFiltradas.size === 1 ? 'Región' : 'Regiones'} seleccionadas)`}</h2>
            <p className="chart-info-text">
            Haz clic en una barra para ver análisis detallado |  Desplázate horizontalmente para ver todos los términos
            </p>

            <div className="terminos-scroll-container">
              <div className="terminos-chart-wrapper" style={{ width: `${terminosMasBuscados.length * 150}px` }}>
                <BarChart 
                  width={terminosMasBuscados.length * 150}
                  height={350}
                  data={terminosMasBuscados}
                  margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                    style={{ fontSize: '14px' }}
                  />
                  <YAxis />
                  <Tooltip 
                    cursor={{ fill: 'rgba(52, 152, 219, 0.1)' }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '1px solid #ccc',
                      borderRadius: '5px'
                    }}
                  />
                  <Bar 
                    dataKey="total" 
                    cursor="pointer"
                    onClick={(data) => {
                      if (data && data.name) {
                        setTerminoSeleccionado(data.name === terminoSeleccionado ? null : data.name);
                      }
                    }}
                  >
                    {terminosMasBuscados.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.name === terminoSeleccionado ? "#e67e22" : "#2ecc71"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </div>
            </div>

            <p className="chart-total-text">
              Total de términos: {terminosMasBuscados.length}
            </p>
          </div>

          {detallesTermino && (
            <>
              <div className="card large" style={{ backgroundColor: '#fff3e0', border: '2px solid #e67e22' }}>
                <h2 style={{ color: '#e67e22' }}>Análisis Detallado: "{detallesTermino.termino}"</h2>
                <button 
                  onClick={() => setTerminoSeleccionado(null)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#e67e22',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    marginBottom: '10px'
                  }}
                >
                  ✕ Cerrar análisis
                </button>
                <p style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#2c3e50", marginTop: '10px' }}>
                  Total de búsquedas: {detallesTermino.totalBusquedas}
                </p>
              </div>

              <div className="card large">
                <h2>Distribución por Región: "{detallesTermino.termino}"</h2>
                <p style={{ fontSize: "0.9rem", color: "#7f8c8d", marginBottom: "1rem" }}>
                  ¿En qué regiones se busca más este producto?
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={detallesTermino.porRegion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#9b59b6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card large">
                <h2>Evolución Temporal: "{detallesTermino.termino}"</h2>
                <p style={{ fontSize: "0.9rem", color: "#7f8c8d", marginBottom: "1rem" }}>
                  Tendencia de búsquedas en los últimos 30 días
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={detallesTermino.evolucion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="fecha" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => `Fecha: ${label}`}
                      formatter={(value) => [`${value} búsquedas`, 'Total']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#e67e22" 
                      strokeWidth={3}
                      dot={{ fill: '#e67e22', strokeWidth: 2 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          <div className="card large">
            <h2>Búsquedas por Grupo de Edad</h2>
            <p style={{ fontSize: "0.9rem", color: "#7f8c8d", marginBottom: "1rem" }}>
              Descubre qué productos buscan las personas de diferentes rangos de edad
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={demographicData.ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#9b59b6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {productosPorUbicacion.datos && productosPorUbicacion.datos.length > 0 && (
            <div className="card large">
              <h2>Comparativa de Productos Buscados por Ubicación</h2>
              <p style={{ fontSize: "0.9rem", color: "#7f8c8d", marginBottom: "1rem" }}>
                Top 10 productos más buscados y su distribución por ubicaciones
              </p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={productosPorUbicacion.datos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="producto" type="category" width={150} />
                  <Tooltip />
                  {productosPorUbicacion.ubicaciones.map((ubicacion, idx) => {
                    const colores = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
                    return (
                      <Bar 
                        key={ubicacion} 
                        dataKey={ubicacion} 
                        fill={colores[idx % colores.length]}
                        stackId="a"
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {prediccionBusquedas.length > 0 && (
            <div className="card large">
              <h2>Predicción de Tendencias de Búsqueda</h2>
              <p style={{ fontSize: "0.9rem", color: "#7f8c8d", marginBottom: "1rem" }}>
                Histórico de últimos 30 días y predicción para próximos 7 días
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={prediccionBusquedas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="fecha" 
                    tickFormatter={(value) => {
                      const fecha = new Date(value);
                      return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const fecha = new Date(value);
                      return fecha.toLocaleDateString('es-CL');
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#3498db" 
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      return (
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={payload.tipo === 'Predicción' ? 4 : 3} 
                          fill={payload.tipo === 'Predicción' ? '#e74c3c' : '#3498db'} 
                        />
                      );
                    }}
                  />
                  <ReferenceLine 
                    x={new Date().toISOString().split('T')[0]} 
                    stroke="#2c3e50" 
                    strokeDasharray="3 3"
                    label="Hoy"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#7f8c8d' }}>
                <span style={{ color: '#3498db' }}>●</span> Datos históricos
                <span style={{ marginLeft: '15px', color: '#e74c3c' }}>●</span> Predicción basada en promedio móvil
              </div>
            </div>
          )}

          <RegionActivityCards 
            busquedas={busquedas} 
            userBusinessLocations={userBusinessLocation}
            filtrosPersonalizados={filtrosPersonalizados}
          />

          <button className="back-button" onClick={() => navigate('/')}>Volver</button>
          
        </>
      )}
    </div>
  );
}

export default Dashboard;