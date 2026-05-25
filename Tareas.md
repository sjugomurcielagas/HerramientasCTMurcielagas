# Tareas

> Tablero vivo. Solo trabajo abierto. Lo resuelto se borra.

## En proceso

| Tarea | Nota |
|---|---|
| `renderTrainingContext()` en `concentraciones/index.html` (línea 560) busca `#reporteContextoList` que no existe en el HTML | Feature a medio construir. No rompe nada (tiene `if(!cont)return`), pero el contexto de reportes vinculados nunca se muestra. Terminar o eliminar. |
| `--celeste: #118ac0` en `reportes/index.html` vs `#22a8e8` estándar | Inconsistencia visual menor. Botones y barras de acento tienen un azul más oscuro solo en ese módulo. |
| Barrido fino de cruce por `persona_id` en módulos secundarios | `reportes` y `analisis` podrían seguir cruzando plantel por DNI en algunos flujos. Verificar antes del próximo push transversal. |

## Regla de mantenimiento

- Este archivo solo refleja trabajo vivo.
- Cuando una tarea se cierra en un push, se elimina de acá.
- Si aparece un punto de falla nuevo, se agrega con una nota corta.
