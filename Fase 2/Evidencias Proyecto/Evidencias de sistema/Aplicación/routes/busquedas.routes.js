// ==============================
//  routes/busquedas.routes.js
// ==============================
import express from "express";
import { getDB } from "../config/db.js";

const router = express.Router();

// -------------------------------------------------------------
//  Palabras clave principales (AMPLIADAS, PROFESIONALES)
// -------------------------------------------------------------
const CATEGORIAS = {
  "Despensa y Abarrotes": [
    "azucar","harina","pasta","fideos","arroz","aceite","sal","pan","porotos","lentejas","garbanzos",
    "arvejas","sopa","galletas","cereal","mayonesa","ketchup","mostaza","mermelada",
    "atun","conserva","manteca","pure","salsa","tomate","sazonador","caldo","avena",
    "manjar","miel","cocoa","salsas","condimento","fideo","tallarin","espagueti",
    "levadura","polvo hornear","cuscus","quinoa","arroz jazmin","arroz basmati",
    "snack","papas fritas","ramitas","mani","mix frutos","frutos secos","pasas",
    "almendras","nueces","chips","popcorn","granola","barrita"
  ],

  "Lácteos": [
    "leche","queso","yogurt","crema","mantequilla","margarina","manjar","leche condensada",
    "leche en polvo","quesillo","leche sin lactosa","bebida lactea","postre lacteo",
    "flan","gelatina","batido","queso crema","ricotta","queso rallado"
  ],

  "Carnes y Pescados": [
    "pollo","carne","pescado","cerdo","hamburguesa","trutro","longaniza","choripan",
    "chuleta","lomito","mechada","molida","plateada","costillar","vienesas","salchicha",
    "camarones","atun fresco","reineta","salmon","merluza","jibia","calamar","mariscos"
  ],

  "Frutas y Verduras": [
    "manzana","pera","platano","banana","uva","naranja","limon","kiwi","piña","sandia",
    "melon","durazno","ciruela","mango","palta","tomate","cebolla","lechuga","papa",
    "zanahoria","brocoli","coliflor","espinaca","cilantro","pimenton","zapallo",
    "pepino","berenjena","repollo","ajo","jengibre","choclo","poroto verde",
    "betarraga","hongo","champinon","ensalada","fruta","verdura"
  ],

  "Bebidas, Jugos y Aguas": [
    "bebida","agua","jugo","gaseosa","coca","cola","fanta","sprite","seven","te","cafe",
    "cafe instantaneo","cafe molido","bebida energetica","monster","red bull",
    "isotonica","gatorade","powerade","kombucha","malta",
    "cerveza","vino","pisco","ron","whisky","vodka","espumante","sidra"
  ],

  "Pan, Pastelería y Congelados": [
    "pan","hallulla","marraqueta","mold","integral","pastel","torta","queque","kuchen",
    "pan de molde","galleton","donas","croissant","masas","empanada","pizza","lasagna",
    "helado","mix congelado","verduras congeladas","papas congeladas","churros",
    "nuggets","barritas pescado","empanizados"
  ],

  "Limpieza y Hogar": [
    "detergente","jabon","shampoo","acondicionador","lavaloza","cloro","desinfectante",
    "toalla","higienico","papel higienico","servilleta","esponja","lavanderia",
    "suavizante","limpiador","multiuso","trapo","bolsa basura",
    "insecticida","desodorante ambiente","cera piso"
  ],

  "Cuidado Personal y Perfumería": [
    "shampoo","acondicionador","crema corporal","desodorante","perfume","colonia",
    "gel","cera","maquina afeitar","afeitadora","cuchillas","cepillo","pasta dental",
    "enjuague bucal","protector solar","bloqueador","maquillaje","labial","mascara",
    "algodon","toalla femenina","pañuelo","pañal","pañales"
  ],

  "Mascotas": [
    "perro","gato","alimento","snack","premio","saco","arena","collar","correa",
    "juguete perro","juguete gato","rascador","hueso","galletitas perro"
  ],

  "Electrodomésticos y Varios": [
    "olla","sarten","licuadora","batidora","tetera","microondas","aspiradora",
    "plancha","cafetera","tostadora","computador","mouse","teclado",
    "parlante","audifono"
  ]
};


// -------------------------------------------------------------
//  POST /api/busquedas → Registrar búsqueda
// -------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const db = getDB();
    const { usuarioEmail, termino } = req.body;

    if (!termino || typeof termino !== "string") {
      return res.status(400).json({ msg: "Debe ingresar un término válido." });
    }

    // 🧼 Normalizar búsqueda (minúsculas y sin acentos)
    const clean = termino
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim();

    if (clean.length < 3)
      return res.status(400).json({ msg: "El término es demasiado corto." });

    const palabras = clean.split(/\s+/);

    // 📌 Detectar categoría principal
    let categoria = "Sin categoría";
    for (const [nombreCategoria, lista] of Object.entries(CATEGORIAS)) {
      if (palabras.some(p => lista.includes(p))) {
        categoria = nombreCategoria;
        break;
      }
    }

    // 📌 Detectar palabra clave específica para estudios
    const coincidencia = palabras.find(p =>
      Object.values(CATEGORIAS).flat().includes(p)
    );

    await db.collection("busquedas").insertOne({
      usuarioEmail: usuarioEmail || "invitado@anonimo.cl",
      termino: clean,
      categoria,
      palabraClave: coincidencia || null,
      fecha: new Date()
    });

    res.json({
      ok: true,
      msg: `Búsqueda registrada como categoría: ${categoria}`,
    });

  } catch (error) {
    console.error("❌ Error al registrar búsqueda:", error);
    res.status(500).json({ msg: "Error interno del servidor." });
  }
});


// -------------------------------------------------------------
//  GET /api/busquedas → Obtener últimas búsquedas (para admin o dashboard)
// -------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const recientes = await db
      .collection("busquedas")
      .find()
      .sort({ fecha: -1 })
      .limit(50)
      .toArray();

    res.json(recientes);
  } catch (error) {
    console.error("❌ Error al listar búsquedas:", error);
    res.status(500).json({ msg: "Error al obtener búsquedas." });
  }
});
 
export default router;
