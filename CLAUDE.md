# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

Think and reason internally in English. Always respond and interact in Spanish (Argentina, voseo).

## Alcance del repo

Este repositorio contiene el frontend estático del sitio de Las Murciélagas y su cliente compartido `Murci` en `assets/config.js`.

No hay build system, ni npm, ni bundler, ni transpiler. Todo el comportamiento vive en HTML estático con CSS y JS inline. Para probar localmente:

```bash
python3 -m http.server 8080
# luego abrir http://localhost:8080
```

## Fuente de verdad

- Frontends estáticos: `index.html`, `base-datos/index.html`, `reportes/index.html`, `analisis/*`, `concentraciones/index.html`, `antidoping/index.html`, `tactica/index.html`
- Cliente compartido: `assets/config.js`
- API pública única: `API_BASE_URL` + `Murci.apiGet(...)` / `Murci.apiPost(...)`
- Estado compartido de UI: `Murci.uiVersion`, `Murci.loadPlantel()`, `Murci.apiGetCached(...)`, `Murci.personName(...)`, `Murci.normalizeText(...)`
- Backend router: `worker.js`
- Legacy o referencias: copias viejas dentro de `gas/*/Index.html`

## Cómo encarar cambios

- Si el pedido es transversal, revisar y aplicar el cambio en todos los módulos que compartan la misma superficie funcional.
- Si una pantalla sigue usando fetch/parseo propio, URL hardcoded o helpers locales de red, migrarla al cliente compartido `Murci` salvo que haya una razón técnica documentada.
- Para limpieza visual, copy o precargas, auditar al menos `antidoping`, `base-datos`, `reportes`, `analisis`, `concentraciones` y `tactica` cuando aplique.
- No asumir que un fix en un módulo resuelve al resto: buscar el patrón repetido y corregirlo en toda la superficie afectada.
- Si una funcionalidad existe duplicada en dos lugares, uno debe quedar marcado como legacy, referencia o compatibilidad temporal.

## Patrón técnico esperado en los módulos

Cada módulo es un único archivo HTML autocontenido con CSS y JS inline. Cuando sea posible debe seguir este patrón:

1. Cargar `assets/config.js`.
2. Usar `Murci` como cliente compartido.
3. Declarar `state` como único estado mutable local.
4. Consumir `Murci.apiGet(...)`, `Murci.apiPost(...)` o `Murci.apiGetCached(...)` en vez de helpers de red duplicados.
5. Mantener login view → app view en el mismo HTML, ocultando con `.hidden`.
6. Navegar tabs con `.tab-btn[data-view]` y `.app-section`.
7. Escapar toda inserción dinámica en DOM con `esc()`, `escapeHtml()` o helper equivalente.

## Contrato de API

- GET: `Murci.apiGet(action, params)` → `{ok: true, data: ...}` o error lanzado por `Murci.parseApiResponse(...)`
- POST: `Murci.apiPost(payload)` → mismo contrato
- Las actions siguen la convención `{módulo}_{verbo}`
- Si una action no existe en el backend real, no inventarla desde el frontend

## Criterios de unificación

- Preferir una sola capa compartida para fetch, parseo, cache y normalización base.
- Mover a `Murci` cualquier lógica repetida entre módulos que hoy exista copiada en cada HTML.
- Mantener alias históricos solo si son necesarios para compatibilidad; si no, simplificarlos.
- Los helpers de fecha, nombre y normalización deben resolverse desde `Murci` antes que en cada módulo.
- Si un módulo tiene lógica local que ya quedó absorbida por `Murci`, eliminar la copia local después de verificar que no rompe el flujo.

## Estructura del proyecto

```
index.html                  — landing principal (grid de herramientas)
analisis/
  index.html                — sub-landing del módulo de análisis
  penales/index.html        — registro y estadísticas de penales
base-datos/index.html       — gestión del plantel (fichas, alertas, archivos)
concentraciones/index.html  — documentos y seguimiento de concentraciones
reportes/index.html         — reportes de entrenamiento
antidoping/index.html       — búsqueda y validación de medicamentos / TUE
tactica/index.html          — tablero táctico (PWA)
assets/
  config.js                 — cliente compartido Murci + API_BASE_URL
  fadec-logo.webp
  logo-murcielagas.webp
```

## Recuperación del sitio

Cuando el sitio quede desalineado, seguir este orden:

1. Leer `RECUPERACION_SITIO.md`.
2. Verificar primero `worker.js`, después `assets/config.js`, y recién luego los frontends.
3. Tratar las copias dentro de `gas/*/Index.html` como referencias o UIs legacy, no como fuente de verdad del sitio estático.
4. No agregar actions al Worker si el backend real no las implementa.
5. Si una pantalla deja de hablar con el backend, revisar primero si está usando una URL hardcoded o un helper local viejo.

## Consistencia de estilo

Mantener coherencia con los módulos existentes. Las CSS custom properties definidas en `:root` son idénticas en todos los módulos internos:

- **Paleta:** `--azul-950` / `--azul-800` / `--azul-700` / `--celeste` / `--celeste-100`
- **UI base:** `--fondo` / `--card` / `--borde` / `--texto` / `--muted`
- **Estados:** `--ok` / `--warn` / `--danger`
- **Forma:** `--shadow` / `--radius`
- **Tipografía:** Barlow + Barlow Condensed
- **Topbar:** sticky, `backdrop-filter: blur(12px)`, logos FADEC + Murciélagas
- **Cards:** `.panel` con `border-radius: var(--radius)` y `box-shadow: var(--shadow)`
- **Botones:** `.btn`, `.btn.secondary`, `.btn.ghost`, `.btn.small`, `.btn.danger`
- **Badges:** `.badge`, `.badge.ok`, `.badge.warn`, `.badge.danger`, `.badge.info`
- **Responsive:** `max-width: 1180px` centrado, breakpoint principal en 740px

## Estado vivo

- Cuando un texto, aviso o bloque de ayuda ya quedó resuelto, no dejarlo congelado en este archivo: actualizar `CLAUDE.md` y mover el seguimiento vivo a `Tareas.md`.
- `Tareas.md` es tablero vivo, no histórico.
- Lo resuelto se elimina en el siguiente corte grande.

## Commit y push

Cuando un cambio esté completo y verificado, hacer `git add`, `git commit` y `git push` sin pedir confirmación. Los mensajes de commit deben:
- Estar en español
- Ser descriptivos del cambio real
- Reflejar el módulo o la lógica afectada

## Archivos protegidos

- `assets/config.js` — contiene la URL del Worker y el cliente compartido `Murci`
- Cualquier archivo de configuración de CI/CD o deploy

## Fuera de alcance

- El Worker de Cloudflare / backend Apps Script
- Credenciales, tokens o secrets de cualquier tipo
