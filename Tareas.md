# Tareas

> Tablero vivo de continuidad.
> No es historial permanente: al cerrar un commit/push grande, borrar lo resuelto y dejar solo lo que sigue vivo.

> Modo de trabajo: no pedir explicaciones técnicas salvo que se soliciten; ejecutar directamente lo que sirva, sea sólido o recomendable; tratar al usuario como quien da directivas y evalúa resultados.

## 1) Pendientes heredados y cierre de sesión

| Pendiente heredado | Lo que se hizo | Estado |
|---|---|---|
| Antidoping rompía la búsqueda con medicamentos conocidos y marcas con variantes | Se corrigió el render, se agregó fallback local por marca comercial y se devolvieron variantes candidatas cuando corresponde. | Resuelto |
| Falta de una referencia interna única para una misma jugadora en todos los módulos | Se agregó `persona_id` como referencia canónica visible solo para el sistema, con helpers compartidos para cruzar plantel entre módulos. | Parcial: queda barrido fino de módulos secundarios |
| Tablero no reconocía bien a las arqueras y seguía mostrando un botón PWA viejo | Se corrigió la detección de arqueras y se eliminó el banner legacy de instalación. | Resuelto |
| Base de datos mostraba duplicaciones en ficha y cargaba más de lo necesario | Se redujeron duplicaciones visibles, se corrigió el cruce de TUE en ficha y se alivianó la carga inicial. | Resuelto |
| Portada y módulos abrían con demasiadas precargas | Se achicó el service worker, se diferieron cargas pesadas y se bajó el costo de arranque. | Resuelto |

## 2) En proceso

| Tarea en curso | Estado | Nota operativa |
|---|---|---|
| Barrido final de referencias viejas por DNI en módulos secundarios | En proceso | Revisar `reportes`, `analisis` y `concentraciones` para que toda cruce real pase por `persona_id` cuando corresponda. |
| Verificación visual final en navegador y celular | En proceso | Confirmar que la última ronda de velocidad, caché y unificación no rompió navegación ni cargas diferidas. |

## 3) Nuevos pendientes agregados

| Nuevo pendiente | Estado | Nota |
|---|---|---|
| Mantener `scripts/qa-fast.ps1` como paso obligatorio antes de cada push grande | Pendiente | Usarlo siempre que se cierre una tanda transversal. |
| Antes de cerrar una tanda, borrar de este archivo todo lo ya resuelto | Pendiente | Dejar solo lo que siga vivo y no repetir tareas cerradas. |

## 4) Regla de mantenimiento

- Este archivo solo debe reflejar trabajo vivo.
- Si una tarea ya quedó resuelta y el cambio fue incluido en un push grande, se elimina del tablero.
- Si una tarea quedó a medias, se deja en `En proceso` con una nota corta y concreta.
