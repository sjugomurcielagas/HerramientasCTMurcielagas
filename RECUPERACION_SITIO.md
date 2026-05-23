# Recuperacion del sitio

Documento operativo para cuando el sitio de Murcielagas Analytics queda desalineado, una pantalla deja de hablar con el backend o aparecen archivos duplicados con logica divergente.

## Fuente de verdad

- Frontends estaticos del sitio: `index.html`, `base-datos/index.html`, `reportes/index.html`, `analisis/*`, `concentraciones/index.html`, `antidoping/index.html`, `tactica/index.html`
- API publica unica: `worker.js`
- Configuracion compartida de API: `assets/config.js`
- Backend Apps Script base/deporte: `gas/base-deporte/Codigo.js`
- Backend Apps Script reportes: `gas/reportes/Codigo.js`

## Que no tocar sin revisar primero

- `assets/config.js`
- Ruta de deploy del Worker
- Planilla de produccion sin backup previo

## Orden de revision cuando algo falla

1. Confirmar que la pantalla afectada usa `API_BASE_URL` y no una URL hardcoded.
2. Revisar `worker.js` para ver si la accion llega al backend correcto.
3. Revisar `gas/base-deporte/Codigo.js` o `gas/reportes/Codigo.js` segun modulo.
4. Buscar si existe una copia vieja del mismo frontend dentro de `gas/*/Index.html`.
5. Corregir primero router, despues frontend, y al final documentacion.

## Smoke tests minimos

Ejecutar estos chequeos despues de cualquier cambio de arquitectura:

- `base_verificarPassword`
- `base_getPlantel`
- `base_getAlertas`
- `getClientData`

Si alguno falla, no asumir que el resto del sitio esta bien.

## Criterios de integridad

- Un modulo no debe tener URL de backend propia si ya puede usar `assets/config.js`.
- Una accion no debe figurar en `worker.js` si el Apps Script no la implementa.
- Si una funcionalidad existe en dos lugares, uno debe quedar marcado como legado o referencia.

## Flujo de recuperacion recomendado

1. Volver a una version conocida buena del Worker.
2. Verificar que `assets/config.js` siga apuntando al Worker correcto.
3. Desplegar el backend Apps Script que corresponda.
4. Validar desde navegador que la pantalla carga y que los datos vuelven.
5. Actualizar esta guia si aparecio un nuevo punto de falla.

## Pendiente operativo

- Continuar revision transversal para detectar helpers de red locales remanentes y reemplazarlos por `Murci`.
- Mantener el chequeo rapido (`scripts/qa-fast.ps1`) antes de cada push.
