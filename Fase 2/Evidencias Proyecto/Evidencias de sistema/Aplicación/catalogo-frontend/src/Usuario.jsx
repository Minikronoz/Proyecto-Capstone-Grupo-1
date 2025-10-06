import "./App.css";

// UserProfilePage.jsx


const mockUsers = [
  {
    id: 1,
    nombre: "Carlos",
    apellido: "Catalán",
    email: "carlos@example.com",
    role: "cliente",
    rut: "12345678-9",
    fechaNacimiento: "1990-05-20",
    sexo: "masculino",
    region: "Metropolitana de Santiago",
    comuna: "Santiago",
    sector: "Centro",
    negocio: { nombre: "Mi Negocio", rolTributario: "123", giro: "Retail", telefono: "123456789", email: "negocio@example.com", web: "www.negocio.cl" }
  }
];

function UserProfilePage() {
  const [users, setUsers] = useState(mockUsers);
  const [editUser, setEditUser] = useState(mockUsers[0]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("negocio.")) {
      const key = name.split(".")[1];
      setEditUser(prev => ({ ...prev, negocio: { ...prev.negocio, [key]: value } }));
    } else {
      setEditUser(prev => ({ ...prev, [name]: value }));
    }
  };

  const saveUser = () => {
    setUsers(users.map(u => u.id === editUser.id ? editUser : u));
    alert("Usuario guardado correctamente");
  };

  return (
    <div className="userprofile-container">
      <h1>Editar Usuario</h1>
      <div className="userprofile-form">
        <div className="form-section">
          <h2>Datos Personales</h2>
          <label>Nombre</label>
          <input name="nombre" value={editUser.nombre} onChange={handleChange} />

          <label>Apellido</label>
          <input name="apellido" value={editUser.apellido} onChange={handleChange} />

          <label>Email</label>
          <input name="email" value={editUser.email} onChange={handleChange} />

          <label>Rol</label>
          <select name="role" value={editUser.role} onChange={handleChange}>
            <option value="cliente">Cliente</option>
            <option value="usuario">Usuario</option>
          </select>

          <label>RUT</label>
          <input name="rut" value={editUser.rut} onChange={handleChange} />

          <label>Fecha de Nacimiento</label>
          <input type="date" name="fechaNacimiento" value={editUser.fechaNacimiento} onChange={handleChange} />

          <label>Sexo</label>
          <select name="sexo" value={editUser.sexo} onChange={handleChange}>
            <option value="">Seleccione</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
          </select>

          <label>Región</label>
          <input name="region" value={editUser.region} onChange={handleChange} />

          <label>Comuna</label>
          <input name="comuna" value={editUser.comuna} onChange={handleChange} />

          <label>Sector</label>
          <input name="sector" value={editUser.sector} onChange={handleChange} />
        </div>

        <div className="form-section">
          <h2>Datos del Negocio</h2>
          <label>Nombre</label>
          <input name="negocio.nombre" value={editUser.negocio.nombre} onChange={handleChange} />

          <label>Rol Tributario</label>
          <input name="negocio.rolTributario" value={editUser.negocio.rolTributario} onChange={handleChange} />

          <label>Giro</label>
          <input name="negocio.giro" value={editUser.negocio.giro} onChange={handleChange} />

          <label>Teléfono</label>
          <input name="negocio.telefono" value={editUser.negocio.telefono} onChange={handleChange} />

          <label>Email</label>
          <input name="negocio.email" value={editUser.negocio.email} onChange={handleChange} />

          <label>Web</label>
          <input name="negocio.web" value={editUser.negocio.web} onChange={handleChange} />
        </div>

        <div className="form-actions">
          <button className="btn-save" onClick={saveUser}>Guardar Cambios</button>
        </div>
      </div>
    </div>
  );
}

export default UserProfilePage;


