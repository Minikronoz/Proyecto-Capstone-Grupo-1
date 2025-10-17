// Archivo: catalogo-frontend/src/utils/Busquedas.js

import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export const Busquedas = async (termino, usuarioInfo = null) => {
  try {
    // Validar el término de búsqueda
    if (!termino || typeof termino !== 'string' || termino.trim().length === 0) {
      console.error('Término de búsqueda inválido');
      return;
    }

    // Si no tenemos info de usuario pero hay usuario autenticado,
    // obtener los datos del usuario desde Firebase
    if (!usuarioInfo && auth.currentUser) {
      try {
        const userDoc = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Extraer datos para MongoDB
          usuarioInfo = {
            usuarioRut: userData.rut || null,
            nombre: userData.nombre || null,
            apellido: userData.apellido || null,
            edad: userData.edad || null,
            sexo: userData.sexo || null,
            region: userData.region || (userData.negocios && userData.negocios.length > 0 ? userData.negocios[0].region : null),
            comuna: userData.comuna || (userData.negocios && userData.negocios.length > 0 ? userData.negocios[0].comuna : null),
            sector: userData.sector || (userData.negocios && userData.negocios.length > 0 ? userData.negocios[0].sector : null)
          };
        }
      } catch (error) {
        console.error("Error al obtener datos del usuario:", error);
      }
    }

    // Construir datos para enviar
    const datos = {
      busqueda: termino.trim().toLowerCase(),
      usuarioInfo
    };

    // Enviar búsqueda al servidor
    const response = await fetch('http://localhost:3000/api/busquedas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos)
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Búsqueda registrada correctamente');
    return result;
  } catch (error) {
    console.error('Error al registrar la búsqueda:', error);
    // No lanzamos el error para no interrumpir la experiencia del usuario
  }
};