# Estado y pendientes

Fecha de corte: 2026-05-17 (actualizado 2026-05-17)

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

### Táctico — IA generadora de jugadas

- [x] Modal IA en `tactica/index.html` con configuración de API key vía `localStorage('mrcl_claude_key')`.
- [x] Verificación de key antes de guardar (llamada real a la API con max_tokens:5).
- [x] Generación de jugadas desde texto libre: llama a `claude-haiku-4-5-20251001`, parsea JSON, inserta jugadoras y flechas en el canvas.
- [x] Opción de reemplazar o agregar sobre el tablero existente.
- [x] System prompt con: sectores por profundidad y carril, tres formaciones base con coordenadas, contexto IBSA Blind Football 5v5.
- [x] Jugadoras genéricas (num 21-25) cuando no se menciona nombre ni número en el texto.
- [x] Apellido en canvas solo si el usuario lo menciona explícitamente en el prompt.
- [x] Flechas `press` siempre de equipo A hacia equipo B (rivales obligatorios como destino).
- [x] Ejemplos de jugadas multi-paso en el system prompt (run + pass + dribble + shot desde la misma jugadora).

### Base de datos

- [x] Sección `IBSA y elegibilidad` visible en la ficha.
- [x] Archivo `IBSA_Elegibilidad_Archivo` y observaciones en ficha.
- [x] Sección `TUE y antidopaje` en la ficha individual del plantel.

## Pendientes reales

### Táctico — IA (pendientes)

- [ ] **Jugadas multi-paso encadenadas**: la IA no genera bien secuencias como "corre hasta el tercio, pasa, la receptora conduce y remata". El system prompt tiene el ejemplo, pero Haiku no lo aplica consistentemente. Opciones a evaluar:
  - Probar con `claude-sonnet-4-6` para jugadas complejas (más caro pero más fiel).
  - Reformular el prompt con chain-of-thought explícito ("primero listá las acciones, luego generá el JSON").
  - Agregar más ejemplos de secuencias en el system prompt.
- [ ] **Posicionamiento espacial**: el modelo a veces ignora referencias como "banda izquierda" o "zona alta". Mejorar mapping de términos en español a rangos de coordenadas en el prompt.
- [ ] **Números fuera de rango**: cuando el usuario pide "la 2" (número no en el plantel real), la IA a veces asigna números del plantel real en lugar de usar el número pedido. Clarificar que los números del usuario son exactos aunque no estén en el roster.
- [ ] **Flechas de conducción**: `dribble + curve` no siempre se genera; la IA tiende a usar `run` en su lugar. Reforzar en el prompt la distinción conducción (con pelota) vs carrera (sin pelota).
- [ ] Evaluar si conviene un paso intermedio: mostrar el JSON antes de aplicarlo al canvas para que el CT lo pueda corregir manualmente.

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
