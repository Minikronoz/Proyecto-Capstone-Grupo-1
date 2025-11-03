import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDB } from "../config/db.js";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------------------------------------------------
// CRUD Usuarios
// ------------------------------------------------------------------

async function listUsers(req, res) {
  try {
    const db = getDB();
    const users = await db.collection("users").find().limit(50).toArray();

    const rows = users
      .map((u) => {
        const negociosHTML =
          u.negocios && u.negocios.length > 0
            ? `<ul>${u.negocios
                .map(
                  (n) => `
            <li>
              <strong>${n.nombre}</strong> (${n.rolTributario || "-"})<br>
              ${n.giro || ""} - ${n.region || ""}, ${n.comuna || ""}, ${
                    n.sector || ""
                  }
            </li>`
                )
                .join("")}</ul>`
            : "<em>—</em>";

        return `
        <tr>
          <td>${u.correo ?? ""}</td>
          <td>${u.nombre ?? ""}</td>
          <td>${u.apellido ?? ""}</td>
          <td>${u.genero ?? ""}</td>
          <td>${u.region ?? ""}</td>
          <td>${u.comuna ?? ""}</td>
          <td>${u.sector ?? ""}</td>
          <td>${u.tieneNegocio ? "Sí" : "No"}</td>
          <td>${negociosHTML}</td>
        </tr>
      `;
      })
      .join("");

    const htmlPath = path.join(__dirname, "../views/usuarios.html");
    let html = fs.readFileSync(htmlPath, "utf8");
    html = html.replace(
      "{{ROWS}}",
      rows || "<tr><td colspan='9'>(sin usuarios)</td></tr>"
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
  } catch (err) {
    res.status(500).send("Error al listar usuarios: " + err.message);
  }
}

async function mostrarFormularioRegistro(req, res) {
  try {
    const htmlPath = path.join(__dirname, "../views/registrar.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
  } catch (err) {
    res.status(500).send("Error al cargar formulario: " + err.message);
  }
}

async function registrarUsuario(req, res) {
  try {
    const {
      nombre,
      apellido,
      rut,
      fechaNacimiento,
      genero,
      region,
      comuna,
      sector,
      correo,
      contraseña,
      tieneNegocio,
    } = req.body;

    const db = getDB();
    const users = db.collection("users");

    if (!correo || !contraseña) {
      return res.status(400).send("Correo y contraseña requeridos");
    }

    const existe = await users.findOne({ correo });
    if (existe) return res.status(400).send("El correo ya está registrado");

    const hash = await bcrypt.hash(contraseña, 10);

    let edad = null;
    if (fechaNacimiento) {
      const nacimiento = new Date(fechaNacimiento);
      const hoy = new Date();
      edad = hoy.getFullYear() - nacimiento.getFullYear();
      const m = hoy.getMonth() - nacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    }

    const negocios = [];
    Object.keys(req.body).forEach((key) => {
      const match = key.match(/^nombreNegocio_(\d+)/);
      if (match) {
        const idx = match[1];
        negocios.push({
          nombre: req.body[`nombreNegocio_${idx}`] || null,
          rolTributario: req.body[`rolTributario_${idx}`] || null,
          giro: req.body[`giro_${idx}`] || null,
          telefono: req.body[`telefonoNegocio_${idx}`] || null,
          correo: req.body[`correoNegocio_${idx}`] || null,
          web: req.body[`webNegocio_${idx}`] || null,
          region: req.body[`regionNegocio_${idx}`] || null,
          comuna: req.body[`comunaNegocio_${idx}`] || null,
          sector: req.body[`sectorNegocio_${idx}`] || null,
        });
      }
    });

    await users.insertOne({
      nombre,
      apellido,
      rut,
      fechaNacimiento,
      edad,
      genero,
      region,
      comuna,
      sector,
      correo,
      contraseña: hash,
      role: "usuario",
      tieneNegocio: tieneNegocio === "on" || tieneNegocio === "true",
      negocios: negocios.length > 0 ? negocios : [],
      creadoEn: new Date(),
    });

    res.redirect("/catalogo");
  } catch (err) {
    res.status(500).send("Error al registrar usuario: " + err.message);
  }
}

// ------------------------------------------------------------------
// Autenticación
// ------------------------------------------------------------------

async function mostrarLogin(req, res) {
  const htmlPath = path.join(__dirname, "../views/login.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
}

async function iniciarSesion(req, res) {
  try {
    const { correo, contraseña } = req.body;

    if (!correo || !contraseña) {
      return res.status(400).send("Faltan datos de inicio de sesión");
    }

    const db = getDB();
    const user = await db.collection("users").findOne({ correo });

    if (!user) return res.status(404).send("Usuario no encontrado");

    const coincide = await bcrypt.compare(contraseña, user.contraseña);
    if (!coincide) return res.status(401).send("Contraseña incorrecta");

    // Asigna el rol correctamente
    const role = user.role || (user.correo === "admin@sistema.com" ? "admin" : "usuario");

    //  Guarda todos los datos en la sesión (no solo el correo)
    req.session.user = {
      id: user._id.toString(),
      correo: user.correo,
      nombre: user.nombre,
      apellido: user.apellido,
      rut: user.rut,
      fechaNacimiento: user.fechaNacimiento,
      genero: user.genero,
      region: user.region,
      comuna: user.comuna,
      sector: user.sector,
      negocios: user.negocios || [],
      role,
    };

    req.session.save((err) => {
      if (err) {
        console.error("Error al guardar la sesión:", err);
        return res.status(500).send("Error interno al guardar la sesión");
      }

      console.log(" Sesión guardada correctamente:", req.session.user);

      // Redirige según el rol
      if (role === "admin") {
        res.redirect("/principal");
      } else {
        res.redirect("/catalogo");
      }
    });
  } catch (err) {
    console.error("Error al iniciar sesión:", err);
    res.status(500).send("Error al iniciar sesión: " + err.message);
  }
}

async function mostrarOlvidePassword(req, res) {
  const htmlPath = path.join(__dirname, "../views/forgot.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
}

async function enviarResetPassword(req, res) {
  const { correo } = req.body;
  const db = getDB();
  const user = await db.collection("users").findOne({ correo });

  if (!user) return res.status(404).send("Correo no registrado");

  res.send(`
    <h2>Restablecimiento enviado</h2>
    <p>Se ha enviado un enlace de recuperación a <strong>${correo}</strong>.</p>
    <a href="/login">Volver al login</a>
  `);
}

async function mostrarPrincipal(req, res) {
  try {
    const htmlPath = path.join(__dirname, "../views/principal.html");
    const html = fs.readFileSync(htmlPath, "utf8");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
  } catch (err) {
    res.status(500).send("Error al cargar la página principal: " + err.message);
  }
}

// ------------------------------------------------------------------
// API (Usuarios y Negocios)
// ------------------------------------------------------------------

async function obtenerUsuarios(req, res) {
  try {
    const db = getDB();
    const users = await db.collection("users").find().toArray();

    // 🔹 Asegurar que siempre haya el campo negocios aunque esté vacío
    const usuariosFormateados = users.map((u) => {
      // Si el usuario tiene negocios anidados
      let negocios = [];
      if (Array.isArray(u.negocios) && u.negocios.length > 0) {
        negocios = u.negocios.map((n) => ({
          nombre: n.nombre || "",
          giro: n.giro || "",
          comuna: n.comuna || "",
          region: n.region || "",
          sector: n.sector || "",
          rolTributario: n.rolTributario || "",
          telefono: n.telefono || "",
          correo: n.correo || "",
        }));
      }
      // Si tieneNegocio = true pero el campo no existe
      else if (u.tieneNegocio && !u.negocios) {
        negocios = [{ nombre: "(Negocio no registrado)", giro: "", comuna: "", region: "" }];
      }

      return {
        _id: u._id,
        nombre: u.nombre || "",
        apellido: u.apellido || "",
        correo: u.correo || "",
        email: u.correo || "", // alias para compatibilidad frontend
        genero: u.genero || "",
        region: u.region || "",
        comuna: u.comuna || "",
        tieneNegocio: u.tieneNegocio || false,
        negocios, // 🔹 campo asegurado
      };
    });

    res.json(usuariosFormateados);
  } catch (err) {
    console.error("Error al obtener usuarios:", err);
    res.status(500).json({ error: "Error al obtener usuarios: " + err.message });
  }
}


async function obtenerNegocios(req, res) {
  try {
    const db = getDB();
    const users = await db.collection("users").find().toArray();
    const negocios = users.flatMap((u) => u.negocios || []);
    res.json(negocios);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener negocios: " + err.message });
  }
}

async function obtenerUsuarioPorId(req, res) {
  try {
    const db = getDB();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuario: " + err.message });
  }
}

async function actualizarUsuario(req, res) {
  try {
    const db = getDB();
    await db
      .collection("users")
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json({ mensaje: "Usuario actualizado correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar usuario: " + err.message });
  }
}

async function obtenerNegocioPorNombre(req, res) {
  try {
    const db = getDB();
    const users = await db.collection("users").find().toArray();
    const negocio = users
      .flatMap((u) => u.negocios?.map((n) => ({ ...n, duenio: u.correo })) || [])
      .find((n) => n.nombre === req.params.nombre);

    if (!negocio) {
      return res.status(404).json({ error: "Negocio no encontrado" });
    }

    res.json(negocio);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener negocio: " + err.message });
  }
}

async function actualizarNegocio(req, res) {
  try {
    const db = getDB();
    const { nombre } = req.params;
    const { giro, comuna, sector } = req.body;

    const resultado = await db.collection("users").updateOne(
      { "negocios.nombre": nombre },
      {
        $set: {
          "negocios.$.giro": giro,
          "negocios.$.comuna": comuna,
          "negocios.$.sector": sector,
        },
      }
    );

    if (resultado.matchedCount === 0)
      return res.status(404).json({ error: "Negocio no encontrado" });

    res.json({ mensaje: "Negocio actualizado correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar negocio: " + err.message });
  }
}

async function eliminarUsuario(req, res) {
  try {
    const db = getDB();
    await db
      .collection("users")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ mensaje: "Usuario eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar usuario: " + err.message });
  }
}

async function eliminarNegocio(req, res) {
  try {
    const db = getDB();
    await db.collection("users").updateOne(
      { "negocios.nombre": req.params.nombre },
      { $pull: { negocios: { nombre: req.params.nombre } } }
    );
    res.json({ mensaje: "Negocio eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar negocio: " + err.message });
  }
}

async function obtenerNegociosConDuenio(req, res) {
  try {
    const db = getDB();
    const users = await db.collection("users").find().toArray();

    // 🔹 Construir lista de negocios con información del dueño
    const negocios = users.flatMap((u) => {
      if (!Array.isArray(u.negocios) || u.negocios.length === 0) return [];
      return u.negocios.map((n) => ({
        nombre: n.nombre || "(sin nombre)",
        giro: n.giro || "—",
        comuna: n.comuna || "—",
        sector: n.sector || "—",
        duenioNombre: `${u.nombre || ""} ${u.apellido || ""}`.trim() || "—",
        duenioCorreo: u.correo || u.email || "—",
        duenioId: u._id.toString(),
      }));
    });

    if (negocios.length === 0) {
      return res.json([]); // no rompe el front
    }

    res.json(negocios);
  } catch (err) {
    console.error("❌ Error al obtener negocios con dueños:", err);
    res.status(500).json({
      error: "Error al obtener negocios con dueños: " + err.message,
    });
  }
}


// ------------------------------------------------------------------
// Exportar
// ------------------------------------------------------------------
export {
  listUsers,
  registrarUsuario,
  mostrarFormularioRegistro,
  mostrarLogin,
  iniciarSesion,
  mostrarOlvidePassword,
  enviarResetPassword,
  mostrarPrincipal,
  obtenerUsuarios,
  obtenerNegocios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  obtenerNegocioPorNombre,
  actualizarNegocio,
  eliminarUsuario,
  eliminarNegocio,
  obtenerNegociosConDuenio,
};
