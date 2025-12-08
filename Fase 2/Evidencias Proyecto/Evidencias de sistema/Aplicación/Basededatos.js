import dotenv from "dotenv";
import path from "path";
import { MongoClient } from "mongodb";

// Cargar .env desde la raíz
dotenv.config({ path: path.resolve("../.env") });

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "SistemaDeReportes";

if (!URI) {
  throw new Error("MONGODB_URI no está definido en el archivo .env");
}

// ================================
//  DEFINICIÓN DDL DE COLECCIONES
// ================================
const ddl = {
  cotizaciones: {
    bsonType: "object",
    required: ["usuario", "carrito", "fecha"],
    properties: {
      usuario: { bsonType: "object" },
      carrito: { bsonType: "array" },
      fecha: { bsonType: "date" }
    }
  },

  users: {
    bsonType: "object",
    required: ["correo", "contraseña", "role"],
    properties: {
      correo: { bsonType: "string" },
      contraseña: { bsonType: "string" },
      role: { bsonType: "string" },
      nombre: { bsonType: "string" },
      apellido: { bsonType: "string" },
      genero: { bsonType: "string" },
      region: { bsonType: "string" },
      comuna: { bsonType: "string" },
      sector: { bsonType: "string" },
      tieneNegocio: { bsonType: "bool" },
      negocios: { bsonType: "array" },
      creadoEn: { bsonType: "date" },
      actualizadoEn: { bsonType: "date" },
      edad: { bsonType: "number" },
      fechaNacimiento: { bsonType: "string" },
      rut: { bsonType: "string" }
    }
  },

  productos: {
    bsonType: "object",
    required: ["title", "store", "currentPrice"],
    properties: {
      globalId: { bsonType: "string" },
      title: { bsonType: "string" },
      brand: { bsonType: "string" },
      store: { bsonType: "string" },
      currentPrice: { bsonType: "number" },
      formattedPrice: { bsonType: "string" },
      priceNormal: { bsonType: "string" },
      pricePerUnit: { bsonType: "string" },
      quantity: { bsonType: "string" },
      unidadEstandar: { bsonType: "string" },
      image: { bsonType: "string" },
      link: { bsonType: "string" },
      categoria: { bsonType: "string" },
      lastUpdate: { bsonType: "date" },
      createdAt: { bsonType: "date" }
    }
  },

  locales_supermercados: {
    bsonType: "object",
    properties: {
      tienda: { bsonType: "string" },
      nombre: { bsonType: "string" },
      direccion: { bsonType: "string" },
      comuna: { bsonType: "string" },
      region: { bsonType: "string" },
      latitud: { bsonType: ["null", "double"] },
      longitud: { bsonType: ["null", "double"] },
      horario: { bsonType: "string" },
      telefono: { bsonType: ["null", "string"] },
      servicios: { bsonType: "array" }
    }
  },

  sesiones: {
    bsonType: "object",
    required: ["expires", "session"],
    properties: {
      expires: { bsonType: "date" },
      session: { bsonType: "string" }
    }
  },

  busquedas: {
    bsonType: "object",
    required: ["usuarioEmail", "termino", "fecha"],
    properties: {
      usuarioEmail: { bsonType: "string" },
      termino: { bsonType: "string" },
      palabrasClave: { bsonType: "array" },
      fecha: { bsonType: "date" }
    }
  },

  priceHistory: {
    bsonType: "object",
    required: ["productId", "store", "price", "fecha"],
    properties: {
      productId: { bsonType: "object" },
      store: { bsonType: "string" },
      price: { bsonType: "number" },
      previousPrice: { bsonType: ["null", "number"] },
      variation: { bsonType: "number" },
      offerDescription: { bsonType: ["null", "string"] },
      fecha: { bsonType: "date" }
    }
  },

  clicks: {
    bsonType: "object",
    required: ["idProducto", "supermercado", "precio", "fecha"],
    properties: {
      idProducto: { bsonType: "string" },
      titulo: { bsonType: "string" },
      marca: { bsonType: "string" },
      precio: { bsonType: "number" },
      precioPorUnidad: { bsonType: "string" },
      supermercado: { bsonType: "string" },
      link: { bsonType: "string" },
      imagen: { bsonType: "string" },
      userId: { bsonType: ["null", "object"] },
      userCorreo: { bsonType: "string" },
      userNombre: { bsonType: ["null", "string"] },
      userApellido: { bsonType: ["null", "string"] },
      userGenero: { bsonType: ["null", "string"] },
      userRegion: { bsonType: ["null", "string"] },
      userComuna: { bsonType: ["null", "string"] },
      userSector: { bsonType: ["null", "string"] },
      userEdad: { bsonType: ["null", "number"] },
      negocios: { bsonType: "array" },
      createdAt: { bsonType: "date" },
      fecha: { bsonType: "date" },
      ip: { bsonType: "string" },
      ua: { bsonType: "string" }
    }
  }
};

// ====================================
//  EJECUTAR DDL EN MONGODB
// ====================================
async function crearDesdeDDL() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB_NAME);

  const existentes = (await db.listCollections().toArray()).map(c => c.name);

  for (const nombre in ddl) {
    if (existentes.includes(nombre)) {
      console.log(`✔ La colección '${nombre}' ya existe`);
      continue;
    }

    await db.createCollection(nombre, {
      validator: { $jsonSchema: ddl[nombre] }
    });

    console.log(` Colección creada con validación: ${nombre}`);
  }

  console.log("\ Estructura DDL aplicada correctamente.");
  await client.close();
}

crearDesdeDDL().catch(err => {
  console.error(" Error al aplicar DDL:", err.message);
});
