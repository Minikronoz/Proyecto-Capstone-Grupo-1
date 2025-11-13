// =============================================================
// 🔒 Middleware de Autenticación — Sesión de Usuario Activa
// =============================================================
export function verificarSesionUsuario(req, res, next) {
  try {
    // 🧠 Validar existencia de sesión y usuario
    if (!req.session || !req.session.user) {
      console.warn("⚠️ Sesión perdida o inexistente. Redirigiendo a login...");
      return res.status(401).send(`
        <html lang="es">
          <head>
            <meta charset="UTF-8" />
            <title>Sesión expirada</title>
            <style>
              body {
                font-family: 'Poppins', sans-serif;
                background-color: #f9fafb;
                color: #1e293b;
                text-align: center;
                padding-top: 100px;
              }
              h2 { color: #dc2626; }
              a {
                color: #0ea5e9;
                text-decoration: none;
                font-weight: 500;
              }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <h2>⚠️ Sesión expirada o no iniciada</h2>
            <p>Por tu seguridad, debes iniciar sesión nuevamente.</p>
            <a href="/login">→ Iniciar sesión</a>
            <script>
              setTimeout(() => { window.location.href = '/login'; }, 2000);
            </script>
          </body>
        </html>
      `);
    }

    // ✅ Sesión válida: continuar
    console.log(`✅ Sesión activa para: ${req.session.user.correo || "Usuario desconocido"}`);
    next();
  } catch (err) {
    console.error("❌ Error al verificar sesión:", err);
    res.status(500).send("Error interno al validar sesión.");
  }
}
// En auth.routes.js o similar
router.get("/yo", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({ ok: false });
  }

  res.json({
    ok: true,
    user: req.session.user
  });
});

export default verificarSesionUsuario;