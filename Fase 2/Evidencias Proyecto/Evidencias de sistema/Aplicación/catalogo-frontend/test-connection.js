// Archivo: test-connection.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// 1. Cargar las variables de entorno desde el archivo .env
dotenv.config();

// Función para probar la conexión
const probarConexion = async () => {
  // 2. Obtener la cadena de conexión desde las variables de entorno
  const dbUri = process.env.MONGODB_URI;

  // Verificar si la cadena de conexión existe
  if (!dbUri) {
    console.error('❌ Error: No se encontró la variable MONGODB_URI en el archivo .env');
    process.exit(1);
  }

  console.log('🔄 Intentando conectar a MongoDB Atlas...');

  try {
    // 3. Intentar conectar a la base de datos
    await mongoose.connect(dbUri);

    // 4. Si la conexión es exitosa, mostrar mensaje y desconectar
    console.log('✅ ¡La conexión a MongoDB Atlas fue exitosa!');
    await mongoose.disconnect();
    console.log('🔌 Conexión cerrada.');
    process.exit(0);

  } catch (error) {
    // 5. Si hay un error, mostrar el mensaje de error y salir
    console.error('❌ Error al conectar a MongoDB:', error.message);
    process.exit(1);
  }
};

// Ejecutar la función de prueba
probarConexion();