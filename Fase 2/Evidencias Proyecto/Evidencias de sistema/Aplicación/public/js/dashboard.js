// =============================================================
// 📌 CONFIG GLOBAL
// =============================================================
const API = "/api";
const socket = io();

// =============================================================
// 🔌 Estado backend
// =============================================================
socket.on("connect", () => {
  const estado = document.getElementById("estado-backend");
  estado.textContent = "API Online";
  estado.classList.remove("badge--error");
  estado.classList.add("badge--ok");
});

socket.on("disconnect", () => {
  const estado = document.getElementById("estado-backend");
  estado.textContent = "Sin conexión";
  estado.classList.remove("badge--ok");
  estado.classList.add("badge--error");
});

// =============================================================
// 📝 LOGS SCRAPING
// =============================================================
function appendLog(store, message, type = "info") {
  const log = document.querySelector(`#log-${store} .log-output`);
  if (!log) return;

  if (log.textContent.includes("Esperando ejecución")) {
    log.innerHTML = "";
  }

  const line = document.createElement("div");
  line.classList.add("log-line");

  if (type === "error") line.classList.add("log-error");
  if (type === "success") line.classList.add("log-success");
  if (type === "warning") line.classList.add("log-warning");

  line.textContent = message;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function limpiarLog(store) {
  const log = document.querySelector(`#log-${store} .log-output`);
  if (log) log.innerHTML = "Esperando ejecución...";
}

// Eventos Socket.io
socket.on("scrape-progress", (d) => appendLog(d.store, d.message));
socket.on("scrape-error", (d) => appendLog(d.store, d.message, "error"));

socket.on("scrape-complete", (d) => {
  appendLog(
    d.store,
    d.success ? "Scraping completado" : "Scraping falló",
    d.success ? "success" : "error"
  );

  // ❗ Solo actualizamos datos, NO redibujamos los gráficos aquí
  cargarDatosDashboard();
});

// =============================================================
// 🚀 Ejecutar Scraping
// =============================================================
async function ejecutarScraping(store) {
  limpiarLog(store);
  appendLog(store, `Iniciando scraping de ${store}...`);

  try {
    const resp = await fetch(`${API}/scrape/${store}`, { method: "POST" });
    if (!resp.ok) throw new Error("No se pudo iniciar scraping");
  } catch (err) {
    appendLog(store, err.message, "error");
  }
}

// =============================================================
// 📊 DASHBOARD PRINCIPAL — KPIS + GRÁFICOS
// =============================================================
async function cargarDatosDashboard() {
  try {
    const res = await fetch(`${API}/dashboard`);
    const data = await res.json();

    // KPIs
    document.getElementById("kpi-productos").textContent =
      data.kpis?.productos_total ?? "—";
    document.getElementById("kpi-usuarios").textContent =
      data.kpis?.total_usuarios ?? "—";
    document.getElementById("kpi-negocios").textContent =
      data.kpis?.total_negocios ?? "—";

    // Último scraping
    const cont = document.getElementById("kpi-ultimo-scraping");
    cont.innerHTML = Object.entries(data.scraping || {})
      .map(
        ([store, s]) => `
        <div class="item-card">
          <h4>${store.toUpperCase()}</h4>
          <div class="datos">
            <span>${s.fechaLocal || s.fecha}</span>
            <span>${s.nuevos} nuevos</span>
            <span>${s.actualizados} actualizados</span>
          </div>
        </div>
      `
      )
      .join("");

    // Dibujar gráficos (solo aquí)
    renderGraficosDashboard(data.charts || {});
  } catch (err) {
    console.error("Error dashboard:", err);
  }
}

// =============================================================
// 📊 Gráficos
// =============================================================
function renderGraficosDashboard(charts) {
  // Destruir gráficos previos
  if (window.graficoRegiones) window.graficoRegiones.destroy();
  if (window.graficoGenero) window.graficoGenero.destroy();

  const reg = charts.region || {};
  const gen = charts.genero || {};

  // REGIONES
  const ctxR = document.getElementById("chartRegiones");
  if (ctxR && Object.keys(reg).length) {
    window.graficoRegiones = new Chart(ctxR, {
      type: "bar",
      data: {
        labels: Object.keys(reg),
        datasets: [
          {
            data: Object.values(reg),
            backgroundColor: "#00A7B5AA",
          },
        ],
      },
      options: {
        responsive: true,
        animation: false, // ❗ evita rebote visual
        maintainAspectRatio: false,
      },
    });
  }

  // GENERO
  const ctxG = document.getElementById("chartGenero");
  if (ctxG && Object.keys(gen).length) {
    window.graficoGenero = new Chart(ctxG, {
      type: "doughnut",
      data: {
        labels: Object.keys(gen),
        datasets: [
          {
            data: Object.values(gen),
            backgroundColor: ["#00A7B5", "#71C562", "#004D61"],
          },
        ],
      },
      options: {
        responsive: true,
        cutout: "45%",
        animation: false, // ❗ evita rebote visual
        maintainAspectRatio: false,
      },
    });
  }
}

// =============================================================
// 🗓 ACTIVIDAD SEMANAL
// =============================================================
async function cargarActividadSemanal() {
  const cont = document.getElementById("tablaScrapingSemanal");
  cont.innerHTML = "Cargando...";

  try {
    console.log("➡️ Ejecutando cargarActividadSemanal()");

    const res = await fetch("/api/scrape/actividad-semanal");

    console.log("📡 Status:", res.status);

    const json = await res.json();

    console.log("📦 Datos recibidos:", json);

    if (!json.actividad) {
      console.error("❌ No existe json.actividad");
      cont.innerHTML = "Error cargando actividad";
      return;
    }

    const actividad = json.actividad;
    const stores = ["unimarc", "tottus", "jumbo", "acuenta"];
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));

    console.log("📅 Inicio de semana:", inicio);

    const dias = [...Array(7)].map((_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    console.log("🗓️ Días generados:", dias);

    let html = `
      <table>
        <thead>
          <tr><th>Store</th>${dias.map(d => `<th>${d}</th>`).join("")}</tr>
        </thead>
        <tbody>
    `;

    stores.forEach(store => {
      html += `<tr><td>${store}</td>`;
      dias.forEach(d => {
        const st = actividad?.[store]?.[d] || "fail";
        const icon = st === "success" ? "✔️" : st === "warning" ? "⚠️" : "❌";
        html += `<td>${icon}</td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody></table>`;

    console.log("🧱 Tabla generada OK");

    cont.innerHTML = html;

  } catch (err) {
    console.error("❌ Error en cargarActividadSemanal:", err);
    cont.innerHTML = "Error cargando actividad";
  }
}


// =============================================================
// 👤 USUARIOS
// =============================================================
async function cargarUsuarios() {
  const tbody = document.getElementById("usuariosBody");
  tbody.innerHTML = "<tr><td colspan='7'>Cargando usuarios...</td></tr>";

  try {
    const res = await fetch("/api/usuarios");
    const usuarios = await res.json();

    renderUsuarios(usuarios);

  } catch (err) {
    console.error("Error:", err);
    tbody.innerHTML = "<tr><td colspan='7'>Error al cargar usuarios</td></tr>";
  }
}





function renderUsuarios(lista) {
  const tbody = document.getElementById("usuariosBody");
  tbody.innerHTML = "";

  lista.forEach((u) => {
    tbody.innerHTML += `
      <tr>
        <td>${u.nombre} ${u.apellido || ""}</td>
        <td>${u.correo}</td>
        <td>${u.genero || "-"}</td>
        <td>${u.region || "-"}</td>
        <td>${u.comuna || "-"}</td>
        <td>${Array.isArray(u.negocios) ? u.negocios.length : 0}</td>
        <td>
          <button onclick="editarUsuario('${u._id}')">✏️</button>
          <button onclick="eliminarUsuarioDef('${u._id}')">🗑️</button>
        </td>
      </tr>
    `;
  });
}





async function editarUsuario(id) {
  console.log("🔥 FUNCION EDITAR USUARIO LLAMADA | ID =", id);


  try {
    const res = await fetch(`/api/usuarios/${id}`);

    if (!res.ok) {
      console.error("❌ Error HTTP al obtener usuario:", res.status);
      alert("No se pudo cargar el usuario");
      return;
    }

    const u = await res.json();
    console.log("📦 Usuario cargado:", u);

    document.getElementById("editId").value = u._id;
    document.getElementById("editNombre").value = u.nombre || "";
    document.getElementById("editApellido").value = u.apellido || "";
    document.getElementById("editRut").value = u.rut || "";
    document.getElementById("editFechaNacimiento").value =
      u.fechaNacimiento ? u.fechaNacimiento.split("T")[0] : "";
    document.getElementById("editEdad").value = u.edad || "";
    document.getElementById("editGenero").value = u.genero || "";
    document.getElementById("editRegion").value = u.region || "";
    document.getElementById("editComuna").value = u.comuna || "";
    document.getElementById("editSector").value = u.sector || "";
    document.getElementById("editCorreo").value = u.correo || "";
    document.getElementById("editRole").value = u.role || "usuario";
    document.getElementById("editTieneNegocio").value =
      u.tieneNegocio ? "true" : "false";

    document.getElementById("modalEditarUsuario").classList.remove("oculto");
  } catch (err) {
    console.error("❌ Error en editarUsuario:", err);
    alert("Error cargando usuario");
  }
}



function cerrarModal() {
  document.getElementById("modalEditarUsuario").classList.add("oculto");
}

// =============================================================
// 🏪 NEGOCIOS
// =============================================================
async function cargarNegocios() {
  const tbody = document.getElementById("negociosBody");
  tbody.innerHTML = "<tr><td colspan='7'>Cargando...</td></tr>";

  try {
    const res = await fetch(`${API}/usuarios/negocios`); // ← Cambiado de /negocios-con-duenio
    const negocios = await res.json();

    if (!negocios.length) {
      tbody.innerHTML =
        "<tr><td colspan='7'>No hay negocios registrados.</td></tr>";
      return;
    }

    tbody.innerHTML = negocios
      .map(
        (n) => `
        <tr>
          <td>${n.nombre}</td>
          <td>${n.giro}</td>
          <td>${n.comuna || "—"}</td>
          <td>${n.sector || "—"}</td>
          <td>${n.duenioNombre}</td>
          <td>${n.duenioCorreo}</td>
          <td>
            <button onclick="editarNegocio('${n._id}', '${n.duenioId}')">✏️</button>
            <button onclick="eliminarNegocio('${n._id}', '${n.duenioId}')">🗑️</button>
          </td>
        </tr>
      `
      )
      .join("");
  } catch (err) {
    tbody.innerHTML =
      "<tr><td colspan='7'>Error cargando negocios</td></tr>";
  }
}


async function guardarUsuario(e) {
  e.preventDefault();

  const id = document.getElementById("editId").value;

  const data = {
    nombre: document.getElementById("editNombre").value,
    apellido: document.getElementById("editApellido").value,
    rut: document.getElementById("editRut").value,
    fechaNacimiento: document.getElementById("editFechaNacimiento").value,
    edad: Number(document.getElementById("editEdad").value),
    genero: document.getElementById("editGenero").value,
    region: document.getElementById("editRegion").value,
    comuna: document.getElementById("editComuna").value,
    sector: document.getElementById("editSector").value,
    correo: document.getElementById("editCorreo").value,
    role: document.getElementById("editRole").value,
    tieneNegocio: document.getElementById("editTieneNegocio").value === "true",
  };

  const res = await fetch(`/api/usuarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const resp = await res.json();

  if (!resp.ok) {
    alert("Error al actualizar usuario");
    return;
  }

  cerrarModal();
  cargarUsuarios();
}



async function eliminarUsuarioDef(id) {
  if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;

  const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
  const data = await res.json();

  if (data.ok) {
    cargarUsuarios();
  } else {
    alert("No se pudo eliminar el usuario");
  }
}



async function editarNegocio(negocioId, duenioId) {
  console.log("✏️ Editando negocio:", { negocioId, duenioId });

  try {
    const res = await fetch(`${API}/usuarios/negocios`);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const negocios = await res.json();
    console.log("📦 Negocios recibidos:", negocios);

    // Buscar el negocio por rolTributario (que ahora es el _id)
    const negocio = negocios.find((n) => n._id === negocioId);
    
    console.log("🔍 Negocio encontrado:", negocio);

    if (!negocio) {
      alert("No se encontró el negocio.");
      return;
    }

    // Rellenar el formulario
    document.getElementById("negocioId").value = negocio._id; // rolTributario
    document.getElementById("negocioId").setAttribute("data-duenio-id", negocio.duenioId);
    document.getElementById("negocioNombre").value = negocio.nombre || "";
    document.getElementById("negocioGiro").value = negocio.giro || "";
    document.getElementById("negocioComuna").value = negocio.comuna || "";
    document.getElementById("negocioSector").value = negocio.sector || "";

    console.log("📝 Formulario rellenado");

    // Mostrar el modal
    const modal = document.getElementById("modalEditarNegocio");
    modal.classList.remove("oculto");
    
    console.log("✅ Modal abierto");

  } catch (err) {
    console.error("❌ Error al cargar negocio:", err);
    alert("Error al cargar negocio: " + err.message);
  }
}

async function guardarNegocio() {
  console.log("💾 Guardando negocio...");

  const negocioIdInput = document.getElementById("negocioId");
  const negocioId = negocioIdInput.value; // Este es el rolTributario
  const duenioId = negocioIdInput.getAttribute("data-duenio-id");

  console.log("📋 Datos a guardar:", { negocioId, duenioId });

  if (!negocioId || !duenioId) {
    alert("Error: Faltan datos del negocio");
    return;
  }

  const nombre = document.getElementById("negocioNombre").value.trim();
  const giro = document.getElementById("negocioGiro").value.trim();
  const comuna = document.getElementById("negocioComuna").value.trim();
  const sector = document.getElementById("negocioSector").value.trim();

  if (!nombre || !giro) {
    alert("El nombre y giro son obligatorios");
    return;
  }

  const payload = { nombre, giro, comuna, sector };
  console.log("📦 Payload:", payload);

  try {
    const res = await fetch(`${API}/usuarios/${duenioId}/negocios/${negocioId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("📡 Response status:", res.status);

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Error al actualizar");
    }

    const result = await res.json();
    console.log("✅ Resultado:", result);

    alert("✅ Negocio actualizado correctamente.");
    cerrarModalNegocio();
    cargarNegocios();

  } catch (err) {
    console.error("❌ Error guardando negocio:", err);
    alert("❌ Error: " + err.message);
  }
}

function cerrarModalNegocio() {
  console.log("❌ Cerrando modal");
  document.getElementById("modalEditarNegocio").classList.add("oculto");
}

// =============================================================
// 🗑️ ELIMINAR NEGOCIO
// =============================================================
async function eliminarNegocio(negocioId, duenioId) {
  console.log("🗑️ Intentando eliminar:", { negocioId, duenioId });

  // ✅ Validación mejorada
  if (!negocioId || !duenioId) {
    console.error("❌ Datos inválidos:", { negocioId, duenioId });
    alert("Error: ID de negocio o dueño inválido");
    return;
  }

  if (negocioId === "null" || negocioId === "undefined" || 
      duenioId === "null" || duenioId === "undefined") {
    console.error("❌ IDs son null/undefined");
    alert("Error: ID de negocio o dueño inválido");
    return;
  }

  if (!confirm("¿Estás seguro de eliminar este negocio?")) return;

  try {
    const res = await fetch(`${API}/usuarios/${duenioId}/negocios/${negocioId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Error al eliminar negocio");
    }

    alert("Negocio eliminado correctamente");
    cargarNegocios();
  } catch (err) {
    console.error("❌ Error eliminando negocio:", err);
    alert("Error al eliminar negocio: " + err.message);
  }
}

// Exponer funciones globalmente para onclick
window.eliminarNegocio = eliminarNegocio;
window.editarNegocio = editarNegocio;
window.guardarNegocio = guardarNegocio;
window.cerrarModalNegocio = cerrarModalNegocio;
window.ejecutarScraping = ejecutarScraping;
window.limpiarLog = limpiarLog;

// =============================================================
// 🚀 Navegación
// =============================================================
document.querySelectorAll(".nav__item").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");

    document.querySelectorAll(".nav__item").forEach((b) =>
      b.classList.remove("active")
    );
    btn.classList.add("active");

    document.querySelectorAll(".seccion").forEach((sec) => {
      sec.classList.remove("activa");
      if (sec.id === target) sec.classList.add("activa");
    });

    if (target === "dashboard") {
      cargarDatosDashboard();
      cargarActividadSemanal();
    }

    if (target === "usuarios") cargarUsuarios();
    if (target === "negocios") cargarNegocios();
  });
});


document.getElementById("formEditarUsuario").addEventListener("submit", guardarUsuario);
// =============================================================
// 🚀 Inicialización REAL
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formEditarUsuario");
  if (form) {
    form.addEventListener("submit", guardarUsuario);
  }

  cargarDatosDashboard();
  cargarActividadSemanal();

window.editarUsuario = editarUsuario;
window.eliminarUsuarioDef = eliminarUsuarioDef;
window.guardarUsuario = guardarUsuario;
window.cerrarModal = cerrarModal;
});

// =============================================================
// 🚀 SISTEMA DE CONSOLAS SEPARADAS
// =============================================================

const consolasActivas = new Map();

// ===== Crear consola individual para cada tienda =====
function crearConsola(store) {
  if (consolasActivas.has(store)) {
    const consola = consolasActivas.get(store);
    consola.element.classList.add('activa');
    actualizarEstadoConsola(store, 'ejecutando');
    return consola;
  }

  const contenedor = document.getElementById('contenedorConsolas');
  const consolaDiv = document.createElement('div');
  consolaDiv.className = `consola-individual consola-${store} activa`;
  consolaDiv.id = `consola-${store}`;

  const iconos = {
    unimarc: '🔴',
    tottus: '🟢',
    jumbo: '🔵',
    acuenta: '🟡'
  };

  consolaDiv.innerHTML = `
    <div class="consola-header">
      <h3>
        <span>${iconos[store] || '📦'}</span>
        <span>${store.toUpperCase()}</span>
      </h3>
      <div class="estado">
        <span class="estado-badge ejecutando" id="estado-${store}">Ejecutando...</span>
        <div class="consola-actions">
          <button class="btn-consola" onclick="limpiarConsola('${store}')" title="Limpiar">
            <i class="fa-solid fa-broom"></i>
          </button>
          <button class="btn-consola" onclick="cerrarConsola('${store}')" title="Cerrar">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="log-output-individual" id="log-${store}">
      <div class="log-line log-info">🚀 Iniciando scraping de ${store}...</div>
    </div>
  `;

  contenedor.appendChild(consolaDiv);

  const consola = {
    element: consolaDiv,
    output: document.getElementById(`log-${store}`),
    estado: document.getElementById(`estado-${store}`)
  };

  consolasActivas.set(store, consola);
  return consola;
}

// ===== Actualizar estado de la consola =====
function actualizarEstadoConsola(store, estado) {
  const consola = consolasActivas.get(store);
  if (!consola) return;

  const estadoBadge = consola.estado;
  estadoBadge.className = 'estado-badge';

  switch (estado) {
    case 'ejecutando':
      estadoBadge.classList.add('ejecutando');
      estadoBadge.textContent = 'Ejecutando...';
      break;
    case 'completado':
      estadoBadge.classList.add('completado');
      estadoBadge.textContent = 'Completado ✓';
      consola.element.classList.remove('activa');
      break;
    case 'error':
      estadoBadge.classList.add('error');
      estadoBadge.textContent = 'Error ✗';
      consola.element.classList.remove('activa');
      break;
    default:
      estadoBadge.classList.add('esperando');
      estadoBadge.textContent = 'Esperando';
  }
}

// ===== Agregar log a consola específica =====
function agregarLogAConsola(store, mensaje, tipo = 'info') {
  let consola = consolasActivas.get(store);
  if (!consola) {
    consola = crearConsola(store);
  }

  const output = consola.output;

  let className = "log-line";
  if (tipo === 'error' || mensaje.includes("❌") || mensaje.includes("ERROR")) {
    className += " log-error";
  } else if (tipo === 'success' || mensaje.includes("✅") || mensaje.includes("completado")) {
    className += " log-success";
  } else if (tipo === 'warning' || mensaje.includes("⚠️")) {
    className += " log-warning";
  } else if (mensaje.includes("█") || mensaje.includes("%")) {
    className += " progress-bar";
  } else if (mensaje.includes("🟢") || mensaje.includes("📊") || mensaje.includes("🚀")) {
    className += " log-info";
  }

  const lineDiv = document.createElement("div");
  lineDiv.className = className;
  lineDiv.textContent = mensaje;

  const lastLine = output.lastElementChild;
  if (className.includes("progress-bar") && lastLine && lastLine.className.includes("progress-bar")) {
    output.removeChild(lastLine);
  }

  output.appendChild(lineDiv);
  output.scrollTop = output.scrollHeight;

  while (output.children.length > 500) {
    output.removeChild(output.firstChild);
  }
}

// ===== Funciones de control de consolas =====
window.limpiarConsola = function(store) {
  const consola = consolasActivas.get(store);
  if (!consola) return;

  consola.output.innerHTML = "";
  const lineDiv = document.createElement("div");
  lineDiv.className = "log-line";
  lineDiv.textContent = "Esperando ejecución...";
  consola.output.appendChild(lineDiv);
  actualizarEstadoConsola(store, 'esperando');
};

window.cerrarConsola = function(store) {
  const consola = consolasActivas.get(store);
  if (!consola) return;

  if (confirm(`¿Cerrar la consola de ${store.toUpperCase()}?`)) {
    consola.element.remove();
    consolasActivas.delete(store);
  }
};

window.limpiarTodasLasConsolas = function() {
  if (confirm('¿Limpiar todas las consolas?')) {
    consolasActivas.forEach((consola, store) => {
      limpiarConsola(store);
    });
  }
};

// ===== Scraping con consola individual =====
async function ejecutarScraping(store) {
  crearConsola(store);
  
  try {
    const resp = await fetch(`${API}/scrape/${store}`, { method: "POST" });
    const data = await resp.json();
    
    if (!resp.ok) {
      throw new Error(data.message || "Error desconocido");
    }
  } catch (err) {
    agregarLogAConsola(store, `❌ Error: ${err.message}`, 'error');
    actualizarEstadoConsola(store, 'error');
  }
}

// ===== Eventos Socket.IO mejorados =====
socket.on("scrape-log", (data) => {
  const store = typeof data === "object" ? data.store : null;
  const msg = typeof data === "string" ? data : data.message || "";
  
  if (!msg.trim()) return;

  const storeMatch = msg.match(/\[(\w+)\]/);
  const detectedStore = storeMatch ? storeMatch[1].toLowerCase() : store;

  if (detectedStore && ['unimarc', 'tottus', 'jumbo', 'acuenta'].includes(detectedStore)) {
    agregarLogAConsola(detectedStore, msg);
  }
});

socket.on("scrape-error", (data) => {
  const store = data.store;
  const msg = typeof data === "string" ? data : data.message || "";
  
  if (store) {
    agregarLogAConsola(store, `❌ ERROR: ${msg}`, 'error');
    actualizarEstadoConsola(store, 'error');
  }
});

socket.on("scrape-complete", (data) => {
  const store = data.store;
  const msg = data.message || (data.success ? "✅ Completado" : "❌ Error");
  
  if (store) {
    agregarLogAConsola(store, msg, data.success ? 'success' : 'error');
    actualizarEstadoConsola(store, data.success ? 'completado' : 'error');
  }

  cargarDatosDashboard();
  cargarActividadSemanal();
});

// Exponer ejecutarScraping globalmente
window.ejecutarScraping = ejecutarScraping;
