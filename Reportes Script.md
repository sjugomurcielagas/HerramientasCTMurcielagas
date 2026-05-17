# Reportes Script

Fecha de corte: 2026-05-17

Documento de referencia del Google Apps Script `gas/reportes/Código.js`.

## Qué resuelve

- Alimentar el módulo `reportes/index.html`.
- Exponer datasets de entrenamiento ya preparados para visualización.
- Detectar inconsistencias en datos de carga semanal.

## Acciones (ruteadas por el Worker via `REPORTES_ACTIONS`)

- `getClientData` — devuelve el dataset completo de entrenamiento para el frontend.
- `generateClientReport` — genera reporte narrativo con IA (recibe `prompt`).
- `generarAuditoriaDatos` — detecta inconsistencias en cargas semanales (total ≠ físico + técnico-táctico).

## Contrato de respuesta

Todas las respuestas siguen el formato `{ok: true, data: ...}` o `{ok: false, error: '...'}`.

El frontend de reportes lee `text()` + `JSON.parse()` con manejo de error.

## Responsabilidades

- Leer y consolidar datos de entrenamiento.
- No manejar fichas personales ni datos del plantel.
- No duplicar lógica de base administrativa.

## Separación con base-deporte

Este script es independiente de `gas/base-deporte/Código.js`. El Worker los diferencia por `REPORTES_ACTIONS` (lista fija) vs prefijos de módulo deportivo.
