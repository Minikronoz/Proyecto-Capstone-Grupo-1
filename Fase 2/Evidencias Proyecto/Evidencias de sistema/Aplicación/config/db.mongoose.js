// config/db.mongoose.js
import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://duoc_user:7OtcjHwo0BDDcqih@cluster0.lkz5yof.mongodb.net/duoc_user?retryWrites=true&w=majority&appName=Cluster0";

export default async function conectarDB() {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      dbName: "duoc_user",
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`[tottus] [Atlas]  Conectado correctamente a ${conn.connection.name}`);
  } catch (error) {
    console.error("[Atlas ERROR]  Error conectando a MongoDB Atlas:", error.message);
    process.exit(1);
  }
}
