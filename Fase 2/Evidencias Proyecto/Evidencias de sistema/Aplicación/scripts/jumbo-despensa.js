// =============================================================
//  Scraper Jumbo — versión extendida con priceNormal y pricePerUnit
// =============================================================
import { chromium } from "playwright";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getDB, connectDB } from "../config/db.js";
import { actualizarScrapingArchivo } from "../utils/actualizarScraping.js";
import crypto from "crypto";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STORE = "jumbo";

// =============================================================
//  MARCAS CONOCIDAS (set global unificado para todos los supermercados)
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


// =============================================================
//  Conversión de precios: "$1.990" / "$1.990$3.710" / "2x$3.000"
// =============================================================
function parsePrice(priceString = "") {
  if (!priceString) return null;

  const texto = priceString.replace(/\s+/g, "").toLowerCase();

  // 1) Si es combo tipo "2x$3000"
  const combo = texto.match(/(\d+)\s*x\s*\$?([\d\.]+)/i);
  if (combo) {
    const cantidad = parseInt(combo[1], 10);
    const total = parseInt(combo[2].replace(/\D/g, ""), 10);
    return cantidad > 0 ? Math.round(total / cantidad) : null;
  }

  // 2) Si es "Paga $890" → capturar ese precio
  const pagaMatch = texto.match(/paga\s*\$?([\d\.]+)/i);
  if (pagaMatch) {
    const num = parseInt(pagaMatch[1].replace(/\D/g, ""), 10);
    return isNaN(num) ? null : num;
  }

  // 3) Capturar SOLO el primer precio del string
  const primerPrecio = texto.match(/\$?([\d\.]+)/);
  if (!primerPrecio) return null;

  const num = parseInt(primerPrecio[1].replace(/\D/g, ""), 10);
  return isNaN(num) ? null : num;
}

// =============================================================
//  Detección automática de marcas conocidas
// =============================================================
function detectarMarca(title = "") {
  const t = title.toLowerCase();
  const marcaEncontrada = MARCAS_CONOCIDAS.find((m) =>
    t.includes(m.toLowerCase())
  );
  return marcaEncontrada
    ? marcaEncontrada.replace(/^Cerveza\s+/i, "").trim()
    : "Sin marca";
}
// =============================================================
//  Barra de progreso
// =============================================================
function renderProgressBar(current, total, prefix = `[${STORE}]`) {
  const width = 30;
  const progress = Math.round((current / total) * width);
  const bar = "█".repeat(progress) + "░".repeat(width - progress);
  const percent = ((current / total) * 100).toFixed(1).padStart(5);
  process.stdout.write(`\r${prefix} [${bar}] ${percent}% (${current}/${total})`);
  if (current === total) process.stdout.write("\n");
}

// =============================================================
//  Aceptar cookies y limpiar overlays OneTrust
// =============================================================
async function aceptarCookiesSiAparecen(page) {
  try {
    const btn = await page.locator("#onetrust-accept-btn-handler, button:has-text('Aceptar')");
    if ((await btn.count()) > 0 && (await btn.isVisible())) {
      await btn.click({ force: true });
      console.log(`[${STORE}] 🍪 Cookies aceptadas`);
      await page.waitForTimeout(1500);
    }

    // 🔹 Limpieza manual de overlays que bloquean clics
    await page.evaluate(() => {
      const overlays = document.querySelectorAll("#onetrust-consent-sdk, .onetrust-pc-dark-filter");
      overlays.forEach((el) => (el.style.display = "none"));
    });
    await page.waitForTimeout(500);
  } catch (err) {
    console.log(`[${STORE}] ⚠️ No se detectaron cookies: ${err.message}`);
  }
}

// =============================================================
//  Categorías a recorrer
// =============================================================
const CATEGORIES = [
  // { name: "Experiencias Jumbo",       url: "https://www.jumbo.cl/experiencias-jumbo" },
  // { name: "Frutas y Verduras",        url: "https://www.jumbo.cl/frutas-y-verduras" },
  // { name: "Lácteos, Huevos y Congelados", url: "https://www.jumbo.cl/lacteos-huevos-y-congelados" },
  // { name: "Quesos y Fiambres",        url: "https://www.jumbo.cl/quesos-y-fiambres" },
  { name: "Despensa",                 url: "https://www.jumbo.cl/despensa" },
  // { name: "Carnes y Pescados",        url: "https://www.jumbo.cl/carnes-y-pescados" },
  // { name: "Panadería y Pastelería",   url: "https://www.jumbo.cl/panaderia-y-pasteleria" },
  // { name: "Licores, Bebidas y Aguas", url: "https://www.jumbo.cl/licores-bebidas-y-aguas" },
  // { name: "Chocolates, Galletas y Snacks", url: "https://www.jumbo.cl/chocolates-galletas-y-snacks" },
  // { name: "Limpieza",                 url: "https://www.jumbo.cl/limpieza" },
  // { name: "Cuidado Personal y Bebé",  url: "https://www.jumbo.cl/cuidado-personal-y-bebe" },
  // { name: "Mascotas",                 url: "https://www.jumbo.cl/mascotas" }
];


// =============================================================
//  Scraper por categoría
// =============================================================
async function scrapeCategoria(page, categoria, colProductos, colPriceHistory) {
  const { name, url } = categoria;
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[${STORE}]  Categoría: ${name}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  let nuevos = 0, actualizados = 0, revisados = 0;
  const productos = [];

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    await aceptarCookiesSiAparecen(page);
    await page.waitForTimeout(2500);

    let hasNext = true, pagina = 1;
    while (hasNext) {
      await aceptarCookiesSiAparecen(page);

      //  Scroll para lazy load
      await page.evaluate(async () => {
        const delay = (ms) => new Promise((res) => setTimeout(res, ms));
        for (let i = 0; i < 10; i++) {
          window.scrollBy(0, window.innerHeight);
          await delay(400);
        }
      });
      await page.waitForTimeout(1500);

      await page.waitForSelector("div.border.rounded-t-lg.flex a[href*='/p']", { timeout: 60000 });

      const items = await page.$$eval("div.border.rounded-t-lg.flex a[href*='/p']", (cards) =>
        cards.map((el) => {
          try {
            //  Detectar productos no disponibles / agotados
            const textoCompleto = el.innerText.toLowerCase();
            const agotado = textoCompleto.includes("agotado") || textoCompleto.includes("no disponible");

            //  Detectar tarjeta gris/inactiva mediante clases
            const clase = el.getAttribute("class") || "";
            const tarjetaBloqueada = clase.includes("opacity") || clase.includes("disabled") || clase.includes("pointer-events");

            if (agotado || tarjetaBloqueada) return null; //  Ignorar sin stock

            //  Selectores limpios
            const title = el.querySelector("h2.product-card-name")?.innerText?.trim() || null;
            const brand = el.querySelector("p.text-sm.text-gray-500")?.innerText?.trim() || "Sin marca";
            
            // ✅ CORREGIDO: Capturar SOLO el primer precio (no el tachado)
            const precioContainer = el.querySelector("div.flex.items-baseline.text-neutral700");
            let price = null;
            let priceNormal = null;
            
            if (precioContainer) {
              // Capturar el primer precio (el que NO tiene line-through)
              const precioActual = precioContainer.childNodes[0]?.textContent?.trim() || null;
              price = precioActual;
              
              // Capturar el precio tachado (precio normal antes de descuento)
              const precioTachado = precioContainer.querySelector(".line-through")?.innerText?.trim() || null;
              priceNormal = precioTachado;
            }
            
            // ✅ Capturar precio con medio de pago especial (ej: "Paga $890")
            const offerDescription = el.querySelector(".bg-bgflagoferta span")?.innerText?.trim() || null;
            
            // Capturar precio por unidad
            const pricePerUnit = el.querySelector(".ppum-price-container span")?.innerText?.trim() || null;
            
            const image = el.querySelector("img")?.src || "";
            const href = el.getAttribute("href") || "";
            const link = href.startsWith("http") ? href : `https://www.jumbo.cl${href}`;

            //  Validación final
            if (!title || !price) return null;
            
            return { 
              title, 
              brand, 
              price, 
              priceNormal, 
              pricePerUnit, 
              offerDescription,
              image, 
              link 
            };

          } catch {
            return null;
          }
        }).filter(Boolean)
      );



      console.log(`[${STORE}] Página ${pagina} (${name}) → ${items.length} productos`);
      productos.push(...items);

      const nextBtn = await page.$(`button.page-number:has-text("${pagina + 1}")`);
      if (nextBtn) {
        await nextBtn.scrollIntoViewIfNeeded();
        await nextBtn.click().catch(() => console.log(`[${STORE}] ⚠️ Error al hacer click, reintenta...`));
        await page.waitForTimeout(3000);
        pagina++;
      } else hasNext = false;
    }

    //  Eliminar duplicados
    const unicos = productos.filter((p, i, arr) => arr.findIndex((x) => x.link === p.link) === i);

for (const [i, prod] of unicos.entries()) {
  const precioNum = parsePrice(prod.price);
  if (isNaN(precioNum) || !prod.link) continue;

  const marcaDetectada = prod.brand || detectarMarca(prod.title);
  const globalId = generarGlobalId(prod.title, marcaDetectada);
  const { unitValue, unitName } = procesarUnit(prod.pricePerUnit);

  //  Buscar si ya existe en BD
  const existente = await colProductos.findOne({ globalId, store: STORE });

  if (existente) {
    //  Si el precio cambió → actualizar
    if (existente.currentPrice !== precioNum) {
              await colProductos.updateOne(
          { _id: existente._id },
          {
            $set: {
              currentPrice: precioNum,
              formattedPrice: prod.price,
              priceNormal: prod.priceNormal || null,
              pricePerUnit: prod.pricePerUnit || null,
              unitValue,
              unitName,
              offerDescription: prod.offerDescription || null,
              image: prod.image,
              link: prod.link,
              categoria: name,
              lastUpdate: new Date()
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
    //  Insertar nuevo producto
    const result = await colProductos.insertOne({
          globalId,
          title: prod.title,
          brand: marcaDetectada,
          store: STORE,
          currentPrice: precioNum,
          formattedPrice: prod.price,
          priceNormal: prod.priceNormal || null,
          pricePerUnit: prod.pricePerUnit || null,
          unitValue,
          unitName,
          offerDescription: prod.offerDescription || null,
          image: prod.image,
          link: prod.link,
          categoria: name,
          lastUpdate: new Date()
        });

    nuevos++;

    await colPriceHistory.insertOne({
      productId: result.insertedId,
      store: STORE,
      price: precioNum,
      previousPrice: null,
      variation: 0,
      offerDescription: prod.offerDescription || null,
      fecha: new Date()
    });
  }

  revisados++;
  renderProgressBar(revisados, unicos.length, `[${STORE}] ${name}`);
}


    console.log(`\n[${STORE}]  ${name}: Nuevos ${nuevos}, Actualizados ${actualizados}, Revisados ${revisados}`);
    return { nuevos, actualizados, revisados };
  } catch (err) {
    console.error(`[${STORE}]  Error en ${name}:`, err.message);
    await page.screenshot({ path: join(__dirname, `error-${STORE}-${name}.png`), fullPage: true });
    return { nuevos: 0, actualizados: 0, revisados: 0 };
  }
}
function procesarUnit(pricePerUnit = "") {
  if (!pricePerUnit) return { unitValue: null, unitName: null };

  // Ej: "$698 x 10g" → ["$698", "10g"]
  const match = pricePerUnit.match(/([\d\.]+).*?x\s*([\d]+)(g|kg|ml|l|lt)/i);
  if (!match) return { unitValue: null, unitName: null };

  let valor = parseInt(match[1].replace(/\D/g, ""), 10);
  let cantidad = parseInt(match[2], 10);
  let unidad = match[3].toLowerCase();

  // Estandarizar unidades
  if (unidad === "kg") {
    cantidad *= 1000;
    unidad = "g";
  }
  if (unidad === "l" || unidad === "lt") {
    cantidad *= 1000;
    unidad = "ml";
  }

  return {
    unitValue: valor,
    unitName: `${cantidad}${unidad}`
  };
}

// =============================================================
//  MAIN
// =============================================================
async function main() {
  console.log(`\n Iniciando SCRAPER ${STORE.toUpperCase()}\n`);
  await connectDB();
  const db = getDB();
  console.log(`[${STORE}] Conectado a MongoDB Atlas`);

  const colProductos = db.collection("productos");
  const colPriceHistory = db.collection("priceHistory");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
  });
  const page = await context.newPage();

  let totalNuevos = 0, totalActualizados = 0, totalRevisados = 0;

  for (const cat of CATEGORIES) {
    const r = await scrapeCategoria(page, cat, colProductos, colPriceHistory);
    totalNuevos += r.nuevos;
    totalActualizados += r.actualizados;
    totalRevisados += r.revisados;
    await page.waitForTimeout(4000 + Math.random() * 3000);
  }

  const totalDB = await colProductos.countDocuments({ store: STORE });
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[${STORE}] 📊 RESULTADOS FINALES`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Nuevos: ${totalNuevos}`);
  console.log(`Actualizados: ${totalActualizados}`);
  console.log(`Revisados hoy: ${totalRevisados}`);
  console.log(`Total en Atlas (${STORE}): ${totalDB}`);
  console.log(`[${STORE}] ✅ Scraping completado correctamente\n`);

  await actualizarScrapingArchivo({
    store: STORE,
    nuevos: totalNuevos,
    actualizados: totalActualizados,
    totalProductos: totalDB
  });

  await browser.close();
  console.log(`[${STORE}]  Conexión cerrada correctamente`);
}

main().catch((err) => console.error(`[${STORE}] ERROR GLOBAL`, err));