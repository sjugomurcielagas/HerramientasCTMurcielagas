# Reportes Script

Fecha de corte: 2026-05-16

Documento de referencia del script asociado al módulo `reportes`. Sirve para ordenar la versión definitiva en uso del Google Apps Script ligado a las consultas de entrenamiento.

## Qué resuelve

- Alimentar el módulo `reportes/index.html`.
- Consolidar el contrato de lectura para métricas, filtros y cortes de entrenamiento.
- Evitar que reportes reinterprete datos que ya deberían venir normalizados desde backend.

## Contrato visible hoy

- Entrada principal: `getClientData`
- El frontend de reportes depende de una respuesta estable y consistente.
- Si hay error de comunicación, el frontend debe mostrar mensaje claro de backend/CORS y no seguir suponiendo datos válidos.

## Responsabilidades del script

- Leer y/o consolidar datos de entrenamiento.
- Exponer datasets ya preparados para visualización.
- Mantener compatibilidad con el Worker actual.
- No duplicar lógica de base de datos administrativa.

## Qué no debe hacer

- No resolver fichas personales.
- No modificar archivos del plantel.
- No manejar penales, partidos o concentraciones como dueño del dato.
- No inventar estructuras nuevas si el Worker ya entrega la forma esperada.

## Datos esperados por el frontend

- Resumen de sesiones o bloques de entrenamiento.
- Métricas agregadas.
- Listados de filtros.
- Series o históricos cuando existan.

## Reglas de mantenimiento

- Si cambia el contrato del Worker, `reportes` se ajusta primero en este script.
- Los nombres de campo deben mantenerse estables.
- Las respuestas deben seguir siendo JSON y no texto libre.
- La estructura debe ser apta para `fetch(...).json()` o su equivalente con manejo de error.

## Relación con el resto del sistema

- Consume backend, no lo reemplaza.
- Debe mantenerse separado del script de base administrativa.
- Si el reporte requiere datos del plantel, los toma ya normalizados, no reimplementando ficha.

## Pendiente operativo

- Confirmar dónde vive el `.gs` real en el entorno productivo.
- Confirmar si la acción `getClientData` sale del Worker o de Apps Script.
- Confirmar el formato exacto del payload que consume `reportes/index.html`.
