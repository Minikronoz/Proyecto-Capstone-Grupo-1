// scripts/unimarc.mjs — versión Atlas compatible
// ===============================================
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { connectDB, getDB, closeDB } from "../config/db.js";
// Removido import de PriceHistory ya que usamos MongoDB nativo
import { actualizarScrapingArchivo } from "../utils/actualizarScraping.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORE = "unimarc";

// =============================================================
// 🏷️ MARCAS CONOCIDAS (igual que antes)
// =============================================================
const MARCAS_CONOCIDAS = [
  //  Manzanas, Peras y Kiwis
  "Hass","Zespri","Royal Gala","Granny Smith","Pink Lady","Fuji","Honeycrisp",
  "Perales del Sur","Agrícola Garcés","Rucaray","San Clemente","Valle Frutal",
  "Prize","Dole","Chiquita","Del Monte","Clementina",
  "Green Kiwi","Gold Kiwi",

  //  Plátanos y Tropicales
  "Dole","Chiquita","Bonita","Fyffes","Terrasol","Del Monte","Tropical Fresh",

  //  Uvas, Arándanos y Frutos Rojos
  "San Clemente","Hortifrut","VitalBerry","Prunesco","Agrozzi","Rio King",
  "Agroberries","Exportadora Aconcagua","Santa Elena","Sun Belle","Bloom Fresh",
  "Savory Fruits","Agricom","Divino","Highbush","Berries Paradise",

  //  Cítricos (naranjas, mandarinas, limones)
  "San Osvaldo","Agrícola San Isidro","Andes Citrus","Frusan","Hermanos Corbella",
  "Citrícola","La Misión","Mediterráneo","Frutícola Atacama","Morro Fruit",

  //  Sandía, Melón, Papayas, Piñas
  "Costeño","Dole","Golden Pineapple","Galatea","Melona","Cantaloupe Premium",
  "Papaya Fresh","Pineapple Crown","Fresh Del Monte",

  //  Hortalizas (lechugas, papas, cebollas, etc)
  "Rucaray","El Parque","Mr. Veggie","Green Garden","La Huerta","La Granjita",
  "FreshCo","VegiMix","Agrícola Don Arturo","AgroChiloe","Papachile","Dale Papas",
  "Doña Juanita","AgroFrutillas","Campo Vivo","Campo Noble","La Familia","FreshLine",

  //  Procesados de huerta (ensalada lista, mixes)
  "Ready Pac","Florette","VitaFresh","Mr. Veggie","Agrosuper Vegetales",
  "Fresh Garden","Salad Box","Natur Fresh","La Huerta Mix",

  //  Importados especiales
  "Tropical Fields","King Coconut","Exótica Fresh","Amazonia Fruit","Premium Tropic",

  //  Leche y derivados tradicionales
  "Colún","Soprole","Loncoleche","Surlat","Nestlé","Quillayes","Watts","Parmalat",
  "Soprole Next","Soprole Gold","Soprole Sin Lactosa","Soprole Bio",
  "Colún Light","Colún Kids","Colún Deslactosado","Colún Sin Lactosa",
  "Surlat Sin Lactosa","Loncoleche Sin Lactosa","Quillayes Light",
  "La Vaquita","La Fuente","Valle Verde","Lácteos Muu","Verónica",

  //  Quesos, mantequillas y crema
  "Quillayes","Colonial","Chilerito","La Fortuna","La Vaquita","Santa Rosa",
  "Los Tilos","Río Bueno","Campos de Solana","Danbo","El Castillo","Kümey",
  "Soprole Crema","Colún Queso","Loncoleche Queso","Quillayes Gourmet",

  //  Helados (marcas lácteas)
  "Savory","Soprole Light","Colún Helados","Nestlé Helados",
  "Bambino","Pinguino","Los Alpes","Magnum","Cornetto","Chungungo",

  //  Yogurt y probióticos
  "Nestlé Griego","Nestlé Batido","Soprole Yoghurt","Soprole Griego",
  "Next Yogurt","YoPRO","Danone","Activia","Actimel","Chamyto",
  "Vivo","Quillayes Yoghurt","Colún Yoghurt","Surlat Yoghurt","La Fuente Yoghurt",

  //  Mantequilla y Margarinas (si son lácteos o mix)
  "Dairy Mix","Calán Mantequilla","La Vaquita Mantequilla","Colún Mantequilla",
  "Soprole Mantequilla","Lider Mantequilla","Tottus Mantequilla",

  //  Leches vegetales (relacionadas al segmento lácteo)
  "Ades","NotCo","Silk","Alpro","Vive Soy","Vanini","Loncoleche Vegetal",
  "Natur-All","Natura","Amelia","Better","The Power of Nature","Kirkland Almendra",

  //  Leche en polvo + fórmulas infantiles
  "Nestlé NAN","Nestogeno","Enfagrow","Similac","Pediasure","S26","Purita Mamá",
  "Purita Cereal","Nido","Klim",

  //  Pan de molde, integral, hallulla, frica, marraqueta
  "Ideal","Bimbo","Oroweat","Collico","Ceral","San Jorge Pan",
  "Pan Pancho Villa","Pan Doñihue","Los Mellizos","San Marino","Molino La Estampa",
  "Panadería San Camilo","Panadería Santa Isabel","Panadería Lider","Cuisine & Co Pan",
  
  //  Pastelería, queques, donuts, panes dulces
  "Nutrabien","San Camilo","Berliner","Dulces Anita","KuchenHaus","La Fête",
  "Merello","Dulce Mía","Dulces Cris","Panadería San Camilo Pastelería",
  "Donut Factory","Fruna Pasteles",

  //  Pan de pascua, panetones (solo panadería)
  "Bauducco","Ideal Navidad","Bimbo Navidad","Panetón D'Italia","Costa Panettone",
  "Nutrabien Pan de Pascua",

  //  Galletas de mesa, desayuno, galletas dulces (asociadas a panadería/cereal)
  "Costa","McKay","Trébol","Field","Gullón","Oreo","Tritón","Club Social",
  "Cereal Bar Quaker","Granuts Cereal","Quaker Cookies","Morochas",

  //  Cereales de desayuno (infantiles, fitness, clásicos)
  "Kellogg's","Zucaritas","Corn Flakes","All-Bran","Froot Loops","Choco Krispis",
  "Nestlé Cereales","Chocapic","Nesquik Cereales","Trix","Fitness","Milo Cereales",
  "Quaker Cereales","Granola Alpen","Nature Valley Cereales","Honey Bunches of Oats",
  "Post Cereals","Granola Mornflake","Kashi",

  //  Barras de cereal (siempre clasificadas en cereales)
  "Nature Valley","Quaker Bar","Kellogg's Bar","Nestlé Cereal Bar","Fitness Bar",
  "Granuts Bar","Milo Bar",

  //  Pastas, salsas, fideos
  "Carozzi","Lucchetti","Tres Montes Lucchetti","Malloa","Don Vittorio",
  "Molitalia","Rana","Barilla","Knorr Pastas","Cuisine & Co Pasta",

  //  Arroz, legumbres, quinoa y granos
  "Tucapel","Miraflores","Dos Caballos","Granja del Sol Arroz","Costeño",
  "La Granja","Don Pedro","Giana","Arroz King","Casan","Nature´s Heart Granos",

  //  Legumbres en bolsa o en caja
  "Selecta","Delicias del Campo","Don Pedro Legumbres","Dos Caballos Legumbres",
  "Manare Legumbres","Caserita","Terrasol","La Esmeralda","Pancho Villa Legumbres",

  //  Aceite, vinagre y aderezos de cocina
  "Cisne Aceite","Chef","Miraflores Aceite","Maravilla","Cocinero",
  "La Española","Capri","Carbonell","Coloso","Sasso","Costa Blanca",
  "Clemente Jacques Aderezos","Karavansay","Maille","Hellmann’s Cocina",

  //  Conservas: tomate, salsa, choclo, arvejas, etc.
  "Wasil","Dos Caballos Conservas","Malloa Conservas","Tres Montes Conservas",
  "La Huerta","Acuenta Conservas","Cuisine & Co Conservas","Arcor Conservas",
  "Productos de la Huerta","Riviana Tomate","Don Juan Conservas",

  //  Conservas de pescado (solo abarrotes)
  "San José","Aceituno","Robinson Crusoe","Van Camp’s","Jurel Azul",
  "Tuny","Mallón Atún","Panamá","Florida","Angelmo","Nerquihue",

  //  Endulzantes básicos de despensa (no mermeladas ni manjar)
  "Iansa Azúcar","Iansa Rubia","Iansa Light","Daily","Canderel",
  "Sugal","Domino Azúcar","Zuccaro","SweetZero","Tagatosa Iansa",

  //  Sal, condimentos básicos de despensa
  "Cisne","Lobos","Miraflores Sal","Astra","Aliño Completo Gourmet",
  "Gourmet Condimentos","Karavansay Condimentos","Knorr Condimentos","McCormick",

  //  Comidas listas en conserva o envase
  "Maggi","Knorr","Clemente Jacques","Puré Maggi","Acuenta Preparados",
  "Cuisine & Co Preparados","Protteína","Arcor Preparados","Gardein enlatados",

 //  Bebidas gaseosas
  "Coca-Cola","Coca-Cola Zero","Coca-Cola Light",
  "Pepsi","Pepsi Black","Seven Up","7Up",
  "Sprite","Sprite Zero","Fanta","Fanta Zero",
  "Bilz","Pap","Kem","Crush","Inca Kola",
  "Canada Dry","Mountain Dew","Dr Pepper",

  //  Bebidas saborizadas / sin gas
  "Watts Néctar","Watts Selección","Andina del Valle","Andina Kids",
  "Tropical","Acuenta Néctar","Cuisine & Co Néctar","Néctar Vivo",
  "Cepita Del Valle","Livean Light","Sunfill","Kem Mix",

  //  Jugos naturales y premium (botella, prensado, sin azúcar)
  "Natural One","Ama","Asofrut","Livean Natural","Watt's Natural",
  "Tamaya","Pomar","Cocotazo","Néctar Manare","Jugo NotCo Fruit",
  "Watt’s 100%","Cosecha Fresca","Jugos Casa Noble",

  //  Aguas minerales y purificadas
  "Benedictino","Vital","Cachantún","Dasani","San Pellegrino",
  "Perrier","Andes Mountain Water","Watt’s Water","LifeWTR",

  //  Aguas saborizadas
  "Cachantún Fresh","Vital Fresh","Smart Water Saborizada",
  "Vital Kids","Benedictino Fresh","Perrier Flavored",

  //  Bebidas deportivas e hidratantes (no energéticas)
  "Gatorade","Powerade","Gatorade Zero","Powerade Zero",
  "IsoSport","Oralight","Vive Hidratante",

  //  Bebidas funcionales (con vitaminas, bajos en calorías, etc.)
  "VitaminWater","Livean","Benjoy","B-Light","Flow Vitamin",
  "Néctar Zero Vivo","Gatorade Fit","Glow Up Drink",

  //  Vinos chilenos (viñas presentes en retail)
  "Concha y Toro","Santa Rita","Undurraga","Casillero del Diablo",
  "Gato Negro","Tarapacá","Carmen","San Pedro","120 Santa Rita",
  "Montes","Errázuriz","De Martino","Ostión","Cousiño Macul",
  "Los Boldos","Terranoble","Casa Silva","Morandé","Veramonte",
  "Koyle","Toro de Piedra","Nidias","Misiones de Rengo","Frontera","Marqués de Casa Concha",

  //  Espumantes y champagne
  "Riccadonna","Chandon","Undurraga Sparkling","Fresita","Norton",
  "Veuve Clicquot","Moët & Chandon","Valdivieso Extra Brut","Freixenet",

  //  Pisco chileno (licor nacional)
  "Mistral","Control C","Alto del Carmen","Horcón Quemado","Campanario",
  "Tres Erres","Mal Paso","Waqar","Coloso","Legado","Kappa",

  //  Cervezas nacionales
  "Cristal","Escudo","Royal Guard","Kunstmann","Austral",
  "Torobayo","Quimera","Cuello Negro","Minerva","Szot","Volcanes del Sur",

  //  Cervezas importadas
  "Heineken","Corona","Budweiser","Stella Artois","Kross",
  "Becker","Peroni","Pilsner Urquell","Hoegaarden","Leffe","Patagonia",

  //  Whisky, ron, tequila, vodka, gin
  "Johnnie Walker","Ballantine’s","Chivas Regal","White Horse","J&B",
  "Jack Daniel’s","Jim Beam","Grant’s","Black Label","Blenders Pride",
  "Absolut","Smirnoff","Skyy Vodka","Belvedere","Grey Goose",
  "Beefeater","Tanqueray","Bombay Sapphire","Hendrick’s",
  "Captain Morgan","Havana Club","Bacardi","Brugal",
  "José Cuervo","Don Julio","Espolón","1800 Tequila",

  //  Licores dulces + aperitivos
  "Baileys","Amaretto Disaronno","Aperol","Campari",
  "Jägermeister","Sheridan’s","Fernet Branca","Benedictine",
  "Piscola Campanario","Artesanos Horcón Quemado","Amargo Andino",

  //  Shampoo, acondicionador y tratamiento capilar
  "Pantene","Head & Shoulders","Sedal","Tío Nacho","Tresemmé",
  "Garnier Fructis","Herbal Essences","Elvive","Bioexpert",
  "Dove Hair","Familand Capilar","Preciosa","Naturaleza y Vida",

  //  Cremas corporales y faciales
  "Nivea","Dove","Lubriderm","Eucerin","Neutrogena","Cicatricure",
  "Hinds","St. Ives","Palmers","Cetaphil","Vasenol","Pond’s","Avena Kinesia",

  //  Jabones corporales y gel de ducha
  "Lux","Dove","Palmolive Naturals","Rexona Gel","Nivea Body Wash",
  "Le Sancy","Protex","Familand","Johnson’s Body Care",

  //  Desodorantes (spray, barra, roll-on)
  "Rexona","Dove Deodorant","Nivea Men","Nivea Deo","Old Spice",
  "Axe","Lady Speed Stick","Speed Stick","Gillette Deo","Secret",

  //  Afeitado y depilación
  "Gillette","Prestobarba","Mach3","Venus","Schick","Bic","Depil Bella",
  "Veet","Nair","Gillette SkinGuard","Wilkinson Sword",

  //  Jabón de tocador / barra de baño
  "Dove Soap","Palmolive Soap","Protex Soap","Nivea Soap","Le Sancy Soap",
  "Fa Soap","Lux Soap","Johnson’s Baby Soap","Heno de Pravia",

  //  Higiene bucal (mínimo de cuidado personal)
  "Colgate","Oral-B","Sensodyne","Aquafresh","Parodontax","Close-Up",
  "Listerine","Colgate Plax","Oral-B Enjuague",

  //  Cuidado personal infantil (no medicamentos)
  "Johnson’s Baby","Baby Dove","Ego Baby","Pigeon Baby Soap","Simond’s Baby",
  "Mustela Baby","Huggies Cuidado","Mababy","Baby Fresh","Dermokids",

  //  Perfumería económica y body splash (de retail)
  "Emporio Aromas","Coty","Bodycology","Benetton Perfumes",
  "Natura EKOS Splash","Hierbas Salvajes","Cramer Naturals",
  "Tabu","Anais Anais","Adidas Perfumes","Axe Body Spray","Impulse Deo",

  //  Detergente ropa (líquido/polvo)
  "Omo","Ace","Ariel","Drive","Biofrescura","Blancatel","Tide",
  "Sapolio Detergente","Roma Detergente","Tottus Detergente",
  "Lider Detergente","Acuenta Detergente",

  //  Suavizantes de ropa
  "Ensueño","Downy","Comfort","Drive Suavizante","Suavité",
  "Baby Soft","Soft","Ariel Soft","Rindex Suavizante",

  //  Limpiadores multiuso y desinfectantes
  "Lysol","Poett","Pinol","Clorox Spray","Mr. Músculo","Virutex Multiuso",
  "Cif Multiuso","Sapolio Limpiador","Acuenta Multiuso",

  //  Lavalozas
  "Quix","Cif Lavalozas","Axion","Salvo","Sapolio Lavalozas",
  "Acuenta Lavalozas","Lider Lavalozas","Tottus Lavalozas",

  //  Desinfectantes y cloro
  "Clorox","Ariel Cloro","Cloralex","Poett Desinfectante","Lysol Desinfectante",
  "Virutex Cloro","Sapolio Cloro","Ayudín",

  //  Baño: limpiadores y pastillas
  "Harpic","Mr. Músculo Baño","Pato Purific","Poett Baño","Cif Baño",
  "Sapolio WC","Lysoform Baño","Virutex Pastillas WC",

  //  Cocina: desengrasantes y limpiadores específicos
  "Mr. Músculo Cocina","Cif Cocina","Axion Spray","Poett Cocina",
  "Sapolio Desengrasante","Quix Spray","Lysol Cocina",

  //  Guantes, paños, escobas y esponjas (marcas de utensilios de aseo)
  "Virutex","3M Scotch-Brite","Esfrebom","Duramax","Elite", 
  "Don Limpio Guantes","MultiClean","Virutex Max","Bayeco",

  //  Papel higiénico, servilletas, toallas de papel (hogar)
  "Elite","Confort","Nova","Rex","Tork Hogar",
  "Acuenta Papel","Tottus Home","Lider Home",

  //  Aromatizantes y ambientadores
  "Glade","Air Wick","Poett Aromatizante","Bolton","Aura Fresh",
  "Arom","Virutex Aromas","Ambicor","Brisa",
  "Forescent","Glade Toque","Acuenta Ambientador",

  //  Insecticidas y repelentes domésticos (hogar)
  "Raid","Baygon","Diclorvo","X-Pel","Anasac Hogar","Off Hogar",

  //  Alimento para perros
  "Pedigree","Dog Chow","Purina One","Purina Pro Plan","Master Dog","Champion Dog",
  "Lider Dog","Tottus Dog","Acuenta Dog","Royal Canin Perro",
  "Hill’s Science Diet Perro","Nutrición Instinct","Naturalis Perro",
  "Whiskas for Dogs (Snacks)","Bakán Dog","Mighty Perro",

  //  Alimento para gatos
  "Cat Chow","Gati","Whiskas","Master Cat","Champion Cat","Felix",
  "Purina Pro Plan Cat","Royal Canin Cat","Hill’s Science Diet Cat",
  "Instinct Cat","Nutrición Instinct Cat","Lider Cat","Tottus Cat","Acuenta Cat",
  "Miau Miau","Evolve Cat Food",

  //  Snacks y premios
  "Dogui","Deli-Treats","Whiskas Snacks","Pedigree Dentastix","Bakán Snacks",
  "Gati Snack","Master Cat Treats","Felix Party Mix","Pro Plan Biscuits",
  "Mighty Snack","Serrano Snacks","Snackytos Pet",

  //  Arena para gatos
  "Sanicat","Cat’s Best","Performatrin Litter","Master Cat Arena","Gati Arena",
  "Big Cat Arena","Lider Arena","Tottus Arena","Acuenta Arena",

  //  Higiene y cuidado (no medicamentos)
  "Petys Toallitas","Dog&Cat Shampoo","Pet Ok Shampoo","SanDimas Shampoo",
  "Good Pet Shampoo","Biofresh Shampoo","Petiser Shampoo",
  "Odoroff","Petys Cuidado","Pet Safe Grooming",

  //  Accesorios básicos (solo marcas vendidas en retail)
  "Petmax","Animal Planet Pets","ZooActive","PetLovers","Mascota Club",
  "Puppy Love Accesorios","Pet Friend","PetComfort","PetLine",
  "Petlife","Mundo Mascota","Doggies Accessory","Gatitown Accesorios",

  //  Organización y almacenamiento
  "Rubbermaid","Sterilite","Plastiluz","Duraplast","Plasutil",
  "Home & Ware","KitchenArt","Peka","Alpina Plast","Plastimix",

  //  Menaje: platos, vasos, cubiertos, termos
  "Luminarc","Nadir","Tramontina","Casaideas Menaje","Bormioli Rocco",
  "Home Elements","KitchenAid Menaje","Tefal Menaje","Baker’s Secret",
  "Mundo Inox","Mayerhoff","Vajilla Cuisine & Co",

  //  Ollas, sartenes, utensilios de cocina
  "Tefal","Ursus Trotter","Somela Kitchen","Oster Kitchen",
  "Tramontina Cookware","Thomas Kitchen","Ilko","Record","Imusa",
  "MasterChef Utensilios","Magefesa","Tasty Kitchen","Home Basics",

  //  Iluminación / linternas / ampolletas hogar
  "Philips Lighting","Osram","General Electric GE Light","Ledvance",
  "Anwo Led","Home Light","Acuenta Led","Cuisine & Co Led","Tay Led",

  //  Cuidado de ropa (no detergentes, solo artículos)
  "Nedis","Brabantia","EasyDry Tendederos","Nova Sec","Virutex Ropa Hogar",
  "Elite Toallas Hogar","Magic Dryer","Soft Touch Hogar",

  //  Artículos para baño y cocina (no químicos)
  "Simple Human","Interdesign","Home Collection","Umbra Casa",
  "Bathroom Set Elite","Kitchen Time","Acuenta Hogar","Tottus Home","Lider Home",

  //  Velas, decoración menor y aromáticos simples
  "Glade Velas","Air Wick Home","Poett Home Aromas","Aura Home",
  "Decor Center","CasaIdeas Decor","Mundo Deco","Sweet Home Candle",

  //  Pequeños artículos infantiles NO juguetes
  "Baby Mink","Disney Baby","Minie Kids","Simond’s Baby Hogar","Baby Fresh Hogar",

  //  Ferretería básica (hogar, no pro)
  "Truper Hogar","Pretul","Bremen Hogar","Fischer Hogar",
  "Fixser","Home Tools","Dogo Tools","Montero Ferretería Hogar",

  //  Lider / Walmart Chile
  "Lider",            // Marca general
  "Acuenta",          // Marca económica (antes "Precio Bajo")
  "Great Value",      // Marca importada exclusiva Walmart
  "Marketside",       // Frescos y panadería
  "Equate",           // Cuidado personal y farmacia
  "Member’s Mark",    // Algunos importados (Sams/Walmart)

  //  Jumbo / Santa Isabel (Cencosud)
  "Cuisine & Co",     // Línea Premium (alimentos)
  "Cuisine & Co Home",// Hogar
  "Mom’s Market",     // Saludable
  "Campo Vivo",       // Orgánicos / Naturales
  "Santa Isabel Marca Propia",

  //  Tottus (Falabella)
  "Tottus",           // Marca general
  "Tottus Kids",      // Infantil
  "Tottus Home",      // Hogar
  "Tottus Pet",       // Mascotas
  "Tottus BIO",       // Saludable / orgánico

  //  Unimarc / Alvi / Mayorista10 (SMU)
  "Unimarc Marca Propia",
  "Alvi Ahorro",      // Mayorista
  "Precio Diez",      // Mayorista10
  "Petman",           // Mascotas
  "D’Luca",           // Pastas y alimentos
  "Don Juan",         // Conservas y abarrotes SMU

  //  OK Market (SMU)
  "OK Market Marca Propia",

  //  Erbi
  "Erbi Market Marca Propia",

  //  Líder Express (similar a Lider, mismo set)
  "Express Lider Marca Propia",

  //  Otras cadenas locales con marca propia visible
  "Mayorista 10 Marca Propia",
  "Santa Isabel Marca Propia",
  "Acuenta (pet, alimentos, hogar)"
];


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


const CATEGORIAS = [
  // ["https://www.unimarc.cl/category/frutas-y-verduras", "Frutas y Verduras"],
  ["https://www.unimarc.cl/despensa", "Despensa"],
  // ["https://www.unimarc.cl/category/lacteos-huevos-y-refrigerados", "Lácteos, Huevos y Refrigerados"],
  // ["https://www.unimarc.cl/category/quesos-y-fiambres", "Quesos y Fiambres"],
  // ["https://www.unimarc.cl/category/panaderia-y-pasteleria", "Panadería y Pastelería"],
  // ["https://www.unimarc.cl/category/congelados", "Congelados"],
  // ["https://www.unimarc.cl/category/desayuno-y-dulces", "Desayuno y Dulces"],
  // ["https://www.unimarc.cl/category/bebidas-y-licores", "Bebidas y Licores"],
  // ["https://www.unimarc.cl/category/limpieza", "Limpieza"],
  // ["https://www.unimarc.cl/category/perfumeria", "Perfumería"],
  // ["https://www.unimarc.cl/category/bebes-y-ninos", "Bebés y Niños"],
  // ["https://www.unimarc.cl/category/mascotas", "Mascotas"],
  // ["https://www.unimarc.cl/category/hogar", "Hogar"],
];

// =============================================================
//  Conversión de precios: "$1.590" / "$3.290$4.290" / "2x$2.500"
// =============================================================
function parsePrice(priceString = "") {
  if (!priceString) return null;

  // Limpieza general
  const texto = priceString.replace(/\s+/g, "").toLowerCase();

  // 🟦 1) Si es combo tipo "2x$3000" o "3 x $1200"
  const combo = texto.match(/(\d+)\s*x\s*\$?([\d\.]+)/i);
  if (combo) {
    const cantidad = parseInt(combo[1], 10);
    const total = parseInt(combo[2].replace(/\D/g, ""), 10);
    return cantidad > 0 ? Math.round(total / cantidad) : null;
  }

  // 🟥 2) Capturar SOLO el primer precio del string (muy común en Unimarc)
  const primerPrecio = texto.match(/\$?([\d\.]+)/);
  if (!primerPrecio) return null;

  // 🟩 3) Convertir ese precio a número entero
  const num = parseInt(primerPrecio[1].replace(/\D/g, ""), 10);
  return isNaN(num) ? null : num;
}


//  Barra de progreso visual
function renderProgressBar(current, total, prefix = "Progreso") {
  const width = 30;
  const progress = Math.round((current / total) * width);
  const bar = "█".repeat(progress) + "░".repeat(width - progress);
  const percent = ((current / total) * 100).toFixed(1).padStart(5);
  process.stdout.write(`\r[${prefix}] [${bar}] ${percent}% (${current}/${total})`);
  if (current === total) process.stdout.write("\n");
}

//  Extraer productos desde el DOM de Unimarc (igual que antes)
async function extraerProductos(page) {
  return await page.$$eval(
    "section[id^='shelf__vertical'], div[class*='ProductCard']",
    (els, MARCAS_CONOCIDAS) => {
      const detectarMarca = (titulo = "") => {
        const texto = titulo.toLowerCase();
        const match = MARCAS_CONOCIDAS.find((m) => texto.includes(m.toLowerCase()));
        return match || "Sin marca";
      };

      const normalizarUnidad = (texto = "") => {
        const match = texto.match(/(\d+)\s*(kg|g|gr|ml|lt|l)/i);
        return match ? match[0].toLowerCase() : null;
      };

      const productos = [];
      
      for (const el of els) {
        const title =
          el.querySelector("p.Shelf_nameProduct__0KIRG, p[class*='product-name']")?.innerText?.trim() || null;
        if (!title) continue;


        const agotado =
        el.innerText.toLowerCase().includes("agotado") ||
        el.innerText.toLowerCase().includes("no disponible") ||
        el.innerText.toLowerCase().includes("sin stock");

        if (agotado) continue;
        
        let brand =
          el.querySelector("p.Shelf_brandText__vmuWJ, p[class*='brand']")?.innerText?.trim() || "";
        if (!brand || brand.length < 2) brand = detectarMarca(title);

        // 🔢 Precios
        let price = el.querySelector("p[id^='listPrice__offerPrice--discountprice'], p[class*='offer-price'], p.Text_text--primary__lzNzV")
          ?.innerText?.trim() || null;

        const priceNormal =
          el.querySelector("p[id^='listPrice__offerPrice--listprice'], p[class*='list-price']")
            ?.innerText?.trim() || null;

        const pricePerUnit =
          el.querySelector("p.Text_text--gray-light__QsyHK")?.innerText?.trim() || null;

        const quantity =
          el.querySelector("#shelf__ppum p, p[class*='unit']")?.innerText?.trim() || "";

        // 🖼️ Imagen
        let image = el.querySelector("img")?.src || null;
        if (image && image.startsWith("//")) image = "https:" + image;

        // 🔗 Enlace
        let link = el.querySelector("a[href*='/product/']")?.getAttribute("href") || null;
        if (link && !link.startsWith("http")) link = `https://www.unimarc.cl${link}`;



        productos.push({
          title,
          brand,
          currentPrice: price ? Number(price.replace(/[^0-9]/g, "")) : null,
          formattedPrice: price,
          priceNormal,
          pricePerUnit,
          quantity: quantity,
          unidadEstandar: normalizarUnidad(quantity),
          image,
          link
        });
      }

      return productos;
    },
    MARCAS_CONOCIDAS
  );
}

//  Función principal (main) — versión Atlas (sin Mongoose)
async function main() {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🛒 Iniciando scraping: ${STORE.toUpperCase()}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  //  Conexión MongoDB Atlas nativa
  await connectDB();
  const db = getDB();
  console.log(`[${STORE}]  Conectado correctamente a MongoDB Atlas`);

  const colProductos = db.collection("productos");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);

  let totalGlobal = 0;
  let nuevosGlobal = 0;
  let actualizadosGlobal = 0;

for (const [url, categoria] of CATEGORIAS) {
  console.log(`\n[${STORE}]  Iniciando categoría: ${categoria}`);

  try {
    console.log(`[${STORE}]  Abriendo: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);

    let productosCategoria = [];
    let paginaActual = 1;

    // � Procesar todas las páginas
    while (true) {
      console.log(`[${STORE}]  Procesando página ${paginaActual}`);
      
      // Esperar a que los productos se carguen
      try {
        await page.waitForSelector("section[id^='shelf__vertical']", { timeout: 30000 });
        
        // Esperar un momento adicional para asegurar que todo se cargue
        await page.waitForTimeout(3000);
        
        // Extraer productos de la página actual
        const productosPagina = await extraerProductos(page, STORE, MARCAS_CONOCIDAS);
        productosCategoria.push(...productosPagina);
        
        console.log(`[${STORE}]  Página ${paginaActual}: ${productosPagina.length} productos encontrados`);
        console.log(`[${STORE}]  Total acumulado: ${productosCategoria.length} productos`);

        // Verificar si hay más páginas
        const siguientePagina = await page.$(`a[href*='page=${paginaActual + 1}']`);
        
        if (siguientePagina) {
          // Ir a la siguiente página
          await siguientePagina.click();
          console.log(`[${STORE}]  Navegando a página ${paginaActual + 1}...`);
          await page.waitForTimeout(5000); // Esperar a que la nueva página cargue
          paginaActual++;
        } else {
          console.log(`[${STORE}]  Última página alcanzada`);
          break;
        }
      } catch (error) {
        console.error(`[${STORE}]  Error en página ${paginaActual}:`, error.message);
        break;
      }
    }

    console.log(
      `[${STORE}]  Total detectados en "${categoria}": ${productosCategoria.length}`
    );

    //  Guardar productos en MongoDB Atlas
    let nuevos = 0,
      actualizados = 0,
      revisados = 0;

for (const prod of productosCategoria) {
  // ❌ Filtrar sin stock → $ -, $0, null, vacío
  if (
    !prod.formattedPrice ||
    prod.formattedPrice.includes("-") ||
    prod.formattedPrice.trim() === "" ||
    /(\$0|\$ 0)/.test(prod.formattedPrice)
  )
    continue;

  const priceNum = parsePrice(prod.formattedPrice);
  if (isNaN(priceNum) || priceNum <= 0) continue;

const globalId = generarGlobalId(prod.title, prod.brand);

// 🔎 Buscar por globalId, no por link
const existente = await colProductos.findOne({
  globalId,
  store: STORE
});

if (existente) {
  const precioAnterior = existente.currentPrice;
  const cambio = precioAnterior !== priceNum;

  await colProductos.updateOne(
    { _id: existente._id },
    {
      $set: {
        globalId,
        title: prod.title,
        brand: prod.brand,
        currentPrice: priceNum,
        formattedPrice: prod.formattedPrice,
        priceNormal: prod.priceNormal,
        pricePerUnit: prod.pricePerUnit,
        quantity: prod.quantity,
        unidadEstandar: prod.unidadEstandar,
        image: prod.image,
        link: prod.link,
        lastUpdate: new Date()
      }
    }
  );

  if (cambio) {
    await db.collection("priceHistory").insertOne({
      productId: existente._id,
      store: STORE,
      price: priceNum,
      previousPrice: precioAnterior || null,
      variation: precioAnterior
        ? Number((((priceNum - precioAnterior) / precioAnterior) * 100).toFixed(2))
        : 0,
      offerDescription: prod.offerDescription || null,
      fecha: new Date(),
    });
    actualizados++;
  }
} else {
  const resultado = await colProductos.insertOne({
    globalId,
    title: prod.title,
    brand: prod.brand,
    store: STORE,
    currentPrice: priceNum,
    formattedPrice: prod.formattedPrice,
    priceNormal: prod.priceNormal,
    pricePerUnit: prod.pricePerUnit,
    quantity: prod.quantity,
    unidadEstandar: prod.unidadEstandar,
    image: prod.image,
    link: prod.link,
    categoria: categoria,
    lastUpdate: new Date(),
    createdAt: new Date()
  });

  await db.collection("priceHistory").insertOne({
    productId: resultado.insertedId,
    store: STORE,
    price: priceNum,
    previousPrice: null,
    variation: 0,
    offerDescription: prod.offerDescription || null,
    fecha: new Date(),
  });

  nuevos++;
}

revisados++;
renderProgressBar(revisados, productosCategoria.length, `[${STORE}] Guardando`);
    }

    process.stdout.write("\n");
    totalGlobal += productosCategoria.length;
    nuevosGlobal += nuevos;
    actualizadosGlobal += actualizados;

    console.log(
      `[${STORE}]  ${categoria}: Nuevos ${nuevos}, Actualizados ${actualizados}`
    );
  } catch (err) {
    console.error(`[${STORE}] ❌ Error en categoría "${categoria}":`, err.message);
  }
}


//  Resumen final estandarizado (modo servidor)
console.log(`\n ${STORE.toUpperCase()} — RESULTADOS`);
console.log(` Nuevos: ${nuevos}`);
console.log(` Actualizados: ${actualizados}`);
console.log(` Revisados: ${revisados}`);
console.log(` Total en Atlas: ${totalDB}`);
console.log(`⏱ Finalizado: ${new Date().toLocaleString("es-CL")}\n`);

try {
  await actualizarScrapingArchivo({
    store: STORE,
    nuevos,
    actualizados,
    totalProductos: totalDB,
    fecha: new Date(),
  });
  console.log(`[${STORE}]  Archivo de scraping actualizado correctamente`);
} catch (err) {
  console.warn(`[${STORE}]  No se pudo actualizar el archivo de scraping:`, err.message);
}

//  NO CERRAMOS BROWSER NI DB (modo servidor)
console.log(`[${STORE}]  Navegador y DB permanecen activos (modo servidor)\n`);
}

main().catch((err) => {
  console.error(`[${STORE}]  Error global:`, err);
  process.exit(1);
});