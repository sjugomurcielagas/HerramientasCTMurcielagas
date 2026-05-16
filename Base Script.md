# Base Script

Fecha de corte: 2026-05-16

Documento de referencia del Google Apps Script de `base-datos`. También cubre las extensiones compartidas que hoy se usan para archivos, penales y otras hojas del backend común.

## Qué resuelve

- Gestión de ficha individual.
- Carga y reemplazo de archivos.
- Baja lógica de integrantes.
- Alertas de faltantes y vencimientos.
- Contratos compartidos que el resto del sitio consume.

## Acciones principales

- `base_verificarPassword`
- `base_getPlantel`
- `base_getFicha`
- `base_guardarCambios`
- `base_subirArchivo`
- `base_darDeBaja`
- `base_getAlertas`

## Contratos compartidos que puede alojar

- `penales_getSesiones`
- `penales_crearSesion`
- `penales_editarSesion`
- `penales_getPenales`
- `penales_registrarPenal`
- `penales_eliminarPenal`
- `partidos_*`
- `concentraciones_*`
- `antidoping_*`

## Responsabilidad de datos

### Plantel

- Fuente canónica de personas.
- Ficha editable.
- Archivos vinculados a `Foto_Link`, `DNI_Completo_Link`, `Pasaporte_Scan_Link`, `CUD_Link`, `Apto_Medico_Link` y `Anti_Doping_Link`.

### Penales

- Debe conservar `SesionesPenales` y `Penales` si este script comparte el backend.
- `Penales` debe persistir `sesionId`, `jugadora` y `arquera`.
- Los alias `sesion_id`, `jugadora_dni` y `arquera_dni` se aceptan solo como compatibilidad.

### Archivos

- El script es responsable de devolver links nuevos cuando se sube un archivo.
- La respuesta de subida debe ser estable y reutilizable por el frontend.

### Alertas

- `base_getAlertas` debe devolver al menos:
  - `faltantes`
  - `vencimientos`

## Reglas de edición

- La ficha individual es el lugar principal para editar datos.
- `base_guardarCambios` aplica cambios parciales, no reemplazos totales.
- La baja lógica no borra historial.
- Los archivos se reemplazan, no se destruyen en silencio.

## Hojas esperadas

- `Password`
- `Plantel`
- `ColumnasDinamicas`
- `SesionesPenales`
- `Penales`
- `Partidos`
- `Concentraciones`
- `ConcentracionDias`
- `Testeos`
- `TesteosMediciones`

## Criterios de mantenimiento

- Mantener compatibilidad con el frontend actual.
- No mezclar datos administrativos con reportes.
- No duplicar lógica documental si ya existe un Worker o script dedicado.
- Si este script se vuelve el backend compartido, su contrato debe quedar documentado antes de tocar frontend.

## Riesgos conocidos

- Hay referencias históricas al backend auxiliar `worker-additions.gs`.
- Si el entorno productivo ya separó responsabilidades, este documento debe ajustarse a esa división real.
- No asumir que `Penales` o `Partidos` viven aquí sin validar el backend desplegado.
