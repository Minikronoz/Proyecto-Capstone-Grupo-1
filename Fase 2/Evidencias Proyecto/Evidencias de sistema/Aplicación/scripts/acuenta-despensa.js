

import { firefox } from "playwright";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getDB, connectDB } from "../config/db.js";
import { actualizarScrapingArchivo } from "../utils/actualizarScraping.js";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORE = "acuenta";

// =============================================================
//  MARCAS CONOCIDAS
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
  "IsoSport","Oralight","Vive Hidratante","Mont Blanc",

  //  Bebidas funcionales (con vitaminas, bajos en calorías, etc.)
  "VitaminWater","Livean","Benjoy","B-Light","Flow Vitamin",
  "Néctar Zero Vivo","Gatorade Fit","Glow Up Drink",

  //  Vinos chilenos (viñas presentes en retail)
  "Concha y Toro","Santa Rita","Undurraga","Casillero del Diablo",
  "Gato Negro","Tarapacá","Carmen","San Pedro","120 Santa Rita",
  "Montes","Errázuriz","De Martino","Ostión","Cousiño Macul",
  "Los Boldos","Terranoble","Casa Silva","Morandé","Veramonte",
  "Koyle","Toro de Piedra","Nidias","Misiones de Rengo","Frontera","Marqués de Casa Concha","Belmont",

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


// =============================================================
//  Conversión de precio Acuenta (evita dobles: "$2990$3790")
// =============================================================
const parsePrice = (priceStr = "") => {
  if (!priceStr) return null;
  const texto = priceStr.replace(/\s+/g, "").toLowerCase();
  if (texto.includes("-")) return null;

  //  Combo "2x$3000"
  const combo = texto.match(/(\d+)\s*x\s*\$?([\d\.]+)/i);
  if (combo) {
    const cantidad = parseInt(combo[1], 10);
    const total = parseInt(combo[2].replace(/\D/g, ""), 10);
    return cantidad > 0 && total > 0 ? Math.round(total / cantidad) : null;
  }

  //  SOLO primer precio (evita “...$2990$3790”)
  const primerPrecio = texto.match(/\$?([\d\.]+)/);
  if (!primerPrecio) return null;

  const num = parseInt(primerPrecio[1].replace(/\D/g, ""), 10);
  return num > 0 ? num : null;
};


// =============================================================
//  Detección automática de marcas conocidas
// =============================================================
function detectarMarca(title = "") {
  const t = title.toLowerCase().trim();

  //  Marcas propias Acuenta
  if (t.includes("acuenta")) return "A Cuenta (Marca Propia)";

  //  Marcas comerciales con coincidencia exacta (evita falsos positivos)
  const marca = MARCAS_CONOCIDAS.find(m => {
    const regex = new RegExp(`\\b${m}\\b`, "i");
    return regex.test(title);
  });

  return marca ? marca : "Sin Marca";
}

// =============================================================
//  Categorías
// =============================================================
const CATEGORIAS = [
  // { nombre: "Promociones", url: "https://www.acuenta.cl/ca/promociones/01" },
  // { nombre: "Bodegazo", url: "https://www.acuenta.cl/ca/bodegazo/60" },
  // { nombre: "Marcas Propias", url: "https://www.acuenta.cl/ca/marcas-propias/20" },
  // { nombre: "Imperdibles", url: "https://www.acuenta.cl/ca/imperdibles/100" },
  // { nombre: "Mundo bebé", url: "https://www.acuenta.cl/ca/mundo-bebe/09" },
  { nombre: "Despensa", url: "https://www.acuenta.cl/ca/despensa/05" },
  // { nombre: "Carnes y Pescados", url: "https://www.acuenta.cl/ca/carnes-y-pescados/03" },
  // { nombre: "Aseo y limpieza", url: "https://www.acuenta.cl/ca/aseo-y-limpieza/11" },
  // { nombre: "Frescos y Lácteos", url: "https://www.acuenta.cl/ca/frescos-y-lacteos/07" },
  // { nombre: "El Bar", url: "https://www.acuenta.cl/ca/el-bar/14" },
  // { nombre: "Desayuno y Dulces", url: "https://www.acuenta.cl/ca/desayuno-y-dulces/12" },
  // { nombre: "Mascotas", url: "https://www.acuenta.cl/ca/mascotas/08" },
  // { nombre: "Bebidas y Snacks", url: "https://www.acuenta.cl/ca/bebidas-y-snacks/02" },
  // { nombre: "Congelados", url: "https://www.acuenta.cl/ca/congelados/04" },
  // { nombre: "Frutas y Verduras", url: "https://www.acuenta.cl/ca/frutas-y-verduras/06" },
  // { nombre: "Panadería y Pastelería", url: "https://www.acuenta.cl/ca/panaderia-y-pasteleria/10" },
  // { nombre: "Perfumería y Cuidado Personal", url: "https://www.acuenta.cl/ca/perfumeria-y-cuidado-personal/13" },
  // { nombre: "Hogar, entretención y tecnología", url: "https://www.acuenta.cl/ca/hogar-entretencion-y-tecnologia/47" }
];


// =============================================================
//  Barra estándar (actualiza solo cada 5%)
// =============================================================
function renderProgressBar(current, total, prefix = `[${STORE}]`) {
  if (!total || total <= 0) return;
  const width = 28;
  const avance = current / total;
  const progress = Math.round(avance * width);

  const pasoMin = Math.ceil(total * 0.05);
  if (current % pasoMin !== 0 && current !== total) return;

  const bar = "█".repeat(progress) + "░".repeat(width - progress);
  const percent = (avance * 100).toFixed(0).padStart(3);

  process.stdout.write(`\r${prefix} [${bar}] ${percent}% (${current}/${total})`);
  if (current === total) process.stdout.write("\n");
}


function procesarUnit(pricePerUnit = "") {
  if (!pricePerUnit) return { unitValue: null, unitName: null };

  const txt = pricePerUnit.toLowerCase().trim();

  //  Ignorar datos inválidos que Acuenta devuelve
  if (
    txt === "" ||
    txt.includes("pum") ||
    txt.includes("unidad") ||
    txt.includes("un") && !txt.match(/\d/) ||
    txt.includes("oferta") ||
    txt.includes("price-unit") ||
    txt.length < 3
  ) {
    return { unitValue: null, unitName: null };
  }

  const match = txt.match(/([\d\.]+).*?(?:x|\/)\s*(\d+)?\s*(g|gr|kg|ml|l|lt)/i);
  if (!match) return { unitValue: null, unitName: null };

  let valor = parseInt(match[1].replace(/\D/g, ""), 10);
  let cantidad = parseInt(match[2], 10) || 1;
  let unidad = match[3].toLowerCase();

  if (unidad === "kg") {
    cantidad *= 1000;
    unidad = "g";
  }
  if (unidad === "l" || unidad === "lt") {
    cantidad *= 1000;
    unidad = "ml";
  }

  if (unidad === "" || unidad === "un" || unidad === "unidad" || cantidad === 1) {
    return { unitValue: null, unitName: null };
  }

  return {
    unitValue: valor,
    unitName: `${cantidad}${unidad}`
  };
}

async function cargarTodosLosProductos(page) {
  const selectorCard = ".styles__StyledCard-sc-3jvmda-0";

  let intentos = 0;
  let sameCount = 0;
  let ultimoTotal = 0;

  while (intentos < 40 && sameCount < 5) {
    intentos++;

    //  Scroll hasta el fondo
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(2000);

    //  Si existe un botón "Ver más productos", lo clickeamos
    const btnVerMas = await page.$("button:has-text('Ver más productos')");
    if (btnVerMas) {
      try {
        await btnVerMas.click();
        await page.waitForTimeout(2000);
      } catch (e) {
        console.warn(`[${STORE}] ⚠️ No se pudo clickear "Ver más productos":`, e.message);
      }
    }

    const totalActual = await page.locator(selectorCard).count();

    if (totalActual === ultimoTotal) {
      sameCount++;
    } else {
      sameCount = 0;
      ultimoTotal = totalActual;
    }

    process.stdout.write(
      `\r[${STORE}]  Scroll infinito -> cards visibles: ${totalActual} (intento ${intentos}, same=${sameCount})`
    );
  }

  const finalCount = await page.locator(selectorCard).count();
  console.log(`\n[${STORE}]  Productos visibles tras scroll: ${finalCount}`);
  return finalCount;
}


// =============================================================
//  MAIN
// =============================================================
async function main() {
  console.log(`\n Iniciando SCRAPER ${STORE.toUpperCase()}`);
  await connectDB();
  const db = getDB();
  console.log(`[${STORE}]  Conectado a MongoDB Atlas`);

  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
  });
  const page = await context.newPage();

  let nuevos = 0, actualizados = 0, revisados = 0;
  const productosMap = new Map();

  for (const cat of CATEGORIAS) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[${STORE}] 🟢 Categoría: ${cat.nombre}`);
    console.log(`[${STORE}] 🌐 URL: ${cat.url}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    let intentos = 0;
    let productos = [];

    //  Reintentos automáticos
    while (intentos < 5 && productos.length === 0) {
      try {
        intentos++;
        console.log(`[${STORE}]  Intento ${intentos}/5 en ${cat.nombre}`);
        const response = await page.goto(cat.url, { waitUntil: "domcontentloaded", timeout: 120000 });
        if (!response || response.status() >= 400) continue;

        await page.waitForTimeout(3000);

        const notFound = await page.$('text="Lo sentimos"');
        if (notFound) {
          console.warn(`[${STORE}] ⚠️ Página vacía (${cat.nombre})`);
          await page.reload();
          continue;
        }

        //  Scroll dinámico
        let sameCount = 0;
        while (sameCount < 3) {
          const before = await page.locator(".styles__StyledCard-sc-3jvmda-0").count();
          await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
          await page.waitForTimeout(1500);
          const after = await page.locator(".styles__StyledCard-sc-3jvmda-0").count();
          if (after === before) sameCount++;
          else sameCount = 0;
        }

//  Scroll infinito hasta que no carguen más productos
await cargarTodosLosProductos(page);

productos = await page.$$eval(".styles__StyledCard-sc-3jvmda-0", (cards) =>
  cards.map((card) => {
    try {
      const title =
        card.querySelector(".prod__name, .CardName__CardNameStyles-sc-147zxke-0")?.innerText?.trim() || "";
      const price =
        card.querySelector(".base__price, .CardBasePrice__CardBasePriceStyles-sc-1dlx87w-0")?.innerText?.trim() || "";
      const pricePerUnit =
        card.querySelector(".CardPum__CardPumStyles-sc-1vz27ac-0 span, .styles__PumStyles-sc-omx4ld-0 span")
          ?.innerText?.trim() || null;
      const offerDescription =
        card.querySelector(".styles__PromoTagStyles-sc-q4v3s1-0 div")?.innerText?.trim() || null;
      const image =
        card.querySelector("img.ant-image-img, img.prod__figure__img")?.src || "";
      const href = card.querySelector("a.containerCard")?.getAttribute("href") || "";
      const link = href.startsWith("http") ? href : `https://www.acuenta.cl${href}`;
      return { title, price, pricePerUnit, offerDescription, image, link };
    } catch {
      return null;
    }
  }).filter(Boolean)
);


      } catch (err) {
        console.error(`[${STORE}] ❌ Error en intento ${intentos}: ${err.message}`);
        await page.waitForTimeout(3000);
      }
    }

    if (!productos.length) {
      console.warn(`[${STORE}] ⚠️ No se logró extraer ${cat.nombre} tras 5 intentos.`);
      continue;
    }

    console.log(`[${STORE}]  ${productos.length} productos extraídos (${cat.nombre})`);
    for (const prod of productos) {
      if (!productosMap.has(prod.link)) productosMap.set(prod.link, { ...prod, categoria: cat.nombre });
    }
  }

  const productosFinal = Array.from(productosMap.values());
  console.log(`\n[${STORE}]  Total productos únicos: ${productosFinal.length}`);

  const colProductos = db.collection("productos");
  const colPriceHistory = db.collection("priceHistory");

for (const [i, prod] of productosFinal.entries()) {
  if (!prod.image || prod.image.includes("default")) continue;

  const precioNum = parsePrice(prod.price);
  if (isNaN(precioNum)) continue;

  const { unitValue, unitName } = procesarUnit(prod.pricePerUnit);
  const marcaDetectada = detectarMarca(prod.title);
  const globalId = generarGlobalId(prod.title, marcaDetectada);


  //  Buscar producto por globalId + store
  const existente = await colProductos.findOne({ globalId, store: STORE });

  if (existente) {
    //  Si el precio cambió → actualizar e insertar al historial
    if (existente.currentPrice !== precioNum) {
      await colProductos.updateOne(
        { _id: existente._id },
        {
          $set: {
            globalId,
            title: prod.title,
            brand: marcaDetectada,
            currentPrice: precioNum,
            formattedPrice: prod.price,
            pricePerUnit: prod.pricePerUnit || null,
            offerDescription: prod.offerDescription || null,
            lastUpdate: new Date(),
            categoria: prod.categoria
          }
        }
      );

      await colPriceHistory.insertOne({
        productId: existente._id,
        store: STORE,
        price: precioNum,
        previousPrice: existente.currentPrice || null,
        variation: existente.currentPrice
          ? Number((((precioNum - existente.currentPrice) / existente.currentPrice) * 100).toFixed(2))
          : 0,
        offerDescription: prod.offerDescription || null,
        fecha: new Date()
      });

      actualizados++;
    }
  } else {
    //  Si no existe → insertar nuevo
      await colProductos.insertOne({
        globalId,
        title: prod.title,
        brand: marcaDetectada,
        store: STORE,
        currentPrice: precioNum,
        formattedPrice: prod.price,
        pricePerUnit: prod.pricePerUnit || null,
        unitValue,
        unitName,
        offerDescription: prod.offerDescription || null,
        image: prod.image,
        link: prod.link,
        categoria: prod.categoria,
        lastUpdate: new Date()
      });

    nuevos++;
  }

  revisados++;
  renderProgressBar(revisados, productosFinal.length, `[${STORE}]`);
}


const totalDB = await colProductos.countDocuments({ store: STORE });

console.log(`\n📊 ${STORE.toUpperCase()} — RESULTADOS`);
console.log(`🆕 Nuevos: ${nuevos}`);
console.log(`♻️ Actualizados: ${actualizados}`);
console.log(`🔎 Revisados: ${revisados}`);
console.log(`📦 Total en Atlas: ${totalDB}`);
console.log(`⏱️ Finalizado: ${new Date().toLocaleString("es-CL")}\n`);

//  Guarda resumen global
await actualizarScrapingArchivo({
  store: STORE,
  nuevos,
  actualizados,
  totalProductos: totalDB
});

console.log(`[${STORE}] 🧾 Archivo de scraping actualizado`);
//  No cerramos browser ni DB para que continúe el proceso padre


}

main().catch((err) => console.error(`[${STORE}] ERROR GLOBAL`, err));
