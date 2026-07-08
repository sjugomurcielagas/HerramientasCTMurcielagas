# Tablero táctico — fixes pendientes

Auditoría realizada: 2026-07-08  
Archivo afectado: `tactica/index.html`  
Estado del código al cierre de sesión: commit `9fb2c5e`

---

## Contexto de la sesión

Se implementaron los siguientes cambios en esta sesión:

1. **Limpieza de código muerto** — funciones de fases heredadas sin botones en la UI (`getArrowPhase`, `setPhaseView`, `drawPhaseLabel`, etc.), constante `BALL_TYPES` duplicada, variable `drawPos` sin usar, script vacío del service worker.
2. **Bugs de roster y tokens** — `fillText(p.num)` dibujaba "null" para rivales sin número; `applyEdit()` no sincronizaba `p.apellido`; mensaje de nómina vacía mejorado.
3. **Bugs de flechas** — estado de curva sucio al cambiar de modo; `arrowFrom` no se limpiaba al salir del canvas; `press` en curva y trazo libre no tenía espinas.
4. **Canvas HiDPI** — buffer del canvas escalado al DPR del dispositivo (fix borrosidad en retina/mobile).
5. **Colores hardcodeados** — reemplazados por variables CSS del proyecto.
6. **Flechas vinculadas a tokens** — cada flecha nueva requiere origen en un token; guarda `ownerId`; toast si el origen no es un token. Retrocompatibilidad con flechas sin `ownerId`.
7. **Fase activa** — `state.activePhase`, control `[− F1 +]` en UI; todas las flechas nuevas usan `activePhase`.
8. **Anotaciones (freedraw y texto)** — `state.annotations[]`, dos nuevas herramientas, render en canvas, selección y borrado, etiquetas de fase tocables, guardado/carga completo.

---

## Fixes pendientes (resultado de auditoría)

### A — Bug confirmado: doble-commit en modo texto
**Severidad:** alta  
**Síntoma:** al confirmar con Enter, la misma anotación de texto se agrega dos veces al canvas.  
**Causa:** `commit()` llama `inp.remove()`, lo que dispara `blur`, que vuelve a llamar `commit()`.  
**Fix:** agregar flag `committed = false` al inicio de `openTextInput`; en `commit()`, hacer `if (committed) return; committed = true;` antes de todo lo demás.

---

### B — Bug confirmado: doble-tap en modo annotMode dispara editor de jugadora/flecha
**Severidad:** alta  
**Síntoma:** doble-tap sobre el canvas en modo freedraw o texto abre el editor de jugadora o el popup de flecha.  
**Causa:** los bloques `if (annotMode === 'freedraw')` e `if (annotMode === 'text')` solo hacen `return` cuando `!isDouble`. Cuando `isDouble === true`, el flujo cae al bloque siguiente que abre editors.  
**Fix:** agregar `if (isDouble) return;` al inicio de cada bloque de annotMode.

---

### C — Estado incorrecto: activePhase no se persiste
**Severidad:** media  
**Síntoma:** después de undo o de cerrar y reabrir el tablero, `activePhase` vuelve a 1 aunque el usuario estaba en otra fase.  
**Causa:** `saveHistory()`, `autosave()`, `undo()`, `tryRestoreAutosave()` e `importJSON()` no incluyen `activePhase`.  
**Fix:**
- `saveHistory()`: incluir `activePhase` en el snapshot.
- `undo()`: restaurar `activePhase` del snapshot + llamar al helper que actualiza el label UI.
- `autosave()`: incluir `activePhase` en el objeto guardado en localStorage.
- `tryRestoreAutosave()`: leer y asignar `activePhase`, actualizar label.
- `importJSON()`: leer `data.activePhase || 1`, asignar y actualizar label.

---

### D — Código frágil: MOVER_TYPES y DRIBBLE_TYPES usados antes de declararse
**Severidad:** media (no explota en el path actual, sí en refactors futuros)  
**Síntoma:** `resolvedPos` usa `MOVER_TYPES` y `DRIBBLE_TYPES` declarados como `const` cientos de líneas más abajo (zona muerta temporal).  
**Fix:** mover las declaraciones de `MOVER_TYPES` y `DRIBBLE_TYPES` al bloque de constantes globales al inicio del script, antes de cualquier función que las use.

---

### E — Input flotante huérfano al cambiar de modo
**Severidad:** media  
**Síntoma:** si el usuario activa modo texto, hace click (abre el input), y toca otro botón antes de confirmar, el input queda huérfano en el DOM.  
**Fix:** crear `closeTextInputIfOpen()` que elimine el input si existe. Llamarla al inicio de `toggleAnnotMode()` y `toggleArrowMode()`.

---

### F — Inconsistencia: exportJSON no clona los arrays
**Severidad:** baja  
**Síntoma:** `exportJSON` pasa `players`, `arrows`, `annotations`, `balls` por referencia; `saveExercise` los clona con `JSON.parse(JSON.stringify(...))`.  
**Fix:** en `exportJSON`, clonar el objeto `data` antes de `JSON.stringify`, igual que en `saveExercise`. O extraer `buildBoardSnapshot()` que ambos usen.

---

## Próximos pasos sugeridos

1. Corregir fixes A y B primero (bugs confirmados, impacto directo en UX).
2. Corregir C y E (estado inconsistente visible para el usuario).
3. Corregir D y F (fragilidad técnica, sin impacto UX inmediato).
4. Considerar: en la animación por fases, las anotaciones actualmente no se animan (no aparecen en `runAutoGroup` ni `drawFinalFrame`). Decidir si deben aparecer en la animación o solo en el modo edición.
