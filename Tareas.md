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

- [ ] **Integrar Concentraciones ↔ Reportes** — Que los períodos de concentración sean conocidos por el sistema y no inferidos. Hoy Reportes ya usa una heurística para excluirlos; el próximo paso es que el módulo de Concentraciones los provea directamente.
- [ ] **Resolver TUE duplicada** — Antidoping y Base de datos tienen los mismos campos con formularios independientes. Definir Antidoping como fuente de edición; Base de datos en modo solo lectura con link a Antidoping.

---

## Prioridad media

- [ ] **Revisar módulo Rivales** — Aparece en el sub-landing de Análisis pero no tiene contenido implementado. Quitar la card o definir qué va a hacer.
- [ ] **Alerta diferenciada para clasificación visual** — `Clasif_Visual_Revision` vencida merece circuito propio. La clasificación B1 vencida es inhabilitación de partido.
- [ ] **Sacar hardcoding de personas en documentos oficiales** — "Generar documentos (Santiago y Gonzalo)" debe configurarse desde Base de datos.
- [ ] **Confirmar integración Registro → estadísticas de Partido** — Si el Registro de acciones en vivo no alimenta automáticamente las estadísticas del partido, implementarlo o aclararlo para evitar carga doble.

---

## Backlog (sin fecha)

- [ ] Asistencia a entrenamientos fuera de concentración
- [ ] Persistencia del tablero táctico (sistemas frecuentes)
- [ ] Penales vinculados a partidos
- [ ] Resumen exportable al cerrar una concentración
- [ ] Modo multi-dispositivo para registro de partido en vivo
