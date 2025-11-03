// middlewares/authAdmin.js
export function verificarAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect("/login");
  }

  if (req.session.user.role !== "admin") {
    return res.status(403).send(`
      <h2 style="color:red;">Acceso denegado</h2>
      <p>Solo los administradores pueden acceder a esta página.</p>
      <a href="/catalogo" style="color:blue;">← Volver al catálogo</a>
    `);
  }

  next();
}
