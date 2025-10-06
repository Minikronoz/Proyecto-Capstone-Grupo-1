import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateEmail, updatePassword } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
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

// Validaciones (email, password, RUT, rol tributario)
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
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [rolTributario, setRolTributario] = useState("");
  const [giroNegocio, setGiroNegocio] = useState("");
  const [telefonoNegocio, setTelefonoNegocio] = useState("");
  const [emailNegocio, setEmailNegocio] = useState("");
  const [webNegocio, setWebNegocio] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const navigate = useNavigate();

  const cleanRut = rut.replace(/\./g, "").replace("-", "");

  // --- Cargar datos si estamos editando ---
  useEffect(() => {
    const loadUserData = async () => {
      if (auth.currentUser) {
        setStep("editar");
        setIsEditing(true);
        const docRef = doc(db, "usuarios", auth.currentUser.uid || auth.currentUser.email);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setNombre(data.nombre || "");
          setApellido(data.apellido || "");
          setRut(data.rut || "");
          setFechaNacimiento(data.fechaNacimiento || "");
          setSexo(data.sexo || "");
          setEmail(data.email || "");
          setSelectedRegion(data.region || "");
          setSelectedComuna(data.comuna || "");
          setSector(data.sector || "");
          if (data.tieneNegocio) {
            setTieneNegocio(true);
            setNombreNegocio(data.negocio.nombre || "");
            setRolTributario(data.negocio.rolTributario || "");
            setGiroNegocio(data.negocio.giro || "");
            setTelefonoNegocio(data.negocio.telefono || "");
            setEmailNegocio(data.negocio.email || "");
            setWebNegocio(data.negocio.web || "");
          }
        }
      }
    };
    loadUserData();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!nombre || !apellido || !rut || !fechaNacimiento || !sexo || !email || !password || !selectedRegion || !selectedComuna) {
      return setErrorMsg("Completa todos los campos obligatorios.");
    }
    if (!validateEmail(email)) return setErrorMsg("Correo inválido");
    if (!validatePassword(password)) return setErrorMsg("Contraseña mínima 6 caracteres");
    if (!validateRut(rut)) return setErrorMsg("RUT inválido");

    if (tieneNegocio) {
      if (!nombreNegocio || !rolTributario || !giroNegocio) return setErrorMsg("Completa los datos de tu negocio.");
      if (!validateRolTributario(rolTributario)) return setErrorMsg("Rol tributario inválido");
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const role = tieneNegocio ? "cliente" : "usuario";
      await setDoc(doc(db, "usuarios", cleanRut), {
        nombre, apellido, rut: formatRut(rut), fechaNacimiento, sexo, email,
        region: selectedRegion, comuna: selectedComuna, sector: sector || null,
        tieneNegocio,
        negocio: tieneNegocio
          ? { nombre: nombreNegocio, rolTributario, giro: giroNegocio, telefono: telefonoNegocio || null, email: emailNegocio || null, web: webNegocio || null }
          : null,
        role
      });
      localStorage.setItem("userName", nombre);
      localStorage.setItem("userRole", role);
      navigate("/");
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!validateEmail(email) || !password) return setErrorMsg("Correo y contraseña son obligatorios");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      localStorage.setItem("userName", user.email);
      localStorage.setItem("userRole", "usuario");
      navigate("/");
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  const handlePasswordReset = async () => {
    if (!validateEmail(email)) return setErrorMsg("Ingresa un correo válido");
    try {
      await sendPasswordResetEmail(auth, email);
      setErrorMsg("Se ha enviado un correo para restablecer tu contraseña");
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!nombre || !apellido || !rut || !fechaNacimiento || !sexo || !email || !selectedRegion || !selectedComuna) {
      return setErrorMsg("Completa todos los campos obligatorios.");
    }
    if (!validateEmail(email)) return setErrorMsg("Correo inválido");
    if (tieneNegocio) {
      if (!nombreNegocio || !rolTributario || !giroNegocio) return setErrorMsg("Completa los datos de tu negocio.");
      if (!validateRolTributario(rolTributario)) return setErrorMsg("Rol tributario inválido");
    }

    try {
      const userRef = doc(db, "usuarios", cleanRut);
      await updateDoc(userRef, {
        nombre, apellido, rut: formatRut(rut), fechaNacimiento, sexo, email,
        region: selectedRegion, comuna: selectedComuna, sector: sector || null,
        tieneNegocio,
        negocio: tieneNegocio
          ? { nombre: nombreNegocio, rolTributario, giro: giroNegocio, telefono: telefonoNegocio || null, email: emailNegocio || null, web: webNegocio || null }
          : null,
      });

      if (auth.currentUser.email !== email) await updateEmail(auth.currentUser, email);

      setErrorMsg("Datos actualizados correctamente.");
    } catch (error) {
      setErrorMsg(error.message);
    }
  };


  return (
    <div className="formularioRegistro_container">
      {step === "login" && !isEditing && (
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

      {(step === "registro" && !isEditing) && (
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
          <select className="formularioRegistro_input" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} required>
            <option value="">Selecciona Región</option>
            {Object.keys(regiones).map(region => <option key={region} value={region}>{region}</option>)}
          </select>
          <select className="formularioRegistro_input" value={selectedComuna} onChange={(e) => setSelectedComuna(e.target.value)} required>
            <option value="">Selecciona Comuna</option>
            {selectedRegion && regiones[selectedRegion].map(comuna => <option key={comuna} value={comuna}>{comuna}</option>)}
          </select>
          <input className="formularioRegistro_input" type="text" placeholder="Sector (opcional)" value={sector} onChange={(e) => setSector(e.target.value)} />
          <label>
            <input type="checkbox" checked={tieneNegocio} onChange={(e) => setTieneNegocio(e.target.checked)} /> Tengo un negocio
          </label>

          {tieneNegocio && (
            <>
              <input className="formularioRegistro_input" type="text" placeholder="Nombre del negocio" value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)} required />
              <input className="formularioRegistro_input" type="text" placeholder="Rol Tributario" value={rolTributario} onChange={(e) => setRolTributario(e.target.value)} required />
              <input className="formularioRegistro_input" type="text" placeholder="Giro del negocio" value={giroNegocio} onChange={(e) => setGiroNegocio(e.target.value)} required />
              <input className="formularioRegistro_input" type="text" placeholder="Teléfono del negocio" value={telefonoNegocio} onChange={(e) => setTelefonoNegocio(e.target.value)} />
              <input className="formularioRegistro_input" type="email" placeholder="Correo del negocio" value={emailNegocio} onChange={(e) => setEmailNegocio(e.target.value)} />
              <input className="formularioRegistro_input" type="text" placeholder="Web del negocio" value={webNegocio} onChange={(e) => setWebNegocio(e.target.value)} />
            </>
          )}

          <button className="formularioRegistro_button" type="submit">Registrar</button>
          <p className="formularioRegistro_link" onClick={() => setStep("login")}>Volver a Ingresar</p>
        </form>
      )}

      {step === "editar" && isEditing && (
        <form className="formularioRegistro_card" onSubmit={handleUpdate}>
          <img src={logoImg} className="formularioRegistro_logo" alt="Logo" />
          <h2 className="formularioRegistro_title">Editar Cuenta</h2>
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
          <select className="formularioRegistro_input" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} required>
            <option value="">Selecciona Región</option>
            {Object.keys(regiones).map(region => <option key={region} value={region}>{region}</option>)}
          </select>
          <select className="formularioRegistro_input" value={selectedComuna} onChange={(e) => setSelectedComuna(e.target.value)} required>
            <option value="">Selecciona Comuna</option>
            {selectedRegion && regiones[selectedRegion].map(comuna => <option key={comuna} value={comuna}>{comuna}</option>)}
          </select>
          <input className="formularioRegistro_input" type="text" placeholder="Sector (opcional)" value={sector} onChange={(e) => setSector(e.target.value)} />
          <label>
            <input type="checkbox" checked={tieneNegocio} onChange={(e) => setTieneNegocio(e.target.checked)} /> Tengo un negocio
          </label>

          {tieneNegocio && (
            <>
              <input className="formularioRegistro_input" type="text" placeholder="Nombre del negocio" value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)} required />
              <input className="formularioRegistro_input" type="text" placeholder="Rol Tributario" value={rolTributario} onChange={(e) => setRolTributario(e.target.value)} required />
              <input className="formularioRegistro_input" type="text" placeholder="Giro del negocio" value={giroNegocio} onChange={(e) => setGiroNegocio(e.target.value)} required />
              <input className="formularioRegistro_input" type="text" placeholder="Teléfono del negocio" value={telefonoNegocio} onChange={(e) => setTelefonoNegocio(e.target.value)} />
              <input className="formularioRegistro_input" type="email" placeholder="Correo del negocio" value={emailNegocio} onChange={(e) => setEmailNegocio(e.target.value)} />
              <input className="formularioRegistro_input" type="text" placeholder="Web del negocio" value={webNegocio} onChange={(e) => setWebNegocio(e.target.value)} />
            </>
          )}

          <button className="formularioRegistro_button" type="submit">Actualizar Datos</button>
          <p className="formularioRegistro_link" onClick={() => { setStep("login"); setIsEditing(false); }}>Volver a Ingresar</p>
        </form>
      )}

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

