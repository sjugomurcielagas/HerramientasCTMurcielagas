# Auditoría de la convivencia de reportes — 12 al 18 de octubre de 2026

Revisión: 3 de noviembre de 2026. Lectura de las hojas fuente y verificación del reporte publicado. Diagnóstico y corrección implementada. Ver decisión actual más abajo.

## Hallazgo principal

El reporte publicado muestra 4 estímulos, todos de Micaela Segovia (3 físicos y 1 técnico-táctico). La fuente diaria contiene 64 filas para el 12–18, de las que una fue eliminada mediante MurcielApp_Correcciones. Quedan 63 estímulos vigentes de 9 jugadoras: 33 físicos, 17 técnico-tácticos y 13 Otros. Físico + Técnico-táctico: 50.

Los 4 de Segovia coinciden en cantidad y tipos con su formulario semanal del 20/10/2026, referido al 12–18. Esto indica solapamiento probable, no evidencia suficiente para sumarlos como cuatro entrenamientos adicionales.

Los registros diarios de las otras ocho jugadoras suman 59 (30 físicos, 16 técnico-tácticos, 13 Otros) y actualmente no alimentan los totales. Hay registros conservados en origen que no aparecen en la consulta.

| Jugadora | Diario vigente | Físico | Técnico | Otros | Total actualmente mostrado |
| --- | ---: | ---: | ---: | ---: | ---: |
| Corrales, Guillermina | 7 | 4 | 2 | 1 | 0 |
| Flores, Melisa Alejandra | 11 | 5 | 1 | 5 | 0 |
| Ligioi, Yanina Noemí | 9 | 3 | 3 | 3 | 0 |
| Massenzana, Florencia Belén | 6 | 4 | 2 | 0 | 0 |
| Medina Páez, Agustina Micaela | 3 | 2 | 0 | 1 | 0 |
| Rodas, Florencia Belén | 7 | 5 | 2 | 0 | 0 |
| Segovia, Micaela Alejandra | 4 | 3 | 1 | 0 | 4 |
| Sosa Barreneche, Gracia | 5 | 3 | 2 | 0 | 0 |
| Yanaje, Sandra Gabriela | 11 | 4 | 4 | 3 | 0 |

El estímulo eliminado es un técnico de Sandra Yanaje del 14/10. La eliminación se respetó en este análisis. No debe restaurarse al conciliar.

## Causa en el código

- reportes/murcielapp-model.js descarta de los totales todos los diarios con fecha anterior a CORTE = 2026-10-19, aunque la jugadora no tenga formulario semanal.
- La fuente histórica se limita a semanas cuyo lunes sea anterior al corte. Formularios que representen semanas posteriores también quedan fuera.
- El modelo conserva los diarios anteriores en detalleTransicion, pero reportes/murcielapp.js ya no representa ese detalle. La simplificación de la pantalla eliminó su visibilidad, además de la exclusión preexistente de los totales.
- La exportación usa únicamente model.registros y también omite esos diarios.
- Las pruebas anteriores verificaban la exclusión por corte como una regla esperada. No cubrían una semana sin formulario para una jugadora que sí tiene diarios.
- La decisión original asumía que todas completarían el último formulario para el 12–18. La hoja solo contiene un formulario correspondiente a esa semana.

## Formularios posteriores al cambio

Se revisaron las 609 respuestas existentes (filas 2–610). La última respuesta por fecha es la de Segovia del 20/10, con 4 estímulos. No se encontraron respuestas posteriores al 20/10 en esta hoja al momento de la lectura. Por lo tanto, el uso continuado del formulario viejo en semanas más recientes es una hipótesis que no se confirma con esta fuente actual.

La regla debe admitirlo igualmente: el canal utilizado no invalida el registro del entrenamiento.

## Semanas vecinas y otras incidencias

El reporte publicado muestra:
- 05–11/10: 44 estímulos históricos.
- 12–18/10: 4 estímulos históricos.
- 19–25/10: 72 estímulos diarios.

En la hoja diaria hay además 11 estímulos vigentes del 05–11/10. No se deben sumar automáticamente a los 44 históricos: requieren conciliación por jugadora y semana.

La lógica del formulario asigna por defecto la carga a la semana anterior. Una carga el 19/10 se asigna al 12–18. Una carga el 26/10 se asigna al 19–25, aunque una persona hubiera querido informar una semana más antigua. También existe una heurística de carga anticipada de fin de semana y sustitución por la última respuesta de la misma jugadora/semana. Se reprodujeron esas reglas con datos sintéticos; no constituyen prueba de desplazamientos concretos en las filas reales.

La comparación publicada del 05–25/10 también muestra identidades separadas para “Camus, Gianella” y “Camus Carricondo, Gianella María Jesús”, así como “Ortiz, Micaela” y “Ortiz, Anahí Micaela”. La conciliación de personas necesita identificadores o alias explícitos; no debe resolver estas variantes solo con aproximación de nombres.

Otra inconsistencia de origen: la fila 603 del formulario (Gracia, cargada el 12/10 y asignada al 05–11) informa total 0 y físico 1. Debe señalarse para revisión; no corregir el total original silenciosamente.

## Decisión actual e implementación

El usuario indicó explícitamente que los registros se deben conservar sin importar el sistema y que, ante la duda, se aplique el criterio favorable a la jugadora. Esta instrucción reemplaza el corte rígido y la propuesta inicial de dejar diferencias sin resolver.

- Se consultan ambos sistemas para cualquier fecha, agrupando por identidad y semana entrenada.
- Los diarios vigentes cuentan antes y después del 19/10, respetando las correcciones y eliminaciones de origen.
- Si solo hay formulario semanal, cuenta aunque sea posterior al 19/10.
- Si hay ambas fuentes, se conserva la mayor cantidad por tipo. Se añaden a los diarios únicamente los excesos del formulario, no ambos totales íntegros. El total no queda por debajo del total declarado ni de los tipos conciliados.
- Ejemplo: diario 2 físicos y 4 técnicos; formulario 5 físicos y 2 técnicos. Se conservan 5 físicos y 4 técnicos. La diferencia se muestra como conciliación favorable y no como coincidencias verificadas a nivel de sesión.
- Si el formulario solo informa una cantidad global adicional, se conserva como «Sin tipo informado»; no se inventan físicos ni se clasifica automáticamente como Otros.
- Los complementos semanales se ubican en el lunes de inicio y en ese mes. No se inventa desglose diario, minutos ni sRPE.
- Se recupera el detalle diario del 12–18, los promedios se calculan sobre los totales conciliados y la exportación identifica cantidades, tipo, fuente, complemento y total semanal original.
- Se agregan alias explícitos para las dos variantes auditadas de Camus y Ortiz, sin aproximación automática de identidades desconocidas.
- Resultado del modelo con las filas reales vigentes del 12–18: 63 estímulos, 50 físico-técnicos, 9 jugadoras, 0 complementos adicionales para Segovia. No se editó ninguna fila en las hojas fuente.
- Las lecturas abarcan semanas completas para evitar duplicar un formulario al consultar un día aislado; se dividen las lecturas que excedan el límite de 366 días del backend.

## Verificación

La batería cubre recuperación de los 63 diarios, coincidencia sin doble conteo, formulario viejo de noviembre sin diarios, discrepancias por tipo con criterio favorable, totales sin clasificación, filtro por tipo, consultas parciales, exportación, alias y navegación. También se ejecutaron los recorridos de creación y rutinas de MurcielApp. El informe conserva arriba las observaciones anteriores a la corrección como evidencia del diagnóstico.

## Fuentes consultadas

- Reporte publicado: https://sjugomurcielagas.github.io/HerramientasCTMurcielagas/reportes/ (consultas 12–18/10 y 05–25/10).
- Formulario: https://docs.google.com/spreadsheets/d/1WNRpBKV3ZU1LEQr6aB_hqSfkcPOSbXaB1Ij3N48fewQ/edit — Respuestas de formulario 1, A1:E710 (610 filas no vacías, incluido encabezado).
- Base diaria: https://docs.google.com/spreadsheets/d/1x2RypyWJ2PDHlTjWuTLKIw8_GqCCrFE-U5QYIUpoFEg/edit — MurcielApp_Estimulos A1:H1000 y MurcielApp_Correcciones A1:G1000.
- Nombres e identidad: Las_Murcielagas_Base_Personal, A1:B28 y BT1:BT28. Se evitaron los campos personales ajenos a este análisis.
- Reglas locales: docs/plan-transicion-reportes-murcielapp.md, reportes/murcielapp-model.js, reportes/murcielapp.js, reportes/historico.js y gas/reportes/Código.js.

