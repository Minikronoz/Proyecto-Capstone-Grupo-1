import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correcciones manuales específicas por nombre de tienda
const CORRECCIONES_JUMBO = {
  "Jumbo 14 Norte": { comuna: "Viña del Mar", region: "Valparaíso" },
  "Jumbo Concepción (Pedro de Valdivia)": { comuna: "Concepción", region: "Biobío" },
  "Jumbo Iquique": { comuna: "Iquique", region: "Tarapacá" },
  "Jumbo Maitencillo": { comuna: "Puchuncaví", region: "Valparaíso" }, // ✅ AGREGADO
  "Jumbo La Reina": { comuna: "La Reina", region: "Metropolitana" }, // ✅ AGREGADO
};

const CORRECCIONES_SANTA_ISABEL = {
  "Calera de Tango": { comuna: "Calera de Tango", region: "Metropolitana" },
  "Carlos Valdovinos": { comuna: "Lo Espejo", region: "Metropolitana" },
  "Curacaví": { comuna: "Curacaví", region: "Metropolitana" },
  "Doñihue": { comuna: "Doñihue", region: "O'Higgins" },
  "El Bosque, Maipú": { comuna: "Maipú", region: "Metropolitana" }, // ✅ AGREGADO
  "Fleming": { comuna: "Padre Hurtado", region: "Metropolitana" },
  "La Cisterna, Paradero 18": { comuna: "La Cisterna", region: "Metropolitana" },
  "La Pintana": { comuna: "La Pintana", region: "Metropolitana" },
  "La Unión": { comuna: "La Unión", region: "Los Ríos" },
  "Las Araucarias": { comuna: "Quillota", region: "Valparaíso" }, // ✅ AGREGADO
  "Larraín": { comuna: "La Reina", region: "Metropolitana" },
  "Mulchén": { comuna: "Mulchén", region: "Biobío" },
  "Ovalle Centro": { comuna: "Ovalle", region: "Coquimbo" },
  "Padre Hurtado": { comuna: "Padre Hurtado", region: "Metropolitana" },
  "Pajarito Vespucio": { comuna: "Pudahuel", region: "Metropolitana" },
  "Patio La Reina": { comuna: "La Reina", region: "Metropolitana" },
  "Pedro Fontova": { comuna: "Cerrillos", region: "Metropolitana" },
  "Peñablanca": { comuna: "Peñaflor", region: "Metropolitana" },
  "Peñaflor": { comuna: "Peñaflor", region: "Metropolitana" },
  "Pirque": { comuna: "Pirque", region: "Metropolitana" },
  "Renato Rocca": { comuna: "Pudahuel", region: "Metropolitana" },
  "Renca": { comuna: "Renca", region: "Metropolitana" },
  "Rubén Darío": { comuna: "Temuco", region: "La Araucanía" },
  "San Antonio": { comuna: "San Antonio", region: "Valparaíso" },
  "San Francisco De Mostazal": { comuna: "San Francisco de Mostazal", region: "O'Higgins" },
  "San Joaquín": { comuna: "San Joaquín", region: "Metropolitana" },
  "San Pablo": { comuna: "Quinta Normal", region: "Metropolitana" },
  "San Pedro De La Paz": { comuna: "San Pedro de la Paz", region: "Biobío" }, // ✅ AGREGADO
  "Santa Isabel Quilín": { comuna: "Macul", region: "Metropolitana" },
  "Talagante": { comuna: "Talagante", region: "Metropolitana" },
  "Tres Poniente, Maipú": { comuna: "Talca", region: "Maule" }, // ✅ CORREGIDO (3 Poniente es en Talca)
  "Trinidad": { comuna: "La Reina", region: "Metropolitana" },
  "Villa Alemana": { comuna: "Villa Alemana", region: "Valparaíso" }, // ✅ AGREGADO
  "Zenteno": { comuna: "Curicó", region: "Maule" }, // ✅ AGREGADO (Zenteno está en Curicó)
};

function aplicarCorrecciones() {
  console.log("\n🔧 Aplicando correcciones manuales...\n");

  // Corregir Jumbo
  const jumboPath = path.join(__dirname, "../data/jumbo_stores.json");
  const jumboData = JSON.parse(fs.readFileSync(jumboPath, "utf-8"));
  
  let jumboCorregidos = 0;
  jumboData.forEach(local => {
    if (CORRECCIONES_JUMBO[local.nombre]) {
      const { comuna, region } = CORRECCIONES_JUMBO[local.nombre];
      console.log(`✅ Jumbo: "${local.nombre}"`);
      console.log(`   Antes: ${local.comuna}, ${local.region}`);
      console.log(`   Después: ${comuna}, ${region}\n`);
      local.comuna = comuna;
      local.region = region;
      jumboCorregidos++;
    }
  });
  
  fs.writeFileSync(jumboPath, JSON.stringify(jumboData, null, 2), "utf-8");
  console.log(`✅ Jumbo: ${jumboCorregidos} locales corregidos\n`);

  // Corregir Santa Isabel
  const santaPath = path.join(__dirname, "../data/santaisabel_stores.json");
  const santaData = JSON.parse(fs.readFileSync(santaPath, "utf-8"));
  
  let santaCorregidos = 0;
  santaData.forEach(local => {
    if (CORRECCIONES_SANTA_ISABEL[local.nombre]) {
      const { comuna, region } = CORRECCIONES_SANTA_ISABEL[local.nombre];
      console.log(`✅ Santa Isabel: "${local.nombre}"`);
      console.log(`   Antes: ${local.comuna}, ${local.region}`);
      console.log(`   Después: ${comuna}, ${region}\n`);
      local.comuna = comuna;
      local.region = region;
      santaCorregidos++;
    }
  });
  
  fs.writeFileSync(santaPath, JSON.stringify(santaData, null, 2), "utf-8");
  console.log(`✅ Santa Isabel: ${santaCorregidos} locales corregidos\n`);

  console.log("🎉 Correcciones aplicadas correctamente");
}

aplicarCorrecciones();