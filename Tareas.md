# Tareas

> Tablero vivo de continuidad. No es historial permanente.
> En cada commit/push grande se elimina lo resuelto.

## 1) Pendiente de la sesión anterior

| Pendiente heredado | Qué se hizo en esta sesión | Estado |
|---|---|---|
| Unificación técnica inicial en landing | Se unificó login de `index.html` al cliente compartido `Murci.apiPost` y se alineó `API_URL` con `Murci.apiBaseUrl`. | Resuelto |
| Estructura de seguimiento viva | Se volvió a ordenar este archivo al formato operativo pedido (continuidad + estado). | Resuelto |

## 2) En proceso

| Tarea en curso | Estado | Nota operativa |
|---|---|---|
| Limpieza de textos técnicos visibles en frontend (todos los módulos) | En proceso | Queda barrido fino final en copys secundarios; portada y módulos críticos ya ajustados. |
| Unificación transversal de patrones compartidos (`Murci` + mensajes UX) | En proceso | `reportes/index.html` ya usa `Murci` para su capa de backend; seguir con módulos restantes por tandas. |
| Auditoría de duplicaciones visuales y simplificación de vistas/botones | En proceso | Prioridad en pantallas con más carga inicial o bloques redundantes. |

## 3) Nuevos pendientes agregados

| Nuevo pendiente | Estado | Nota |
|---|---|---|
| Revisión visual final completa del sitio | Pendiente | Validar que no queden textos técnicos visibles ni solapamientos UI. |
| Cierre operativo | Pendiente | Commit/push final cuando cierre la tanda transversal. |

## 4) Regla de mantenimiento (obligatoria)

- Este archivo se usa como tablero vivo.
- Al finalizar cada commit/push grande, eliminar lo ya resuelto.
- Mantener solo: pendiente heredado, hecho/estado, en proceso y nuevos pendientes.
