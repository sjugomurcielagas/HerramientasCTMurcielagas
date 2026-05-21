# Recuperación del sitio

Documento operativo para cuando el sitio de Murciélagas Analytics queda desalineado, una pantalla deja de hablar con el backend o aparecen archivos duplicados con lógica divergente.

## Fuente de verdad

- Frontends estáticos del sitio: `index.html`, `base-datos/index.html`, `reportes/index.html`, `analisis/*`, `concentraciones/index.html`, `antidoping/index.html`, `tactica/index.html`
- API pública única: `worker.js`
- Configuración compartida de la API: `assets/config.js`
- Backend Apps Script base/deporte: `gas/base-deporte/Código.js`
- Backend Apps Script reportes: `gas/reportes/Código.js`

## Qué no tocar sin revisar primero

- `assets/config.js`
- La ruta de deploy del Worker
- La planilla de producción sin backup previo

## Orden de revisión cuando algo falla

1. Confirmar que la pantalla afectada usa `API_BASE_URL` y no una URL hardcoded.
2. Revisar `worker.js` para ver si la acción llega al backend correcto.
3. Revisar `gas/base-deporte/Código.js` o `gas/reportes/Código.js` según el módulo.
4. Buscar si existe una copia vieja del mismo frontend dentro de `gas/*/Index.html`.
5. Corregir primero el router, después el frontend, y al final la documentación.

## Smoke tests mínimos

Ejecutar estos chequeos después de cualquier cambio de arquitectura:

- `base_verificarPassword`
- `base_getPlantel`
- `base_getAlertas`
- `getClientData`

Si alguno falla, no asumir que el resto del sitio está bien.

## Criterios de integridad

- Un módulo no debe tener una URL de backend propia si ya puede usar `assets/config.js`.
- Una acción no debe figurar en `worker.js` si el Apps Script no la implementa.
- Si una funcionalidad existe en dos lugares, uno de ellos debe quedar marcado como legado o referencia.

## Flujo de recuperación recomendado

1. Volver a una versión conocida buena del Worker.
2. Verificar que `assets/config.js` siga apuntando al Worker correcto.
3. Desplegar el backend Apps Script que corresponda.
4. Validar desde el navegador que la pantalla carga y que los datos vuelven.
5. Actualizar esta guía si apareció un nuevo punto de falla.

## Pendiente para mañana

- Terminar de mover `reportes/index.html` al cliente compartido `Murci` y retirar su `callBackend` local.
- Revisar si queda alguna pantalla usando helpers propios para fetch/parseo en vez de `assets/config.js`.
