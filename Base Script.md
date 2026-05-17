# Base Script

Fecha de corte: 2026-05-17

Documento de referencia del Google Apps Script `gas/base-deporte/Código.js`. Cubre base administrativa, penales, partidos, concentraciones y testeos.

## Acciones — Base

Ruteadas por el Worker via `BASE_ACTION_MAP` (el prefijo `base_` se convierte al nombre corto antes de llegar al GAS).

- `base_verificarPassword` → `verificarPassword`
- `base_getPlantel` → `getPlantel`
- `base_getFicha` → `getFicha`
- `base_getFaltantes` → `getFaltantes`
- `base_getAlertas` → `getAlertas`
- `base_guardarCambios` → `guardarCambios`
- `base_darDeBaja` → `darDeBaja`
- `base_subirArchivo` → `subirArchivo`
- `base_agregarColumna` → `base_agregarColumna` (nombre completo, sin stripping)

> Nota: `base_ordenarColumnasBase` está mapeada en el Worker pero no tiene `case` en el GAS.

## Acciones — Penales

- `penales_getSesiones`
- `penales_crearSesion`
- `penales_editarSesion`
- `penales_getPenales`
- `penales_registrarPenal`
- `penales_eliminarPenal`

Campos persistidos en hoja `Penales`: `sesionId`, `jugadora`, `arquera`, `zona`, `potencia`, `resultado`, `timestamp`.

## Acciones — Partidos

- `partidos_getPartidos`
- `partidos_getDetalle`
- `partidos_crearPartido`
- `partidos_actualizarPartido`
- `partidos_eliminarPartido`
- `partidos_guardarDetalle`
- `partidos_guardarConvocatoria`
- `partidos_guardarRatings`
- `partidos_agregarMomento`
- `partidos_eliminarMomento`
- `partidos_getMetricas`

## Acciones — Concentraciones

- `concentraciones_getConcentraciones`
- `concentraciones_crearConcentracion`
- `concentraciones_editarConcentracion`
- `concentraciones_eliminarConcentracion`
- `concentraciones_getDias`
- `concentraciones_agregarActividad`
- `concentraciones_editarActividad`
- `concentraciones_eliminarActividad`
- `concentraciones_generarConvocatoria` — genera la convocatoria FADEC
- `concentraciones_getTiposDocumento`
- `concentraciones_validarDatosDocumentos`
- `concentraciones_generarDocumentos` — genera convocatoria, licencias y certificación según `tiposDocumento`
- `concentraciones_getDocumentosGenerados`

## Acciones — Testeos

- `testeos_getTesteos`
- `testeos_crearTesteo`
- `testeos_agregarMedicion`
- `testeos_editarMedicion`
- `testeos_eliminarMedicion`

## Hojas reales (nombre exacto en Sheets)

| Clave interna       | Nombre real en Sheets              |
|---------------------|------------------------------------|
| `plantel`           | `Las_Murcielagas_Base_Personal`    |
| `sesionesPenales`   | `SesionesPenales`                  |
| `penales`           | `Penales`                          |
| `partidos`          | `Partidos`                         |
| `concentraciones`   | `Concentraciones`                  |
| `concentracionDias` | `ConcentracionDias`                |
| `testeos`           | `Testeos`                          |
| `testeosMediciones` | `TesteosMediciones`                |
| `columnasDinamicas` | `ColumnasDinamicas`                |

> No existe hoja `Password`. La verificación de contraseña lee la hoja `Las_Murcielagas_Base_Personal`.

## Helpers internos relevantes

- `ensureColumn_(sheet, colName)` — agrega columna al final si no existe. Permite auto-extender el esquema sin tocar Sheets manualmente.
- `getOrCreateFolder_(parentId, nombre)` — crea subcarpeta en Drive si no existe.
- `formatFechaTextoGas_(fecha)` — convierte `yyyy-MM-dd` a texto natural (ej: "17 de mayo de 2026").
- `FORZAR_AUTORIZACION()` — función manual a ejecutar desde el editor una sola vez para pre-autorizar DriveApp, SpreadsheetApp y DocumentApp.

## Generación de convocatoria (Drive)

- Template: ID `1foA1M0ftQz7KAOWRgBHCRcewgdCJFdUPynpMYdyEmZM`
- Carpeta de generados: ID `1HtxDxNOxjm3xKs6N5t2SzDlp3TlXf8P1`
- Plantillas extra: se resuelven desde `Config_Plantillas` / `Config_Carpetas` si existen, con fallback a búsqueda por nombre en la carpeta de plantillas y, si hace falta, en todo Drive. Las copias `.docx` del repo no son necesarias.
- Placeholders: `{{FECHA_EMISION}}`, `{{LUGAR}}`, `{{DIRECCION_LUGAR}}`, `{{CIUDAD}}`, `{{FECHA_INICIO_TEXTO}}`, `{{FECHA_FIN_TEXTO}}`, `{{TABLA_CONVOCADAS}}`, `{{TIPO_ACTIVIDAD}}`
- `{{TABLA_CONVOCADAS}}` se reemplaza por una tabla de Google Docs con columnas `Nombre y apellido`, `DNI` y `Provincia de procedencia`.
- Si `File.getUrl()` viene vacío, el backend arma el enlace del documento con el ID del archivo para devolver siempre un link utilizable.

## Antidoping

Las acciones `antidoping_*` **no están** en el Worker ni en este GAS. El módulo antidoping funciona como consulta local con fallback — no tiene backend.
