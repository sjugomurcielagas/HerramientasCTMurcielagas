# Tareas

> Tablero vivo de continuidad. No es historial permanente.
> En cada commit/push grande se elimina lo resuelto.

## 1) Pendiente heredado y estado actual

| Pendiente heredado | Que se hizo en esta sesion | Estado |
|---|---|---|
| Limpieza de textos tecnicos visibles en frontend | Se limpio portada y modulos principales, y se hizo barrido transversal con QA automatizado. | En proceso |
| Unificacion transversal de patrones compartidos (`Murci` + UX) | `reportes/index.html` migro su capa de backend a `Murci` y se consolido el flujo de chequeo previo a push. | En proceso |
| Auditoria de duplicaciones visuales y simplificacion de vistas/botones | Se redujo ruido en varias vistas; queda pasada fina en superficies secundarias. | En proceso |

## 2) En proceso

| Tarea en curso | Estado | Nota operativa |
|---|---|---|
| Revision visual final completa del sitio | En proceso | Validacion tecnica completa OK; queda chequeo manual final en navegacion real desktop/mobile. |
| Barrido final de copys secundarios | En proceso | Se ajustaron portada y antidoping; quedan detalles menores a revisar por uso diario del CT. |
| Cierre operativo de tanda transversal | En proceso | Commit/push final usando `scripts/ship-safe.ps1` cuando cierre la pasada completa. |

## 3) Nuevos pendientes agregados

| Nuevo pendiente | Estado | Nota |
|---|---|---|
| Mantener QA automatizado como paso obligatorio pre-push | Pendiente | Ejecutar `scripts/qa-fast.ps1` o `scripts/ship-safe.ps1` en cada corte grande. |

## 4) Regla de mantenimiento (obligatoria)

- Este archivo se usa como tablero vivo.
- Al finalizar cada commit/push grande, eliminar lo ya resuelto.
- Mantener solo: pendiente heredado, estado actual, en proceso y nuevos pendientes.
