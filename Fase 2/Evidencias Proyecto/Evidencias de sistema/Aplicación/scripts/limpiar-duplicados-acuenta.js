import { getDB, connectDB } from "../config/db.js";
import crypto from "crypto";

const STORE = "acuenta";

function extraerCodigoProducto(link = "") {
  if (!link || typeof link !== "string") return null;
  const match = link.match(/\/p\/[\w-]+-(\d{6,})/);
  return match ? match[1] : null;
}

function generarGlobalId(codigoProducto) {
  const cadena = `${STORE}_${codigoProducto}`;
  return crypto.createHash("md5").update(cadena).digest("hex").substring(0, 12);
}

async function limpiarDuplicados() {
  console.log("\n🔄 Limpiando duplicados de Acuenta...\n");
  
  await connectDB();
  const db = getDB();
  const colProductos = db.collection("productos");

  // Obtener todos los productos de Acuenta
  const productos = await colProductos.find({ store: STORE }).toArray();
  
  console.log(`📦 Productos de Acuenta encontrados: ${productos.length}\n`);

  const duplicadosMap = new Map(); // codigoProducto → array de _id
  let procesados = 0;
  let eliminados = 0;

  // Agrupar por código de producto
  for (const prod of productos) {
    const codigo = extraerCodigoProducto(prod.link);
    
    if (codigo) {
      if (!duplicadosMap.has(codigo)) {
        duplicadosMap.set(codigo, []);
      }
      duplicadosMap.get(codigo).push(prod);
    }
    procesados++;
  }

  console.log(`\n🔍 Códigos únicos encontrados: ${duplicadosMap.size}`);
  console.log(`🔄 Buscando duplicados...\n`);

  // Procesar duplicados
  for (const [codigo, prods] of duplicadosMap.entries()) {
    if (prods.length > 1) {
      console.log(`\n📦 Código ${codigo} tiene ${prods.length} versiones:`);
      
      // Ordenar por fecha de actualización (más reciente primero)
      prods.sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate));
      
      const mantener = prods[0]; // El más reciente
      const eliminar = prods.slice(1); // Los demás
      
      console.log(`   ✅ MANTENER: "${mantener.title}"`);
      console.log(`      Link: ${mantener.link}`);
      console.log(`      Precio: $${mantener.currentPrice}`);
      
      // Actualizar el que mantenemos con el nuevo globalId
      const nuevoGlobalId = generarGlobalId(codigo);
      
      await colProductos.updateOne(
        { _id: mantener._id },
        {
          $set: {
            globalId: nuevoGlobalId,
            codigoProducto: codigo,
            lastUpdate: new Date()
          }
        }
      );
      
      // Eliminar duplicados
      for (const dup of eliminar) {
        console.log(`   ❌ ELIMINAR: "${dup.title}"`);
        console.log(`      Link: ${dup.link}`);
        
        await colProductos.deleteOne({ _id: dup._id });
        eliminados++;
      }
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Productos procesados: ${procesados}`);
  console.log(`🗑️  Duplicados eliminados: ${eliminados}`);
  console.log(`📊 Productos únicos restantes: ${productos.length - eliminados}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  process.exit(0);
}

limpiarDuplicados().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});