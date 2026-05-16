# Cloudflare Worker Referencia

Fecha de corte: 2026-05-16

Documento de referencia del backend compartido. No es el código desplegado: es el contrato consolidado para modificar una sola vez y mantener consistencia entre `reportes`, `base-datos`, `analisis`, `concentraciones` y `antidoping`.

## Objetivo

- Centralizar el contrato de acciones del Worker.
- Definir hojas, campos y normalizaciones esperadas.
- Evitar que cada frontend invente variantes de nombres de campo.
- Servir como base antes de tocar Apps Script o frontends.

## Piezas que integran el contrato

- URL base: `https://murcielagas-reportes-api.sjugomurcielagas.workers.dev`
- Acceso por `action` en `GET` o `POST`
- Respuesta estándar: `{ ok: true, data: ... }` o `{ ok: false, error: ... }`
- Convención de acciones: `{modulo}_{verbo}`

## Módulos y acciones

### Base

- `base_verificarPassword`
- `base_getPlantel`
- `base_getFicha`
- `base_guardarCambios`
- `base_subirArchivo`
- `base_darDeBaja`
- `base_getAlertas`
- `base_agregarColumna`

### Penales

- `penales_getSesiones`
- `penales_crearSesion`
- `penales_editarSesion`
- `penales_getPenales`
- `penales_registrarPenal`
- `penales_eliminarPenal`

Campos esperados:

- `sesionId`
- `jugadora`
- `arquera`
- `zona`
- `potencia`
- `resultado`
- `timestamp`

Compatibilidad:

- aceptar `sesion_id` como alias de `sesionId`
- normalizar `jugadora_dni` y `arquera_dni` cuando vengan desde el frontend

### Partidos

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

### Concentraciones

- `concentraciones_getConcentraciones`
- `concentraciones_crearConcentracion`
- `concentraciones_editarConcentracion`
- `concentraciones_eliminarConcentracion`
- `concentraciones_getDias`
- `concentraciones_agregarActividad`
- `concentraciones_editarActividad`
- `concentraciones_eliminarActividad`
- `concentraciones_generarConvocatoria`
- `concentraciones_getTiposDocumento`
- `concentraciones_validarDatosDocumentos`
- `concentraciones_generarDocumentos`
- `concentraciones_getDocumentosGenerados`

Documentos previstos:

- `convocatoria_fadec`
- `licencia_agencia_cordoba`
- `licencia_municipalidad_cordoba`
- `certificacion_participacion`

### Antidoping

- `antidoping_buscarMedicamento`
- `antidoping_getFrecuentes`
- `antidoping_getHistorial`

### Reportes

- `getClientData`

## Hojas y configuración

### Base estructural

- `Password`
- `Plantel`
- `ColumnasDinamicas`

### Penales

- `SesionesPenales`
- `Penales`

### Partidos

- `Partidos`

### Concentraciones

- `Concentraciones`
- `ConcentracionDias`
- `Config_Plantillas`
- `Config_Carpetas`
- `Documentos_Generados`

### Testeos

- `Testeos`
- `TesteosMediciones`

### Antidoping

- `Antidoping_Frecuentes`
- `Antidoping_Historial`

## Reglas de normalización

- Preferir `sesionId` como campo canónico.
- Si el frontend manda `sesion_id`, traducirlo sin perder compatibilidad.
- `Penales` debe conservar `arquera` en persistencia y lectura.
- Fechas ISO: normalizar a `YYYY-MM-DD` o `timestamp` completo según el caso.
- Campos vacíos: devolver `''` o `null` de forma consistente, no mezclar tipos.

## Reglas de diseño del backend

- El Worker debe tolerar hojas faltantes cuando la referencia documental todavía no se inicializó.
- Si una hoja de configuración no existe, el backend debe caer a fallback limpio.
- Las acciones documentales no deben exigir datos hardcodeados en el frontend.
- Si el Worker real cambia, este documento es el primero que se actualiza.

## Inicialización sugerida

1. Crear o validar las hojas del contrato.
2. Cargar configuraciones documentales.
3. Verificar `base_*`.
4. Verificar `penales_*`.
5. Verificar `partidos_*`.
6. Verificar `concentraciones_*`.
7. Verificar `antidoping_*`.

## Riesgo actual

- `worker-additions.gs` sigue siendo una referencia de contrato, no una prueba de despliegue.
- La versión productiva del Worker debe validarse antes de asumir que todo esto está activo.
