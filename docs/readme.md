# Nexora Tech — Proyecto final de JavaScript

**Autor:** Emanuel Constantino  
**Tipo:** simulador de compra de productos tecnológicos.  
**Tecnologías:** HTML, CSS, JavaScript con módulos, JSON y SweetAlert2.

El usuario puede explorar ocho productos, buscar, filtrar y ordenar el catálogo; ver detalles; agregar productos al carrito; modificar cantidades; elegir envío o retiro; completar un formulario sin registro; revisar y confirmar la compra; y consultar el último comprobante. Todo el proceso es simulado: no hay pagos, emails ni entregas reales. Se pueden utilizar datos ficticios.

## Cómo ejecutarlo en Visual Studio Code

1. Descomprimir el archivo ZIP.
2. En Visual Studio Code, ir a **Archivo > Abrir carpeta** y seleccionar `nexora-tech` (la carpeta que contiene `index.html`).
3. Instalar la extensión **Live Server**, de Ritwick Dey, si todavía no está instalada.
4. Hacer clic derecho sobre `index.html` y elegir **Open with Live Server**.
5. Usar la dirección local que abre la extensión.

**No abrir el HTML con doble clic:** la aplicación utiliza `fetch` y módulos ES. Necesita HTTP/HTTPS, no el protocolo `file://`.

No requiere npm, instalación de dependencias del proyecto, claves, backend ni configuración adicional. La librería está incluida en el proyecto, por lo que no depende de un CDN durante el uso.

Si ya tenés Python instalado, también podés abrir una terminal en la carpeta y ejecutar `python -m http.server 8000`, y luego visitar `http://localhost:8000`.

## Archivos y responsabilidades

| Ruta | Responsabilidad |
| --- | --- |
| `index.html` | Estructura semántica, catálogo, carrito y formulario. Único archivo suelto en la raíz. |
| `css/styles.css` | Diseño propio, responsive, estados de foco y movimiento reducido. |
| `js/app.js` | Eventos, manipulación del DOM, renderizado, notificaciones y proceso de compra. |
| `js/tienda.js` | Fetch, validación, filtros, operaciones del carrito, cálculos y storage. Importado por `app.js`. |
| `js/vendor/sweetalert2.min.js` | Librería externa SweetAlert2, con sus estilos incluidos. |
| `data/catalogo.json` | Productos, categorías, medios de pago, opciones de entrega y configuración comercial. |
| `assets/img/` | Ocho ilustraciones SVG originales y el favicon. |
| `docs/readme.md` | Esta guía. Está en una carpeta para respetar la raíz con solo `index.html`. |
| `docs/licencias.md` | Créditos y licencia de la librería externa. |

Hay **exactamente tres archivos `.js`**: dos propios y uno de la librería. `index.html` referencia la librería y `app.js`; este último importa `tienda.js` mediante una ruta relativa.

## Requisitos de la consigna

| Requisito | Dónde se implementa |
| --- | --- |
| Interacción mediante DOM | Eventos `click`, `input`, `change` y `submit` en `app.js`. |
| Sin cuadros nativos | Se usan SweetAlert2 y un elemento HTML `dialog` para el carrito. No se invoca `prompt()`, `alert()` ni `confirm()`. |
| Datos en JSON consumidos con fetch | `cargarCatalogo()` lee `data/catalogo.json`. No hay catálogos ni arrays de objetos de prueba escritos dentro de los JS propios. |
| Funciones de orden superior | `filter` y `sort` en filtros; `find` en búsquedas; `map` en renderizado; `reduce` en totales; `some`, `every` y `forEach` en validaciones e interfaz. |
| Guardar y modificar storage | `guardarEstado()` usa `localStorage.setItem()` luego de modificar carrito o entrega y al confirmar una compra. |
| Borrar artículos | `actualizarCantidad()` elimina una entrada del carrito cuando la cantidad es cero y luego se persiste el estado. |
| Vaciar carrito | Botón **Vaciar carrito**, con confirmación mediante SweetAlert2. |
| Vaciar datos de la app | Botón **Borrar mis datos de la tienda**: `borrarDatos()` ejecuta `localStorage.removeItem(CLAVE_STORAGE)`. |
| Ternario, OR y destructuring | Ejemplos: cálculo de envío con `? :`; cantidades con `estado.carrito[id] || 0`; extracción de productos con `{ id, nombre, precio }`. |
| Asincronismo y errores | `cargarCatalogo()` usa `async/await`, `try/catch/finally`, control de respuesta HTTP y timeout. La interfaz ofrece **Volver a intentar**. |
| Librería externa | SweetAlert2 para notificaciones, detalle del producto, confirmaciones y comprobantes. |
| Circuito completo | Catálogo → carrito → cantidades → entrega → formulario → revisión → confirmación → comprobante. |
| Sin registro ni login | La compra usa un formulario simple y no crea cuentas. |
| Código claro | Funciones con nombres semánticos; sin código propio en desuso ni logs de depuración. |

Los únicos arrays de objetos iniciales están en el JSON. Los resultados de `map`/`filter` se generan a partir de esos datos. El carrito se representa como un objeto de pares `id: cantidad`, y los comprobantes se crean a partir de la compra del usuario; no son datos precargados ni un catálogo hardcodeado.

## Reglas del simulador

- Importes ficticios en pesos argentinos, sin centavos.
- Envío: $6.990 para compras inferiores a $150.000; gratis a partir de ese importe.
- Retiro: sin cargo.
- No se puede superar el stock de cada producto.
- Los productos se pueden eliminar con **Eliminar** o disminuyendo su cantidad a cero.
- La búsqueda ignora mayúsculas y tildes, y se combina con la categoría.
- El checkout requiere nombre y email. La dirección solo es obligatoria para envío.
- Se puede volver al carrito o cancelar la revisión final sin perder la selección.
- Al confirmar, se genera un número de operación, se guarda el último comprobante y se vacía el carrito.
- Solo se conserva el **último** comprobante. Una nueva compra lo reemplaza.
- El stock es simulado por compra; no representa inventario de un servidor.

## Persistencia y privacidad

La aplicación usa una sola clave: `nexora.tienda.v1`. Contiene el carrito, la entrega elegida y el último pedido. La opción de borrar datos elimina esa clave; evita utilizar `localStorage.clear()` porque podría borrar información de otras aplicaciones del mismo origen.

No se envían datos a un servidor. El nombre, email y dirección del último pedido permanecen en el navegador hasta reemplazar o borrar el comprobante. Es recomendable usar datos ficticios en la demostración. Si el navegador bloquea el almacenamiento, la aplicación avisa y permite seguir utilizando el carrito durante la sesión.

## Prueba manual antes de entregar

1. Verificar que se muestran los ocho productos y sus ilustraciones.
2. Buscar `teclado`, cambiar categorías y ordenar por precio.
3. Buscar una palabra inexistente y usar **Ver todos los productos**.
4. Agregar Wave Pro ($89.990) y Mouse Orbit ($34.990). El subtotal debe ser **$124.980**, el envío **$6.990** y el total **$131.970**.
5. Aumentar Wave Pro a dos unidades. El subtotal y total deben ser **$214.970**, con envío gratis.
6. Recargar: productos y cantidades deben seguir en el carrito.
7. Elegir retiro y comprobar que no se cobra envío.
8. Probar **Eliminar**, vaciar el carrito y cancelar/aceptar su confirmación.
9. Intentar continuar con datos incompletos: el formulario debe marcar los campos necesarios.
10. Completar una compra con datos ficticios; volver desde la revisión y luego confirmarla.
11. Comprobar que el carrito queda vacío y que **Mi última compra** muestra el comprobante, incluso después de recargar.
12. Borrar los datos de la tienda y comprobar que desaparecen el carrito y el comprobante.
13. Para probar un error de carga, renombrar temporalmente `data/catalogo.json`, recargar y verificar el mensaje. Restaurar el nombre y presionar **Volver a intentar**.
14. Revisar la vista de celular y la navegación con teclado en tu navegador.

## Subir a GitHub

1. Crear un repositorio llamado, por ejemplo, `nexora-tech-javascript` y marcarlo como **Public**.
2. No agregar archivos iniciales automáticos al repositorio.
3. Subir el contenido de la carpeta del proyecto: `index.html`, `assets`, `css`, `data`, `docs` y `js`. **No subir solamente el ZIP** ni ubicar todo dentro de otra carpeta adicional.
4. Confirmar los cambios y compartir la URL del repositorio como entrega.
5. Opcionalmente, habilitar GitHub Pages en **Settings > Pages**, usando la rama `main` y la carpeta raíz. Las rutas son relativas para funcionar también dentro del subdirectorio del repositorio.
6. Abrir el enlace publicado y repetir una compra completa. Verificar en la pestaña Network del navegador que `data/catalogo.json` responde correctamente.

El repositorio público de GitHub debe crearse en tu cuenta; el archivo ZIP y una demostración online por sí solos no reemplazan la URL del repositorio que solicita la consigna.

## Ideas para explicar el proyecto

- `cargarCatalogo()` espera la respuesta de `fetch`, comprueba su estado y convierte el cuerpo con `.json()`.
- `filtrarProductos()` genera una nueva selección sin modificar el catálogo original.
- `calcularTotales()` usa `reduce` para sumar importes y unidades; después decide si corresponde cobrar envío.
- `renderizarCarrito()` dibuja nuevamente el contenido a partir del estado actual.
- Se usa delegación de eventos en los listados porque sus botones se generan dinámicamente.
- `guardarEstado()` serializa el estado con `JSON.stringify`; `leerEstado()` lo recupera con `JSON.parse` y valida las cantidades.
- SweetAlert2 devuelve una promesa: `await` permite esperar la decisión del usuario antes de vaciar el carrito o confirmar la compra.

## Alcance de verificación

Se incluyen controles de sintaxis y pruebas automatizadas de lógica e interacción DOM durante el desarrollo. La revisión visual y de comportamiento en un navegador real debe completarse con los pasos manuales anteriores antes de entregar.
