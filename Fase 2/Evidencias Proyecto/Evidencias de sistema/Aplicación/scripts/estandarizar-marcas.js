import { getDB, connectDB } from "../config/db.js";
import crypto from "crypto";

// ✅ Mapeo de marcas duplicadas → marca estándar (AMPLIADO)
const MAPEO_MARCAS = {
  // ===== VARIACIONES EXISTENTES =====
  "watt's": "Watts",
  "watt s": "Watts",
  "watts": "Watts",
  
  "hellmanns": "Hellmann's",
  "hellmans": "Hellmann's",
  "hellmann s": "Hellmann's",
  
  "van camps": "Van Camp's",
  "vancamps": "Van Camp's",
  "van camp s": "Van Camp's",
  
  "coca cola": "Coca-Cola",
  "cocacola": "Coca-Cola",
  
  "lays": "Lay's",
  "lay s": "Lay's",
  
  "nestlé": "Nestlé",
  "nestle": "Nestlé",
  
  "cuisine co": "Cuisine & Co",
  "cuisine&co": "Cuisine & Co",
  "cuisine co": "Cuisine & Co",
  
  // ===== NUEVAS VARIACIONES DETECTADAS =====
  
  // Acuenta
  "a cuenta (marca propia)": "Acuenta",
  "a cuenta": "Acuenta",
  "acuenta conservas": "Acuenta",
  "acuenta detergente": "Acuenta",
  "acuenta led": "Acuenta",
  "acuenta preparados": "Acuenta",
  "acuenta nectar": "Acuenta",
  "acuenta multiuso": "Acuenta",
  "acuenta lavalozas": "Acuenta",
  "acuenta papel": "Acuenta",
  "acuenta ambientador": "Acuenta",
  "acuenta dog": "Acuenta",
  "acuenta cat": "Acuenta",
  "acuenta arena": "Acuenta",
  "acuenta hogar": "Acuenta",
  
  // Lider (marca propia)
  "lider mantequilla": "Lider",
  "lider detergente": "Lider",
  "lider dog": "Lider",
  "lider cat": "Lider",
  "lider arena": "Lider",
  "lider home": "Lider",
  "lider lavalozas": "Lider",
  "express lider marca propia": "Lider",
  
  // Tottus
  "tottus mantequilla": "Tottus",
  "tottus detergente": "Tottus",
  "tottus kids": "Tottus",
  "tottus home": "Tottus",
  "tottus pet": "Tottus",
  "tottus bio": "Tottus",
  "tottus dog": "Tottus",
  "tottus cat": "Tottus",
  "tottus arena": "Tottus",
  
  // Cuisine & Co (todas las variaciones)
  "cuisine & co home": "Cuisine & Co",
  "cuisine & co pan": "Cuisine & Co",
  "cuisine & co pasta": "Cuisine & Co",
  "cuisine & co nectar": "Cuisine & Co",
  "cuisine & co conservas": "Cuisine & Co",
  "cuisine & co preparados": "Cuisine & Co",
  "cuisine & co led": "Cuisine & Co",
  "vajilla cuisine & co": "Cuisine & Co",
  
  // P.A.N (harina)
  "p.a.n": "P.A.N",
  "pan": "P.A.N",  // ⚠️ CUIDADO: puede confundirse con productos de pan
  "p.a.n.": "P.A.N",
  "p a n": "P.A.N",
  
  // Mayúsculas/minúsculas inconsistentes
  "aconcagua": "Aconcagua",
  "ACONCAGUA": "Aconcagua",
  
  "ambrosoli": "Ambrosoli",
  "AMBROSOLI": "Ambrosoli",
  
  "angelmo": "Angelmo",
  "ANGELMO": "Angelmo",
  
  "antartic": "Antartic",
  "ANTARTIC": "Antartic",
  
  "alusweet": "AluSweet",
  "ALUSWEET": "AluSweet",
  
  "alcafood": "Alcafood",
  "ALCAFOOD": "Alcafood",
  
  "alacena": "Alacena",
  "ALACENA": "Alacena",
  
  "american classic": "American Classic",
  "AMERICAN CLASSIC": "American Classic",
  
  "act ii": "Act II",
  "ACT II": "Act II",
  
  "aji-no-men": "Aji-No-Men",
  "AJI-NO-MEN": "Aji-No-Men",
  
  "aji-no-moto": "Aji-No-Moto",
  "AJI-NO-MOTO": "Aji-No-Moto",
  
  "aji-no-sillao": "Aji-No-Sillao",
  "AJI-NO-SILLAO": "Aji-No-Sillao",
  
  "acquaviva": "Acquaviva",
  "ACQUAVIVA": "Acquaviva",
  
  "alto la cruz": "Alto La Cruz",
  "ALTO LA CRUZ": "Alto La Cruz",
  
  "a la huerta de la esquina": "A La Huerta De La Esquina",
  "A LA HUERTA DE LA ESQUINA": "A La Huerta De La Esquina",
  
  "SELECTA":" Selecta",
  "selecta":" Selecta",
  // Colún variaciones
  "colun": "Colún",
  "COLUN": "Colún",
  "colun light": "Colún Light",
  "colun kids": "Colún Kids",
  "colun deslactosado": "Colún",
  "colun sin lactosa": "Colún",
  "colun helados": "Colún",
  "colun yoghurt": "Colún",
  "colun queso": "Colún",
  "colun mantequilla": "Colún",
  
  // Soprole variaciones
  "soprole next": "Soprole",
  "soprole gold": "Soprole",
  "soprole sin lactosa": "Soprole",
  "soprole bio": "Soprole",
  "soprole yoghurt": "Soprole",
  "soprole griego": "Soprole",
  "soprole crema": "Soprole",
  "soprole light": "Soprole",
  "soprole mantequilla": "Soprole",
  
  // Nestlé variaciones
  "nestle griego": "Nestlé",
  "nestle batido": "Nestlé",
  "nestle cereales": "Nestlé",
  "nestle cereal bar": "Nestlé",
  "nestle helados": "Nestlé",
  "nestle nan": "Nestlé",
  
  // Watt's variaciones
  "watt's natural": "Watts",
  "watt's water": "Watts",
  "watt's 100%": "Watts",
  "watt's nectar": "Watts",
  "watt's seleccion": "Watts",
  
  // Dole duplicado
  "DOLE": "Dole",
  
  // Chiquita duplicado
  "CHIQUITA": "Chiquita",
  
  // Del Monte duplicado
  "del monte": "Del Monte",
  "DEL MONTE": "Del Monte",
  
  // Coca-Cola variaciones
  "coca-cola zero": "Coca-Cola",
  "coca-cola light": "Coca-Cola",
  "COCA-COLA": "Coca-Cola",
  
  // Golondrina
  "golondrina": "Golondrina",
  "GOLONDRINA": "Golondrina",
  
  // Lucchetti
  "lucchetti": "Lucchetti",
  "LUCCHETTI": "Lucchetti",
  
  // Buka
  "buka": "Buka",
  "BUKA": "Buka",
  
  // Talliani
  "talliani": "Talliani",
  "TALLIANI": "Talliani",
};

function normalizarMarca(marca) {
  if (!marca || marca === "Sin Marca") return marca;
  
  // Normalizar: quitar acentos, minúsculas, espacios extra
  const marcaNorm = marca
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  
  // Buscar en el mapeo
  return MAPEO_MARCAS[marcaNorm] || marca; // Si no está en el mapeo, devolver original
}

function generarGlobalId(title, brand) {
  const normalizar = (txt) =>
    txt
      ?.toLowerCase()
      ?.normalize("NFD")
      ?.replace(/[\u0300-\u036f]/g, "")
      ?.replace(/[^a-z0-9]/g, "")
      ?.trim() || "";

  const extraerUnidad = (txt) => {
    const match = txt?.match(/(\d+)(\s)?(g|gr|kg|ml|lt|l)/i);
    return match ? match[0].toLowerCase() : "";
  };

  const tituloNorm = normalizar(title);
  const unidad = extraerUnidad(title);
  const brandNorm = normalizar(brand);
  const cadena = `${brandNorm}_${tituloNorm}_${unidad}`;

  return crypto.createHash("md5").update(cadena).digest("hex").substring(0, 12);
}

async function estandarizarMarcas() {
  console.log("\n🔄 Iniciando estandarización de marcas...\n");
  
  await connectDB();
  const db = getDB();
  const colProductos = db.collection("productos");

  // Obtener todas las marcas únicas
  const marcasUnicas = await colProductos.distinct("brand");
  
  console.log(`📦 Marcas encontradas: ${marcasUnicas.length}\n`);

  let actualizados = 0;
  let sinCambios = 0;

  for (const marcaOriginal of marcasUnicas) {
    if (!marcaOriginal || marcaOriginal === "Sin Marca") continue;
    
    const marcaEstandar = normalizarMarca(marcaOriginal);
    
    if (marcaEstandar !== marcaOriginal) {
      // Encontrar todos los productos con esta marca
      const productos = await colProductos.find({ brand: marcaOriginal }).toArray();
      
      console.log(`🔄 "${marcaOriginal}" → "${marcaEstandar}" (${productos.length} productos)`);
      
      for (const prod of productos) {
        const nuevoGlobalId = generarGlobalId(prod.title, marcaEstandar);
        
        await colProductos.updateOne(
          { _id: prod._id },
          {
            $set: {
              brand: marcaEstandar,
              globalId: nuevoGlobalId,
              lastUpdate: new Date()
            }
          }
        );
      }
      
      actualizados += productos.length;
    } else {
      sinCambios++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Productos actualizados: ${actualizados}`);
  console.log(`⚪ Marcas sin cambios: ${sinCambios}`);
  console.log(`📊 Total marcas procesadas: ${marcasUnicas.length}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Mostrar marcas estandarizadas
  const marcasFinales = await colProductos.distinct("brand");
  console.log(`\n📋 Marcas únicas después de estandarizar: ${marcasFinales.length}`);
  console.log(`\nMarcas finales (primeras 50):`);
  marcasFinales.slice(0, 50).forEach(m => console.log(`  - ${m}`));

  process.exit(0);
}

estandarizarMarcas().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});