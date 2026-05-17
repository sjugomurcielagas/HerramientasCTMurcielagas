# Estado y pendientes

Fecha de corte: 2026-05-17

## Ya implementado

### Antidoping

- [x] Backend real `antidoping_buscarMedicamento` vía GAS + Worker.
- [x] Cache de consultas, historial y carga de reglas `WADA_Sustancias`.
- [x] Normalización de marcas conocidas (`tafirol`, `actron`, `ibupirac`, `refrianex`, `buscapina`).
- [x] Criterio operativo actual:
  - `PERMITIDO` si no hay prohibición ni advertencia explícita en la base WADA cargada.
  - `PERMITIDO CON ADVERTENCIA` si hay condición de uso, dosis, vía, umbral o TUE potencial.
  - `PROHIBIDO` / `PROHIBIDO EN COMPETENCIA` cuando la regla lo marca de forma explícita.
- [x] TUE end to end:
  - CTA `Requiere TUE` desde el resultado antidoping.
  - Ficha TUE con jugadora, medicamento, sustancia, diagnóstico, justificación, fechas, estado, envío a IBSA y observaciones.
  - Upload de archivo `TUE_Archivo`.
  - Tablero de TUE vigentes / vencidas / pendientes de envío a IBSA.

### Base de datos

- [x] Sección `IBSA y elegibilidad` visible en la ficha.
- [x] Archivo `IBSA_Elegibilidad_Archivo` y observaciones en ficha.
- [x] Sección `TUE y antidopaje` en la ficha individual del plantel.

## Pendientes reales

### Antidoping

- [ ] Reemplazar el link genérico de TUE IBSA por la URL directa al formulario PDF oficial, si se consigue.
- [ ] Permitir múltiples TUE históricas por jugadora. Hoy el modelo guarda un único estado TUE activo por ficha.
- [ ] Agregar recordatorios automáticos o vista específica de `vence en 30/15/7 días`.
- [ ] Diferenciar mejor entre advertencias por umbral, por vía y por TUE en la UI con copy más específico.
- [ ] Mejorar el cruce con fuentes farmacológicas argentinas para identificar presentaciones y composiciones combinadas.

### Base de datos / IBSA

- [ ] Mostrar en dashboard una tarjeta específica de TUE vigentes y pendientes IBSA.
  Diferido hasta contar con al menos un caso TUE real. Retomar cuando exista el primer caso para validar si el CT necesita ese resumen en `base-datos` o si alcanza con el tablero de `antidoping`.
- [ ] Agregar fecha de vencimiento o renovación de elegibilidad IBSA si el flujo real la necesita.
- [ ] Validar si conviene separar `IBSA enviado` en dos campos: `enviado` y `reconocido/aprobado`.

### Operativo / producto

- [ ] Definir el procedimiento exacto del CT para decidir cuándo una advertencia pasa a “iniciar TUE”.
- [ ] Confirmar si la vigencia estándar de trabajo seguirá siendo `365 días por defecto` o si se ajustará por disciplina/caso.
- [ ] Definir auditoría mínima: quién cargó TUE, cuándo se subió, cuándo se envió a IBSA y quién lo confirmó.

## Nota operativa sobre TUE

- Al 2026-05-17 no hay casos TUE activos o históricos cargados para el equipo.
- Por esa razón, cualquier mejora adicional de dashboard, recordatorios o refinamiento de flujo TUE queda en pausa hasta disponer de un caso real que permita validar uso, estados y necesidad operativa.
- Cuando aparezca el primer caso, revisar en este orden:
  1. Si la ficha actual de una sola TUE activa por jugadora alcanza o ya obliga a soportar histórico.
  2. Si el CT necesita visibilidad en `base-datos` además del tablero del módulo `antidoping`.
  3. Qué plazos reales usan médica/CT/IBSA para definir recordatorios de vencimiento y envío.
