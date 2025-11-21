// =============================================================
//  Middleware de Autenticación — Solo para Administradores
// =============================================================
export function verificarAdmin(req, res, next) {
  // Si no hay sesión activa → redirigir al login
  if (!req.session || !req.session.user) {
    console.warn(" Intento de acceso sin sesión activa.");
    return res.redirect("/login");
  }

  // Si el usuario no tiene rol admin → acceso denegado
  const { role, correo } = req.session.user;
  if (role !== "admin") {
    console.warn(` Acceso denegado a usuario no admin: ${correo}`);
    return res.status(403).send(`
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Acceso Denegado</title>
          <style>
            body {
              font-family: 'Poppins', sans-serif;
              background-color: #f8fafc;
              color: #1e293b;
              text-align: center;
              padding-top: 80px;
            }
            h2 { color: #dc2626; }
            a {
              display: inline-block;
              margin-top: 12px;
              color: #0ea5e9;
              text-decoration: none;
              font-weight: 500;
            }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h2>⚠️ Acceso Denegado</h2>
          <p>Solo los administradores pueden acceder a esta sección.</p>
          <a href="/catalogo">← Volver al Catálogo</a>
        </body>
      </html>
    `);
  }

  //  Autorizado
  next();
}
