import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import { auth } from "../firebase";

export const Busquedas = async (busqueda) => {
  try {
    let userInfo = {
      usuarioRut: null,
      nombre: null,
      apellido: null,
      fechaNacimiento: null, // ✅ agregado
      edad: null,            // ✅ agregado
      sexo: null,
      region: null,
      comuna: null,
      sector: null,
    };

    // 🔹 Si hay usuario logueado, obtener info desde Firestore por su email
    const user = auth.currentUser;
    if (user) {
      const usuariosRef = collection(db, "usuarios");
      const q = query(usuariosRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        console.log("📌 Datos del usuario encontrados:", data);

        // 🔹 Calcular edad a partir de fechaNacimiento
        let edadCalculada = null;
        if (data.fechaNacimiento) {
          const nacimiento = new Date(data.fechaNacimiento);
          const hoy = new Date();
          let edad = hoy.getFullYear() - nacimiento.getFullYear();
          const mes = hoy.getMonth() - nacimiento.getMonth();

          if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
          }
          edadCalculada = edad;
        }

        userInfo = {
          usuarioRut: data.rut || null,
          nombre: data.nombre || null,
          apellido: data.apellido || null,
          fechaNacimiento: data.fechaNacimiento || null, // ✅ guardamos la fecha original
          edad: edadCalculada,                           // ✅ guardamos también la edad
          sexo: data.sexo || null,
          region: data.region || null,
          comuna: data.comuna || null,
          sector: data.sector || null,
        };
      } else {
        console.warn("⚠️ No se encontró el usuario en Firestore con email:", user.email);
      }
    } else {
      console.warn("⚠️ No hay usuario logueado actualmente.");
    }

    // 🔹 Guardar búsqueda con todos los datos requeridos
    await addDoc(collection(db, "busquedas"), {
      busqueda,               // ✅ ahora el campo se llama "busqueda"
      fechaBusqueda: serverTimestamp(),
      ...userInfo,            // ✅ incluye todos los datos del usuario
    });

    console.log("✅ Búsqueda guardada correctamente:", busqueda, userInfo);

  } catch (error) {
    console.error("❌ Error guardando búsqueda:", error);
  }
};
