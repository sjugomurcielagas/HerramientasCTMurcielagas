# Tareas

> Tablero vivo. Solo trabajo abierto. Lo resuelto se borra.

---

## Inmediato

- [ ] **Unificar TUE** — Antidoping como único punto de edición; Base de datos muestra la TUE en modo solo lectura con link a Antidoping.
- [ ] **Resolver módulo Rivales** — Si `analisis/rivales/` no existe o está vacío, quitar la card del sub-landing de Análisis o marcarlo como próximamente con descripción.
- [ ] **Alerta diferenciada para clasificación visual** — `Clasif_Visual_Revision` vencida debe tener su propio circuito de alerta separado de los vencimientos documentarios. La clasificación B1 vencida es inhabilitación de partido, no problema administrativo.
- [ ] **Sacar hardcoding de personas en documentos oficiales** — El botón "Generar documentos (Santiago y Gonzalo)" debe configurarse desde Base de datos, no desde el código.
- [ ] **Confirmar integración Registro → estadísticas de Partido** — Verificar si el Registro de acciones en vivo alimenta automáticamente las estadísticas del partido. Si no, implementarlo o aclararlo visualmente para evitar carga doble.

---

## Próximo ciclo

- [ ] **Asistencia a entrenamientos fuera de concentración** — Módulo liviano: fecha, sesión, presentes/ausentes con motivo. Insumo para Reportes y para decisiones de convocatoria.
- [ ] **Cruce entre concentración activa y otros módulos** — Home con acceso directo a la concentración en curso; Reportes filtrando por jugadoras convocadas; Tablero táctico cargando la convocatoria como punto de partida.
- [ ] **Persistencia del tablero táctico** — Guardar al menos los sistemas tácticos frecuentes para no rearmar desde cero en cada charla técnica.
- [ ] **Penales vinculados a partidos** — Cuando se registra un penal en Registro de acciones, alimentar las estadísticas del módulo de Penales de esa jugadora.
- [ ] **Resumen exportable al cerrar una concentración** — Asistentes, actividades realizadas, resultados de partidos, incidencias disciplinarias.

---

## Visión

- [ ] **Vista precompetitiva integrada** — Pantalla que el CT abre antes de un partido: jugadoras disponibles, habilitación (docs + TUE + clasificación), últimas estadísticas de penales, faltas acumulativas del partido anterior.
- [ ] **Perfil de rendimiento longitudinal por jugadora** — Cruzar carga semanal (Reportes) + estadísticas individuales (Partidos) + evolución de penales + períodos de lesión en una línea de tiempo por jugadora.
- [ ] **Modo multi-dispositivo para registro de partido** — Dos integrantes del CT registran acciones del mismo partido desde dispositivos distintos con sincronización en tiempo real.
