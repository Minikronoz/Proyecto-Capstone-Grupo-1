// Archivo: catalogo-frontend/src/utils/Busquedas.js

import { auth } from "../firebase";

export const Busquedas = async (busqueda) => {
  try {
    const user = auth.currentUser;

    // Si no hay usuario logueado, no hacemos nada.
    if (!user || !user.email) {
      console.warn("No hay usuario logueado. No se guardará la búsqueda.");
      return;
    }

    // El cuerpo de la petición que enviaremos a nuestro backend
    const body = {
      busqueda: busqueda,
      userEmail: user.email,
    };

    // Hacemos la llamada a nuestra nueva API en el backend
    const response = await fetch('http://localhost:3001/api/busquedas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.msg || 'Error al guardar la búsqueda');
    }

    const result = await response.json();
    console.log(result.msg);

  } catch (error) {
    console.error("Error guardando búsqueda en MongoDB:", error.message);
  }
};