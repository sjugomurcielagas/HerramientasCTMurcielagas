# Tareas

> Tablero vivo. Solo trabajo abierto. Lo resuelto se borra.

---

## Infraestructura (ya resuelto, no tocar)

- [x] Playwright instalado y corriendo — `npx playwright test tests/navegacion_general.spec.ts` → 6 passed
- [x] Suite E2E en `tests/navegacion_general.spec.ts` (login, home, módulos, mobile, rutas)
- [x] Agentes Playwright en `.codex/agents/`
- [x] `DESIGN.md` con criterios visuales del proyecto
- [x] Unificación visual global (todos los módulos)
- [x] Simplificación UX — paneles secundarios colapsados, menos ruido

---

## Prioridad alta

- [x] **Integrar Concentraciones ↔ Reportes** — API integrada; selector de semanas muestra nombre de la concentración cuando la semana cae dentro de una.
- [x] **Resolver TUE duplicada** — Antidoping como fuente de edición; Base de datos en modo solo lectura con link.

---

## Prioridad media

- [x] **Revisar módulo Rivales** — El módulo existe y funciona (`equipos_getEquipos`, `equipos_getEstadisticas`).
- [x] **Alerta diferenciada para clasificación visual** — Alertas de clasificación aparecen primero en vencimientos con banner rojo "inhabilitación inmediata IBSA B1".
- [x] **Sacar hardcoding de personas en documentos oficiales** — Botón renombrado a "Generar documentos oficiales".
- [x] **Confirmar integración Registro → estadísticas de Partido** — Las stats son entrada manual post-partido; se agregó hint para verificar contra el registro en tiempo real.

---

## Tablero táctico — fixes pendientes (auditoría 2026-07-08)

Ver detalle completo en `docs/tablero-tactico-pendientes.md`.

- [ ] **A — Bug doble-commit texto**: Enter + blur agregan la misma anotación dos veces → flag `committed` en `openTextInput`
- [ ] **B — Bug doble-tap en modo annot**: dispara editor de jugadora/flecha por debajo → `return` explícito para `isDouble` en ambos modos
- [ ] **C — activePhase no persiste**: no se guarda en `saveHistory`/`autosave` ni se restaura en `undo`/`tryRestoreAutosave`/`importJSON`
- [ ] **D — MOVER_TYPES antes de declararse**: `resolvedPos` las usa antes de la línea donde están declaradas como `const` → mover declaraciones arriba
- [ ] **E — Input flotante huérfano**: cambiar de modo sin confirmar deja el input en el DOM → `closeTextInputIfOpen()` en `toggleAnnotMode` y `toggleArrowMode`
- [ ] **F — exportJSON sin clonar**: pasa referencias vivas; `saveExercise` clona con `JSON.parse(JSON.stringify)` → alinear patrón

---

## Backlog (sin fecha)

- [ ] Asistencia a entrenamientos fuera de concentración — requiere backend nuevo
- [x] Persistencia del tablero táctico — autosave en localStorage; se restaura al reabrir la sesión
- [ ] Penales vinculados a partidos — requiere coordinación de dos sistemas backend
- [x] Resumen exportable de concentración — botón "Ver resumen" con convocadas, asistencia y actividades; imprimible
- [ ] Modo multi-dispositivo para registro de partido en vivo — requiere backend
