import React, { useState, useEffect } from "react";
// CAMBIO: Se eliminan las importaciones de Firebase Auth/Firestore, excepto para el reseteo de contraseña.
import { auth } from "./firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import logoImg from "./assets/imagenes/Logo.png";

const regiones = { 
  "Arica y Parinacota": ["Arica", "Camarones", "Putre", "General Lagos"], 
  "Tarapacá": ["Iquique", "Alto Hospicio", "Pozo Almonte", "Camiña", "Colchane", "Huara", "Pica"], 
  "Antofagasta": ["Antofagasta", "Mejillones", "Sierra Gorda", "Taltal", "Calama", "Ollagüe", "San Pedro de Atacama", "Tocopilla", "María Elena"], 
  "Atacama": ["Copiapó", "Caldera", "Tierra Amarilla", "Chañaral", "Diego de Almagro", "Vallenar", "Alto del Carmen", "Freirina", "Huasco"], 
  "Coquimbo": ["La Serena", "Coquimbo", "Andacollo", "La Higuera", "Paiguano", "Vicuña", "Illapel", "Canela", "Los Vilos", "Salamanca", "Ovalle", "Combarbalá", "Monte Patria", "Punitaqui", "Río Hurtado"], 
  "Valparaíso": ["Valparaíso", "Casablanca", "Concón", "Juan Fernández", "Puchuncaví", "Quintero", "Viña del Mar", "Isla de Pascua", "Los Andes", "Calle Larga", "Rinconada", "San Esteban", "La Ligua", "Cabildo", "Papudo", "Petorca", "Zapallar", "Quillota", "Calera", "Hijuelas", "La Cruz", "Nogales", "San Antonio", "Algarrobo", "Cartagena", "El Quisco", "El Tabo", "Santo Domingo", "San Felipe", "Catemu", "Llaillay", "Panquehue", "Putaendo", "Santa María", "Quilpué", "Limache", "Olmué", "Villa Alemana"], 
  "Metropolitana de Santiago": ["Santiago", "Cerrillos", "Cerro Navia", "Conchalí", "El Bosque", "Estación Central", "Huechuraba", "Independencia", "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina", "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado", "Macul", "Maipú", "Ñuñoa", "Pedro Aguirre Cerda", "Peñalolén", "Providencia", "Pudahuel", "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Joaquín", "San Miguel", "San Ramón", "Vitacura", "Puente Alto", "Pirque", "San José de Maipo", "Colina", "Lampa", "Tiltil"], 
  "O'Higgins": ["Rancagua", "Codegua", "Coinco", "Coltauco", "Doñihue", "Graneros", "Las Cabras", "Machalí", "Malloa", "Mostazal", "Olivar", "Peumo", "Pichidegua", "Quinta de Tilcoco", "Rengo", "Requínoa", "San Vicente", "La Estrella", "Litueche", "Marchihue", "Navidad", "Paredones", "Pichilemu", "Chimbarongo", "Lolol", "Nancagua", "Palmilla", "Peralillo", "Placilla", "Santa Cruz"], 
  "Maule": ["Talca", "Constitución", "Curepto", "Empedrado", "Maule", "Pelarco", "Pencahue", "Río Claro", "San Clemente", "San Rafael", "Cauquenes", "Chanco", "Pelluhue", "Curicó", "Hualañé", "Licantén", "Molina", "Rauco", "Romeral", "Sagrada Familia", "Teno", "Vichuquén", "Linares", "Colbún", "Longaví", "Parral", "Retiro", "San Javier", "Villa Alegre", "Yerbas Buenas"], 
  "Ñuble": ["Chillán", "Chillán Viejo", "Cobquecura", "Coelemu", "Coihueco", "Chillán Viejo", "El Carmen", "Ninhue", "Ñiquén", "Pemuco", "Pinto", "Portezuelo", "Quillón", "Quirihue", "Ránquil", "San Carlos", "San Fabián", "San Ignacio", "San Nicolás", "Treguaco", "Yungay"], 
  "Biobío": ["Concepción", "Coronel", "Chiguayante", "Florida", "Hualpén", "Hualqui", "Lota", "Penco", "San Pedro de la Paz", "Santa Juana", "Talcahuano", "Tomé", "Cabrero", "Lebu", "Los Álamos", "Cañete", "Contulmo", "Curanilahue", "Arauco", "Laja", "Los Ángeles", "Mulchén", "Nacimiento", "Negrete", "Quilaco", "Quilleco", "San Rosendo", "Santa Bárbara", "Tucapel", "Yumbel", "Alto Biobío"], 
  "Araucanía": ["Temuco", "Carahue", "Cholchol", "Cunco", "Curarrehue", "Freire", "Galvarino", "Gorbea", "Lautaro", "Loncoche", "Melipeuco", "Nueva Imperial", "Padre Las Casas", "Perquenco", "Pitrufquén", "Pucón", "Saavedra", "Teodoro Schmidt", "Toltén", "Vilcún", "Villarrica", "Angol", "Collipulli", "Curacautín", "Ercilla", "Lonquimay", "Los Sauces", "Lumaco", "Purén", "Renaico", "Traiguén", "Victoria"], 
  "Los Ríos": ["Valdivia", "Corral", "Lanco", "Los Lagos", "Máfil", "Mariquina", "Paillaco", "Panguipulli", "La Unión", "Futrono", "Lago Ranco", "Río Bueno"], 
  "Los Lagos": ["Puerto Montt", "Calbuco", "Cochamó", "Fresia", "Frutillar", "Los Muermos", "Llanquihue", "Maullín", "Puerto Varas", "Castro", "Ancud", "Chonchi", "Curaco de Vélez", "Dalcahue", "Puqueldón", "Queilén", "Quellón", "Quemchi", "Quinchao", "Osorno", "Puerto Octay", "Purranque", "Puyehue", "Río Negro", "San Juan de la Costa", "San Pablo", "Chaitén", "Futaleufú", "Hualaihué", "Palena"], 
  "Aysén": ["Coyhaique", "Lago Verde", "Aysén", "Cisnes", "Guaitecas", "Chile Chico", "Río Ibáñez", "Tortel"], 
  "Magallanes": ["Punta Arenas", "Laguna Blanca", "Río Verde", "San Gregorio", "Cabo de Hornos", "Antártica", "Porvenir", "Primavera", "Timaukel", "Natales", "Torres del Paine"] 
};
const sectoresPorComuna = {
  "Santiago": ["Centro", "Barrio Brasil", "Barrio Lastarria", "Barrio Yungay", "Barrio Franklin", "Barrio Matta", "Barrio República", "Barrio Estación Central", "Barrio Meiggs", "Barrio Patronato", "Barrio Bellavista", "Barrio Concha y Toro", "Barrio San Diego", "Barrio Santa Ana"],
  "Las Condes": ["Centro", "El Golf", "San Carlos de Apoquindo", "Las Condes Centro", "Nueva Las Condes", "El Arrayán", "La Dehesa"],
  "Providencia": ["Centro", "Nueva Providencia", "Los Leones", "Manuel Montt", "Pedro de Valdivia", "Tobalaba"],
  "Maipú": ["Centro", "Maipú Centro", "Pudahuel", "Cerro Navia", "Lo Prado", "Quinta Normal", "Renca"],
  "Puente Alto": ["Centro", "Puente Alto Centro", "San José de Maipo", "Pirque", "La Florida", "Peñalolén", "Macul"],
  "La Florida": ["Centro", "La Florida Centro", "Peñalolén", "Macul", "Ñuñoa", "Providencia"],
  "Ñuñoa": ["Centro", "Ñuñoa Centro", "Macul", "Providencia", "Las Condes", "Lo Barnechea"],
  "San Miguel": ["Centro", "San Miguel Centro", "La Granja", "La Pintana", "El Bosque", "La Cisterna"],
  "San Bernardo": ["Centro", "San Bernardo Centro", "Buin", "Paine", "Calera de Tango", "El Monte"],
  "Quilicura": ["Centro", "Quilicura Centro", "Lampa", "Colina", "Tiltil", "Huechuraba"],
  "Vitacura": ["Centro", "Vitacura Centro", "Las Condes", "Lo Barnechea", "Huechuraba", "Providencia"],
  "Lo Barnechea": ["Centro", "Lo Barnechea Centro", "Las Condes", "Vitacura", "Huechuraba", "San José de Maipo"],
  "Valparaíso": ["Centro", "Puerto", "Playa Ancha", "Cerro Alegre", "Cerro Concepción", "Cerro Cárcel", "Cerro Panteón", "Cerro Barón", "Cerro Las Cañas", "Cerro La Cruz", "Cerro El Litre", "Cerro La Loma", "Cerro La Merced", "Cerro La Pólvora", "Cerro La Virgen", "Cerro Los Placeres", "Cerro Mariposa", "Cerro Monjas", "Cerro O'Higgins", "Cerro Pajonal", "Cerro Ramaditas", "Cerro San Juan de Dios", "Cerro San Roque", "Cerro Santa Elena", "Cerro Santo Domingo", "Cerro Toro", "Cerro Yungay", "Cerro Zapallar", "Cerro Zorrilla"],
  "Viña del Mar": ["Centro", "Viña del Mar Centro", "Reñaca", "Concón", "Quintero", "Puchuncaví", "Casablanca"],
  "Concón": ["Centro", "Concón Centro", "Reñaca", "Viña del Mar", "Quintero", "Puchuncaví"],
  "Quilpué": ["Centro", "Quilpué Centro", "Limache", "Olmué", "Villa Alemana"],
  "Villa Alemana": ["Centro", "Villa Alemana Centro", "Quilpué", "Limache", "Olmué"],
  "Concepción": ["Centro", "Concepción Centro", "Coronel", "Chiguayante", "Florida", "Hualpén", "Hualqui", "Lota", "Penco", "San Pedro de la Paz", "Santa Juana", "Talcahuano", "Tomé"],
  "Talcahuano": ["Centro", "Talcahuano Centro", "Hualpén", "Hualqui", "Lota", "Penco", "San Pedro de la Paz", "Santa Juana", "Tomé"],
  "Hualpén": ["Armando Alarcón del Canto", "Parque Central Hualpén", "Hualpencillo", "4 Esquinas", "Cristo Redentor", "Villa Acero", "Villa San Pedro", "Villa Los Héroes", "Villa Los Pinos", "Villa Los Robles", "Villa Los Tilos", "Villa Los Laureles", "Villa Los Nogales", "Villa Los Cerezos", "Villa Los Manzanos", "Villa Los Perales", "Villa Los Olmos", "Villa Los Sauces", "Villa Los Álamos", "Villa Los Eucaliptos"],
  "Chiguayante": ["Centro", "Chiguayante Centro", "Concepción", "Florida", "Hualpén", "Hualqui"],
  "Coronel": ["Centro", "Coronel Centro", "Concepción", "Lota", "San Pedro de la Paz", "Santa Juana"],
  "Temuco": ["Centro", "Temuco Centro", "Carahue", "Cholchol", "Cunco", "Curarrehue", "Freire", "Galvarino", "Gorbea", "Lautaro", "Loncoche", "Melipeuco", "Nueva Imperial", "Padre Las Casas", "Perquenco", "Pitrufquén", "Pucón", "Saavedra", "Teodoro Schmidt", "Toltén", "Vilcún", "Villarrica"],
  "Padre Las Casas": ["Centro", "Padre Las Casas Centro", "Temuco", "Freire", "Perquenco"],
  "Villarrica": ["Centro", "Villarrica Centro", "Pucón", "Curarrehue", "Freire"],
  "Rancagua": ["Centro", "Rancagua Centro", "Codegua", "Coinco", "Coltauco", "Doñihue", "Graneros", "Las Cabras", "Machalí", "Malloa", "Mostazal", "Olivar", "Peumo", "Pichidegua", "Quinta de Tilcoco", "Rengo", "Requínoa", "San Vicente"],
  "Rengo": ["Centro", "Rengo Centro", "Rancagua", "Requínoa", "Malloa", "Quinta de Tilcoco"],
  "San Vicente": ["Centro", "San Vicente Centro", "Rancagua", "Machalí", "Malloa", "Mostazal"],
  "Talca": ["Centro", "Talca Centro", "Constitución", "Curepto", "Empedrado", "Maule", "Pelarco", "Pencahue", "Río Claro", "San Clemente", "San Rafael"],
  "Curicó": ["Centro", "Curicó Centro", "Hualañé", "Licantén", "Molina", "Rauco", "Romeral", "Sagrada Familia", "Teno", "Vichuquén"],
  "Linares": ["Centro", "Linares Centro", "Colbún", "Longaví", "Parral", "Retiro", "San Javier", "Villa Alegre", "Yerbas Buenas"],
  "Chillán": ["Centro", "Chillán Centro", "Chillán Viejo", "Cobquecura", "Coelemu", "Coihueco", "El Carmen", "Ninhue", "Ñiquén", "Pemuco", "Pinto", "Portezuelo", "Quillón", "Quirihue", "Ránquil", "San Carlos", "San Fabián", "San Ignacio", "San Nicolás", "Treguaco", "Yungay"],
  "Chillán Viejo": ["Centro", "Chillán Viejo Centro", "Chillán", "El Carmen", "Pinto", "Pemuco"],
  "Valdivia": ["Centro", "Valdivia Centro", "Corral", "Lanco", "Los Lagos", "Máfil", "Mariquina", "Paillaco", "Panguipulli", "La Unión", "Futrono", "Lago Ranco", "Río Bueno"],
  "La Unión": ["Centro", "La Unión Centro", "Valdivia", "Futrono", "Lago Ranco", "Río Bueno"],
  "Puerto Montt": ["Centro", "Puerto Montt Centro", "Calbuco", "Cochamó", "Fresia", "Frutillar", "Los Muermos", "Llanquihue", "Maullín", "Puerto Varas"],
  "Osorno": ["Centro", "Osorno Centro", "Puerto Octay", "Purranque", "Puyehue", "Río Negro", "San Juan de la Costa", "San Pablo"],
  "Castro": ["Centro", "Castro Centro", "Ancud", "Chonchi", "Curaco de Vélez", "Dalcahue", "Puqueldón", "Queilén", "Quellón", "Quemchi", "Quinchao"],
  "Coyhaique": ["Centro", "Coyhaique Centro", "Lago Verde", "Aysén", "Cisnes", "Guaitecas", "Chile Chico", "Río Ibáñez", "Tortel"],
  "Punta Arenas": ["Centro", "Punta Arenas Centro", "Laguna Blanca", "Río Verde", "San Gregorio", "Cabo de Hornos", "Antártica", "Porvenir", "Primavera", "Timaukel", "Natales", "Torres del Paine"],
  "Arica": ["Centro", "Arica Centro", "Camarones", "Putre", "General Lagos"],
  "Iquique": ["Centro", "Iquique Centro", "Alto Hospicio", "Pozo Almonte", "Camiña", "Colchane", "Huara", "Pica"],
  "Antofagasta": ["Centro", "Antofagasta Centro", "Mejillones", "Sierra Gorda", "Taltal", "Calama", "Ollagüe", "San Pedro de Atacama", "Tocopilla", "María Elena"],
  "Calama": ["Centro", "Calama Centro", "Antofagasta", "Ollagüe", "San Pedro de Atacama"],
  "Copiapó": ["Centro", "Copiapó Centro", "Caldera", "Tierra Amarilla", "Chañaral", "Diego de Almagro", "Vallenar", "Alto del Carmen", "Freirina", "Huasco"],
  "Vallenar": ["Centro", "Vallenar Centro", "Copiapó", "Alto del Carmen", "Freirina", "Huasco"],
  "La Serena": ["Centro", "La Serena Centro", "Coquimbo", "Andacollo", "La Higuera", "Paiguano", "Vicuña", "Illapel", "Canela", "Los Vilos", "Salamanca", "Ovalle", "Combarbalá", "Monte Patria", "Punitaqui", "Río Hurtado"],
  "Coquimbo": ["Centro", "Coquimbo Centro", "La Serena", "Andacollo", "La Higuera", "Paiguano", "Vicuña"],
  "Ovalle": ["Centro", "Ovalle Centro", "La Serena", "Combarbalá", "Monte Patria", "Punitaqui", "Río Hurtado"]
};
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => password.length >= 6;
const formatRut = (rut) => {
  let clean = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length > 1) {
    let body = clean.slice(0, -1);
    let dv = clean.slice(-1);
    body = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${body}-${dv}`;
  }
  return clean;
};
const validateRut = (rut) => {
  rut = rut.replace(/\./g, "").replace("-", "");
  let body = rut.slice(0, -1);
  let dv = rut.slice(-1).toUpperCase();
  let sum = 0, multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier < 7 ? multiplier + 1 : 2;
  }
  let expectedDV = 11 - (sum % 11);
  expectedDV = expectedDV === 11 ? "0" : expectedDV === 10 ? "K" : expectedDV.toString();
  return dv === expectedDV;
};
const validateRolTributario = (rol) => {
  rol = rol.replace(/\./g, "").replace("-", "");
  if (rol.length < 2) return false;
  let body = rol.slice(0, -1);
  let dv = rol.slice(-1).toUpperCase();
  let sum = 0, multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier < 7 ? multiplier + 1 : 2;
  }
  let expectedDV = 11 - (sum % 11);
  expectedDV = expectedDV === 11 ? "0" : expectedDV === 10 ? "K" : expectedDV.toString();
  return dv === expectedDV;
};

function Formularioregistro() {
  const [step, setStep] = useState("login");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [rut, setRut] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [sexo, setSexo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedComuna, setSelectedComuna] = useState("");
  const [sector, setSector] = useState("");
  const [tieneNegocio, setTieneNegocio] = useState(false);
  const [negocios, setNegocios] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  // La lógica de 'isEditing' y 'handleUpdate' se elimina de este componente.
  // Se manejará en un componente de perfil de usuario protegido.
  
  const navigate = useNavigate();

  // --- FUNCIÓN DE REGISTRO ACTUALIZADA ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!nombre || !apellido || !rut || !fechaNacimiento || !sexo || !email || !password || !selectedRegion || !selectedComuna || !sector) {
      return setErrorMsg("Completa todos los campos obligatorios.");
    }
    if (!validateEmail(email)) return setErrorMsg("Correo inválido");
    if (!validatePassword(password)) return setErrorMsg("Contraseña mínima 6 caracteres");
    if (!validateRut(rut)) return setErrorMsg("RUT inválido");

    if (tieneNegocio) {
      if (!negocios.length) return setErrorMsg("Agrega al menos un negocio.");
      for (const n of negocios) {
        if (!n.nombre || !n.rolTributario || !n.giro || !n.region || !n.comuna || !n.sector) {
          return setErrorMsg("Completa los campos obligatorios del negocio (Nombre, Rol, Giro, Región, Comuna y Sector).");
        }
        if (!validateRolTributario(n.rolTributario)) return setErrorMsg("Rol tributario inválido en uno de los negocios");
      }
    }
    
    const role = tieneNegocio ? "cliente" : "usuario";
    
    const userData = {
        nombre, apellido, rut: formatRut(rut), fechaNacimiento, sexo, email, password,
        region: selectedRegion, comuna: selectedComuna, sector: sector || null,
        tieneNegocio, negocios, role
    };

    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.msg || 'Error al registrar el usuario.');
        }

        alert('¡Registro exitoso! Ahora puedes iniciar sesión con tus credenciales.');
        setStep("login");

    } catch (error) {
        setErrorMsg(error.message);
    }
  };

  // --- FUNCIÓN DE LOGIN ACTUALIZADA ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!validateEmail(email) || !password) return setErrorMsg("Correo y contraseña son obligatorios");
    
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.msg || 'Error al iniciar sesión');
        }

        localStorage.setItem('token', data.token);
        navigate("/");

    } catch (error) {
        setErrorMsg(error.message);
    }
  };

  // --- FUNCIÓN DE RECUPERAR CONTRASEÑA (se mantiene con Firebase) ---
  const handlePasswordReset = async () => {
    if (!validateEmail(email)) return setErrorMsg("Ingresa un correo válido");
    try {
      await sendPasswordResetEmail(auth, email);
      setErrorMsg("Se ha enviado un correo para restablecer tu contraseña.");
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="formularioRegistro_container">
      {step === "login" && (
        <form className="formularioRegistro_card" onSubmit={handleLogin}>
          <img src={logoImg} className="formularioRegistro_logo" alt="Logo" />
          <h2 className="formularioRegistro_title">Ingresar a mi cuenta</h2>
          {errorMsg && <p className="formularioRegistro_error">{errorMsg}</p>}
          <input className="formularioRegistro_input" type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="formularioRegistro_input" type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="formularioRegistro_button" type="submit">Ingresar</button>
          <p className="formularioRegistro_link" onClick={() => setStep("registro")}>Crear cuenta</p>
          <p className="formularioRegistro_link" onClick={() => setStep("recuperar")}>¿Olvidaste tu contraseña?</p>
        </form>
      )}

      {step === "registro" && (
        <form className="formularioRegistro_card" onSubmit={handleRegister}>
          <img src={logoImg} className="formularioRegistro_logo" alt="Logo" />
          <h2 className="formularioRegistro_title">Registro de Usuario</h2>
          {errorMsg && <p className="formularioRegistro_error">{errorMsg}</p>}
          <input className="formularioRegistro_input" type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          <input className="formularioRegistro_input" type="text" placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
          <input className="formularioRegistro_input" type="text" placeholder="RUT" value={rut} onChange={(e) => setRut(formatRut(e.target.value))} required />
          <input className="formularioRegistro_input" type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} required />
          <select className="formularioRegistro_input" value={sexo} onChange={(e) => setSexo(e.target.value)} required>
            <option value="">Selecciona sexo</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
            <option value="Otro">Otro</option>
          </select>
          <input className="formularioRegistro_input" type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="formularioRegistro_input" type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <select className="formularioRegistro_input" value={selectedRegion} onChange={(e) => {setSelectedRegion(e.target.value); setSelectedComuna(""); setSector("");}} required>
            <option value="">Selecciona Región</option>
            {Object.keys(regiones).map(region => <option key={region} value={region}>{region}</option>)}
          </select>
          <select className="formularioRegistro_input" value={selectedComuna} onChange={(e) => {setSelectedComuna(e.target.value); setSector("");}} required disabled={!selectedRegion}>
            <option value="">Selecciona Comuna</option>
            {selectedRegion && regiones[selectedRegion] && regiones[selectedRegion].map(comuna => <option key={comuna} value={comuna}>{comuna}</option>)}
          </select>
          {selectedComuna && sectoresPorComuna[selectedComuna] ? (
            <select className="formularioRegistro_input" value={sector} onChange={(e) => setSector(e.target.value)} required>
              <option value="">Selecciona Sector</option>
              {sectoresPorComuna[selectedComuna].map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
          ) : (
            <input className="formularioRegistro_input" type="text" placeholder="Sector" value={sector} onChange={(e) => setSector(e.target.value)} required disabled={!selectedComuna}/>
          )}
          <label>
            <input type="checkbox" checked={tieneNegocio} onChange={(e) => setTieneNegocio(e.target.checked)} /> Tengo un negocio
          </label>
          {tieneNegocio && (
            <>
              {negocios.map((n, idx) => (
                <div key={idx} className="formularioRegistro_negocio_group">
                  <input className="formularioRegistro_input" type="text" placeholder="Nombre del negocio" value={n.nombre} onChange={(e) => { const arr = [...negocios]; arr[idx] = { ...arr[idx], nombre: e.target.value }; setNegocios(arr); }} required />
                  <input className="formularioRegistro_input" type="text" placeholder="Rol Tributario" value={n.rolTributario} onChange={(e) => { const arr = [...negocios]; arr[idx] = { ...arr[idx], rolTributario: e.target.value }; setNegocios(arr); }} required />
                  <input className="formularioRegistro_input" type="text" placeholder="Giro del negocio" value={n.giro} onChange={(e) => { const arr = [...negocios]; arr[idx] = { ...arr[idx], giro: e.target.value }; setNegocios(arr); }} required />
                  <select className="formularioRegistro_input" value={n.region} onChange={(e) => { const arr = [...negocios]; arr[idx] = { ...arr[idx], region: e.target.value, comuna: "" }; setNegocios(arr); }} required>
                    <option value="">Región del negocio</option>
                    {Object.keys(regiones).map(region => <option key={region} value={region}>{region}</option>)}
                  </select>
                  <select className="formularioRegistro_input" value={n.comuna} onChange={(e) => { const arr = [...negocios]; arr[idx] = { ...arr[idx], comuna: e.target.value }; setNegocios(arr); }} required>
                    <option value="">Comuna del negocio</option>
                    {n.region && regiones[n.region].map(comuna => <option key={comuna} value={comuna}>{comuna}</option>)}
                  </select>
                  {n.comuna && sectoresPorComuna[n.comuna] ? (
                    <select className="formularioRegistro_input" value={n.sector || ""} onChange={(e) => { const arr = [...negocios]; arr[idx] = { ...arr[idx], sector: e.target.value }; setNegocios(arr); }} required>
                      <option value="">Sector del negocio</option>
                      {sectoresPorComuna[n.comuna].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                    </select>
                  ) : (
                    <input className="formularioRegistro_input" type="text" placeholder="Sector del negocio" value={n.sector || ""} onChange={(e) => { const arr = [...negocios]; arr[idx] = { ...arr[idx], sector: e.target.value }; setNegocios(arr); }} required />
                  )}
                  <input className="formularioRegistro_input" type="text" placeholder="Teléfono del negocio (opcional)" value={n.telefono || ""} onChange={(e) => { const arr = [...negocios]; arr[idx] = { ...arr[idx], telefono: e.target.value }; setNegocios(arr); }} />
                  <input className="formularioRegistro_input" type="email" placeholder="Correo del negocio (opcional)" value={n.email || ""} onChange={(e) => { const arr = [...negocios]; arr[idx] = { ...arr[idx], email: e.target.value }; setNegocios(arr); }} />
                  <input className="formularioRegistro_input" type="text" placeholder="Web del negocio (opcional)" value={n.web || ""} onChange={(e) => { const arr = [...negocios]; arr[idx] = { ...arr[idx], web: e.target.value }; setNegocios(arr); }} />
                  <div className="formularioRegistro_negocio_actions">
                    <button type="button" className="formularioRegistro_button_secundario" onClick={() => { const arr = [...negocios]; arr.splice(idx, 1); setNegocios(arr); }}>Eliminar negocio</button>
                  </div>
                </div>
              ))}
              <button type="button" className="formularioRegistro_button" onClick={() => setNegocios([...negocios, { nombre: "", rolTributario: "", giro: "", telefono: "", email: "", web: "", region: "", comuna: "", sector: "" }])}>Agregar negocio</button>
            </>
          )}
          <button className="formularioRegistro_button" type="submit">Registrar</button>
          <p className="formularioRegistro_link" onClick={() => setStep("login")}>Volver a Ingresar</p>
        </form>
      )}
      
      {/* La lógica de 'editar' se ha eliminado de este componente, ya que no corresponde aquí. */}
      {/* Se manejará en un componente de perfil de usuario cuando el usuario esté logueado. */}

      {step === "recuperar" && (
        <form className="formularioRegistro_card" onSubmit={(e) => { e.preventDefault(); handlePasswordReset(); }}>
          <img src={logoImg} className="formularioRegistro_logo" alt="Logo" />
          <h2 className="formularioRegistro_title">Recuperar Contraseña</h2>
          {errorMsg && <p className="formularioRegistro_error">{errorMsg}</p>}
          <input className="formularioRegistro_input" type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button className="formularioRegistro_button" type="submit">Enviar correo</button>
          <p className="formularioRegistro_link" onClick={() => setStep("login")}>Volver a Ingresar</p>
        </form>
      )}
    </div>
  );
}

export default Formularioregistro;