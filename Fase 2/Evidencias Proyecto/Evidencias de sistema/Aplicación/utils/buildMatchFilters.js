// ======================================================
// 🧩 utils/buildMatchFilters.js
// Genera dinámicamente el objeto $match para los pipelines
// de estadísticas y dashboards (clicks, búsquedas, etc.)
// ======================================================
export function buildMatchFilters(query = {}) {
  const {
    supermercado,
    genero,
    region,
    usuario,
    desde,
    hasta,
    periodo,
  } = query;

  const match = {};

  // ======================================================
  // 🏬 Filtros de atributos simples
  // ======================================================
  if (supermercado && supermercado !== "todos")
    match.supermercado = supermercado;

  if (genero && genero !== "todos")
    match.userGenero = genero;

  if (region && region !== "todas")
    match.userRegion = region;

  // ======================================================
  // 👥 Filtro tipo de usuario
  // ======================================================
  if (usuario === "registrado") {
    match.userCorreo = { $ne: "invitado@anonimo.cl" };
  } else if (usuario === "invitado") {
    match.userCorreo = "invitado@anonimo.cl";
  }

  // ======================================================
  // 📅 Filtros por rango de fechas o periodo
  // ======================================================
  let fechaInicio = null;
  let fechaFin = null;

  // 1️⃣ Rango personalizado (desde / hasta)
  if (desde || hasta) {
    fechaInicio = desde ? new Date(desde) : null;
    fechaFin = hasta ? new Date(hasta) : new Date();
  }

  // 2️⃣ Periodo automático (últimos X días)
  else if (periodo) {
    const dias = parseInt(periodo, 10);
    if (!isNaN(dias) && dias > 0) {
      const hoy = new Date();
      fechaInicio = new Date();
      fechaInicio.setDate(hoy.getDate() - dias);
      fechaFin = hoy;
    }
  }

  // Aplicar filtro si existen fechas válidas
  if (fechaInicio || fechaFin) {
    match.$or = [
      {
        createdAt: {
          ...(fechaInicio ? { $gte: fechaInicio } : {}),
          ...(fechaFin ? { $lte: fechaFin } : {}),
        },
      },
      {
        fecha: {
          ...(fechaInicio ? { $gte: fechaInicio } : {}),
          ...(fechaFin ? { $lte: fechaFin } : {}),
        },
      },
    ];
  }

  // ======================================================
  // 🧠 Resultado final
  // ======================================================
  return match;
}
