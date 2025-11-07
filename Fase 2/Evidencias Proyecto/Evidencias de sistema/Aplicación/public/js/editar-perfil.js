// =============================================================
// 👤 EDITAR PERFIL DE USUARIO — Versión Limpia Atlas
// =============================================================

// ---------- Utilidades ----------
function getUserId() {
  const idParam = new URLSearchParams(location.search).get("id");
  return idParam || localStorage.getItem("userId") || null;
}

const $ = (id) => document.getElementById(id);
const userId = getUserId();
const msg = $("mensaje");

// ---------- Validación inicial ----------
if (!userId) {
  msg.textContent = "⚠️ No se encontró el usuario actual. Inicia sesión nuevamente.";
  msg.className = "msg err";
}

// ---------- Cargar datos del usuario ----------
async function cargarUsuario() {
  try {
    const res = await fetch(`/api/usuarios/${userId}`, { credentials: "include" });
    if (!res.ok) throw new Error("No se pudo cargar el usuario");

    const u = await res.json();
    $("email").value = u.email || "";
    $("nombre").value = u.nombre || "";
    $("apellido").value = u.apellido || "";
    $("region").value = u.region || "";
    $("comuna").value = u.comuna || "";
    $("telefono").value = u.telefono || "";

  } catch (e) {
    console.error("❌ Error cargando usuario:", e);
    msg.textContent = "Error al cargar los datos del usuario.";
    msg.className = "msg err";
  }
}

// ---------- Guardar cambios ----------
$("formEditar").addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "";

  const body = {
    nombre: $("nombre").value.trim(),
    apellido: $("apellido").value.trim(),
    region: $("region").value.trim(),
    comuna: $("comuna").value.trim(),
    telefono: $("telefono").value.trim(),
  };

  // Validación simple antes de enviar
  if (!body.nombre || !body.apellido) {
    msg.textContent = "Por favor, completa al menos nombre y apellido.";
    msg.className = "msg err";
    return;
  }

  try {
    const res = await fetch(`/api/usuarios/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });

    if (!res.ok) throw new Error("Error en actualización");

    msg.textContent = "✅ Datos actualizados correctamente.";
    msg.className = "msg ok";

    // Redirigir tras confirmación
    setTimeout(() => {
      window.location.href = "/catalogo";
    }, 1200);
  } catch (e) {
    console.error("❌ Error guardando usuario:", e);
    msg.textContent = "No se pudo actualizar. Inténtalo más tarde.";
    msg.className = "msg err";
  }
});

// ---------- Botón cancelar ----------
$("btnCancelar").addEventListener("click", () => {
  history.length > 1 ? history.back() : (location.href = "/principal");
});

// ---------- Inicio ----------
if (userId) cargarUsuario();
