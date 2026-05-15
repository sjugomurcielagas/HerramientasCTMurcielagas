# CLAUDE.md — Instrucciones permanentes para este proyecto

## Lectura previa obligatoria
Siempre leer todos los archivos relevantes antes de modificar cualquier cosa. Si un cambio toca múltiples módulos, leer cada uno primero.

## Consistencia de estilo
Mantener coherencia con los módulos existentes:
- **Fuente**: Barlow + Barlow Condensed (Google Fonts, ya incluidas)
- **Paleta**: azul (`--azul-950` / `--azul-800` / `--celeste`) sobre fondo `--fondo` claro
- **Topbar**: sticky con `backdrop-filter: blur`, logo FADEC + Murciélagas
- **JS**: inline al final del HTML, minificado (sin espacios innecesarios, sin comentarios)
- **Cards**: `.panel` con `border-radius: var(--radius)` y `box-shadow: var(--shadow)`
- **Botones**: clases `.btn`, `.btn.secondary`, `.btn.ghost`, `.btn.small`, `.btn.danger`
- **Badges**: `.badge`, `.badge.ok`, `.badge.warn`, `.badge.danger`, `.badge.info`

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

## Estructura del proyecto
- `index.html` — landing principal
- `analisis/` — módulos de análisis deportivo
  - `penales/index.html` — registro y estadísticas de penales
- `base-datos/index.html` — gestión del plantel
- `assets/` — logos, config.js, fuentes
