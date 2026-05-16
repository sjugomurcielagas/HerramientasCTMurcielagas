# Estado del sitio y pendientes

Fecha de corte: 2026-05-15

Documento de traspaso para retomar el trabajo desde Codex o Claude sin depender del hilo de conversación.

## 1. Qué está funcionando hoy

- `index.html` centraliza el acceso a `reportes`, `tactica`, `base-datos`, `concentraciones`, `antidoping` y `analisis`.
- `concentraciones/index.html` crea y edita concentraciones, guarda convocatoria y carga actividades/días.
- `analisis/penales/index.html` registra penales y ya quedó alineado con `sesionId` y `jugadora`.
- `reportes/index.html` carga datos desde backend y conserva filtros/estado local.
- `tactica/index.html` funciona como tablero canvas con exportación y PWA.
- `base-datos/index.html` permite ficha editable, subida de archivos y baja lógica.
- `antidoping/index.html` responde como consulta interna orientativa con fallback cuando no hay backend disponible.

## 1.1 Descubrimientos confirmados hoy

- En penales había una desalineación de contrato: el frontend filtraba por `sesion_id`, mientras el backend usa `sesionId`.
- La hoja/contrato de `Penales` no persistía `arquera`, aunque el módulo la usa en lista y estadísticas.
- Los botones inline de penales estaban inyectando UUIDs sin comillas, lo que podía romper `Activar` y `Eliminar`.
- El backend de referencia sigue siendo un contrato auxiliar; la publicación real del Worker sigue siendo un punto a validar.

## 2. Lo que está incompleto o es frágil

- La generación documental automática en `concentraciones` no está implementada en backend.
- `worker-additions.gs` solo documenta contratos y no prueba que el Worker productivo tenga esas acciones activas.
- El PWA de `tactica` referencia `icon-192.png`, pero ese archivo no existe en el repo.
- Varios módulos siguen con login bypass activo para etapa de prueba.
- Algunos módulos siguen usando `fetch(...).json()` directo y son frágiles ante respuestas no JSON.

## 3. Estado por módulo

### Hub principal

- Está operativo.
- Navegación relativa correcta.
- No requiere cambios inmediatos.

### Reportes

- Funcional con observaciones.
- Depende de `getClientData` y del formato de respuesta del backend.
- Tiene manejo parcial de errores y almacenamiento local.

### Táctica

- Funcional con observaciones.
- El canvas, el historial local y la exportación funcionan.
- El PWA necesita revisar el icono faltante y la robustez del cache.

### Base de datos

- Funcional con observaciones.
- Login activo en modo de prueba.
- Carga/edición de ficha y archivos ya están implementadas.

### Concentraciones

- Funcional con observaciones.
- Crear, editar, convocar y registrar actividades funcionan.
- Falta el flujo documental automático completo.

### Antidoping

- Funcional con observaciones.
- La UI está preparada para consulta interna y fallback.
- Falta backend real para validación y trazabilidad completa.

### Análisis

- El hub de análisis está correcto.
- `partidos` y `penales` funcionan, pero conviene revisar contratos del backend, migraciones de hoja y robustez de fetch.

## 4. Pendiente específico: generación documental en Concentraciones

### Objetivo de la próxima sesión

Agregar un flujo frontend para seleccionar documentos y personas desde una concentración ya guardada, validar datos faltantes y disparar la generación documental al backend.

### Lo que el frontend debe seguir usando

- `nombre`
- `fechaInicio`
- `fechaFin`
- `lugar`
- `notas`
- `convocadas_json`

### Lo que no debe pedir al usuario

- Federación convocante.
- Selección.
- Datos personales ya cargados en la base.
- Cargos administrativos hardcodeados.
- URLs hardcodeadas.

### Acciones preparadas para futuro backend

- `concentraciones_getTiposDocumento`
- `concentraciones_validarDatosDocumentos`
- `concentraciones_generarDocumentos`
- `concentraciones_getDocumentosGenerados`

### Documentos previstos

- `convocatoria_fadec`
- `licencia_agencia_cordoba`
- `licencia_municipalidad_cordoba`
- `certificacion_participacion`

## 5. Qué conviene dejar activo

- Hub principal.
- Concentraciones básicas: crear, editar, convocatoria, días y actividades.
- Penales.
- Partidos.
- Reportes.
- Base de datos.
- Táctica.
- Antidoping.

## 6. Qué conviene desactivar o dejar en espera cuando se vuelva a tocar código

- Botones o flujos que dependan de acciones documentales no implementadas.
- Cualquier UI que prometa generar PDFs sin backend real.
- Login bypass de prueba cuando vuelva a haber una etapa de acceso controlado.

## 7. Riesgos a revisar antes de tocar código

- Confirmar si el Worker productivo ya expone las nuevas acciones documentales.
- Confirmar si existe una hoja de configuración de plantillas/carpeta en Apps Script.
- Confirmar la clave de vínculo entre Base de Datos Personal y Config_Documentos: `persona_id` o DNI normalizado.
- Confirmar migración real de la hoja `Penales`: columnas `arquera`, `sesionId` y compatibilidad con registros viejos.
- Confirmar que todos los `onclick` inline que reciben IDs usan comillas seguras.
- Confirmar si el PWA de tácticas debe instalarse con un icono nuevo o si se reemplaza el manifiesto.

## 8. Orden recomendado para retomar mañana

1. Confirmar backend documental real disponible.
2. Validar que el Worker productivo tenga el contrato de penales alineado con el frontend.
3. Resolver migración de la hoja `Penales` y revalidar carga histórica.
4. Construir el modal o panel de generación documental en `concentraciones`.
5. Validar datos faltantes antes de generar.
6. Mostrar links de PDF generados.
7. Después, revisar si corresponde reactivar el login en módulos internos.
