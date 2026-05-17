# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Think and reason internally in English. Always respond and interact in Spanish (Argentina, voseo).

## Desarrollo local

No hay build system. Son archivos estáticos. Para probar en un navegador:

```bash
python3 -m http.server 8080
# luego abrir http://localhost:8080
```

No hay npm, webpack, transpilación ni dependencias instalables. Todo el JS y CSS es inline en cada HTML.

## Lectura previa obligatoria

Siempre leer todos los archivos relevantes antes de modificar cualquier cosa. Si un cambio toca múltiples módulos, leer cada uno primero.

## Arquitectura

Cada módulo es un único archivo HTML autocontenido con CSS y JS inline. Todos los módulos comparten el mismo patrón estructural:

**Patrón de un módulo:**
1. `<script src="../../assets/config.js">` para obtener `API_BASE_URL`
2. `const API_URL = API_BASE_URL` — única referencia a la URL del Worker
3. `const state = {...}` — objeto de estado mutable en memoria
4. Helpers `apiGet(action, params)` y `apiPost(payload)` — idénticos en todos los módulos
5. Login view → App view (ambos en el mismo HTML, uno oculto con `.hidden`)
6. Tabs navegados con `.tab-btn[data-view]` que muestran/ocultan `.app-section`
7. Todo el JS minificado (sin espacios ni comentarios) al final del `<body>`

**Contrato de la API (Cloudflare Worker):**
- GET: `fetch(API_URL + '?action=xxx&param=yyy')` → `{ok: true, data: ...}` o `{ok: false, error: '...'}`
- POST: `fetch(API_URL, {method:'POST', body: JSON.stringify({action:'xxx', ...})})` → mismo formato
- Convención de nombres de action: `{módulo}_{verbo}` — ej: `base_getPlantel`, `penales_registrarPenal`

**Login compartido:** todos los módulos usan la misma contraseña del equipo verificada via `base_verificarPassword`. Si la respuesta es `true`, se muestra la app.

**Seguridad XSS:** todos los módulos tienen una función local `esc()` o `escapeHtml()` — usarla siempre al insertar datos en el DOM via `innerHTML`.

## Estructura del proyecto

```
index.html                  — landing principal (grid de herramientas)
analisis/
  index.html                — sub-landing del módulo de análisis
  penales/index.html        — registro y estadísticas de penales
base-datos/index.html       — gestión del plantel (fichas, alertas, archivos)
reportes/index.html         — reportes de entrenamiento
tactica/index.html          — tablero táctico (con manifest.json para PWA)
assets/
  config.js                 — una sola línea: const API_BASE_URL = '...'
  fadec-logo.webp
  logo-murcielagas.webp
```

## Estado actual relevante

- `antidoping/index.html` ya no es solo consulta: incluye flujo TUE operativo.
- `gas/base-deporte/Código.js` expone acciones antidoping y TUE vía el mismo Apps Script.
- La ficha del plantel se auto-extiende con columnas TUE si no existen todavía en Sheets.

### Antidoping y TUE

Acciones activas del backend:

- `antidoping_buscarMedicamento`
- `antidoping_getFrecuentes`
- `antidoping_getHistorial`
- `antidoping_importarCatalogo`
- `antidoping_importarWada`
- `antidoping_getBackendStatus`
- `antidoping_guardarTUE`
- `antidoping_listarTUEs`

Criterio operativo actual del módulo:

- `PERMITIDO` si la base WADA cargada no marca prohibición ni advertencia explícita.
- `PERMITIDO CON ADVERTENCIA` si hay condición de uso, umbral, vía, dosis o posible TUE.
- `PROHIBIDO` o `PROHIBIDO EN COMPETENCIA` si la regla lo marca de forma explícita.

Modelo TUE actual en ficha:

- `TUE_Estado`
- `TUE_Medicamento`
- `TUE_Sustancia`
- `TUE_Diagnostico`
- `TUE_Justificacion`
- `TUE_Fecha_Emision`
- `TUE_Fecha_Vencimiento`
- `TUE_IBSA_Enviado`
- `TUE_IBSA_Fecha_Envio`
- `TUE_Observaciones`
- `TUE_Archivo`

Importante:

- Hoy el sistema maneja una sola TUE activa por jugadora en la ficha.
- La vigencia por defecto se propone a `365 días`, pero es editable y no debe asumirse como regla universal.
- Al 2026-05-17 no hay casos TUE reales cargados. Antes de expandir dashboard, alertas o histórico, validar el primer caso operativo con el CT para no sobrediseñar el flujo.

## Consistencia de estilo

Mantener coherencia con los módulos existentes. Las CSS custom properties definidas en `:root` son idénticas en todos los módulos internos (base-datos, penales, analisis):

- **Paleta:** `--azul-950` / `--azul-800` / `--azul-700` / `--celeste` / `--celeste-100`
- **UI base:** `--fondo` / `--card` / `--borde` / `--texto` / `--muted`
- **Estados:** `--ok` / `--warn` / `--danger`
- **Forma:** `--shadow` / `--radius`
- **Tipografía:** Barlow + Barlow Condensed (Google Fonts, ya incluidas vía `<link>`)
- **Topbar:** sticky, `backdrop-filter: blur(12px)`, logos FADEC + Murciélagas
- **Cards:** `.panel` con `border-radius: var(--radius)` y `box-shadow: var(--shadow)`
- **Botones:** `.btn`, `.btn.secondary`, `.btn.ghost`, `.btn.small`, `.btn.danger`
- **Badges:** `.badge`, `.badge.ok`, `.badge.warn`, `.badge.danger`, `.badge.info`
- **Responsive:** `max-width: 1180px` centrado, breakpoint principal en 740px

## Commit y push automático

Cuando un cambio esté completo y verificado, hacer `git add`, `git commit` y `git push` sin pedir confirmación. Los mensajes de commit deben:
- Estar en español
- Ser descriptivos del cambio real (no genéricos)
- Formato: `Título corto del cambio` + cuerpo si hay múltiples modificaciones

## Archivos protegidos — requieren confirmación explícita antes de tocar

- `assets/config.js` — contiene la URL del Worker de Cloudflare, crítica para todos los módulos
- Cualquier archivo de configuración de CI/CD o deploy

## Fuera de alcance — nunca modificar desde este proyecto

- El Worker de Cloudflare (Google Apps Script / Cloudflare Worker backend)
- Credenciales, tokens o secrets de cualquier tipo
