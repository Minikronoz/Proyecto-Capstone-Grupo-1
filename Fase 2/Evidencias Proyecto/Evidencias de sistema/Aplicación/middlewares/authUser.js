export function verificarSesionUsuario(req, res, next) {
  if (!req.session || !req.session.user) {
    console.log("⚠️ Sesión perdida o inexistente");
    return res.status(401).send(`
      <script>
        alert('Debes iniciar sesión nuevamente.');
        window.location.href='/login';
      </script>
    `);
  }
  console.log("✅ Sesión activa:", req.session.user);
  next();
}
