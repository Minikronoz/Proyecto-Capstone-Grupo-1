// public/js/regiones.js

// 🗺️ Catálogo de regiones y comunas de Chile
const regiones = {
  "Arica y Parinacota": ["Arica", "Camarones", "Putre", "General Lagos"],
  "Tarapacá": ["Iquique", "Alto Hospicio", "Pozo Almonte", "Camiña", "Colchane", "Huara", "Pica"],
  "Antofagasta": ["Antofagasta", "Mejillones", "Sierra Gorda", "Taltal", "Calama", "San Pedro de Atacama", "Tocopilla"],
  "Atacama": ["Copiapó", "Caldera", "Tierra Amarilla", "Chañaral", "Diego de Almagro", "Vallenar", "Huasco"],
  "Coquimbo": ["La Serena", "Coquimbo", "Andacollo", "Illapel", "Ovalle", "Los Vilos", "Salamanca", "Vicuña"],
  "Valparaíso": ["Valparaíso", "Viña del Mar", "Concón", "Quilpué", "Villa Alemana", "San Antonio", "Los Andes", "Quillota"],
  "Metropolitana de Santiago": [
    "Santiago", "Puente Alto", "Maipú", "Ñuñoa", "Providencia", "Las Condes", "La Florida",
    "San Bernardo", "Vitacura", "La Reina", "Pudahuel", "Quilicura"
  ],
  "O'Higgins": ["Rancagua", "Machalí", "Graneros", "San Vicente", "Rengo", "Pichilemu"],
  "Maule": ["Talca", "Curicó", "Linares", "Cauquenes", "Constitución", "Parral", "San Javier"],
  "Ñuble": ["Chillán", "Chillán Viejo", "San Carlos", "Quillón", "Coihueco", "Yungay"],
  "Biobío": ["Concepción", "Talcahuano", "Hualpén", "Coronel", "Chiguayante", "Los Ángeles", "Lota", "San Pedro de la Paz"],
  "Araucanía": ["Temuco", "Padre Las Casas", "Angol", "Villarrica", "Nueva Imperial", "Pitrufquén"],
  "Los Ríos": ["Valdivia", "La Unión", "Paillaco", "Panguipulli", "Río Bueno"],
  "Los Lagos": ["Puerto Montt", "Castro", "Ancud", "Osorno", "Frutillar", "Puerto Varas", "Quellón"],
  "Aysén": ["Coyhaique", "Puerto Aysén", "Chile Chico", "Cisnes", "Río Ibáñez"],
  "Magallanes": ["Punta Arenas", "Puerto Natales", "Porvenir", "Torres del Paine"]
};

// 📍 Catálogo de sectores por comuna
const sectoresPorComuna = {
  // Región Metropolitana
  "Santiago": ["Centro", "Barrio Brasil", "Lastarria", "Yungay", "Franklin", "Patronato", "Bellavista"],
  "Las Condes": ["El Golf", "La Dehesa", "San Carlos de Apoquindo", "Nueva Las Condes"],
  "Maipú": ["Maipú Centro", "El Abrazo", "Ciudad Satélite", "Camino a Melipilla"],
  "Puente Alto": ["Centro", "San Carlos", "Bajos de Mena", "Pirque", "La Florida"],
  "Ñuñoa": ["Plaza Ñuñoa", "Villa Frei", "Irarrázaval", "Macul"],
  "Providencia": ["Pedro de Valdivia", "Manuel Montt", "Los Leones", "Tobalaba"],
  "San Bernardo": ["Centro", "Nos", "Lo Herrera", "Chena"],

  // Región del Biobío
  "Concepción": ["Centro", "Collao", "Pedro de Valdivia", "Agua de la Gloria", "Cerro Amarillo"],
  "Talcahuano": ["Centro", "Las Salinas", "Higueras", "Gaete", "El Morro"],
  "Hualpén": ["Parque Central", "Hualpencillo", "4 Esquinas", "Villa Acero"],
  "Coronel": ["Centro", "Laguna Quiñenco", "Escuadrón", "Camilo Olavarría", "Lagunillas"],
  "Chiguayante": ["Centro", "Leonera", "Palomares", "Los Héroes"],
  "Los Ángeles": ["Centro", "Paillihue", "Villa Génesis", "El Avellano", "Las Quintas"],
  "Lota": ["Centro", "Colcura", "El Morro", "Costa", "Fundición"],
  "San Pedro de la Paz": ["Centro", "Boca Sur", "Lomas Coloradas", "Huertos Familiares"],

  // Región de Ñuble
  "Chillán": ["Centro", "Chillán Viejo", "Quinchamalí", "Las Mariposas", "Doña Francisca"],
  "Chillán Viejo": ["Centro", "Altos de Ñuble", "Rucapequén", "Quilamapu"],
  "San Carlos": ["Centro", "Laguna Grande", "El Sauce", "Sur", "Norte"],
  "Quillón": ["Centro", "Coyanco", "Baja Camelia", "El Casino"],
  "Coihueco": ["Centro", "Tanilvoro", "Las Pataguas", "El Rosal"],
  "Yungay": ["Centro", "Campanario", "Los Mayos", "El Roble"],

  // Otras regiones
  "Valparaíso": ["Centro", "Puerto", "Cerro Alegre", "Cerro Concepción", "Cerro Barón"],
  "Viña del Mar": ["Centro", "Reñaca", "Aguas Santa", "Miraflores", "Chorrillos"],
  "Temuco": ["Centro", "Labranza", "Padre Las Casas", "Amanecer"],
  "Villarrica": ["Centro", "Segunda Faja", "Los Volcanes", "Molco"],
  "Puerto Montt": ["Centro", "Angelmo", "Alerce", "Lenca"],
  "Osorno": ["Centro", "Rahue", "Francke", "Ovejería"],
  "Punta Arenas": ["Centro", "Zona Franca", "Barrio Prat", "Costanera"]
};

// 🧩 Fallback automático: asigna sectores genéricos a comunas sin definir
Object.keys(regiones).forEach(region => {
  regiones[region].forEach(comuna => {
    if (!sectoresPorComuna[comuna]) {
      sectoresPorComuna[comuna] = ["Centro", "Norte", "Sur", "Oriente", "Poniente"];
    }
  });
});
