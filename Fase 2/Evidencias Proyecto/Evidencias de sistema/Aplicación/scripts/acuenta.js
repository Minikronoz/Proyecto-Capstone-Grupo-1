import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function convertirAcuentaTxtAJson() {
  console.log("\n🔄 Convirtiendo locales_acuenta_raw.txt a JSON...");

  const inputPath = path.join(__dirname, "../data/locales_acuenta_raw.txt");
  const outputPath = path.join(__dirname, "../data/acuenta_stores.json");

  // Leer archivo TXT
  const contenido = fs.readFileSync(inputPath, "utf-8");
  const lineas = contenido.split("\n").filter(l => l.trim());

  const locales = [];

  lineas.forEach((linea, index) => {
    try {
      // Dividir por tabulaciones
      const partes = linea.split("\t").map(p => p.trim());

      if (partes.length < 7) {
        console.log(`⚠️ Línea ${index + 1} incompleta, saltando...`);
        return;
      }

      // Formato: tienda | comuna | direccion | estado | region | horario_inicio | horario_fin
      const [tienda, comuna, direccion, estado, region, horarioInicio, horarioFin] = partes;

      locales.push({
        nombre: `${tienda} ${comuna}`,
        direccion: direccion || "Sin dirección",
        comuna: comuna || "Sin comuna",
        region: region || "Sin región",
        horario: `${horarioInicio} - ${horarioFin}`,
        estado: estado
      });

    } catch (error) {
      console.log(`❌ Error en línea ${index + 1}: ${error.message}`);
    }
  });

  // Guardar en JSON
  fs.writeFileSync(outputPath, JSON.stringify(locales, null, 2), "utf-8");

  console.log(`✅ Acuenta: ${locales.length} locales convertidos a JSON`);
  console.log(`📄 Guardado en: ${outputPath}`);
}

convertirAcuentaTxtAJson();