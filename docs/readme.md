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


