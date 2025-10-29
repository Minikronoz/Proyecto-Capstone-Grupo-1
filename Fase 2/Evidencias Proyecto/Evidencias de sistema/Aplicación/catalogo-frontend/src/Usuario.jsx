import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function Usuario() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [formData, setFormData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Obtener el token del localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          navigate("/login");
          return;
        }

        // Obtener los datos del usuario
        const response = await fetch('http://localhost:3000/api/auth/', {
          headers: {
            'x-auth-token': token
          }
        });

        if (!response.ok) {
          throw new Error('Error al obtener datos del usuario');
        }

        const data = await response.json();
        
        // Asegurarse que "negocios" siempre sea un array
        if (!Array.isArray(data.negocios)) data.negocios = [];

        setUsuario(data);
        setFormData(data);
      } catch (error) {
        console.error("Error al obtener datos del usuario:", error);
        navigate("/login");
      } finally {
        setCargando(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleChange = (e, index = null) => {
    const { name, value } = e.target;

    // Si es un campo de negocio
    if (name.startsWith("negocios.") && index !== null) {
      const key = name.split(".")[1];
      const nuevosNegocios = [...(formData.negocios || [])];
      nuevosNegocios[index] = {
        ...nuevosNegocios[index],
        [key]: value,
      };
      setFormData((prev) => ({ ...prev, negocios: nuevosNegocios }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleGuardar = async () => {
    try {
      if (!usuario) return;

      const token = localStorage.getItem('token');
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.msg || 'Error al actualizar los datos');
      }

      alert("Datos actualizados correctamente");
      navigate("/");
    } catch (error) {
      console.error("Error al actualizar datos:", error);
      alert(error.message || "Error al actualizar los datos");
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


          <label>Email:</label>
          <input type="email" name="email" value={formData.email || ""} disabled />

          <label>Sexo:</label>
          <input type="text" name="sexo" value={formData.sexo || ""} onChange={handleChange} />

          <label>Fecha de nacimiento:</label>
          <input type="date" name="fechaNacimiento" value={formData.fechaNacimiento || ""} onChange={handleChange} />
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

        {formData.tieneNegocio && formData.negocios.length > 0 && (
          formData.negocios.map((negocio, index) => (
            <section className="usuario-seccion" key={index}>
              <h3>Datos del Negocio {index + 1}</h3>
              <label>Nombre del negocio:</label>
              <input type="text" name="negocios.nombre" value={negocio.nombre || ""} onChange={(e) => handleChange(e, index)} />

              <label>Email del negocio:</label>
              <input type="text" name="negocios.email" value={negocio.email || ""} onChange={(e) => handleChange(e, index)} />

              <label>Giro:</label>
              <input type="text" name="negocios.giro" value={negocio.giro || ""} onChange={(e) => handleChange(e, index)} />

              <label>Comuna:</label>
              <input type="text" name="negocios.comuna" value={negocio.comuna || ""} onChange={(e) => handleChange(e, index)} />

              <label>Región:</label>
              <input type="text" name="negocios.region" value={negocio.region || ""} onChange={(e) => handleChange(e, index)} />

              <label>Sector:</label>
              <input type="text" name="negocios.sector" value={negocio.sector || ""} onChange={(e) => handleChange(e, index)} />

              <label>Teléfono:</label>
              <input type="text" name="negocios.telefono" value={negocio.telefono || ""} onChange={(e) => handleChange(e, index)} />

              <label>Web:</label>
              <input type="text" name="negocios.web" value={negocio.web || ""} onChange={(e) => handleChange(e, index)} />
            </section>
          ))
        )}




        <button className="usuario-perfil-btn" onClick={handleGuardar}>Guardar cambios</button>
      </div>
    </div>
  );
}

export default Usuario;
