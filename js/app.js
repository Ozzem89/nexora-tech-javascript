import { cargarCatalogo, leerEstado, guardarEstado, borrarDatos, obtenerItems, calcularTotales, actualizarCantidad, filtrarProductos } from "./tienda.js";

const elemento = id => document.getElementById(id);
const formatoMoneda = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const dinero = importe => formatoMoneda.format(importe);
const escaparHTML = valor => String(valor).replace(/[&<>"']/g, caracter => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter]);
const dialogo = elemento("dialogo-carrito");
let catalogo;
let estado = { carrito: {}, entrega: "envio", ultimoPedido: null };
let categoriaActiva = "todos";
let cargando = false;
let procesandoCompra = false;
let avisoStorageMostrado = false;

function notificar(titulo, icono = "success") {
  return Swal.fire({ toast: true, position: "bottom-start", icon: icono, title: titulo,
    target: dialogo.open ? dialogo : document.body,
    showConfirmButton: false, timer: icono === "warning" ? 6500 : 2800, timerProgressBar: true });
}

function persistirEstado() {
  try {
    guardarEstado(estado);
  } catch {
    if (!avisoStorageMostrado) {
      avisoStorageMostrado = true;
      notificar("El navegador no permite guardar cambios. Al cerrar la página se pueden perder.", "warning");
    }
  }
}

function cambiarCarrito(id, cantidad) {
  try {
    estado.carrito = actualizarCantidad(estado.carrito, catalogo.productos, id, cantidad);
    persistirEstado();
    renderizarCarrito();
    actualizarBotonesProductos();
    return true;
  } catch (error) {
    notificar(error.message, "warning");
    return false;
  }
}

function agregarProducto(id) {
  if (!catalogo) return;
  const cantidad = (estado.carrito[id] || 0) + 1;
  if (cambiarCarrito(id, cantidad)) notificar("Agregado a tu carrito");
}

function renderizarCategorias() {
  elemento("categorias").innerHTML = catalogo.categorias.map(({ id, nombre }) =>
    `<button type="button" class="category-button ${id === categoriaActiva ? "active" : ""}" data-categoria="${escaparHTML(id)}" aria-pressed="${id === categoriaActiva}">${escaparHTML(nombre)}</button>`).join("");
}

function renderizarProductos() {
  if (!catalogo) return;
  const productosVisibles = filtrarProductos(catalogo.productos, categoriaActiva, elemento("busqueda").value, elemento("orden").value);
  elemento("cantidad-resultados").textContent = `${productosVisibles.length} ${productosVisibles.length === 1 ? "producto" : "productos"}`;
  elemento("productos").innerHTML = productosVisibles.length ? productosVisibles.map(producto => {
    const { id, nombre, imagen, precio, descripcion, categoria, etiqueta, tono, stock } = producto;
    const nombreCategoria = catalogo.categorias.find(opcion => opcion.id === categoria)?.nombre || categoria;
    return `<article class="product-card"><div class="product-visual tone-${escaparHTML(tono)}"><span class="product-tag ${etiqueta === "Favorito" ? "lime" : ""}">${escaparHTML(etiqueta)}</span><img src="${escaparHTML(imagen)}" alt="${escaparHTML(nombre)}" width="320" height="280" loading="lazy"><button class="detail-trigger" type="button" data-detalle="${id}" aria-label="Ver detalles de ${escaparHTML(nombre)}">↗</button></div><div class="product-info"><span class="product-category">${escaparHTML(nombreCategoria)}</span><h3 class="product-title">${escaparHTML(nombre)}</h3><p class="product-description">${escaparHTML(descripcion)}</p><div class="product-bottom"><p class="product-price">${dinero(precio)}<span class="currency-note">Pesos argentinos</span></p><button type="button" class="add-button" data-agregar="${id}" aria-label="Agregar ${escaparHTML(nombre)} al carrito">+</button></div><p class="stock-indicator" data-stock="${id}">${stock > 0 ? `${stock} disponibles` : "Sin stock"}</p></div></article>`;
  }).join("") : `<div class="catalog-status"><h3>No encontramos coincidencias.</h3><p>Probá con otro nombre o explorá todas las categorías.</p><button class="button button-dark" id="limpiar-filtros" type="button">Ver todos los productos</button></div>`;
  actualizarBotonesProductos();
}

function actualizarBotonesProductos() {
  document.querySelectorAll("[data-agregar]").forEach(boton => {
    const producto = catalogo.productos.find(({ id }) => id === boton.dataset.agregar);
    const cantidad = estado.carrito[producto.id] || 0;
    boton.disabled = cantidad >= producto.stock;
    boton.title = boton.disabled ? "Ya agregaste todo el stock disponible" : "Agregar al carrito";
    const indicador = document.querySelector(`[data-stock="${producto.id}"]`);
    if (indicador) indicador.textContent = cantidad > 0 ? `${cantidad} en tu carrito · ${producto.stock - cantidad} disponibles` : (producto.stock > 0 ? `${producto.stock} disponibles` : "Sin stock");
  });
}

async function mostrarDetalle(id) {
  const producto = catalogo.productos.find(productoActual => productoActual.id === id);
  if (!producto) return;
  const sinStock = (estado.carrito[id] || 0) >= producto.stock;
  const resultado = await Swal.fire({ title: producto.nombre,
    html: `<div class="detail-copy"><img class="detail-image" src="${escaparHTML(producto.imagen)}" alt="${escaparHTML(producto.nombre)}"><p>${escaparHTML(producto.detalle)}</p><ul>${producto.especificaciones.map(especificacion => `<li>${escaparHTML(especificacion)}</li>`).join("")}</ul><p class="detail-price">${dinero(producto.precio)}</p><p>${sinStock ? "No quedan unidades para agregar." : `${producto.stock - (estado.carrito[id] || 0)} unidades disponibles.`}</p></div>`,
    showCancelButton: true, showConfirmButton: !sinStock, confirmButtonText: "Agregar al carrito", cancelButtonText: "Volver", focusConfirm: false });
  if (resultado.isConfirmed) agregarProducto(id);
}

function totalesHTML(totales) {
  return `<div class="total-row"><span>Subtotal</span><strong>${dinero(totales.subtotal)}</strong></div><div class="total-row"><span>${estado.entrega === "retiro" ? "Retiro" : "Envío"}</span><strong>${totales.envio === 0 ? "Sin cargo" : dinero(totales.envio)}</strong></div><div class="total-row grand-total"><span>Total</span><strong>${dinero(totales.total)}</strong></div>`;
}

function renderizarCarrito() {
  if (!catalogo) return;
  const items = obtenerItems(estado.carrito, catalogo.productos);
  const totales = calcularTotales(estado.carrito, catalogo.productos, estado.entrega, catalogo.configuracion);
  elemento("cantidad-carrito").textContent = totales.cantidad;
  elemento("abrir-carrito").setAttribute("aria-label", `Abrir carrito, ${totales.cantidad} productos`);
  elemento("carrito-vacio").hidden = items.length > 0;
  elemento("contenido-carrito").hidden = items.length === 0;
  elemento("items-carrito").innerHTML = items.map(({ id, nombre, imagen, precio, cantidad, importe, stock }) =>
    `<article class="cart-item"><img src="${escaparHTML(imagen)}" alt="" width="75" height="75"><div><h3>${escaparHTML(nombre)}</h3><p class="unit-price">${dinero(precio)} / unidad</p><div class="quantity-control"><button type="button" data-cantidad="${id}" data-cambio="-1" aria-label="Quitar una unidad de ${escaparHTML(nombre)}">−</button><output aria-label="Cantidad de ${escaparHTML(nombre)}">${cantidad}</output><button type="button" data-cantidad="${id}" data-cambio="1" ${cantidad >= stock ? "disabled" : ""} aria-label="Agregar una unidad de ${escaparHTML(nombre)}">+</button></div></div><div class="cart-item-aside"><strong>${dinero(importe)}</strong><button type="button" class="remove-button" data-eliminar="${id}" aria-label="Eliminar ${escaparHTML(nombre)}">Eliminar</button></div></article>`).join("");
  elemento("tipo-entrega").value = estado.entrega;
  elemento("totales-carrito").innerHTML = totalesHTML(totales);
  elemento("totales-checkout").innerHTML = totalesHTML(totales);
  const faltante = catalogo.configuracion.envioGratisDesde - totales.subtotal;
  elemento("mensaje-envio").textContent = estado.entrega === "retiro"
    ? "Retiro sin cargo. La coordinación de entrega se simula en el comprobante."
    : (faltante > 0 ? `Sumá ${dinero(faltante)} más y obtené envío gratis.` : "¡Tu compra tiene envío gratis!");
  elemento("ver-pedido").hidden = !estado.ultimoPedido;
  if (!items.length) mostrarPasoCarrito();
}

function mostrarPasoCarrito() {
  elemento("vista-carrito").hidden = false;
  elemento("formulario-compra").hidden = true;
  elemento("paso-compra").textContent = "01 / TU SELECCIÓN";
  elemento("carrito-titulo").innerHTML = "Tu carrito<span>.</span>";
}

function abrirCarrito() {
  if (!catalogo) { notificar("Primero necesitamos cargar el catálogo.", "info"); return; }
  mostrarPasoCarrito();
  renderizarCarrito();
  dialogo.showModal();
  document.body.classList.add("modal-open");
}

function cerrarCarrito() {
  dialogo.close();
  document.body.classList.remove("modal-open");
}

function continuarCompra() {
  if (!Object.keys(estado.carrito).length) return;
  elemento("vista-carrito").hidden = true;
  elemento("formulario-compra").hidden = false;
  elemento("campo-direccion").hidden = estado.entrega !== "envio";
  elemento("direccion-cliente").required = estado.entrega === "envio";
  elemento("paso-compra").textContent = "02 / FINALIZÁ TU COMPRA";
  elemento("carrito-titulo").innerHTML = "Un último paso<span>.</span>";
  dialogo.scrollTop = 0;
  elemento("nombre-cliente").focus();
}

function crearPedido(cliente, pago) {
  const totales = calcularTotales(estado.carrito, catalogo.productos, estado.entrega, catalogo.configuracion);
  const identificador = crypto.randomUUID ? crypto.randomUUID().split("-")[0].toUpperCase() : Date.now().toString(36).toUpperCase();
  return {
    numero: `NX-${identificador}`,
    fecha: new Date().toISOString(), cliente,
    entrega: catalogo.entregas.find(({ id }) => id === estado.entrega).nombre,
    pago: catalogo.pagos.find(({ id }) => id === pago).nombre,
    items: Object.fromEntries(obtenerItems(estado.carrito, catalogo.productos).map(({ id, nombre, precio, cantidad }) => [id, { nombre, precio, cantidad }])),
    totales
  };
}

function comprobanteHTML(pedido, esRevision = false) {
  const { cliente, totales, items } = pedido;
  const fecha = new Date(pedido.fecha).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
  return `<div class="receipt"><div class="receipt-heading">${esRevision ? "Revisá tu selección" : `<strong>${escaparHTML(pedido.numero)}</strong> · ${escaparHTML(fecha)}`}<br><strong>${escaparHTML(cliente.nombre)}</strong><br>${escaparHTML(cliente.email)}<br>${escaparHTML(pedido.entrega)}${cliente.direccion ? `<br>${escaparHTML(cliente.direccion)}` : ""}<br>${escaparHTML(pedido.pago)}</div><ul class="receipt-items">${Object.values(items).map(({ nombre, cantidad, precio }) => `<li><span>${cantidad} × ${escaparHTML(nombre)}</span><strong>${dinero(cantidad * precio)}</strong></li>`).join("")}</ul><div class="order-totals"><div class="total-row"><span>Subtotal</span><strong>${dinero(totales.subtotal)}</strong></div><div class="total-row"><span>Entrega</span><strong>${totales.envio ? dinero(totales.envio) : "Sin cargo"}</strong></div><div class="total-row grand-total"><span>Total</span><strong>${dinero(totales.total)}</strong></div></div><p class="receipt-footer">Comprobante de demostración. No se realizan cobros ni envíos reales. ${esRevision ? "" : "Podés volver a verlo desde «Mi última compra»."}</p></div>`;
}

async function confirmarCompra(evento) {
  evento.preventDefault();
  if (procesandoCompra || !Object.keys(estado.carrito).length) return;
  const formulario = evento.currentTarget;
  for (const id of ["nombre-cliente", "email-cliente", "direccion-cliente"]) elemento(id).value = elemento(id).value.trim();
  if (!formulario.reportValidity()) return;
  const pago = elemento("medio-pago").value;
  if (!catalogo.pagos.some(opcion => opcion.id === pago)) return;
  procesandoCompra = true;
  const cliente = { nombre: elemento("nombre-cliente").value, email: elemento("email-cliente").value,
    direccion: estado.entrega === "envio" ? elemento("direccion-cliente").value : "" };
  const pedido = crearPedido(cliente, pago);
  cerrarCarrito();
  try {
    const respuesta = await Swal.fire({ title: "¿Todo listo?", html: comprobanteHTML(pedido, true),
      showCancelButton: true, confirmButtonText: "Confirmar compra", cancelButtonText: "Volver y editar", focusCancel: true });
    if (!respuesta.isConfirmed) {
      dialogo.showModal(); document.body.classList.add("modal-open"); return;
    }
    estado.ultimoPedido = pedido;
    estado.carrito = {};
    let guardado = true;
    try { guardarEstado(estado); } catch { guardado = false; }
    formulario.reset();
    renderizarCarrito();
    actualizarBotonesProductos();
    await Swal.fire({ icon: "success", title: "¡Tu upgrade está confirmado!",
      html: `<p>Compra simulada <strong>${escaparHTML(pedido.numero)}</strong>.</p><p>${guardado ? "Guardamos tu comprobante en este navegador." : "No pudimos guardar el comprobante. Estará disponible mientras esta página permanezca abierta."}</p>`,
      confirmButtonText: "Ver comprobante", showCancelButton: true, cancelButtonText: "Seguir explorando" }).then(resultado => {
        if (resultado.isConfirmed) return mostrarUltimoPedido();
      });
  } finally {
    procesandoCompra = false;
  }
}

function mostrarUltimoPedido() {
  if (!estado.ultimoPedido) return;
  return Swal.fire({ title: "Tu comprobante", html: comprobanteHTML(estado.ultimoPedido), confirmButtonText: "Listo", width: 540 });
}

async function vaciarCarrito() {
  cerrarCarrito();
  const resultado = await Swal.fire({ title: "¿Vaciar el carrito?", text: "Se quitarán todos los productos de tu selección.", icon: "question", showCancelButton: true, confirmButtonText: "Sí, vaciar", cancelButtonText: "Conservar productos", focusCancel: true });
  if (resultado.isConfirmed) {
    estado.carrito = {};
    persistirEstado();
    actualizarBotonesProductos();
  }
  abrirCarrito();
}

async function reiniciarDatos() {
  if (procesandoCompra) return;
  const resultado = await Swal.fire({ title: "¿Borrar tus datos de Nexora?", text: "Se eliminarán el carrito y el último comprobante guardados en este navegador.", icon: "question", showCancelButton: true, confirmButtonText: "Borrar datos", cancelButtonText: "Cancelar", focusCancel: true });
  if (!resultado.isConfirmed) return;
  try { borrarDatos(); } catch {
    await Swal.fire({ icon: "error", title: "No pudimos borrar los datos", text: "El navegador bloqueó el acceso al almacenamiento. Revisá sus permisos y volvé a intentar." });
    return;
  }
  estado = { carrito: {}, entrega: "envio", ultimoPedido: null };
  elemento("formulario-compra").reset();
  elemento("ver-pedido").hidden = true;
  elemento("cantidad-carrito").textContent = "0";
  if (catalogo) { renderizarCarrito(); actualizarBotonesProductos(); }
  notificar("Los datos de la tienda fueron borrados");
}

function limpiarFiltros() {
  categoriaActiva = "todos";
  elemento("busqueda").value = "";
  elemento("orden").value = "destacados";
  renderizarCategorias(); renderizarProductos();
}

async function iniciarTienda() {
  if (cargando) return;
  cargando = true;
  elemento("productos").setAttribute("aria-busy", "true");
  elemento("estado-catalogo").hidden = false;
  elemento("estado-catalogo").innerHTML = '<span class="loader" aria-hidden="true"></span><h3>Preparando tu próximo upgrade…</h3><p>Estamos cargando los productos.</p>';
  try {
    if (!window.Swal) throw new Error("No se pudo cargar la librería de la interfaz. Recargá la página para intentarlo nuevamente.");
    catalogo = await cargarCatalogo();
    const recuperado = leerEstado(catalogo.productos);
    estado = recuperado;
    elemento("tipo-entrega").innerHTML = catalogo.entregas.map(({ id, nombre }) => `<option value="${escaparHTML(id)}">${escaparHTML(nombre)}</option>`).join("");
    elemento("medio-pago").innerHTML = catalogo.pagos.map(({ id, nombre }) => `<option value="${escaparHTML(id)}">${escaparHTML(nombre)}</option>`).join("");
    elemento("beneficio-envio").textContent = `Envío gratis desde ${dinero(catalogo.configuracion.envioGratisDesde)}.`;
    renderizarCategorias(); renderizarProductos(); renderizarCarrito();
    elemento("estado-catalogo").hidden = true;
    if (recuperado.advertencia) notificar(recuperado.advertencia, "warning");
  } catch (error) {
    elemento("estado-catalogo").innerHTML = `<h3>El catálogo necesita un momento.</h3><p>${escaparHTML(error.message)}</p><button type="button" class="button button-dark" id="reintentar-carga">Volver a intentar</button>`;
  } finally {
    cargando = false;
    elemento("productos").setAttribute("aria-busy", "false");
  }
}

elemento("busqueda").addEventListener("input", renderizarProductos);
elemento("orden").addEventListener("change", renderizarProductos);
elemento("categorias").addEventListener("click", evento => {
  const boton = evento.target.closest("[data-categoria]");
  if (!boton) return;
  categoriaActiva = boton.dataset.categoria;
  renderizarCategorias(); renderizarProductos();
});
elemento("productos").addEventListener("click", evento => {
  const boton = evento.target.closest("button");
  if (!boton) return;
  if (boton.dataset.agregar) agregarProducto(boton.dataset.agregar);
  if (boton.dataset.detalle) mostrarDetalle(boton.dataset.detalle);
  if (boton.id === "limpiar-filtros") limpiarFiltros();
});
elemento("estado-catalogo").addEventListener("click", evento => {
  if (evento.target.closest("#reintentar-carga")) iniciarTienda();
});
elemento("explorar-audio").addEventListener("click", () => {
  if (!catalogo) return;
  categoriaActiva = "audio";
  elemento("busqueda").value = "";
  renderizarCategorias(); renderizarProductos();
});
elemento("abrir-carrito").addEventListener("click", abrirCarrito);
elemento("cerrar-carrito").addEventListener("click", cerrarCarrito);
elemento("seguir-explorando").addEventListener("click", () => { cerrarCarrito(); elemento("catalogo").scrollIntoView({ behavior: "smooth" }); });
dialogo.addEventListener("close", () => document.body.classList.remove("modal-open"));
dialogo.addEventListener("click", evento => {
  if (evento.target === dialogo) {
    const limites = dialogo.getBoundingClientRect();
    if (evento.clientX < limites.left || evento.clientX > limites.right) cerrarCarrito();
  }
});
elemento("items-carrito").addEventListener("click", evento => {
  const boton = evento.target.closest("button");
  if (!boton) return;
  if (boton.dataset.eliminar) cambiarCarrito(boton.dataset.eliminar, 0);
  if (boton.dataset.cantidad) {
    const id = boton.dataset.cantidad;
    const cambio = boton.dataset.cambio;
    cambiarCarrito(id, (estado.carrito[id] || 0) + Number(cambio));
    const siguienteBoton = elemento("items-carrito").querySelector(`[data-cantidad="${id}"][data-cambio="${cambio}"]:not(:disabled)`)
      || elemento("items-carrito").querySelector(`[data-cantidad="${id}"]:not(:disabled)`)
      || elemento("seguir-explorando");
    siguienteBoton.focus();
  }
});
elemento("tipo-entrega").addEventListener("change", evento => {
  if (!catalogo.entregas.some(opcion => opcion.id === evento.target.value)) return;
  estado.entrega = evento.target.value;
  persistirEstado(); renderizarCarrito();
});
elemento("continuar-compra").addEventListener("click", continuarCompra);
elemento("volver-carrito").addEventListener("click", mostrarPasoCarrito);
elemento("vaciar-carrito").addEventListener("click", vaciarCarrito);
elemento("formulario-compra").addEventListener("submit", confirmarCompra);
elemento("ver-pedido").addEventListener("click", mostrarUltimoPedido);
elemento("reiniciar-datos").addEventListener("click", reiniciarDatos);

iniciarTienda();
