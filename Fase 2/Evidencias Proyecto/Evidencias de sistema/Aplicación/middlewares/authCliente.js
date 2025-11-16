export default function verificarCliente(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect("/login");
  }

  const { role } = req.session.user;

  if (role === "cliente" || role === "admin") {
    return next();
  }

  return res.status(403).send(`
    <h2>🚫 Acceso restringido</h2>
    <p>No tienes permisos para visualizar este dashboard.</p>
    <a href="/catalogo">Volver al catálogo</a>
  `);
}

