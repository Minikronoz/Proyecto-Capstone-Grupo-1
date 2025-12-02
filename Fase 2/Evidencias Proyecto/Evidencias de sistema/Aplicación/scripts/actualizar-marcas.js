import { getDB, connectDB } from "../config/db.js";
import crypto from "crypto";

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
  "Fresh Garden","Salad Box","Natur Fresh","La Huerta Mix","La Romana","Hellmann'S","Natural",
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
  "Post Cereals","Granola Mornflake","Kashi","golondrina","buka",

  //  Barras de cereal (siempre clasificadas en cereales)
  "Nature Valley","Quaker Bar","Kellogg's Bar","Nestlé Cereal Bar","Fitness Bar",
  "Granuts Bar","Milo Bar","lucchetti","pirulin","Fermipan","Delia","van camps",

  //  Pastas, salsas, fideos
  "Carozzi","Lucchetti","Tres Montes Lucchetti","Malloa","Don Vittorio",
  "Molitalia","Rana","Barilla","Knorr Pastas","Cuisine & Co Pasta","Banquete",

  //  Arroz, legumbres, quinoa y granos
  "Tucapel","Miraflores","Dos Caballos","Granja del Sol Arroz","Costeño",
  "La Granja","Don Pedro","Giana","Arroz King","Casan","Nature´s Heart Granos",

  //  Legumbres en bolsa o en caja
  "Selecta","Delicias del Campo","Don Pedro Legumbres","Dos Caballos Legumbres",
  "Manare Legumbres","Caserita","Terrasol","La Esmeralda","Pancho Villa Legumbres",

  //  Aceite, vinagre y aderezos de cocina
  "Cisne Aceite","Chef","Miraflores Aceite","Maravilla","Cocinero",
  "La Española","Capri","Carbonell","Coloso","Sasso","Costa Blanca",
  "Clemente Jacques Aderezos","Karavansay","Maille","Hellmann's","Hellmanns","lucchetti","Vivo",
  "Doritos","Panela Fonce","Oso",
  //  Conservas: tomate, salsa, choclo, arvejas, etc.
  "Wasil","Dos Caballos Conservas","Malloa Conservas","Tres Montes Conservas",
  "La Huerta","Acuenta Conservas","Cuisine & Co Conservas","Arcor Conservas",
  "Productos de la Huerta","Riviana Tomate","Don Juan Conservas","Rikesa","Mavesa",
  "Marco Polo","Caserita Conservas","Iansa","Ambrosoli","Esmeralda","Aconcagua",
  "Underwood","Evercrisp","Barcel","Sembrasol","Delicia","La Comadre",

  //  Conservas de pescado (solo abarrotes)
  "San José","Aceituno","Robinson Crusoe","Van Camp’s","Jurel Azul",
  "Tuny","Mallón Atún","Panamá","Florida","Angelmo","Nerquihue",

  //  Endulzantes básicos de despensa (no mermeladas ni manjar)
  "Iansa Azúcar","Iansa Rubia","Iansa Light","Daily","Canderel",
  "Sugal","Domino Azúcar","Zuccaro","SweetZero","Tagatosa Iansa",

  //  Sal, condimentos básicos de despensa
  "Cisne","Lobos","Miraflores Sal","Astra","Aliño Completo Gourmet","Gourmet",
  "Gourmet Condimentos","Karavansay Condimentos","Knorr Condimentos","McCormick",
  "Caricia","Lider","Cock Brand","Kraft",

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
  "Watt’s 100%","Cosecha Fresca","Jugos Casa Noble","Pomarola",
  "Iselita",

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
  "Néctar Zero Vivo","Gatorade Fit","Glow Up Drink","P.A.N",

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
  "Tres Erres","Mal Paso","Waqar","Coloso","Legado","Kappa","Coliseo",
  "Pontevedra","El Gobernador","Capel","Talliani","Trattoria","Lays","Tostitos","Choritos",

  //  Cervezas nacionales
  "Cristal","Escudo","Royal Guard","Kunstmann","Austral",
  "Torobayo","Quimera","Cuello Negro","Minerva","Szot","Volcanes del Sur",

  //  Cervezas importadas
  "Heineken","Corona","Budweiser","Stella Artois","Kross","Stevia",
  "Becker","Peroni","Pilsner Urquell","Hoegaarden","Leffe","Patagonia",

  //  Whisky, ron, tequila, vodka, gin
  "Johnnie Walker","Ballantine’s","Chivas Regal","White Horse","J&B",
  "Jack Daniel’s","Jim Beam","Grant’s","Black Label","Blenders Pride",
  "Absolut","Smirnoff","Skyy Vodka","Belvedere","Grey Goose",
  "Beefeater","Tanqueray","Bombay Sapphire","Hendrick’s",
  "Captain Morgan","Havana Club","Bacardi","Brugal",
  "José Cuervo","Don Julio","Espolón","1800 Tequila",

  //  Licores dulces + aperitivos
  "Baileys","Amaretto Disaronno","Aperol","Campari","Selección","Oregon","Imperial",
  "Jägermeister","Sheridan’s","Fernet Branca","Benedictine","Lefersa","Royal",
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
  "Veet","Nair","Gillette SkinGuard","Wilkinson Sword",'Hellmann’s',

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
  "Virutex Cloro","Sapolio Cloro","Ayudín","JB","pan","Maizena","Golondrina","Buka","Talliani","Van Camp's",

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
  "Miau Miau","Evolve Cat Food","Alusweet",

  //  Snacks y premios
  "Dogui","Deli-Treats","Whiskas Snacks","Pedigree Dentastix","Bakán Snacks",
  "Gati Snack","Master Cat Treats","Felix Party Mix","Pro Plan Biscuits",
  "Mighty Snack","Serrano Snacks","Snackytos Pet",
  "Maruchan","Nissin","Deyco","Imperatore","Hoffmann","Van Camp´s",

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
  "Traverso","Heinz","Molino el Peral","Kazai","Diaguita","Edra",

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

// ✅ Función de detección mejorada CON LINK (NORMALIZACIÓN MEJORADA)
function detectarMarca(title = "", link = "") {
  if (!title || typeof title !== "string") return "Sin Marca";

  const normalizar = (txt) =>
    txt
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
      .replace(/[°º]/g, "") // ✅ Quitar símbolos de grado
      .replace(/\s+/g, " ") // Espacios múltiples → 1 espacio
      .trim();

  const tituloNorm = normalizar(title);
  
  let linkSlug = "";
  if (link && typeof link === "string") {
    const match = link.match(/\/p\/([\w-°º]+)/); // ✅ Permitir °º en el match
    if (match) {
      linkSlug = normalizar(match[1].replace(/-/g, " ")); // Reemplazar guiones por espacios
    }
  }

  console.log(`🔍 Título normalizado: "${tituloNorm}"`);
  console.log(`🔗 Link slug normalizado: "${linkSlug}"`);

  if (tituloNorm.includes("acuenta") || tituloNorm.includes("a cuenta") || 
      linkSlug.includes("acuenta") || linkSlug.includes("a cuenta")) {
    return "Acuenta";
  }

  const marcasOrdenadas = [...MARCAS_CONOCIDAS].sort((a, b) => b.length - a.length);

  for (const marca of marcasOrdenadas) {
    const marcaNorm = normalizar(marca);
    const regex = new RegExp(`\\b${marcaNorm}\\b`, "i");
    
    if (regex.test(tituloNorm)) {
      console.log(`✅ Encontrado en título: "${marca}"`);
      return marca;
    }
    
    if (linkSlug && regex.test(linkSlug)) {
      console.log(`✅ Encontrado en link: "${marca}"`);
      return marca;
    }
  }

  return "Sin Marca";
}

// ✅ Regenerar globalId
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

// ✅ Función principal (CORREGIDA)
async function actualizarMarcas() {
  console.log("\n🔄 Iniciando actualización de marcas...\n");
  
  await connectDB();
  const db = getDB();
  const colProductos = db.collection("productos");

  const productosSinMarca = await colProductos
    .find({
      store: "acuenta",
      $or: [
        { brand: "Sin Marca" },
        { brand: { $exists: false } },
        { brand: null },
        { brand: "" }
      ]
    })
    .toArray();

  console.log(`📦 Productos sin marca encontrados: ${productosSinMarca.length}\n`);

  let actualizados = 0;
  let sinCambios = 0;

  for (const prod of productosSinMarca) {
    // ✅ PASAR TÍTULO Y LINK
    const marcaDetectada = detectarMarca(prod.title, prod.link);
    
    // ✅ VALIDAR QUE NO SEA "Sin Marca" NI VACÍO
    if (marcaDetectada && 
        marcaDetectada !== "Sin Marca" && 
        marcaDetectada.trim() !== "") {
      
      const nuevoGlobalId = generarGlobalId(prod.title, marcaDetectada);
      
      await colProductos.updateOne(
        { _id: prod._id },
        {
          $set: {
            brand: marcaDetectada.trim(), // ✅ Limpiar espacios
            globalId: nuevoGlobalId,
            lastUpdate: new Date()
          }
        }
      );
      
      console.log(`✅ "${prod.title.substring(0, 60)}..."`);
      console.log(`   Link: ${prod.link}`);
      console.log(`   Marca detectada: "${marcaDetectada}"\n`);
      
      actualizados++;
    } else {
      console.log(`⚠️ SIN MARCA: "${prod.title.substring(0, 60)}..."`);
      console.log(`   Link: ${prod.link}\n`);
      sinCambios++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Actualizados: ${actualizados}`);
  console.log(`⚠️ Sin cambios: ${sinCambios}`);
  console.log(`📊 Total procesados: ${productosSinMarca.length}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  process.exit(0);
}

actualizarMarcas().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});