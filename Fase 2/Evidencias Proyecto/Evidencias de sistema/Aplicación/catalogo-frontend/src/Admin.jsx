import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { io } from "socket.io-client";
import "./App.css";

function Admin() {
  const [usuarios, setUsuarios] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    role: "",
    rut: "",
    fechaNacimiento: "",
    sexo: "",
    region: "",
    comuna: "",
    sector: "",
    negocio: { nombre: "", rolTributario: "", giro: "", telefono: "", email: "", web: "" },
  });
  const [scrapingLogs, setScrapingLogs] = useState({
    tottus: [],
    jumbo: [],
    unimarc: [],
    acuenta: [],
  });
  const [isLoading, setIsLoading] = useState({
    tottus: false,
    jumbo: false,
    unimarc: false,
    acuenta: false,
  });
  const [scrapingStatus, setScrapingStatus] = useState({
    tottus: 'idle',
    jumbo: 'idle',
    unimarc: 'idle',
    acuenta: 'idle'
  });

  const regiones = { 
    "Arica y Parinacota": ["Arica", "Camarones", "Putre", "General Lagos"], 
    "Tarapacá": ["Iquique", "Alto Hospicio", "Pozo Almonte", "Camiña", "Colchane", "Huara", "Pica"], 
    "Antofagasta": ["Antofagasta", "Mejillones", "Sierra Gorda", "Taltal", "Calama", "Ollagüe", "San Pedro de Atacama", "Tocopilla", "María Elena"], 
    "Atacama": ["Copiapó", "Caldera", "Tierra Amarilla", "Chañaral", "Diego de Almagro", "Vallenar", "Alto del Carmen", "Freirina", "Huasco"], 
    "Coquimbo": ["La Serena", "Coquimbo", "Andacollo", "La Higuera", "Paiguano", "Vicuña", "Illapel", "Canela", "Los Vilos", "Salamanca", "Ovalle", "Combarbalá", "Monte Patria", "Punitaqui", "Río Hurtado"], 
    "Valparaíso": ["Valparaíso", "Casablanca", "Concón", "Juan Fernández", "Puchuncaví", "Quintero", "Viña del Mar", "Isla de Pascua", "Los Andes", "Calle Larga", "Rinconada", "San Esteban", "La Ligua", "Cabildo", "Papudo", "Petorca", "Zapallar", "Quillota", "Calera", "Hijuelas", "La Cruz", "Nogales", "San Antonio", "Algarrobo", "Cartagena", "El Quisco", "El Tabo", "Santo Domingo", "San Felipe", "Catemu", "Llaillay", "Panquehue", "Putaendo", "Santa María", "Quilpué", "Limache", "Olmué", "Villa Alemana"], 
    "Metropolitana de Santiago": ["Santiago", "Cerrillos", "Cerro Navia", "Conchalí", "El Bosque", "Estación Central", "Huechuraba", "Independencia", "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina", "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado", "Macul", "Maipú", "Ñuñoa", "Pedro Aguirre Cerda", "Peñalolén", "Providencia", "Pudahuel", "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Joaquín", "San Miguel", "San Ramón", "Vitacura", "Puente Alto", "Pirque", "San José de Maipo", "Colina", "Lampa", "Tiltil"], 
    "O'Higgins": ["Rancagua", "Codegua", "Coinco", "Coltauco", "Doñihue", "Graneros", "Las Cabras", "Machalí", "Malloa", "Mostazal", "Olivar", "Peumo", "Pichidegua", "Quinta de Tilcoco", "Rengo", "Requínoa", "San Vicente", "La Estrella", "Litueche", "Marchihue", "Navidad", "Paredones", "Pichilemu", "Chimbarongo", "Lolol", "Nancagua", "Palmilla", "Peralillo", "Placilla", "Santa Cruz"], 
    "Maule": ["Talca", "Constitución", "Curepto", "Empedrado", "Maule", "Pelarco", "Pencahue", "Río Claro", "San Clemente", "San Rafael", "Cauquenes", "Chanco", "Pelluhue", "Curicó", "Hualañé", "Licantén", "Molina", "Rauco", "Romeral", "Sagrada Familia", "Teno", "Vichuquén", "Linares", "Colbún", "Longaví", "Parral", "Retiro", "San Javier", "Villa Alegre"], 
    "Ñuble": ["Chillán", "Chillán Viejo", "Cobquecura", "Coelemu", "Coihueco", "El Carmen", "Ninhue", "Ñiquén", "Pemuco", "Pinto", "Portezuelo", "Quillón", "Quirihue", "Ránquil", "San Carlos", "San Fabián", "San Ignacio", "San Nicolás", "Treguaco", "Yungay"], 
    "Biobío": ["Concepción", "Coronel", "Chiguayante", "Florida", "Hualpén", "Hualqui", "Lota", "Penco", "San Pedro de la Paz", "Santa Juana", "Talcahuano", "Tomé", "Cabrero", "Lebu", "Los Álamos", "Cañete", "Contulmo", "Curanilahue", "Arauco", "Laja", "Los Ángeles", "Mulchén", "Nacimiento", "Negrete", "Quilaco", "Quilleco", "San Rosendo", "Santa Bárbara", "Tucapel", "Yumbel", "Alto Biobío"], 
    "Araucanía": ["Temuco", "Carahue", "Cholchol", "Cunco", "Curarrehue", "Freire", "Galvarino", "Gorbea", "Lautaro", "Loncoche", "Melipeuco", "Nueva Imperial", "Padre Las Casas", "Perquenco", "Pitrufquén", "Pucón", "Saavedra", "Teodoro Schmidt", "Toltén", "Vilcún", "Villarrica", "Angol", "Collipulli", "Curacautín", "Ercilla", "Lonquimay", "Los Sauces", "Lumaco", "Purén", "Renaico", "Traiguén", "Victoria"], 
    "Los Ríos": ["Valdivia", "Corral", "Lanco", "Los Lagos", "Máfil", "Mariquina", "Paillaco", "Panguipulli", "La Unión", "Futrono", "Lago Ranco", "Río Bueno"],
    "Los Lagos": ["Puerto Montt", "Calbuco", "Cochamó", "Fresia", "Frutillar", "Los Muermos", "Llanquihue", "Maullín", "Puerto Varas", "Castro", "Ancud", "Chonchi", "Curaco de Vélez", "Dalcahue", "Puqueldón", "Queilén", "Quellón", "Quemchi", "Quinchao", "Osorno", "Puerto Octay", "Purranque", "Puyehue", "Río Negro", "San Juan de la Costa", "San Pablo", "Chaitén", "Futaleufú", "Hualaihué", "Palena"], 
    "Aysén": ["Coyhaique", "Lago Verde", "Aysén", "Cisnes", "Guaitecas", "Chile Chico", "Río Ibáñez", "Tortel"], 
    "Magallanes": ["Punta Arenas", "Laguna Blanca", "Río Verde", "San Gregorio", "Cabo de Hornos", "Antártica", "Porvenir", "Primavera", "Timaukel", "Natales", "Torres del Paine"] 
  };

  // ===== FUNCIONES DE USUARIOS =====
  useEffect(() => {
    const fetchUsuarios = async () => {
      const snapshot = await getDocs(collection(db, "usuarios"));
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsuarios(data);
    };
    fetchUsuarios();
  }, []);

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === "cliente" ? "usuario" : "cliente";
    await updateDoc(doc(db, "usuarios", userId), { role: newRole });
    setUsuarios((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  };

  const deleteUser = async (userId) => {
    if (window.confirm("¿Seguro que deseas eliminar este usuario?")) {
      await deleteDoc(doc(db, "usuarios", userId));
      setUsuarios((prev) => prev.filter((u) => u.id !== userId));
    }
  };

  const startEdit = (user) => {
    setEditUser(user.id);
    setFormData({
      nombre: user.nombre || "",
      apellido: user.apellido || "",
      email: user.email || "",
      role: user.role || "cliente",
      rut: user.rut || "",
      fechaNacimiento: user.fechaNacimiento || "",
      sexo: user.sexo || "",
      region: user.region || "",
      comuna: user.comuna || "",
      sector: user.sector || "",
      negocio: {
        nombre: user.negocio?.nombre || "",
        rolTributario: user.negocio?.rolTributario || "",
        giro: user.negocio?.giro || "",
        telefono: user.negocio?.telefono || "",
        email: user.negocio?.email || "",
        web: user.negocio?.web || "",
      },
    });
  };

  const saveEdit = async (userId) => {
    await updateDoc(doc(db, "usuarios", userId), formData);
    setUsuarios((prev) => prev.map((u) => (u.id === userId ? { ...u, ...formData } : u)));
    setEditUser(null);
  };

  const cancelEdit = () => setEditUser(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("negocio.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        negocio: { ...prev.negocio, [key]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ===== FUNCIONES DE CATÁLOGOS =====
  useEffect(() => {
    const socket = io("http://localhost:3001");

    socket.on('scrapingLog', ({ store, log, type }) => {
      setScrapingLogs(prev => ({
        ...prev,
        [store]: [...prev[store], { text: log, type }]
      }));
    });

    socket.on('scrapingError', ({ store }) => {
      setScrapingStatus(prev => ({
        ...prev,
        [store]: 'error'
      }));
      setIsLoading(prev => ({
        ...prev,
        [store]: false
      }));
    });

    socket.on('scrapingComplete', ({ store, success }) => {
      setScrapingStatus(prev => ({
        ...prev,
        [store]: success ? 'success' : 'error'
      }));
      setIsLoading(prev => ({
        ...prev,
        [store]: false
      }));
    });

    return () => socket.disconnect();
  }, []);

  const handleUpdateCatalog = async (store) => {
    try {
      setIsLoading(prev => ({ ...prev, [store]: true }));
      setScrapingStatus(prev => ({ ...prev, [store]: 'loading' }));
      setScrapingLogs(prev => ({ ...prev, [store]: [] })); // Limpiar logs anteriores
      
      const response = await fetch(`http://localhost:3001/api/scrape/${store}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Error al actualizar catálogo de ${store}`);
      }
    } catch (error) {
      console.error(error);
      setScrapingStatus(prev => ({ ...prev, [store]: 'error' }));
      setIsLoading(prev => ({ ...prev, [store]: false }));
    }
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Administración de Usuarios</h1>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Email</th>
              <th>Rol</th>
              <th>RUT</th>
              <th>Fecha Nac.</th>
              <th>Sexo</th>
              <th>Región</th>
              <th>Comuna</th>
              <th>Sector</th>
              <th>Negocio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((user) => (
              <tr key={user.id}>
                <td>{editUser === user.id ? <input name="nombre" value={formData.nombre} onChange={handleInputChange} /> : user.nombre}</td>
                <td>{editUser === user.id ? <input name="apellido" value={formData.apellido} onChange={handleInputChange} /> : user.apellido}</td>
                <td>{editUser === user.id ? <input name="email" value={formData.email} onChange={handleInputChange} /> : user.email}</td>
                <td>
                  {editUser === user.id ? (
                    <select name="role" value={formData.role} onChange={handleInputChange}>
                      <option value="cliente">Cliente</option>
                      <option value="usuario">Usuario</option>
                    </select>
                  ) : (
                    <span className={`admin-role-badge ${user.role}`}>{user.role}</span>
                  )}
                </td>
                <td>{editUser === user.id ? <input name="rut" value={formData.rut} onChange={handleInputChange} /> : user.rut}</td>
                <td>{editUser === user.id ? <input type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleInputChange} /> : user.fechaNacimiento}</td>
                <td>{editUser === user.id ? (
                  <select name="sexo" value={formData.sexo} onChange={handleInputChange}>
                    <option value="">Seleccione</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                ) : user.sexo}</td>
                <td>{editUser === user.id ? (
                  <select name="region" value={formData.region} onChange={handleInputChange}>
                    <option value="">Seleccione</option>
                    {Object.keys(regiones).map((reg) => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                ) : user.region}</td>
                <td>{editUser === user.id ? (
                  <select name="comuna" value={formData.comuna} onChange={handleInputChange}>
                    <option value="">Seleccione</option>
                    {regiones[formData.region]?.map((com) => (
                      <option key={com} value={com}>{com}</option>
                    ))}
                  </select>
                ) : user.comuna}</td>
                <td>{editUser === user.id ? <input name="sector" value={formData.sector} onChange={handleInputChange} /> : user.sector}</td>
                <td>
                  {editUser === user.id ? (
                    <>
                      <input name="negocio.nombre" placeholder="Nombre" value={formData.negocio.nombre} onChange={handleInputChange} />
                      <input name="negocio.rolTributario" placeholder="Rol Tributario" value={formData.negocio.rolTributario} onChange={handleInputChange} />
                      <input name="negocio.giro" placeholder="Giro" value={formData.negocio.giro} onChange={handleInputChange} />
                      <input name="negocio.telefono" placeholder="Teléfono" value={formData.negocio.telefono} onChange={handleInputChange} />
                      <input name="negocio.email" placeholder="Email" value={formData.negocio.email} onChange={handleInputChange} />
                      <input name="negocio.web" placeholder="Web" value={formData.negocio.web} onChange={handleInputChange} />
                    </>
                  ) : (
                    <>
                      <div>{user.negocio?.nombre}</div>
                      <div>{user.negocio?.rolTributario}</div>
                      <div>{user.negocio?.giro}</div>
                      <div>{user.negocio?.telefono}</div>
                      <div>{user.negocio?.email}</div>
                      <div>{user.negocio?.web}</div>
                    </>
                  )}
                </td>
                <td className="admin-action-buttons">
                  {editUser === user.id ? (
                    <>
                      <button className="admin-btn-save" onClick={() => saveEdit(user.id)}>Guardar</button>
                      <button className="admin-btn-cancel" onClick={cancelEdit}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button className="admin-btn-role" onClick={() => toggleRole(user.id, user.role)}>Cambiar Rol</button>
                      <button className="admin-btn-edit" onClick={() => startEdit(user)}>Editar</button>
                      <button className="admin-btn-delete" onClick={() => deleteUser(user.id)}>Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===================== GESTIÓN DE CATÁLOGOS ===================== */}
      <h2 className="admin-subtitle">Gestión de Catálogos</h2>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Supermercado</th>
              <th>Estado</th>
              <th>Acciones</th>
              <th>Logs</th>
            </tr>
          </thead>
          <tbody>
            {["tottus", "jumbo", "unimarc", "acuenta"].map((store) => (
              <tr key={store}>
                <td>{store.charAt(0).toUpperCase() + store.slice(1)}</td>
                <td>{isLoading[store] ? <span className="loading-indicator">Actualizando...</span> : <span className="status-indicator">Listo</span>}</td>
                <td>
                  <button
                    className="admin-btn-update"
                    onClick={() => handleUpdateCatalog(store)}
                    disabled={isLoading[store]}
                  >
                    Actualizar Catálogo
                  </button>
                </td>
                <td className="log-cell">
                  <div className="log-container">
                    {scrapingLogs[store].map((log, index) => (
                      <div key={index} className="log-line">{log.text}</div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Admin;
