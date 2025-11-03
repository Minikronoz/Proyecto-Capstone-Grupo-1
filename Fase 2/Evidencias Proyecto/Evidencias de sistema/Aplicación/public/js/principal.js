// =============================
// 🧩 CARGAR USUARIOS
// =============================
async function cargarUsuarios() {
  const tbody = document.getElementById("usuariosBody");
  if (!tbody) return;
  tbody.innerHTML = "<tr><td colspan='7'>Cargando usuarios...</td></tr>";

  try {
    // Usa la API directa de usuarios (tu controlador ya la expone)
    const resp = await fetch("/api/usuarios");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const usuarios = await resp.json();

    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      tbody.innerHTML = "<tr><td colspan='7'>No hay usuarios registrados.</td></tr>";
      return;
    }

    const filas = usuarios.map((u) => {
      // Detectar negocios del usuario (array "negocios", objeto "negocio" o string)
      let negociosTexto = "—";
      if (Array.isArray(u.negocios) && u.negocios.length > 0) {
        negociosTexto = u.negocios
          .map(n => (n && (n.nombre || n.giro)) ? (n.nombre || n.giro) : "(sin nombre)")
          .join(", ");
      } else if (u.negocio) {
        if (typeof u.negocio === "object") {
          negociosTexto = u.negocio.nombre || u.negocio.giro || "(sin nombre)";
        } else if (typeof u.negocio === "string") {
          negociosTexto = u.negocio;
        }
      }

      const nombre = [u.nombre, u.apellido].filter(Boolean).join(" ");
      const correo = u.email || u.correo || "—";

      return `
        <tr>
          <td>${nombre || "—"}</td>
          <td>${correo}</td>
          <td>${u.genero || "—"}</td>
          <td>${u.region || "—"}</td>
          <td>${u.comuna || "—"}</td>
          <td>${negociosTexto}</td>
          <td>
            <button class="btn-editar" onclick="abrirModalUsuario('${u._id}')">✏️</button>
            <button class="btn-eliminar" onclick="eliminarUsuario('${u._id}')">🗑️</button>
          </td>
        </tr>`;
    }).join("");

    // 🔹 Solo filas: NO metas <tbody> dentro del <tbody id="usuariosBody">
    tbody.innerHTML = filas;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan='7' style='color:red;'>Error cargando usuarios: ${err.message}</td></tr>`;
  }
}

// =============================
// 🧩 ABRIR / GUARDAR USUARIO
// =============================
async function abrirModalUsuario(id) {
  try {
    const res = await fetch(`/api/usuarios/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const user = await res.json();

    const modal = document.getElementById("modal-editar");
    if (!modal) { alert("Modal de edición no existe en el HTML."); return; }

    modal.style.display = "flex";
    document.getElementById("edit-id").value = id;
    document.getElementById("edit-nombre").value = user.nombre || "";
    document.getElementById("edit-apellido").value = user.apellido || "";
    document.getElementById("edit-comuna").value = user.comuna || "";
  } catch (err) {
    alert("❌ Error al abrir modal: " + err.message);
  }
}

async function guardarCambiosUsuario() {
  const id = document.getElementById("edit-id")?.value;
  const nombre = document.getElementById("edit-nombre")?.value;
  const apellido = document.getElementById("edit-apellido")?.value;
  const comuna = document.getElementById("edit-comuna")?.value;

  if (!id) return alert("Falta ID de usuario.");

  try {
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, apellido, comuna }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    alert("✅ Usuario actualizado correctamente");
    cerrarModal();
    cargarUsuarios();
  } catch (err) {
    alert("❌ " + err.message);
  }
}

async function eliminarUsuario(id) {
  if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;
  try {
    const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    alert("🗑️ Usuario eliminado correctamente");
    cargarUsuarios();
  } catch (err) {
    alert("❌ Error al eliminar: " + err.message);
  }
}

// =============================
// 🧩 CARGAR NEGOCIOS CON DUEÑO
// =============================
async function cargarNegocios() {
  const contenedor = document.getElementById("tablaNegocios");
  if (!contenedor) return;

  contenedor.innerHTML = "<p>Cargando negocios...</p>";

  try {
    const res = await fetch("/api/negocios-con-duenio");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const negocios = await res.json();

    if (!Array.isArray(negocios) || negocios.length === 0) {
      contenedor.innerHTML = "<p>(No hay negocios registrados)</p>";
      return;
    }

    // Armamos tabla COMPLETA dentro del contenedor (aquí sí corresponde)
    const filas = negocios.map((n) => `
      <tr>
        <td>${n.nombre || "-"}</td>
        <td>${n.giro || "-"}</td>
        <td>${n.comuna || "-"}</td>
        <td>${n.sector || "-"}</td>
        <td>${n.duenioNombre || "-"}</td>
        <td>${n.duenioCorreo || "-"}</td>
        <td>
          <button class="btn-editar" onclick="abrirModalNegocio('${encodeURIComponent(n.nombre || "")}')">✏️</button>
          <button class="btn-eliminar" onclick="eliminarNegocio('${encodeURIComponent(n.nombre || "")}')">🗑️</button>
          ${n.duenioId ? `<button class="btn-eliminar" onclick="eliminarUsuario('${n.duenioId}')">🧍‍♂️</button>` : ""}
        </td>
      </tr>
    `).join("");

    contenedor.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Giro</th>
            <th>Comuna</th>
            <th>Sector</th>
            <th>Dueño</th>
            <th>Correo Dueño</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>`;
  } catch (error) {
    contenedor.innerHTML = `<p style="color:red;">Error al cargar negocios: ${error.message}</p>`;
  }
}

// =============================
// 🧩 ABRIR / GUARDAR / ELIMINAR NEGOCIO
// =============================
async function abrirModalNegocio(nombreCodificado) {
  const nombre = decodeURIComponent(nombreCodificado || "");
  try {
    const res = await fetch(`/api/negocios/nombre/${encodeURIComponent(nombre)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const n = await res.json();

    const modal = document.getElementById("modal-editar-negocio");
    if (!modal) { alert("Modal de negocio no existe en el HTML."); return; }

    document.getElementById("edit-nombre-negocio").value = n.nombre || "";
    document.getElementById("edit-giro").value = n.giro || "";
    document.getElementById("edit-comuna-negocio").value = n.comuna || "";
    document.getElementById("edit-sector").value = n.sector || "";
    modal.style.display = "flex";
  } catch (err) {
    alert("❌ Error al cargar negocio: " + err.message);
  }
}

async function guardarCambiosNegocio() {
  const nombre = document.getElementById("edit-nombre-negocio")?.value || "";
  const giro = document.getElementById("edit-giro")?.value || "";
  const comuna = document.getElementById("edit-comuna-negocio")?.value || "";
  const sector = document.getElementById("edit-sector")?.value || "";

  if (!nombre) return alert("Falta el nombre del negocio.");

  try {
    const res = await fetch(`/api/negocios/nombre/${encodeURIComponent(nombre)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ giro, comuna, sector }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

    alert("✅ Negocio actualizado correctamente");
    cerrarModalNegocio();
    cargarNegocios();
  } catch (err) {
    alert("❌ " + err.message);
  }
}

async function eliminarNegocio(nombreCodificado) {
  const nombre = decodeURIComponent(nombreCodificado || "");
  if (!nombre) return;

  if (!confirm(`¿Seguro que deseas eliminar el negocio "${nombre}"?`)) return;

  try {
    const res = await fetch(`/api/negocios/nombre/${encodeURIComponent(nombre)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    alert("🗑️ Negocio eliminado correctamente");
    cargarNegocios();
  } catch (err) {
    alert("❌ Error al eliminar: " + err.message);
  }
}

// =============================
// 🧩 MODALES Y SECCIONES
// =============================
function cerrarModal() {
  const m = document.getElementById("modal-editar");
  if (m) m.style.display = "none";
}
function cerrarModalNegocio() {
  const m = document.getElementById("modal-editar-negocio");
  if (m) m.style.display = "none";
}

function mostrarSeccion(id) {
  document.querySelectorAll(".seccion").forEach((s) => s.classList.remove("activa"));
  const target = document.getElementById(id);
  if (target) target.classList.add("activa");
  if (id === "usuarios") cargarUsuarios();
  if (id === "negocios") cargarNegocios();
}

// =============================
// 🚀 Inicialización
// =============================
document.addEventListener("DOMContentLoaded", () => {
  // Si tienes botones de navegación, puedes engancharlos aquí también
  cargarUsuarios();
  cargarNegocios();
});
