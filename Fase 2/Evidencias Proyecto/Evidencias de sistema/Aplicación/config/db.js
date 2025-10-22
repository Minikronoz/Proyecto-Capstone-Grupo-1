import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const conectarDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error('La variable de entorno MONGODB_URI no está configurada');
    }

    // Agregamos las opciones correctas
    const connection = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      w: "majority",
    });

    console.log('MongoDB Atlas conectado:', connection.connection.host);
    return connection;
  } catch (error) {
    console.error('Error conectando a MongoDB:', error.message);
    console.error('Detalles del error:', error);
    throw error;
  }
};

export default conectarDB;
