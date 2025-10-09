import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { io } from "socket.io-client";
import "./App.css";

function Admin() {
  const [usuarios, setUsuarios] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({});
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
    tottus: "idle",
    jumbo: "idle",
    unimarc: "idle",
    acuenta: "idle",
  });

  const regiones = {
    /* Tu objeto regiones aquí */
  };

  // ===== FUNCIONES AUXILIARES =====
  const getFormattedDateTime = () => {
    const today = new Date();
    return today.toLocaleString("es-CL", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
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

    // Inicializa formData incluyendo todos los negocios
    setFormData({
      ...user,
      negocios: user.negocios?.length
        ? user.negocios.map(n => ({
            nombre: n.nombre || "",
            rolTributario: n.rolTributario || "",
            giro: n.giro || "",
            telefono: n.telefono || "",
            email: n.email || "",
            web: n.web || "",
            comuna: n.comuna || "",
            region: n.region || "",
            sector: n.sector || null
          }))
        : [],
      negocio: user.negocio || {
        nombre: "",
        rolTributario: "",
        giro: "",
        telefono: "",
        email: "",
        web: "",
      }
    });
  };

  const saveEdit = async (userId) => {
    await updateDoc(doc(db, "usuarios", userId), formData);
    setUsuarios((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...formData } : u))
    );
    setEditUser(null);
  };

  const cancelEdit = () => setEditUser(null);

  const handleInputChange = (e, negocioIndex = null) => {
    const { name, value } = e.target;

    if (name.startsWith("negocio.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        negocio: { ...prev.negocio, [key]: value },
      }));
    } else if (name.startsWith("negocios.") && negocioIndex !== null) {
      const key = name.split(".")[1];
      setFormData((prev) => {
        const updatedNegocios = [...prev.negocios];
        updatedNegocios[negocioIndex] = { ...updatedNegocios[negocioIndex], [key]: value };
        return { ...prev, negocios: updatedNegocios };
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ===== FUNCIONES DE CATÁLOGOS =====
  useEffect(() => {
    const socket = io("http://localhost:3001");

    socket.on("scrapingLog", ({ store, log, type }) => {
      setScrapingLogs((prev) => ({
        ...prev,
        [store]: [...prev[store], { text: log, type }],
      }));
    });

    socket.on("scrapingError", ({ store }) => {
      setScrapingStatus((prev) => ({ ...prev, [store]: "error" }));
      setIsLoading((prev) => ({ ...prev, [store]: false }));
    });

    socket.on("scrapingComplete", ({ store, success }) => {
      setScrapingStatus((prev) => ({ ...prev, [store]: success ? "success" : "error" }));
      setIsLoading((prev) => ({ ...prev, [store]: false }));

      setTimeout(() => {
        setScrapingLogs((prev) => ({
          ...prev,
          [store]: [{ text: "✅ Catálogo actualizado" }],
        }));
      }, 2000);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const allUpdated = Object.values(scrapingStatus).every(status => status === "success");

    if (allUpdated) {
      const now = getFormattedDateTime();
      setLastUpdate(now);

      const updateDateInDB = async () => {
        try {
          const configRef = doc(db, "config", "catalogo");
          await updateDoc(configRef, { lastUpdate: now });
          console.log("Fecha de actualización guardada:", now);
        } catch (error) {
          console.error("Error guardando la fecha de actualización:", error);
        }
      };

      updateDateInDB();
    }
  }, [scrapingStatus]);

  const handleUpdateCatalog = async (store) => {
    try {
      setIsLoading((prev) => ({ ...prev, [store]: true }));
      setScrapingStatus((prev) => ({ ...prev, [store]: "loading" }));
      setScrapingLogs((prev) => ({ ...prev, [store]: [] }));

      const response = await fetch(`http://localhost:3001/api/scrape/${store}`, {
        method: "POST",
      });

      if (!response.ok) throw new Error(`Error al actualizar catálogo de ${store}`);
    } catch (error) {
      console.error(error);
      setScrapingStatus((prev) => ({ ...prev, [store]: "error" }));
      setIsLoading((prev) => ({ ...prev, [store]: false }));
      setScrapingLogs((prev) => ({
        ...prev,
        [store]: [{ text: "❌ Error al actualizar catálogo" }],
      }));
    }
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Administración de Usuarios</h1>

      {/* Tabla de usuarios */}
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
              <th>Sector</th>
              <th>Negocios</th>
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
                    {Object.keys(regiones).map((reg) => <option key={reg} value={reg}>{reg}</option>)}
                  </select>
                ) : user.region}</td>
                <td>{editUser === user.id ? <input name="sector" value={formData.sector} onChange={handleInputChange} /> : user.sector}</td>

                

                {/* Array de negocios */}
                <td>
                  {editUser === user.id ? (
                    formData.negocios.map((neg, index) => (
                      <div key={index} style={{ marginBottom: "10px", border: "1px solid #ccc", padding: "5px" }}>
                        <input name="negocios.nombre" placeholder="Nombre" value={neg.nombre} onChange={(e) => handleInputChange(e, index)} />
                        <input name="negocios.rolTributario" placeholder="Rol Tributario" value={neg.rolTributario} onChange={(e) => handleInputChange(e, index)} />
                        <input name="negocios.giro" placeholder="Giro" value={neg.giro} onChange={(e) => handleInputChange(e, index)} />
                        <input name="negocios.telefono" placeholder="Teléfono" value={neg.telefono} onChange={(e) => handleInputChange(e, index)} />
                        <input name="negocios.email" placeholder="Email" value={neg.email} onChange={(e) => handleInputChange(e, index)} />
                        <input name="negocios.web" placeholder="Web" value={neg.web} onChange={(e) => handleInputChange(e, index)} />
                        <input name="negocios.comuna" placeholder="Comuna" value={neg.comuna} onChange={(e) => handleInputChange(e, index)} />
                        <input name="negocios.region" placeholder="Región" value={neg.region} onChange={(e) => handleInputChange(e, index)} />
                        <input name="negocios.sector" placeholder="Sector" value={neg.sector} onChange={(e) => handleInputChange(e, index)} />
                      </div>
                    ))
                  ) : (
                    user.negocios?.map((neg, i) => (
                      <div key={i} style={{ marginBottom: "5px" }}>
                        <div>{neg.nombre} - {neg.rolTributario} - {neg.giro} - {neg.telefono} - {neg.email} - {neg.web}</div>
                      </div>
                    ))
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
                  <button className="admin-btn-update" onClick={() => handleUpdateCatalog(store)} disabled={isLoading[store]}>
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
