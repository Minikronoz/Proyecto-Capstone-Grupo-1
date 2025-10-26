import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { auth, db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const AdminRoute = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchamos los cambios de autenticación de Firebase
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Si hay un usuario, buscamos su documento en Firestore por su email
        const q = query(collection(db, "usuarios"), where("email", "==", user.email));
        const userQuerySnapshot = await getDocs(q);

        if (!userQuerySnapshot.empty) {
          const userData = userQuerySnapshot.docs[0].data();
          // Verificamos si el campo 'role' es exactamente 'admin'
          if (userData.role === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } else {
          // El usuario está en Auth, pero no tiene documento en Firestore
          setIsAdmin(false);
        }
      } else {
        // Si no hay ningún usuario logueado
        setIsAdmin(false);
      }
      setLoading(false); // Terminamos de cargar
    });

    // Limpiamos el listener cuando el componente se desmonta
    return () => unsubscribe();
  }, []);

  // Mientras se verifica, mostramos un mensaje de carga
  if (loading) {
    return <div>Verificando permisos de administrador...</div>;
  }

  // Si es admin, renderiza la página solicitada (Admin.jsx). Si no, redirige a la página de inicio.
  return isAdmin ? <Outlet /> : <Navigate to="/" />;
};

export default AdminRoute;