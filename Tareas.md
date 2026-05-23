# Pendientes

> Estructura de trabajo:
> - Qué venía pendiente de la sesión anterior.
> - Qué se hizo en esta sesión.
> - Si quedó resuelto o no.
> - Qué quedó en proceso.
> - Qué nuevos pendientes se agregaron.
> - Al terminar cada commit o push grande, borrar lo que ya quedó resuelto.

## Sesión anterior — pendientes y estado actual

| Pendiente | Qué se hizo | Estado |
|---|---|---|
| Base de datos — Error al abrir ficha desde alertas | `toInputDate` quedó disponible en el contexto compartido y la ficha abre sin romper desde alertas. | Resuelto |
| Base de datos — Duplicación en la ficha | Se limpiaron los bloques repetidos y quedaron solo las tarjetas finales de archivos / estados. | Resuelto |
| Antidoping — Medicamentos inventados y variantes comerciales | Se endureció la búsqueda, se separaron variantes y se diferenció la carga de frecuentes. | Resuelto con validación pendiente |
| Generación de documentos — Entidad convocante con nombre completo | La convocatoria y los placeholders priorizan el nombre completo de la Federación Argentina de Deportes para Ciegos. | Resuelto |
| Reportes — Prompt y modelo de IA | Se dejó el prompt más guiado y el backend sigue con `gpt-4.1-mini` por defecto. | Resuelto |
| Rendimiento — Precargas iniciales | Antidoping difiere frecuentes y Reportes difiere el contexto pesado hasta que hace falta. | Resuelto |

## En proceso

| Pendiente | Estado | Nota |
|---|---|---|
| Antidoping — Revisión con casos reales | En proceso | Probar con ejemplos concretos de nombres comerciales y verificar que cada versión aparezca con su propio veredicto. |
| Reportes — Ajuste visual final | En proceso | Hacer una pasada visual en navegador para confirmar que el panel de referencias quedó más liviano y que no se rompió la composición. |
| Rendimiento — Otros módulos | En proceso | Seguir mirando si hay otro módulo que siga precargando de más o mostrando pantallas vacías al inicio. |

## Nuevos pendientes agregados

| Pendiente | Estado | Nota |
|---|---|---|
| Unificar lógica compartida después del repaso manual | Pendiente | Cuando termines de pulir a mano los módulos e instrucciones, unificamos la lógica repetida entre archivos. |
| Depurar `Tareas.md` tras cada commit o push grande | Pendiente permanente | Todo lo que ya quedó resuelto se borra de acá para no arrastrar historial viejo. |

## Regla de mantenimiento

- Esta lista no es histórico: es tablero vivo.
- Si algo quedó resuelto en una sesión grande, se elimina del archivo en el siguiente corte.
- Si algo sigue abierto pero cambió de prioridad, se mueve de sección.
- Si aparece un bloqueo nuevo, se agrega al bloque **Nuevos pendientes agregados**.
