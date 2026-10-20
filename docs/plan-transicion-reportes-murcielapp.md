# Transición de Reportes a registros diarios de MurcielApp

Estado: implementación preparada en rama; publicación coordinada y cotejo con la planilla real pendientes. Actualizado: 20 de octubre de 2026.

Ver [implementación, comprobaciones y publicación](puesta-en-marcha-reportes-murcielapp.md). La nueva vista reutiliza el lector privado y agrega el plantel mínimo, sin copiar los registros a otra fuente. La edición y eliminación se aplican también a Gestión y Mi semana. El informe con IA de registros diarios se mantiene pendiente; los informes existentes quedan dentro del histórico.

## Decisión operativa

- Del 12 al 18 de octubre conviven el registro diario en MurcielApp y el reporte semanal anterior.
- El lunes 19 de octubre las jugadoras completan por última vez el formulario semanal, referido a la semana del 12 al 18. «Mi semana» sirve para consultar sus registros; no envía ese formulario.
- Desde el 19 de octubre las jugadoras registran estímulos solamente en MurcielApp. Reportes de Herramientas CT será el lugar único de análisis para el CT.
- Los reportes históricos se conservan. Los registros diarios de la semana de transición pueden consultarse en detalle, pero no se suman a los totales del reporte semanal.

## Fuentes y reglas de unión

| Período entrenado | Fuente para los totales de Reportes | Otra fuente |
| --- | --- | --- |
| Hasta el 18/10/2026 | Planilla de reportes semanales | Registros diarios visibles como detalle, sin sumarlos al total |
| Desde el 19/10/2026 | `MurcielApp_Estimulos` | El formulario semanal deja de alimentar los totales |

- El corte usa la **fecha del estímulo** o la **semana trabajada** del reporte anterior, no la fecha en que se cargó el dato. Una carga retrospectiva conserva su fecha de entrenamiento.
- Unir a cada jugadora mediante `Persona_ID`. Las filas históricas que solo tienen nombre necesitan conciliación explícita; las que no coincidan no se asignan por aproximación silenciosa.
- Conservar cantidad de estímulos, minutos y carga interna como medidas distintas. Carga interna = duración en minutos × sRPE para Físico y Técnico-táctico. «Otros» suma registros y minutos, sin sRPE ni carga interna.
- La falta de registros significa «sin datos registrados»; no demuestra que una jugadora no entrenó. Evitar alertas, rankings o textos que interpreten ausencia como incumplimiento.

## Incrementos, uno por módulo/problema/commit

### 1. Contrato de lectura privado y conciliación

Reutilizar primero `murcielapp_adminEstimulos`, que ya lee `MurcielApp_Estimulos` con rango de fechas, `Persona_ID`, fecha, tipo, subtipo, duración, sRPE e identificador de registro. Usar la sesión administrativa existente. Ampliar el endpoint solo si una necesidad comprobada lo exige. Mantener los datos personales fuera de `site_getContext` y `getClientData`, que hoy pueden consultarse sin esa sesión.

Comprobar: autorización obligatoria; Santiago de prueba excluido; límites de rango y volumen; fechas y nombres válidos; respuesta explícita ante errores; ningún dato sensible en URL o caché pública. Revisar paginación o agregación en servidor antes de permitir períodos mayores a los límites actuales de 366 días o 5000 filas.

**Terminado cuando:** la lectura privada coincide con la hoja fuente y la vista actual de Gestión para un mismo rango, sin filas duplicadas ni jugadoras mal vinculadas.

### 2. Modelo semanal diario y corte histórico

Agrupar registros diarios por semana calendario de lunes a domingo, según `America/Argentina/Buenos_Aires`, usando la fecha del estímulo. Mantener separada la lógica anterior, que asigna un formulario cargado a la semana trabajada previa. Aplicar el corte del 19/10 en un solo lugar del modelo de datos.

**Terminado cuando:** la semana del 12 al 18 usa solo el formulario en los totales, la del 19 al 25 usa solo MurcielApp y una carga retrospectiva aparece en la semana entrenada. Verificar bordes de domingo/lunes y cambio de año.

### 3. Vista operativa en Reportes

Mostrar plantel y jugadora, por día y por semana: cantidad por tipo, minutos, sRPE de cada registro, carga interna y evolución. Incluir filtros por jugadora, semana y rango, así como CSV de la vista. Identificar la fuente de cada período y mostrar hora de actualización. Proveer «Actualizar datos» sin depender de caché pública para los datos privados.

**Terminado cuando:** las cifras visibles y el CSV coinciden con los registros fuente para varias jugadoras, incluido «Otros» sin sRPE. La vista sigue siendo legible con teclado y lector de pantalla.

### 4. Informes, texto y auditoría

Adaptar las plantillas semanal, periódica e individual, y el informe con IA, al nuevo modelo. Retirar de los períodos diarios los estados «No cargó», «pendientes de carga», rankings de continuidad y conclusiones automáticas basadas en ausencia. Mantener esos análisis históricos solo donde corresponden y con su fuente identificada. Revisar la auditoría antigua antes de aplicarla a estímulos diarios.

**Terminado cuando:** ningún informe mezcla cantidades del formulario con minutos o carga interna; las conclusiones citan período y fuente; los días sin registro no se presentan como incumplimiento; la IA recibe solamente los datos y definiciones correctos.

### 5. Verificación y puesta en marcha

Comparar con datos reales el panel de Gestión, la hoja `MurcielApp_Estimulos` y Reportes. Probar el corte con la carga final del lunes 19 antes de considerarlo cerrado. Mantener el formulario anterior accesible solo para consultar el historial y retirar sus instrucciones de carga una vez verificada la última recepción. Confirmar que los registros de las jugadoras siguen visibles en «Mi semana».

**Terminado cuando:** Reportes muestra el historial anterior, la semana de transición sin doble conteo y la nueva semana diaria; el CT puede generar y exportar un informe fiable desde una sola pantalla.

## Archivos previstos

- `gas/base-deporte/MurcielApp.js`: lectura privada o agregación adicional si el endpoint actual no alcanza.
- `worker.js`: ruta restringida si se agrega una acción nueva; nunca incluir estos datos en el contexto público.
- `reportes/index.html` y, si conviene separar la lógica, un módulo JS propio de Reportes: unión, vistas e informes.
- `gas/reportes/Código.js`: revisar la generación de informes y auditoría ligada al esquema semanal anterior.
- `tests/`: bordes temporales, exclusión de Santiago, doble conteo, agregados y control de acceso.

La pantalla actual de `gestion-murcielapp/` conserva su función de revisión administrativa. La fuente de verdad permanece en las hojas existentes; Reportes consulta y analiza, sin crear una copia persistente de los estímulos.

## Orden para esta transición

- **Antes del lunes 19:** cerrar los incrementos 1 a 3 y cotejar manualmente las cifras con registros reales. El formulario semanal sigue funcionando durante esta semana.
- **Lunes 19:** recibir la última carga semanal; comprobar que corresponde al 12–18 y fijar ese período como histórico sin doble conteo.
- **Después de esa comprobación:** cerrar incrementos 4 y 5 y retirar las indicaciones de carga del formulario anterior. Los informes nuevos se habilitan tras verificar su fuente y lenguaje.
