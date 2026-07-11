# Auditoría V1 estable del sitio

Fecha: 2026-07-11  
Baseline auditado: `7eb6c3b` (`main`)  
URL publicada: `https://sjugomurcielagas.github.io/HerramientasCTMurcielagas/`

## Resumen ejecutivo

El sitio publicado pasa la navegación general y los smokes móviles principales. La estructura de Home, Reportes, Base de datos, Concentraciones, Táctica, Antidoping y Análisis carga sin 404 visibles y sin errores JavaScript críticos en el test general.

El principal riesgo para V1 estable no está en la navegación, sino en la sincronización de releases backend/frontend: el frontend publicado ya llama `partidos_getAccionesResumen`, pero el Worker publicado responde `ok:false` con `Acción no reconocida`. Esto deja degradada la nueva sección de estadísticas por acciones en Partidos y prueba que GitHub Pages, Worker y Apps Script pueden quedar fuera de fase.

## Evidencia de validación

- Checkpoint inicial: se commiteó y pusheó `7eb6c3b Prepara baseline V1 estable`.
- Deploy GitHub Pages: `Deploy sitio` y `pages-build-deployment` finalizaron `success` para `7eb6c3b`.
- Playwright local: `BASE_URL=http://127.0.0.1:8090/ npx playwright test tests/navegacion_general.spec.ts` -> 6/6 passed.
- Playwright publicado: `npx playwright test tests/navegacion_general.spec.ts` -> 6/6 passed.
- Lighthouse local, 12 rutas:
  - Home: P100 A11y100 BP96 SEO91.
  - Reportes: P93 A11y95 BP96 SEO91.
  - Táctica: P96 A11y76 BP96 SEO100.
  - Partidos y Registro: P100 A11y93 BP96 SEO91.
  - Resto de rutas auditadas: mayormente P100 A11y100 BP96 SEO91.
- Backend readonly real:
  - `site_getPlantel`: 200 ok, 25 registros.
  - `partidos_getPartidos`: 200 ok, 4 registros.
  - `penales_getSesiones`: 200 ok, 5 registros.
  - `penales_getPenales`: 200 ok, 113 registros.
  - `concentraciones_getConcentraciones`: 200 ok, 6 registros.
  - `base_getAlertas`: 200 ok.
  - `antidoping_listarTUEs`: 200 ok, 2 registros.
  - `partidos_getAccionesResumen`: 200 `ok:false`, `Acción no reconocida`.
- Mocks de backend vacío/caído: Reportes, Base, Concentraciones, Antidoping, Partidos y Penales no crashean ni generan overflow horizontal en 390x844; algunos módulos dejan errores de consola esperables por plantel/API y favicon 404.
- Táctica mock funcional: encadenamiento de acción con fantasma conserva endpoint `(420,260)`, oculta fantasma y no deja errores.
- Penales mock funcional: edición optimista envía payload correcto, confirma éxito y hace rollback ante error.
- Dependencias: `npm audit --json` reporta 17 vulnerabilidades moderadas, todas en dependencias transitivas de `lighthouse`/OpenTelemetry/Sentry de desarrollo.

## Backlog priorizado

| Prioridad | Categoría | Módulo | Síntoma | Impacto | Evidencia | Causa probable | Fix sugerido | Esfuerzo | Criterio de aceptación |
|---|---|---|---|---|---|---|---|---|---|
| P0 | Backend/datos | Análisis > Partidos | `partidos_getAccionesResumen` falla en producción con `Acción no reconocida`. | La nueva sección de rendimiento por acciones queda degradada o muestra error aunque el frontend esté publicado. | GET readonly al Worker publicado devolvió `200 ok:false error=Acción no reconocida`. Frontend llama la acción en `analisis/partidos/index.html`. | Worker y/o Apps Script publicados no están alineados con el commit `7eb6c3b`. | Desplegar `worker.js` con `npx wrangler deploy` y publicar `gas/base-deporte/Código.js` con clasp; agregar verificación post-deploy de acciones nuevas. | S | GET real a `partidos_getAccionesResumen` devuelve `ok:true` con `{ total, propio, rival, por_* }`; stats de Partidos no muestra error. |
| P0 | Release | Transversal | El deploy de GitHub Pages puede quedar exitoso aunque backend requerido no esté actualizado. | Riesgo de releases parcialmente rotas en producción. | Pages success para `7eb6c3b`, pero Worker publicado no reconoce una acción del mismo baseline. | No hay checklist automatizado que combine Pages + Worker + Apps Script. | Crear script `verify-release` readonly que pruebe endpoints requeridos por versión y falle si falta alguno; documentar orden de despliegue. | M | Antes de declarar V1 estable, el script valida Pages, Worker y Apps Script con todas las acciones críticas. |
| P1 | Accesibilidad | Táctica | Lighthouse accesibilidad 76. Muchos botones/canvas dependen de iconos/títulos visuales y el canvas no expone alternativa operativa. | Usuarios con lector de pantalla o navegación por teclado tienen experiencia pobre; baja calidad V1. | Lighthouse local `tactica/`: A11y 76. Búsqueda HTML muestra canvas y múltiples botones sin `aria-label` explícito. | UI de tablero optimizada para interacción visual/táctil, con controles compactos y canvas central. | Añadir labels ARIA a controles, nombre/descripcion al canvas, estados `aria-pressed`, foco visible y atajos accesibles documentados fuera del canvas. | M | Lighthouse A11y >= 95 y navegación básica por teclado puede guardar, importar/exportar y cambiar herramientas. |
| P1 | Backend/datos | Worker / Apps Script | Acciones mutantes pasan por Worker sin autenticación propia visible. | Cualquier origen permitido o bypass backend podría intentar mutaciones si Apps Script no valida permisos. | `worker.js` enruta POST por acción y CORS restringe origen, pero no valida token/sesión para mutaciones. | El login del sitio es localStorage/UI; no es control de acceso backend. | Agregar token server-side o secreto por acción mutante, validado en Worker/Apps Script; separar readonly público de mutaciones. | M-L | POST mutante sin credencial válida devuelve 401/403; UI legítima sigue funcionando. |
| P1 | UX/error | Base, Concentraciones, Partidos, Penales | Cuando falla `site_getPlantel`, aparecen `console.error` compartidos aunque la UI se degrada. | Ruido en auditorías y difícil distinguir errores esperados de regresiones reales. | Mock backend caído generó consola `[Murci] No se pudo obtener el plantel canónico...` en varios módulos. | Helper global loguea error cuando no hay cache stale. | Normalizar error handling: devolver estado vacío con metadata y mostrar banner no intrusivo; logs solo en modo debug. | S | Mocks de backend caído no producen `console.error` no controlados y muestran estado degradado uniforme. |
| P1 | UX/producto | Análisis > Penales | Si no hay sesión activa, los penales cargados pueden no verse hasta entrar por hash/sesión. | Una sesión vieja compartida o navegación directa puede parecer vacía. | Test mock necesitó `#sesion=s1` para renderizar registro y botón `Editar`. | Filtro de lista depende de `state.sesionActualId`; no selecciona automáticamente la sesión más reciente con datos. | Seleccionar última sesión con penales al cargar si no hay hash, o mostrar selector con aviso claro. | S | Cargar Penales sin hash muestra una sesión útil o una CTA explícita para seleccionar sesión. |
| P2 | Performance/UX | Reportes | Lighthouse Reportes baja a P93/A11y95, inferior al resto. | No bloquea V1, pero es el módulo más pesado después de Táctica. | Lighthouse local `reportes/`: P93 A11y95. | Página extensa con mucha lógica/render local y posibles controles densos. | Revisar tareas largas, lazy render de secciones no visibles y labels faltantes. | M | Reportes P >= 95 y A11y >= 98 en Lighthouse local. |
| P2 | Cache/PWA | Home / Service worker | `service-worker.js` cachea `assets/config.js?v=20260525021325`, pero `UI_VERSION` es `2026.06.14.1` y `UI_DEPLOYED_AT='partidos-internos'`. | Riesgo de cache confuso y actualización no determinística en releases. | `APP_SHELL` contiene versión query antigua; config usa firma lógica distinta. | Versionado manual disperso. | Unificar cache name, query de assets y `UI_VERSION` desde una sola constante o script de build. | S-M | Nuevo deploy invalida shell/config de forma verificable sin recarga manual. |
| P2 | Seguridad/deps | Tooling | 17 vulnerabilidades moderadas en dev dependencies. | No afecta runtime estático directamente, pero ensucia baseline y CI. | `npm audit --json`: cadena `lighthouse` -> `@sentry/node` -> OpenTelemetry. | Versión actual de Lighthouse arrastra advisories transitivos. | Evaluar bajar/subir Lighthouse a versión sin advisories o aceptar riesgo documentado al ser dev-only. | S | `npm audit` en CI queda limpio o con excepción documentada para dev-only. |
| P2 | UX/error | Transversal | Favicon 404 aparece como `console error` en mocks. | Ruido en monitoreo/Playwright si se endurece la política de consola. | Mock Playwright reportó `Failed to load resource: 404 (File not found)` en módulos. | Falta ruta o asset esperado por browser. | Agregar favicon válido o ajustar manifest/head. | XS | Navegación con consola estricta no registra 404 de favicon. |
| P3 | Deuda técnica | Transversal | Lógica de fetch/cache/error se repite con variaciones entre módulos. | Mantenimiento más lento; fixes de fallback se aplican módulo por módulo. | Partidos/Penales tienen wrappers `apiGetCached` propios; Base/Concentraciones usan variantes. | Evolución incremental de módulos. | Exponer helpers compartidos para `loadModuleData`, estado vacío, stale cache y banner de error. | M | Nuevos módulos consumen un helper común y tests mock cubren vacío/error una sola vez por patrón. |
| P3 | QA | Transversal | Los mocks funcionales usados en auditoría no están versionados como tests. | Riesgo de regresión en penales/táctica/errores de backend. | Validaciones se ejecutaron con scripts ad hoc de Playwright. | La suite existente solo cubre navegación general. | Convertir los smokes críticos en specs: backend vacío/caído, penales edición, táctica fantasmas, Partidos stats. | M | CI ejecuta specs nuevas y falla ante regresión de esos flujos. |

## Observaciones por módulo

### Home y navegación

Estado general estable. Login local por `mrcl_auth` permite entrar y las tarjetas principales navegan correctamente. La navegación directa a rutas principales y subrutas de Análisis pasó en local y publicado.

Riesgo pendiente: el login es una barrera de UI, no una garantía de autorización backend. Para V1 interna puede ser aceptable si los datos no son sensibles o si Apps Script valida, pero debe quedar explícito.

### Reportes

El módulo responde bien con datos vacíos y backend caído: muestra mensajes de planilla vacía o carga fallida sin romper layout móvil. Es el segundo peor resultado Lighthouse después de Táctica, aunque dentro de rango aceptable para V1.

### Base de datos

Dashboard, plantel y alertas degradan a cero/sin alertas cuando el backend falla. Hay mutaciones sensibles (`guardarCambios`, `darDeBaja`, `subirArchivo`, `agregarIntegrante`) que deben quedar protegidas backend-side antes de considerar V1 estable con datos reales.

### Concentraciones

Lista, creación y detalle tienen estados vacíos razonables. Las acciones destructivas o mutantes no se probaron contra backend real por criterio readonly. Debe cubrirse con mocks versionados para asistencia, actividades y eliminación antes de tocar datos reales.

### Táctica

Funcionalmente el flujo auditado de fantasmas/encadenamiento está estable. El mayor problema del módulo es accesibilidad: canvas y controles compactos necesitan nombres, estados y navegación por teclado.

### Antidoping

Lecturas reales de TUE funcionan. El módulo carga sin overflow móvil con backend vacío/caído. Quedan por probar con mocks versionados los flujos de archivo TUE y búsqueda WADA con respuestas ambiguas, porque son de mayor impacto operativo.

### Análisis

Penales: edición mockeada funciona, incluyendo rollback ante error. Hay un riesgo UX con selección de sesión activa.  
Partidos: navegación y ficha fallback están bien encaminadas, pero estadísticas por acciones dependen de backend no desplegado.  
Rivales y Pre-partido: pasaron navegación/Lighthouse, sin auditoría funcional profunda.

## Recomendación de estabilización

Para declarar V1 estable, cerrar primero los P0: desplegar y verificar Worker/Apps Script alineados con `7eb6c3b`, y agregar una verificación release readonly que impida repetir una publicación parcial. Después, atacar P1 de Táctica accesible, protección backend para mutaciones y manejo uniforme de errores.

No se recomienda iniciar fixes funcionales masivos antes de resolver el pipeline de release, porque hoy el mismo commit puede verse correcto en GitHub Pages y fallar por backend desfasado.
