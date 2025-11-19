// ================================
// 🛒 Manejo de Carrito con LocalStorage
// ================================

// Obtener carrito desde LocalStorage o crear uno vacío
export function obtenerCarrito() {
  return JSON.parse(localStorage.getItem("carrito") || "[]");
}

// Guardar carrito en LocalStorage
export function guardarCarrito(carrito) {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}
window.agregarDesdeBoton = function (btn) {
  const producto = {
    id: btn.dataset.id,
    nombre: btn.dataset.nombre,
    precio: parseFloat(btn.dataset.precio),
    foto: btn.dataset.imagen,
    url: btn.dataset.url,
    supermercado: btn.dataset.supermercado,
    cantidad: 1
  };

  agregarAlCarrito(producto);
  actualizarVistaCarrito();
  alert(`🛒 "${producto.nombre}" agregado al carrito`);
};

// Agregar producto al carrito
export function agregarAlCarrito(producto) {
  const carrito = obtenerCarrito();
  
  // Buscar si ya existe el producto
  const index = carrito.findIndex(p => p.id === producto.id);

  if (index >= 0) {
    carrito[index].cantidad += 1; // si ya existe, aumentar cantidad
  } else {
    carrito.push({...producto, cantidad: 1});
  }

  guardarCarrito(carrito);
  actualizarVistaCarrito();
}

// Cambiar cantidad
export function cambiarCantidad(id, cantidad) {
  const carrito = obtenerCarrito();
  const prod = carrito.find(p => p.id === id);

  if (prod) {
    prod.cantidad = cantidad >= 1 ? cantidad : 1;
    guardarCarrito(carrito);
    actualizarVistaCarrito();
  }
}

// Eliminar producto
export function eliminarProducto(id) {
  const carrito = obtenerCarrito().filter(p => p.id !== id);
  guardarCarrito(carrito);
  actualizarVistaCarrito();
}

// Obtener total del carrito
export function totalCarrito() {
  const carrito = obtenerCarrito();
  return carrito.reduce((suma, p) => suma + (p.precio * p.cantidad), 0);
}
