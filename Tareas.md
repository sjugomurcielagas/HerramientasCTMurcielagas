# Estado y pendientes

Fecha de corte: 2026-05-17

---

## Ya implementado

### Antidoping — correcciones de seguridad (2026-05-17)

- [x] **Bug crítico: plural de sustancias prohibidas** — "efedrinas" retornaba PERMITIDO porque la búsqueda no encontraba "efedrina" en WADA. Corregido con normalización plural→singular en `searchVariants()`: prueba la forma singular como primera variante antes de buscar con el término original.
- [x] **Scoring de resultados**: `PROHIBIDO` ahora devuelve score fijo 10, superando cualquier combinación de resultados PERMITIDO (máximo 5). Evita que un hit permitido de marca comercial tape un prohibido de principio activo.
- [x] **Corte del loop de búsqueda**: el loop de alias solo hace early exit cuando el resultado es conclusivo (PROHIBIDO o ADVERTENCIA). Antes cortaba ante cualquier score ≥ 4, lo que podía dejar sin evaluar variantes más específicas.

### Antidoping — TUE (pre-existente, documentado)

- [x] Backend real `antidoping_buscarMedicamento` vía GAS + Worker.
- [x] Cache de consultas, historial y carga de reglas `WADA_Sustancias`.
- [x] Normalización de marcas conocidas (`tafirol`, `actron`, `ibupirac`, `refrianex`, `buscapina`).
- [x] Criterio operativo:
  - `PERMITIDO` si no hay prohibición ni advertencia explícita en la base WADA cargada.
  - `PERMITIDO CON ADVERTENCIA` si hay condición de uso, dosis, vía, umbral o TUE potencial.
  - `PROHIBIDO` / `PROHIBIDO EN COMPETENCIA` cuando la regla lo marca de forma explícita.
- [x] TUE end to end: ficha TUE completa, upload de archivo, tablero de vigentes/vencidas/pendientes IBSA.

### Sesión con expiración (2026-05-17)

- [x] Login en `index.html` guarda `mrcl_auth_ts` (timestamp) junto con `mrcl_auth='1'` en localStorage.
- [x] Todos los módulos tienen guard de sesión con expiración a **30 días**: si el timestamp supera ese plazo, borra auth y redirige al login.
- [x] Módulos actualizados: `index.html`, `antidoping`, `base-datos`, `concentraciones`, `analisis/index`, `analisis/penales`, `analisis/partidos`.

### CSS — consistencia de variables (2026-05-17)

- [x] `reportes/index.html`: variables CSS alineadas al sistema estándar (`--azul-950`, `--celeste`, `--ok`, `--warn`, `--danger`, etc.). Las variables propias del módulo quedan como alias que apuntan a las del sistema.
- [x] `tactica/index.html`: mismo alineamiento. `--celeste` del tablero táctica se mantiene en `#4a9fd4` (azul del campo, distinto del `--celeste` del sistema `#22a8e8`) para no alterar el visual del canvas.

### Táctico — IA generadora de jugadas (2026-05-17)

- [x] Modal IA con configuración de API key vía `localStorage('mrcl_claude_key')`. La key nunca se guarda en el código.
- [x] Verificación de key antes de guardar (llamada real a la API con `max_tokens:5`). Distingue error de red vs error de API.
- [x] Generación de jugadas desde texto libre: llama a `claude-haiku-4-5-20251001`, parsea JSON, inserta jugadoras y flechas en el canvas.
- [x] Opción de reemplazar o agregar sobre el tablero existente.
- [x] System prompt con: sectores por profundidad y carril, tres formaciones base con coordenadas exactas, contexto IBSA Blind Football 5v5 (4 ciegas + arquera vidente, sin offside, campo 40×20m).
- [x] Jugadoras genéricas (num 21-25) cuando no se menciona nombre ni número en el texto.
- [x] Apellido en canvas solo si el usuario lo menciona explícitamente en el prompt (el JS ya no resuelve apellido por número automáticamente).
- [x] Flechas `press` siempre de equipo A hacia equipo B. Si hay presión, obliga a incluir rivales (team B) como destino.
- [x] Ejemplos de jugadas multi-paso en el system prompt (run + pass + dribble + shot desde la misma jugadora).

### Base de datos (pre-existente, documentado)

- [x] Sección `IBSA y elegibilidad` visible en la ficha.
- [x] Archivo `IBSA_Elegibilidad_Archivo` y observaciones en ficha.
- [x] Sección `TUE y antidopaje` en la ficha individual del plantel.

---

## Pendientes reales

### Táctico — IA

- [ ] **Jugadas multi-paso encadenadas**: la IA no genera bien secuencias como "corre hasta el tercio, pasa, la receptora conduce y remata". El system prompt tiene el ejemplo, pero Haiku no lo aplica consistentemente. Opciones a evaluar:
  - Probar con `claude-sonnet-4-6` para jugadas complejas (más caro, más fiel).
  - Reformular el prompt con chain-of-thought explícito ("primero listá las acciones, luego generá el JSON").
  - Agregar más ejemplos de secuencias encadenadas.
- [ ] **Posicionamiento espacial**: el modelo a veces ignora "banda izquierda", "zona alta", etc. Mejorar mapping de términos tácticos en español a rangos de coordenadas en el prompt.
- [ ] **Números fuera del plantel**: cuando el usuario pide "la 2" (no existe en el roster), la IA a veces usa un número del plantel real. Aclarar que el número del usuario es exacto aunque no esté en el roster.
- [ ] **Conducción vs carrera**: `dribble + curve` no siempre se genera; la IA tiende a usar `run`. Reforzar en el prompt: `dribble` = con pelota, `run` = sin pelota.
- [ ] Evaluar mostrar el JSON generado antes de aplicarlo al canvas, para que el CT pueda corregirlo manualmente si la jugada sale mal.

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

- [ ] Definir el procedimiento exacto del CT para decidir cuándo una advertencia pasa a "iniciar TUE".
- [ ] Confirmar si la vigencia estándar de trabajo seguirá siendo `365 días por defecto` o si se ajustará por disciplina/caso.
- [ ] Definir auditoría mínima: quién cargó TUE, cuándo se subió, cuándo se envió a IBSA y quién lo confirmó.

---

## Nota operativa sobre TUE

- Al 2026-05-17 no hay casos TUE activos o históricos cargados para el equipo.
- Cualquier mejora adicional de dashboard, recordatorios o refinamiento de flujo TUE queda en pausa hasta disponer de un caso real.
- Cuando aparezca el primer caso, revisar en este orden:
  1. Si la ficha actual de una sola TUE activa por jugadora alcanza o ya obliga a soportar histórico.
  2. Si el CT necesita visibilidad en `base-datos` además del tablero del módulo `antidoping`.
  3. Qué plazos reales usan médica/CT/IBSA para definir recordatorios de vencimiento y envío.
