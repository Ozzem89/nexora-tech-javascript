// Los datos iniciales se cargan desde JSON. El carrito guarda únicamente ID y cantidad.
export const CLAVE_STORAGE = "nexora.tienda.v1";

export async function cargarCatalogo() {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 12000);
  try {
    const respuesta = await fetch(new URL("../data/catalogo.json", import.meta.url), {
      signal: controlador.signal,
      cache: "no-cache"
    });
    if (!respuesta.ok) throw new Error(`Respuesta HTTP ${respuesta.status}`);
    const catalogo = await respuesta.json();
    validarCatalogo(catalogo);
    return catalogo;
  } catch (error) {
    const mensaje = error.name === "AbortError"
      ? "La carga tardó demasiado. Revisá tu conexión e intentá nuevamente."
      : "No pudimos cargar el catálogo. Verificá que la página esté abierta con un servidor como Live Server y volvé a intentar.";
    throw new Error(mensaje, { cause: error });
  } finally {
    clearTimeout(temporizador);
  }
}

export function validarCatalogo(catalogo) {
  const { productos, categorias, entregas, pagos, configuracion } = catalogo || {};
  if (!Array.isArray(productos) || !productos.length || !Array.isArray(categorias)
    || !Array.isArray(entregas) || !entregas.length || !Array.isArray(pagos) || !pagos.length) {
    throw new Error("El catálogo no tiene la estructura esperada.");
  }
  if (!configuracion || configuracion.moneda !== "ARS"
    || !Number.isFinite(configuracion.envioGratisDesde) || configuracion.envioGratisDesde < 0
    || !Number.isFinite(configuracion.costoEnvio) || configuracion.costoEnvio < 0) {
    throw new Error("La configuración de importes es inválida.");
  }
  for (const opciones of [categorias, entregas, pagos]) {
    if (opciones.some(opcion => !opcion || typeof opcion.id !== "string" || typeof opcion.nombre !== "string")) {
      throw new Error("Hay opciones inválidas en el catálogo.");
    }
  }
  const identificadores = new Set();
  for (const producto of productos) {
    if (!producto || typeof producto.id !== "string" || !/^[a-z0-9-]+$/.test(producto.id)
      || identificadores.has(producto.id) || typeof producto.nombre !== "string"
      || !categorias.some(categoria => categoria.id === producto.categoria)
      || !Number.isInteger(producto.precio) || producto.precio <= 0
      || !Number.isInteger(producto.stock) || producto.stock < 0
      || typeof producto.imagen !== "string" || !/^assets\/img\/[a-z0-9-]+\.svg$/.test(producto.imagen)
      || !["descripcion", "detalle", "tono", "etiqueta"].every(campo => typeof producto[campo] === "string")
      || !Array.isArray(producto.especificaciones)
      || producto.especificaciones.some(especificacion => typeof especificacion !== "string")) {
      throw new Error("Hay un producto inválido en el catálogo.");
    }
    identificadores.add(producto.id);
  }
}

export function normalizarCarrito(carrito, productos) {
  if (!carrito || typeof carrito !== "object" || Array.isArray(carrito)) return {};
  return Object.entries(carrito).reduce((carritoValido, [id, cantidad]) => {
    const producto = productos.find(productoActual => productoActual.id === id);
    if (producto && Number.isInteger(cantidad) && cantidad > 0 && producto.stock > 0) {
      carritoValido[id] = Math.min(cantidad, producto.stock);
    }
    return carritoValido;
  }, {});
}

function pedidoValido(pedido) {
  if (!pedido || typeof pedido !== "object" || typeof pedido.numero !== "string"
    || typeof pedido.fecha !== "string" || Number.isNaN(Date.parse(pedido.fecha))
    || !pedido.cliente || !["nombre", "email", "direccion"].every(campo => typeof pedido.cliente[campo] === "string")
    || typeof pedido.entrega !== "string" || typeof pedido.pago !== "string"
    || !pedido.totales || !["subtotal", "envio", "total"].every(campo => Number.isFinite(pedido.totales[campo]) && pedido.totales[campo] >= 0)
    || !pedido.items || typeof pedido.items !== "object" || !Object.keys(pedido.items).length) return false;
  return Object.values(pedido.items).every(item => item && typeof item.nombre === "string"
    && Number.isInteger(item.cantidad) && item.cantidad > 0 && Number.isFinite(item.precio) && item.precio > 0);
}

export function leerEstado(productos) {
  const inicial = { carrito: {}, entrega: "envio", ultimoPedido: null, advertencia: "" };
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_STORAGE) || "null");
    if (!guardado) return inicial;
    if (typeof guardado !== "object" || Array.isArray(guardado)) throw new Error("Estado inválido");
    const carrito = normalizarCarrito(guardado.carrito, productos);
    const ajustado = JSON.stringify(carrito) !== JSON.stringify(guardado.carrito || {});
    return {
      carrito,
      entrega: guardado.entrega === "retiro" ? "retiro" : "envio",
      ultimoPedido: pedidoValido(guardado.ultimoPedido) ? guardado.ultimoPedido : null,
      advertencia: ajustado ? "Actualizamos tu carrito según los productos y el stock disponibles." : ""
    };
  } catch {
    return { ...inicial, advertencia: "No se pudieron recuperar tus datos guardados. Podés comenzar una nueva compra." };
  }
}

export function guardarEstado(estado) {
  const { carrito, entrega, ultimoPedido } = estado;
  localStorage.setItem(CLAVE_STORAGE, JSON.stringify({ carrito, entrega, ultimoPedido }));
}

export function borrarDatos() {
  // Se vacía todo el almacenamiento de esta app sin borrar datos de otros proyectos.
  localStorage.removeItem(CLAVE_STORAGE);
}

export function obtenerItems(carrito, productos) {
  return productos.filter(({ id }) => carrito[id] > 0).map(producto => ({
    ...producto,
    cantidad: carrito[producto.id],
    importe: producto.precio * carrito[producto.id]
  }));
}

export function calcularTotales(carrito, productos, entrega, configuracion) {
  const items = obtenerItems(carrito, productos);
  const subtotal = items.reduce((acumulado, { importe }) => acumulado + importe, 0);
  const cantidad = items.reduce((acumulado, item) => acumulado + item.cantidad, 0);
  const envio = cantidad > 0 && entrega === "envio" && subtotal < configuracion.envioGratisDesde
    ? configuracion.costoEnvio : 0;
  return { subtotal, envio, total: subtotal + envio, cantidad };
}

export function actualizarCantidad(carrito, productos, id, cantidad) {
  const producto = productos.find(productoActual => productoActual.id === id);
  if (!producto || !Number.isInteger(cantidad) || cantidad < 0) throw new Error("Cantidad inválida.");
  if (cantidad > producto.stock) throw new Error(`Solo hay ${producto.stock} unidades disponibles de ${producto.nombre}.`);
  const actualizado = { ...carrito };
  if (cantidad === 0) delete actualizado[id];
  else actualizado[id] = cantidad;
  return actualizado;
}

export function filtrarProductos(productos, categoria, busqueda, orden) {
  const normalizarTexto = texto => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const termino = normalizarTexto(busqueda.trim());
  const filtrados = productos.filter(producto => (categoria === "todos" || producto.categoria === categoria)
    && normalizarTexto(`${producto.nombre} ${producto.descripcion}`).includes(termino));
  if (orden === "precio-menor") filtrados.sort((primero, segundo) => primero.precio - segundo.precio);
  if (orden === "precio-mayor") filtrados.sort((primero, segundo) => segundo.precio - primero.precio);
  if (orden === "nombre") filtrados.sort((primero, segundo) => primero.nombre.localeCompare(segundo.nombre, "es"));
  return filtrados;
}
