# Reportes Script

Fecha de corte: 2026-05-17

Documento de referencia del Google Apps Script `gas/reportes/Código.js`.

## Qué resuelve

- Alimentar el módulo `reportes/index.html`.
- Exponer datasets de entrenamiento ya preparados para visualización.
- Detectar inconsistencias en datos de carga semanal.
- Mantener el frontend estático conectado al Worker vía `assets/config.js`.

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
No comparte resolver de plantillas ni lógica de concentración: `reportes` sigue siendo un backend separado.

## Recuperación

Si reportes deja de cargar desde GitHub Pages, revisar en este orden:

1. `assets/config.js` en el frontend estático.
2. `worker.js` y su ruteo de `getClientData`.
3. `gas/reportes/Código.js`.
4. `gas/base-deporte/Código.js` solo si el problema viene de la parte de plantel que el Worker mergea.
