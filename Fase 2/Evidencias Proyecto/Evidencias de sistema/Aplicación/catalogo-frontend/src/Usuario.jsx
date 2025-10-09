import React, { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./App.css";


function Usuario() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [formData, setFormData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        const usuariosRef = collection(db, "usuarios");
        const q = query(usuariosRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          setUsuario({ id: docSnap.id, ...docSnap.data() });
          setFormData(docSnap.data());
        } else {
          console.error("No se encontró el documento del usuario");
        }
      } catch (error) {
        console.error("Error al obtener datos del usuario:", error);
      } finally {
        setCargando(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Para campos de negocio anidados
    if (name.startsWith("negocio.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        negocio: {
          ...prev.negocio,
          [key]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

const handleGuardar = async () => {
  try {
    if (!usuario) return;

    const userRef = doc(db, "usuarios", usuario.id);
    await updateDoc(userRef, formData);
    alert("Datos actualizados correctamente ✅");

    // Redirigir a la página principal (App.jsx)
    navigate("/");
  } catch (error) {
    console.error("Error al actualizar datos:", error);
    alert("Error al actualizar los datos ❌");
  }
};

  if (cargando) return <p className="usuario-loading">Cargando datos...</p>;
  if (!usuario) return <p className="usuario-error">No se encontró el usuario.</p>;

  return (
    <div className="usuario-perfil-container">
      <h2 className="usuario-perfil-title">Mi Perfil</h2>

      <div className="usuario-perfil-form">

        <section className="usuario-seccion">
          <h3>Información Personal</h3>
          <label>Nombre:</label>
          <input type="text" name="nombre" value={formData.nombre || ""} onChange={handleChange} />

          <label>Apellido:</label>
          <input type="text" name="apellido" value={formData.apellido || ""} onChange={handleChange} />

          <label>Rut:</label>
          <input type="text" name="rut" value={formData.rut || ""} onChange={handleChange} />

          <label>Sexo:</label>
          <input type="text" name="sexo" value={formData.sexo || ""} onChange={handleChange} />

          <label>Fecha de nacimiento:</label>
          <input type="date" name="fechaNacimiento" value={formData.fechaNacimiento || ""} onChange={handleChange} />
        </section>

        <section className="usuario-seccion">
          <h3>Contacto</h3>
          <label>Email:</label>
          <input type="email" name="email" value={formData.email || ""} disabled />

          <label>Teléfono:</label>
          <input type="text" name="telefono" value={formData.telefono || ""} onChange={handleChange} />

          <label>Web:</label>
          <input type="text" name="web" value={formData.web || ""} onChange={handleChange} />
        </section>

        <section className="usuario-seccion">
          <h3>Ubicación</h3>
          <label>Comuna:</label>
          <input type="text" name="comuna" value={formData.comuna || ""} onChange={handleChange} />

          <label>Región:</label>
          <input type="text" name="region" value={formData.region || ""} onChange={handleChange} />

          <label>Sector:</label>
          <input type="text" name="sector" value={formData.sector || ""} onChange={handleChange} />
        </section>

        {formData.tieneNegocio && (
          <section className="usuario-seccion">
            <h3>Datos del Negocio</h3>
            <label>Nombre del negocio:</label>
            <input type="text" name="negocio.nombre" value={formData.negocio?.nombre || ""} onChange={handleChange} />

            <label>Email del negocio:</label>
            <input type="text" name="negocio.email" value={formData.negocio?.email || ""} onChange={handleChange} />

            <label>Giro:</label>
            <input type="text" name="negocio.giro" value={formData.negocio?.giro || ""} onChange={handleChange} />
          </section>
        )}

        <button className="usuario-perfil-btn" onClick={handleGuardar}>Guardar cambios</button>
      </div>
    </div>
  );
}

export default Usuario;