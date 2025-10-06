import React, { useEffect, useState } from "react";
import { db } from "./firebase"; //  config firebase
import { collection, getDocs } from "firebase/firestore";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";


function Dashboard() {
  const [busquedas, setBusquedas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [busquedasPorDia, setBusquedasPorDia] = useState([]);
  const [terminosMasBuscados, setTerminosMasBuscados] = useState([]);
  const [terminosFiltrados, setTerminosFiltrados] = useState([]);
  const [busquedasPorRegion, setBusquedasPorRegion] = useState([]);
  const [regionesFiltradas, setRegionesFiltradas] = useState(new Set());
  const [buscadorTermino, setBuscadorTermino] = useState("");
  const [isOpen, setIsOpen] = useState(false);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Iniciando fetchData...');
        const busquedasSnap = await getDocs(collection(db, "busquedas"));
        const usuariosSnap = await getDocs(collection(db, "usuarios"));

        const busquedasData = busquedasSnap.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        const usuariosData = usuariosSnap.docs.map(doc => doc.data());

        console.log('Datos obtenidos:', { 
          busquedas: busquedasData.length, 
          usuarios: usuariosData.length 
        });

        setBusquedas(busquedasData);
        setUsuarios(usuariosData);

        // --- Agrupar por día ---
        const countsDia = {};
        busquedasData.forEach(b => {
          if (!b.fechaBusqueda) return;
          if (regionesFiltradas.size > 0 && !regionesFiltradas.has(b.region)) return;
          if (buscadorTermino && normalizarTexto(b.busqueda) !== normalizarTexto(buscadorTermino)) return;
          
          let fecha;
          try {
            if (b.fechaBusqueda.seconds) {
              fecha = new Date(b.fechaBusqueda.seconds * 1000);
            } else if (b.fechaBusqueda.toDate) {
              fecha = b.fechaBusqueda.toDate();
            } else {
              fecha = new Date(b.fechaBusqueda);
            }
            const fechaStr = fecha.toLocaleDateString("es-CL");
            countsDia[fechaStr] = (countsDia[fechaStr] || 0) + 1;
          } catch (error) {
            console.error('Error procesando fecha:', b.fechaBusqueda, error);
          }
        });

        // Convertir fechas a formato Date para ordenar correctamente
        let datosOrdenados = Object.entries(countsDia)
          .map(([date, total]) => {
            // Convertir fecha de formato "DD-MM-YYYY" a Date
            const [dia, mes, anio] = date.split('-');
            return {
              date,
              dateObj: new Date(`${anio}-${mes}-${dia}`),
              total
            };
          })
          .sort((a, b) => a.dateObj - b.dateObj) // Ordenar por fecha
          .map(({ date, total }) => ({ date, total })); // Remover dateObj del resultado final

        if (datosOrdenados.length > 7) {
          datosOrdenados = datosOrdenados.slice(-7);
        }
        setBusquedasPorDia(datosOrdenados);
        console.log('Datos por día procesados:', datosOrdenados);

        // --- Términos más buscados ---
        const countsTermino = {};
        busquedasData.forEach(b => {
          if (!b.busqueda) return;
          if (regionesFiltradas.size > 0 && !regionesFiltradas.has(b.region)) return;
          // Normalizar el término de búsqueda
          const terminoNormalizado = b.busqueda.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          countsTermino[terminoNormalizado] = (countsTermino[terminoNormalizado] || 0) + 1;
        });

        const terminosOrdenados = Object.entries(countsTermino)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total);

        setTerminosMasBuscados(terminosOrdenados);
        setTerminosFiltrados(terminosOrdenados);
        console.log('Términos procesados:', terminosOrdenados);

        // --- Distribución por región ---
        const countsRegion = {};
        busquedasData.forEach(b => {
          if (!b.region) return;
          if (buscadorTermino && normalizarTexto(b.busqueda) !== normalizarTexto(buscadorTermino)) return;
          countsRegion[b.region] = (countsRegion[b.region] || 0) + 1;
        });

        const regionesOrdenadas = Object.entries(countsRegion)
          .map(([region, total]) => ({ region, total }))
          .sort((a, b) => b.total - a.total);

        console.log('Regiones procesadas:', regionesOrdenadas);
        setBusquedasPorRegion(regionesOrdenadas);

      } catch (error) {
        console.error('Error en fetchData:', error);
      }
    };

    fetchData();
  }, [regionesFiltradas, buscadorTermino]);

  // Usuarios únicos
  const totalUsuarios = new Set(usuarios.map(u => u.rut)).size;

  // Función para normalizar texto (remover tildes y convertir a minúsculas)
  const normalizarTexto = (texto) => {
    return texto.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  // Filtro del buscador
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

  return (
    <div className="dashboard-container">
      <h1> Dashboard Administrativo</h1>

    <button 
      onClick={() => navigate('/')}
      className="back-button"
    >Regresar al inicio
    </button>
      {/* Métricas principales */}
      <div className="card small">
        <h2> Total Usuarios</h2>
        <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#2c3e50", textAlign: "center" }}>{totalUsuarios}</p>
      </div>
      
      <div className="card small">
        <h2>{buscadorTermino ? `Búsquedas de "${buscadorTermino}"` : "Total Búsquedas"}</h2>
        <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#3498db", textAlign: "center" }}>
          {(() => {
            let busquedasFiltradas = busquedas;
            if (regionesFiltradas.size > 0) {
              busquedasFiltradas = busquedasFiltradas.filter(b => regionesFiltradas.has(b.region));
            }
            if (buscadorTermino) {
              busquedasFiltradas = busquedasFiltradas.filter(b => 
                normalizarTexto(b.busqueda) === normalizarTexto(buscadorTermino)
              );
            }
            return busquedasFiltradas.length;
          })()}
        </p>
      </div>

      <div className="card small">
        <h2>{buscadorTermino ? `Búsquedas Hoy de "${buscadorTermino}"` : "Término Más Buscado Hoy"}</h2>
        <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2ecc71", textAlign: "center" }}>
          {(() => {
            const hoy = new Date().toLocaleDateString("es-CL");
            const busquedasHoy = busquedas.filter(b => {
              if (regionesFiltradas.size > 0 && !regionesFiltradas.has(b.region)) return false;
              const fechaBusqueda = new Date(b.fechaBusqueda.seconds * 1000).toLocaleDateString("es-CL");
              return fechaBusqueda === hoy;
            });
            
            if (buscadorTermino) {
              // Si hay un término seleccionado, mostrar sus búsquedas de hoy
              const busquedasTerminoHoy = busquedasHoy.filter(b => 
                normalizarTexto(b.busqueda) === normalizarTexto(buscadorTermino)
              ).length;
              return busquedasTerminoHoy ? (
                <>
                  {busquedasTerminoHoy}
                  <span style={{ display: 'block', fontSize: '1rem', color: '#7f8c8d' }}>
                    búsquedas hoy
                  </span>
                </>
              ) : "Sin búsquedas hoy";
            } else {
              // Comportamiento original para mostrar el término más buscado
              const terminosHoy = {};
              busquedasHoy.forEach(b => {
                if (!b.busqueda) return;
                terminosHoy[b.busqueda] = (terminosHoy[b.busqueda] || 0) + 1;
              });

              const masBuscadoHoy = Object.entries(terminosHoy)
                .sort(([,a], [,b]) => b - a)[0];

              return masBuscadoHoy ? (
                <>
                  {masBuscadoHoy[0]}
                  <span style={{ display: 'block', fontSize: '1rem', color: '#7f8c8d' }}>
                    ({masBuscadoHoy[1]} veces hoy)
                  </span>
                </>
              ) : "Sin búsquedas hoy";
            }
          })()}
        </p>
      </div>

      <div className="card small">
        <h2>
          {buscadorTermino 
            ? `Región con más búsquedas de "${buscadorTermino}" hoy` 
            : "Región Más Activa Hoy"}
        </h2>
        <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#e67e22", textAlign: "center" }}>
          {(() => {
            const hoy = new Date().toLocaleDateString("es-CL");
            let busquedasHoy = busquedas.filter(b => {
              if (regionesFiltradas.size > 0 && !regionesFiltradas.has(b.region)) return false;
              const fechaBusqueda = new Date(b.fechaBusqueda.seconds * 1000).toLocaleDateString("es-CL");
              return fechaBusqueda === hoy;
            });

            if (buscadorTermino) {
              busquedasHoy = busquedasHoy.filter(b => 
                normalizarTexto(b.busqueda) === normalizarTexto(buscadorTermino)
              );
            }

            const regionesHoy = {};
            busquedasHoy.forEach(b => {
              if (!b.region) return;
              regionesHoy[b.region] = (regionesHoy[b.region] || 0) + 1;
            });

            const masActivaHoy = Object.entries(regionesHoy)
              .sort(([,a], [,b]) => b - a)[0];

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
        <h2> Búsquedas por día {regionesFiltradas.size > 0 && `(${regionesFiltradas.size} ${regionesFiltradas.size === 1 ? 'Región' : 'Regiones'} seleccionadas)`}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={busquedasPorDia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date"
              tick={{ fontSize: 14 }}
              tickFormatter={(value) => {
                // Convertir de "DD-MM-YYYY" a "DD/MM"
                const [dia, mes] = value.split('-');
                return `${dia}/${mes}`;
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

      {/* Términos más buscados con buscador */}
      <div className="card large">
        <h2> Términos más buscados {regionesFiltradas.size > 0 && `(${regionesFiltradas.size} ${regionesFiltradas.size === 1 ? 'Región' : 'Regiones'} seleccionadas)`}</h2>

        {/* Dropdown personalizado para términos */}
        <div id="terminos-dropdown" style={{ position: 'relative', marginBottom: '1rem' }}>
          <div 
            onClick={() => setIsOpen(!isOpen)}
            style={{
              padding: "0.5rem",
              width: "100%",
              border: "1px solid #ccc",
              borderRadius: "8px",
              backgroundColor: "white",
              fontSize: "1rem",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span>{buscadorTermino || "Todos los términos"}</span>
            <svg 
              fill="gray" 
              height="24" 
              viewBox="0 0 24 24" 
              width="24" 
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.3s ease'
              }}
            >
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </div>
          
          {isOpen && (
            <div 
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                maxHeight: "250px",
                overflowY: "auto",
                backgroundColor: "white",
                border: "1px solid #ccc",
                borderRadius: "8px",
                marginTop: "4px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                zIndex: 1000
              }}
            >
              <div 
                onClick={() => {
                  setBuscadorTermino("");
                  setIsOpen(false);
                }}
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                  hover: {
                    backgroundColor: "#f5f5f5"
                  }
                }}
              >
                Todos los términos
              </div>
              {terminosMasBuscados.map(termino => (
                <div
                  key={termino.name}
                  onClick={() => {
                    setBuscadorTermino(termino.name);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    backgroundColor: buscadorTermino === termino.name ? "#f5f5f5" : "white",
                    transition: "background-color 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 
                      buscadorTermino === termino.name ? "#f5f5f5" : "white";
                  }}
                >
                  {termino.name} ({termino.total} búsquedas)
                </div>
              ))}
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={terminosFiltrados.slice(0, 10)}> {/* top 10 o buscados */}
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#2ecc71" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Distribución por región */}
      <div className="card large">
        <h2>
          {buscadorTermino 
            ? `Distribución por región de "${buscadorTermino}"`
            : "Distribución por región"}
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            layout="vertical"
            data={[...busquedasPorRegion].sort((a, b) => b.total - a.total)}
            onClick={(data) => {
              if (data && data.activeLabel) {
                setRegionesFiltradas(prevRegiones => {
                  const newRegiones = new Set(prevRegiones);
                  if (newRegiones.has(data.activeLabel)) {
                    newRegiones.delete(data.activeLabel);
                  } else {
                    newRegiones.add(data.activeLabel);
                  }
                  return newRegiones;
                });
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="region" width={150} />
            <Tooltip />
            <Bar dataKey="total">
              {busquedasPorRegion.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={regionesFiltradas.has(entry.region) ? '#868181ff' : COLORS[index % COLORS.length]}
                  opacity={regionesFiltradas.size === 0 || regionesFiltradas.has(entry.region) ? 1 : 0.5}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        {/* Lista de regiones seleccionadas */}
        {regionesFiltradas.size > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              Regiones seleccionadas:
              {Array.from(regionesFiltradas).map(region => (
                <span
                  key={region}
                  style={{
                    display: 'inline-block',
                    margin: '4px',
                    padding: '4px 8px',
                    backgroundColor: '#3b3b3bff',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.9em'
                  }}
                >
                  {region}
                </span>
              ))}
            </div>
            <button 
              onClick={() => setRegionesFiltradas(new Set())}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b3b3bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Quitar todos los filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
