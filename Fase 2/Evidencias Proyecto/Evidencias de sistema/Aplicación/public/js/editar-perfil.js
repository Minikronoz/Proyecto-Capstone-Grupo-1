// public/js/editar-perfil.js

function getUserId() {
  const p = new URLSearchParams(location.search).get("id");
  if (p) return p;
  return localStorage.getItem("userId"); // úsalo si lo guardas al iniciar sesión
}

const $ = (id) => document.getElementById(id);
const userId = getUserId();
const msg = $("mensaje");

if (!userId) {
  msg.textContent = "No se encontró el usuario actual. Inicia sesión nuevamente.";
  msg.className = "msg err";
}

async function cargarUsuario() {
  try {
    const res = await fetch(`/api/usuarios/${userId}`, {
      credentials: "include"
    });
    if (!res.ok) throw new Error("No se pudo cargar el usuario");
    const u = await res.json();

    $("email").value = u.email || "";
    $("nombre").value = u.nombre || "";
    $("apellido").value = u.apellido || "";
    $("region").value = u.region || "";
    $("comuna").value = u.comuna || "";
    $("telefono").value = u.telefono || "";
  } catch (e) {
    msg.textContent = "Error cargando datos del usuario.";
    msg.className = "msg err";
  }
}

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

  try {
    const res = await fetch(`/api/usuarios/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include"
    });

    if (!res.ok) throw new Error("Fallo actualización");

    msg.textContent = "Datos actualizados correctamente.";
    msg.className = "msg ok";

    // Redirigir al catálogo después de 1 segundo
    setTimeout(() => {
      window.location.href = "/catalogo";
    }, 1000);

  } catch (e) {
    msg.textContent = "No se pudo actualizar. Inténtalo más tarde.";
    msg.className = "msg err";
  }
});

$("btnCancelar").addEventListener("click", () => {
  history.length > 1 ? history.back() : (location.href = "/principal");
});

// inicio
if (userId) cargarUsuario();
