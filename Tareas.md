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

## Backlog (sin fecha)

- [ ] Asistencia a entrenamientos fuera de concentración
- [ ] Persistencia del tablero táctico (sistemas frecuentes)
- [ ] Penales vinculados a partidos
- [ ] Resumen exportable al cerrar una concentración
- [ ] Modo multi-dispositivo para registro de partido en vivo
