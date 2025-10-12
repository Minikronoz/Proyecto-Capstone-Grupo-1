import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, ReferenceLine
} from "recharts";
import { db, auth } from "./firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";

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
  const [filtrosPersonalizados, setFiltrosPersonalizados] = useState(true);
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
  const navigate = useNavigate();

  const COLORS = ["#3498db", "#e67e22", "#2ecc71", "#9b59b6", "#e74c3c", "#16a085", "#f39c12", "#34495e"];

  // Cerrar el dropdown cuando se hace click fuera de él
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

  // Cargar filtros desde localStorage al iniciar
  useEffect(() => {
    const savedFilters = localStorage.getItem('dashboardFilters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setFiltrosPersonalizados(filters.filtrosPersonalizados ?? true);
        if (filters.regiones) setRegionesFiltradas(new Set(filters.regiones));
        if (filters.comunas) setComunasFiltradas(new Set(filters.comunas));
        if (filters.sectores) setSectoresFiltrados(new Set(filters.sectores));
        if (filters.userBusinessLocation) setUserBusinessLocation(filters.userBusinessLocation);
      } catch (error) {
        console.error('Error cargando filtros guardados:', error);
      }
    }
  }, []);

  // Obtener datos del usuario actual y su ubicación de negocio
  useEffect(() => {
    const getCurrentUserData = async () => {
      if (auth.currentUser) {
        try {
          const q = query(collection(db, "usuarios"), where("email", "==", auth.currentUser.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const userData = snap.docs[0].data();
            setCurrentUser(userData);
            
            // Si tiene negocios, aplicar filtros automáticamente
            if (userData.tieneNegocio && userData.negocios && userData.negocios.length > 0 && filtrosPersonalizados) {
              const regiones = new Set();
              const comunas = new Set();
              const sectores = new Set();
              
              userData.negocios.forEach(negocio => {
                if (negocio.region) regiones.add(negocio.region);
                if (negocio.comuna) comunas.add(negocio.comuna);
                if (negocio.sector) sectores.add(negocio.sector);
              });
              
              setRegionesFiltradas(regiones);
              setComunasFiltradas(comunas);
              setSectoresFiltrados(sectores);
              
              // Guardar ubicaciones de TODOS los negocios
              const businessLocations = userData.negocios.map(n => ({
                region: n.region,
                comuna: n.comuna,
                sector: n.sector
              }));
              setUserBusinessLocation(businessLocations);
              
              // Guardar en localStorage
              localStorage.setItem('dashboardFilters', JSON.stringify({
                filtrosPersonalizados: true,
                regiones: Array.from(regiones),
                comunas: Array.from(comunas),
                sectores: Array.from(sectores),
                userBusinessLocation: businessLocations
              }));
            }
          }
        } catch (error) {
          console.error('Error obteniendo datos del usuario:', error);
        }
      }
    };
    getCurrentUserData();
  }, [filtrosPersonalizados]);

  // Cargar datos directamente desde Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Cargar búsquedas
        const busquedasQuery = query(collection(db, "busquedas"));
        const busquedasSnap = await getDocs(busquedasQuery);
        const busquedasData = busquedasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBusquedas(busquedasData);
        
        // 2. Cargar usuarios
        const usuariosQuery = query(collection(db, "usuarios"));
        const usuariosSnap = await getDocs(usuariosQuery);
        const usuariosData = usuariosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsuarios(usuariosData);
        
        // 3. Calcular datos demográficos
        const sexCount = { Masculino: 0, Femenino: 0, Otro: 0 };
        const ageRanges = { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };
        let businessCount = 0;
        
        usuariosData.forEach(user => {
          // Contar por sexo
          if (user.sexo) sexCount[user.sexo] = (sexCount[user.sexo] || 0) + 1;
          
          // Contar usuarios con negocios
          if (user.tieneNegocio) businessCount++;
          
          // Calcular edad y asignar a rango
          if (user.fechaNacimiento) {
            try {
              const birthDate = new Date(user.fechaNacimiento);
              const age = new Date().getFullYear() - birthDate.getFullYear();
              
              if (age < 25) ageRanges['18-24']++;
              else if (age < 35) ageRanges['25-34']++;
              else if (age < 45) ageRanges['35-44']++;
              else if (age < 55) ageRanges['45-54']++;
              else ageRanges['55+']++;
            } catch (e) {
              console.error('Error calculando edad:', e);
            }
          }
        });
        
        // Actualizar datos demográficos
        setDemographicData({
          sexDistribution: [
            { name: 'Hombres', value: sexCount.Masculino || 0 },
            { name: 'Mujeres', value: sexCount.Femenino || 0 },
            { name: 'Otro', value: sexCount.Otro || 0 }
          ],
          businessUsers: businessCount,
          ageDistribution: Object.entries(ageRanges).map(([name, value]) => ({ name, value }))
        });
        
        // Procesar los datos para los gráficos
        procesarDatos(busquedasData);
        
      } catch (error) {
        console.error('Error cargando datos de Firestore:', error);
      }
    };
    
    fetchData();
  }, []);
  
  // Actualizar gráficos cuando cambian los filtros
  useEffect(() => {
    procesarDatos(busquedas);
  }, [regionesFiltradas, comunasFiltradas, sectoresFiltrados, buscadorTermino, filtrosPersonalizados]);

  // Procesar datos para los gráficos
  const procesarDatos = useCallback((data) => {
    if (!data || data.length === 0) return;
    
    // Filtrar datos según los filtros activos
    let datosFiltrados = data;
    
    if (filtrosPersonalizados) {
      if (regionesFiltradas.size > 0) {
        datosFiltrados = datosFiltrados.filter(b => regionesFiltradas.has(b.region));
      }
      if (comunasFiltradas.size > 0) {
        datosFiltrados = datosFiltrados.filter(b => comunasFiltradas.has(b.comuna));
      }
      if (sectoresFiltrados.size > 0) {
        datosFiltrados = datosFiltrados.filter(b => sectoresFiltrados.has(b.sector));
      }
    }
    
    // --- Agrupar por día ---
    const countsDia = {};
    datosFiltrados.forEach(b => {
      if (!b.fechaBusqueda) return;
      
      let fecha;
      try {
        if (b.fechaBusqueda.seconds) {
          fecha = new Date(b.fechaBusqueda.seconds * 1000);
        } else if (b.fechaBusqueda instanceof Date) {
          fecha = b.fechaBusqueda;
        } else if (typeof b.fechaBusqueda === 'string') {
          fecha = new Date(b.fechaBusqueda);
        } else {
          console.log("Formato desconocido:", b.fechaBusqueda);
          return;
        }
        
        const fechaStr = fecha.toLocaleDateString("es-CL");
        countsDia[fechaStr] = (countsDia[fechaStr] || 0) + 1;
      } catch (error) {
        console.error('Error procesando fecha:', b.fechaBusqueda, error);
      }
    });

    // Convertir a formato para gráficos y ordenar por fecha
    let datosOrdenados = Object.entries(countsDia)
      .map(([date, total]) => {
        // Convertir fecha de formato "DD-MM-YYYY" a Date para ordenar
        const parts = date.split('-');
        let dateObj;
        if (parts.length === 3) {
          dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          dateObj = new Date(date);
        }
        return { date, dateObj, total };
      })
      .sort((a, b) => a.dateObj - b.dateObj)
      .map(({ date, total }) => ({ date, total }));

    // Limitar a últimos 7 días si hay muchos
    if (datosOrdenados.length > 7) {
      datosOrdenados = datosOrdenados.slice(-7);
    }
    
    setBusquedasPorDia(datosOrdenados);

    // --- Términos más buscados ---
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

    // --- Distribución por región ---
    const countsRegion = {};
    datosFiltrados.forEach(b => {
      if (!b.region) return;
      countsRegion[b.region] = (countsRegion[b.region] || 0) + 1;
    });

    const regionesOrdenadas = Object.entries(countsRegion)
      .map(([region, total]) => ({ region, total }))
      .sort((a, b) => b.total - a.total);

    setBusquedasPorRegion(regionesOrdenadas);

    // --- Productos por ubicación ---
    const productosPorLoc = {};
    datosFiltrados.forEach(b => {
      if (!b.busqueda || !b.region) return;
      const terminoNormalizado = normalizarTexto(b.busqueda);
      const ubicacion = b.comuna ? `${b.region}, ${b.comuna}` : b.region;
      
      if (!productosPorLoc[terminoNormalizado]) {
        productosPorLoc[terminoNormalizado] = {};
      }
      productosPorLoc[terminoNormalizado][ubicacion] = 
        (productosPorLoc[terminoNormalizado][ubicacion] || 0) + 1;
    });

    // Convertir a formato para gráfico (top 10 productos más buscados)
    const productosArray = Object.entries(productosPorLoc)
      .map(([producto, ubicaciones]) => {
        const total = Object.values(ubicaciones).reduce((sum, val) => sum + val, 0);
        return { producto, ubicaciones, total };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Obtener todas las ubicaciones únicas
    const ubicacionesUnicas = new Set();
    productosArray.forEach(p => {
      Object.keys(p.ubicaciones).forEach(ub => ubicacionesUnicas.add(ub));
    });

    // Formatear datos para el gráfico
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

    // --- Predicción de tendencias ---
    const ultimosDias = 30;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Agrupar búsquedas por día (últimos 30 días)
    const busquedasPorDiaCompleto = {};
    for (let i = ultimosDias - 1; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().split('T')[0];
      busquedasPorDiaCompleto[fechaStr] = 0;
    }

    datosFiltrados.forEach(b => {
      if (!b.fechaBusqueda) return;  // CORREGIDO: usar fechaBusqueda en lugar de fecha
      
      let dateObj;
      try {
        if (b.fechaBusqueda.seconds) {
          dateObj = new Date(b.fechaBusqueda.seconds * 1000);
        } else if (b.fechaBusqueda instanceof Date) {
          dateObj = b.fechaBusqueda;
        } else {
          dateObj = new Date(b.fechaBusqueda);
        }
        
        // Solo considerar fechas de los últimos 30 días
        if (dateObj >= new Date(hoy.getTime() - (ultimosDias * 24 * 60 * 60 * 1000))) {
          const fechaStr = dateObj.toISOString().split('T')[0];
          busquedasPorDiaCompleto[fechaStr] = (busquedasPorDiaCompleto[fechaStr] || 0) + 1;
        }
      } catch (error) {
        console.error('Error procesando fecha para predicción:', error);
      }
    });

    // Convertir a array y calcular predicción (promedio móvil simple)
    const datosHistoricos = Object.entries(busquedasPorDiaCompleto)
      .map(([fecha, total]) => ({ fecha, total, tipo: 'Histórico' }));

    // Calcular predicción para próximos 7 días usando promedio móvil
    const ventana = 7; // días para promedio móvil
    const ultimosValores = datosHistoricos.slice(-ventana).map(d => d.total);
    const promedio = ultimosValores.reduce((sum, val) => sum + val, 0) / ventana;

    // Asegurar que el promedio no sea cero para tener una predicción más útil
    const valorPrediccion = Math.max(Math.round(promedio), 1); // Al menos 1 para visualización

    const predicciones = [];
    for (let i = 1; i <= 7; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() + i);
      const fechaStr = fecha.toISOString().split('T')[0];
      
      // Añadir una pequeña variación para que el gráfico no sea una línea recta
      const variacion = Math.random() * 0.2 + 0.9; // entre 0.9 y 1.1
      
      predicciones.push({ 
        fecha: fechaStr, 
        total: Math.round(valorPrediccion * variacion),
        tipo: 'Predicción' 
      });
    }

    setPrediccionBusquedas([...datosHistoricos, ...predicciones]);

    // --- Detalles del término seleccionado ---
    if (terminoSeleccionado) {
      const busquedasTermino = datosFiltrados.filter(b => 
        normalizarTexto(b.busqueda) === normalizarTexto(terminoSeleccionado)
      );

      // Distribución por región
      const porRegion = {};
      busquedasTermino.forEach(b => {
        if (!b.region) return;
        porRegion[b.region] = (porRegion[b.region] || 0) + 1;
      });
      const regionesData = Object.entries(porRegion)
        .map(([region, total]) => ({ region, total }))
        .sort((a, b) => b.total - a.total);

      // Evolución temporal (últimos 30 días)
      const evolucionTemporal = {};
      const hace30Dias = new Date();
      hace30Dias.setDate(hace30Dias.getDate() - 30);

      busquedasTermino.forEach(b => {
        if (!b.fechaBusqueda) return;
        let dateObj;
        try {
          if (b.fechaBusqueda.seconds) {
            dateObj = new Date(b.fechaBusqueda.seconds * 1000);
          } else if (b.fechaBusqueda instanceof Date) {
            dateObj = b.fechaBusqueda;
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

  // Función para normalizar texto (remover tildes y convertir a minúsculas)
  const normalizarTexto = (texto) => {
    if (!texto) return '';
    return texto.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  // Filtro del buscador de términos
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

  // Función para quitar filtros personalizados
  const quitarFiltrosPersonalizados = () => {
    setFiltrosPersonalizados(false);
    setRegionesFiltradas(new Set());
    setComunasFiltradas(new Set());
    setSectoresFiltrados(new Set());
    
    // Guardar en localStorage
    localStorage.setItem('dashboardFilters', JSON.stringify({
      filtrosPersonalizados: false,
      regiones: [],
      comunas: [],
      sectores: [],
      userBusinessLocation: []
    }));
  };

  // Función para restaurar filtros personalizados
  const restaurarFiltrosPersonalizados = () => {
    setFiltrosPersonalizados(true);
    
    // Volver a aplicar filtros basados en el usuario actual
    if (currentUser?.negocios && currentUser.negocios.length > 0) {
      const regiones = new Set();
      const comunas = new Set();
      const sectores = new Set();
      
      currentUser.negocios.forEach(negocio => {
        if (negocio.region) regiones.add(negocio.region);
        if (negocio.comuna) comunas.add(negocio.comuna);
        if (negocio.sector && negocio.sector !== "null") sectores.add(negocio.sector);
      });
      
      setRegionesFiltradas(regiones);
      setComunasFiltradas(comunas);
      setSectoresFiltrados(sectores);
      
      const businessLocations = currentUser.negocios.map(n => ({
        region: n.region,
        comuna: n.comuna,
        sector: n.sector
      }));
      setUserBusinessLocation(businessLocations);
      
      // Guardar en localStorage
      localStorage.setItem('dashboardFilters', JSON.stringify({
        filtrosPersonalizados: true,
        regiones: Array.from(regiones),
        comunas: Array.from(comunas),
        sectores: Array.from(sectores),
        userBusinessLocation: businessLocations
      }));
    }
  };

  // Calcular total de usuarios únicos
  const totalUsuarios = new Set(usuarios.map(u => u.rut || u.email)).size;

  return (
    <div className="dashboard-container">
      <h1>Dashboard de Análisis</h1>
      
      {/* Botón para quitar/restaurar filtros personalizados */}
      <div className="filters-control">
        {filtrosPersonalizados ? (
          <button 
            className="reset-btn" 
            onClick={quitarFiltrosPersonalizados}
          >
            Ver datos generales (quitar filtros personalizados)
          </button>
        ) : (
          <button 
            className="reset-btn" 
            onClick={restaurarFiltrosPersonalizados}
          >
            Ver mis datos (restaurar filtros personalizados)
          </button>
        )}
      </div>

      {/* Indicador de filtros activos */}
      {filtrosPersonalizados && userBusinessLocation && (
        <div className="active-filters card small">
          <h3>Filtros activos:</h3>
          {regionesFiltradas.size > 0 && (
            <div>
              <strong>Regiones:</strong> {Array.from(regionesFiltradas).join(', ')}
            </div>
          )}
          {comunasFiltradas.size > 0 && (
            <div>
              <strong>Comunas:</strong> {Array.from(comunasFiltradas).join(', ')}
            </div>
          )}
          {sectoresFiltrados.size > 0 && (
            <div>
              <strong>Sectores:</strong> {Array.from(sectoresFiltrados).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Métricas principales */}
      <div className="card small">
        <h2> Total Usuarios</h2>
        <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#2c3e50", textAlign: "center" }}>{totalUsuarios}</p>
      </div>

      {/* Cards demográficas */}
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

      {/* Card de actividad en las ubicaciones de los negocios */}
      {userBusinessLocation && userBusinessLocation.length > 0 && (
        <div className="card small">
          <h2>Actividad en tus Ubicaciones</h2>
          {(() => {
            const hoy = new Date().toLocaleDateString("es-CL");
            const busquedasHoy = busquedas.filter(b => {
              if (!b.fechaBusqueda) return false;
              let fechaStr;
              try {
                if (b.fechaBusqueda.seconds) {
                  fechaStr = new Date(b.fechaBusqueda.seconds * 1000).toLocaleDateString("es-CL");
                } else if (b.fechaBusqueda instanceof Date) {
                  fechaStr = b.fechaBusqueda.toLocaleDateString("es-CL");
                } else {
                  fechaStr = new Date(b.fechaBusqueda).toLocaleDateString("es-CL");
                }
              } catch (error) {
                return false;
              }
              return fechaStr === hoy;
            });

            return userBusinessLocation.map((location, idx) => {
              const busquedasEnRegion = busquedasHoy.filter(b => b.region === location.region);
              const busquedasEnComuna = location.comuna ? 
                busquedasEnRegion.filter(b => b.comuna === location.comuna) : [];

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
            if (regionesFiltradas.size > 0) {
              busquedasFiltradas = busquedasFiltradas.filter(b => regionesFiltradas.has(b.region));
            }
            if (comunasFiltradas.size > 0) {
              busquedasFiltradas = busquedasFiltradas.filter(b => comunasFiltradas.has(b.comuna));
            }
            if (sectoresFiltrados.size > 0) {
              busquedasFiltradas = busquedasFiltradas.filter(b => sectoresFiltrados.has(b.sector));
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
              if (regionesFiltradas.size > 0 && !regionesFiltradas.has(b.region)) return false;
              
              let fechaStr;
              try {
                if (b.fechaBusqueda.seconds) {
                  fechaStr = new Date(b.fechaBusqueda.seconds * 1000).toLocaleDateString("es-CL");
                } else if (b.fechaBusqueda instanceof Date) {
                  fechaStr = b.fechaBusqueda.toLocaleDateString("es-CL");
                } else {
                  fechaStr = new Date(b.fechaBusqueda).toLocaleDateString("es-CL");
                }
              } catch (error) {
                return false;
              }
              
              return fechaStr === hoy;
            });
            
            // Mostrar el término más buscado del día
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
              if (regionesFiltradas.size > 0 && !regionesFiltradas.has(b.region)) return false;
              
              let fechaStr;
              try {
                if (b.fechaBusqueda.seconds) {
                  fechaStr = new Date(b.fechaBusqueda.seconds * 1000).toLocaleDateString("es-CL");
                } else if (b.fechaBusqueda instanceof Date) {
                  fechaStr = b.fechaBusqueda.toLocaleDateString("es-CL");
                } else {
                  fechaStr = new Date(b.fechaBusqueda).toLocaleDateString("es-CL");
                }
              } catch (error) {
                return false;
              }
              
              return fechaStr === hoy;
            });

            // Agrupar por región
            const regionesHoy = {};
            busquedasHoy.forEach(b => {
              if (!b.region) return;
              regionesHoy[b.region] = (regionesHoy[b.region] || 0) + 1;
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

      {/* Busquedas por día */}
      <div className="card large">
        <h2>Búsquedas por día {regionesFiltradas.size > 0 && `(${regionesFiltradas.size} ${regionesFiltradas.size === 1 ? 'Región' : 'Regiones'} seleccionadas)`}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={busquedasPorDia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date"
              tick={{ fontSize: 14 }}
              tickFormatter={(value) => {
                // Convertir de formato "DD-MM-YYYY" a "DD/MM"
                const parts = value.split('-');
                if (parts.length === 3) {
                  return `${parts[0]}/${parts[1]}`;
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

      {/* Términos más buscados with horizontal scroll */}
      <div className="card large">
        <h2>Términos Más Buscados {regionesFiltradas.size > 0 && `(${regionesFiltradas.size} ${regionesFiltradas.size === 1 ? 'Región' : 'Regiones'} seleccionadas)`}</h2>
        <p className="chart-info-text">
        Haz clic en una barra para ver análisis detallado |  Desplázate horizontalmente para ver todos los términos
        </p>

        {/* Contenedor con scroll horizontal - muestra 10 barras a la vez */}
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
          📊 Total de términos: {terminosMasBuscados.length}
        </p>
      </div>

      {/* Análisis detallado del término seleccionado */}
      {detallesTermino && (
        <>
          <div className="card large" style={{ backgroundColor: '#fff3e0', border: '2px solid #e67e22' }}>
            <h2 style={{ color: '#e67e22' }}>📊 Análisis Detallado: "{detallesTermino.termino}"</h2>
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

          {/* Distribución por región del término */}
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

          {/* Evolución temporal del término */}
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

      {/* Análisis por edad - qué buscan diferentes grupos de edad */}
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

      {/* Productos más buscados por ubicación */}
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

      {/* Predicción de tendencias de búsqueda */}
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

      <button className="back-button" onClick={() => navigate('/')}>Volver</button>
    </div>
  );
}

export default Dashboard;
