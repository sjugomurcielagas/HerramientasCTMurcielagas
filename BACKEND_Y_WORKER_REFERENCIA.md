# Backend y Worker - referencia de orden

Fecha de corte: 2026-05-15

Objetivo: arrancar por backend antes de tocar más frontend, porque hay scripts repartidos entre varias hojas y el contrato real puede estar fragmentado.

## Prioridad de trabajo

1. Ordenar contratos backend.
2. Identificar qué vive en Worker y qué vive en Apps Script.
3. Confirmar hojas, acciones y nombres de campos.
4. Recién después conectar o ampliar frontend.

## Hallazgos confirmados hoy

- Penales estaba desalineado en el cliente: se filtraba por `sesion_id`, pero el contrato real usa `sesionId`.
- La hoja `Penales` necesita `arquera` persistida para que el módulo de análisis no pierda información al recargar.
- Los `onclick` de penales deben serializar IDs con comillas seguras; UUIDs sin comillas rompen acciones.
- `worker-additions.gs` sigue siendo un contrato auxiliar; no reemplaza la validación del Worker productivo.

## Contratos visibles hoy

### Worker / API

- `API_BASE_URL` apunta a `https://murcielagas-reportes-api.sjugomurcielagas.workers.dev`.
- El frontend usa acciones `base_*`, `penales_*`, `partidos_*`, `concentraciones_*`, `antidoping_*` y `getClientData`.
- En el repo hay un archivo auxiliar `worker-additions.gs` con contrato comentado, pero no prueba despliegue real.

### Acciones que ya aparecen en el frontend

- Base:
  - `base_verificarPassword`
  - `base_getPlantel`
  - `base_getFicha`
  - `base_guardarCambios`
  - `base_subirArchivo`
  - `base_darDeBaja`
  - `base_getAlertas`
- Penales:
  - `penales_getSesiones`
  - `penales_crearSesion`
  - `penales_getPenales`
  - `penales_registrarPenal`
  - `penales_eliminarPenal`
  - Campos esperados en la práctica:
    - `sesionId`
    - `jugadora`
    - `arquera`
    - `zona`
    - `potencia`
    - `resultado`
    - `timestamp`
- Partidos:
  - `partidos_getPartidos`
  - `partidos_getDetalle`
  - `partidos_crearPartido`
  - `partidos_actualizarPartido`
  - `partidos_guardarDetalle`
  - `partidos_guardarConvocatoria`
  - `partidos_guardarRatings`
  - `partidos_agregarMomento`
  - `partidos_eliminarMomento`
  - `partidos_eliminarPartido`
- Concentraciones:
  - `concentraciones_getConcentraciones`
  - `concentraciones_crearConcentracion`
  - `concentraciones_editarConcentracion`
  - `concentraciones_eliminarConcentracion`
  - `concentraciones_getDias`
  - `concentraciones_agregarActividad`
  - `concentraciones_editarActividad`
  - `concentraciones_eliminarActividad`
- Antidoping:
  - `antidoping_buscarMedicamento`
  - `antidoping_getFrecuentes`
  - `antidoping_getHistorial`

## Hojas que ya aparecen en el contrato auxiliar

Desde `worker-additions.gs` se mencionan:

- `Password`
- `Plantel`
- `SesionesPenales`
- `Penales`
- `Partidos`
- `Concentraciones`
- `ConcentracionDias`
- `Testeos`
- `TesteosMediciones`
- `ColumnasDinamicas`

## Pendientes de backend que conviene resolver primero

- Generación documental en concentraciones.
- Contrato real de acciones documentales:
  - `concentraciones_getTiposDocumento`
  - `concentraciones_validarDatosDocumentos`
  - `concentraciones_generarDocumentos`
  - `concentraciones_getDocumentosGenerados`
- Mapas de plantillas:
  - `Config_Plantillas`
  - `Config_Carpetas`
  - `Documentos_Generados`
- Vinculación de persona:
  - `persona_id`
  - o `dni_normalizado` como puente transitorio
- Migración y validación de `Penales` en producción:
  - agregar `arquera` a la hoja real si no existe
  - aceptar `sesion_id` como alias de compatibilidad
  - verificar lectura de registros históricos
- Revisión de acciones de penales en el Worker real:
  - confirmar que `penales_registrarPenal` persiste todos los campos usados por la UI
  - confirmar que `penales_getPenales` devuelve el esquema que el frontend normaliza

## Qué hace falta ordenar mañana

1. Confirmar dónde vive cada script.
2. Confirmar cuál es el Worker productivo real y qué rutas expone.
3. Cerrar contrato de `Penales` con migración de hoja y compatibilidad histórica.
4. Separar documentos de referencia por hoja o por archivo.
5. Establecer un contrato único por módulo.
6. Después conectar frontend documental.

## Documentos de referencia recomendados

- Contrato del Worker.
- Inventario de hojas reales por script.
- Mapa de acciones por módulo.
- Mapa de campos base.
- Mapa documental:
  - plantillas
  - carpetas
  - datos personales
  - datos administrativos
  - trazabilidad de PDFs

## Regla de trabajo para la próxima sesión

- Empezar por backend.
- No tocar frontend documental hasta validar hojas, acciones y nombres de campo.
- No duplicar datos personales en configuración documental.
- No hardcodear URLs, carpetas ni template IDs en frontend.
