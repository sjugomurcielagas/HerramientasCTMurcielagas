# Plan de pruebas: navegacion general

## Alcance

Sitio bajo prueba: `https://sjugomurcielagas.github.io/HerramientasCTMurcielagas/`

Secciones cubiertas:

- Home
- Reportes
- Tactica
- Base de datos
- Concentraciones
- Analisis

Verificaciones incluidas:

- Navegacion entre secciones principales.
- Enlaces rotos evidentes.
- Botones o enlaces de Inicio.
- Errores JavaScript visibles para el usuario o en consola.
- Problemas mobile evidentes.

## Observaciones de exploracion

- Las rutas principales respondieron HTTP 200:
  - `/`
  - `/reportes/`
  - `/tactica/`
  - `/base-datos/`
  - `/concentraciones/`
  - `/analisis/`
- Las rutas internas visibles de Analisis tambien respondieron HTTP 200:
  - `/analisis/penales/`
  - `/analisis/partidos/`
  - `/analisis/rivales/`
  - `/analisis/partidos/registro/`
- Assets principales revisados con HTTP 200:
  - `/assets/fadec-logo.webp`
  - `/assets/logo-murcielagas.webp`
  - `/manifest.json`
- Cada modulo principal expone un enlace de retorno tipo `Inicio` hacia Home.
- Home requiere acceso por contrasena antes de mostrar las tarjetas de herramientas.

Nota operativa: en este entorno la conexion Playwright/browser no pudo completarse por una restriccion del sandbox de Windows. Este plan se redacta desde la estructura publicada/local y comprobaciones HTTP. La ejecucion posterior debe confirmar consola, responsive y clicks reales en navegador.

## Escenarios generales

### 1. Acceso inicial a Home

Estado inicial: navegador limpio, sin sesion previa ni datos de cache requeridos.

Pasos:

1. Abrir `https://sjugomurcielagas.github.io/HerramientasCTMurcielagas/`.
2. Verificar que carga la pantalla de acceso o el contenido principal si ya existe sesion.
3. Si aparece login, ingresar una contrasena valida conocida por el equipo.
4. Confirmar que se muestran las tarjetas de herramientas.

Resultado esperado:

- La pagina carga sin errores visibles.
- Los logos y textos principales son visibles.
- Las tarjetas de Reportes, Tactica, Base de datos, Concentraciones y Analisis quedan disponibles.

Criterios de falla:

- Pantalla en blanco.
- Error visible de JavaScript.
- Recursos principales ausentes.
- Login bloqueado sin mensaje claro.

### 2. Navegacion desde Home a secciones principales

Estado inicial: Home visible con acceso concedido.

Pasos:

1. Hacer click en la tarjeta Reportes.
2. Confirmar que la URL cambia a `/reportes/` y que el modulo Reportes carga.
3. Volver a Home con el enlace Inicio.
4. Repetir para Tactica, Base de datos, Concentraciones y Analisis.

Resultado esperado:

- Cada tarjeta abre la seccion correcta.
- No hay redirecciones inesperadas.
- Cada modulo muestra su encabezado o interfaz principal.
- El enlace Inicio vuelve a Home.

Criterios de falla:

- Click sin efecto.
- URL incorrecta.
- Respuesta 404 o pagina de GitHub Pages no encontrada.
- Se pierde el acceso a Home al volver.

### 3. Deteccion de enlaces rotos principales

Estado inicial: Home visible.

Pasos:

1. Listar todos los enlaces visibles en Home.
2. Abrir cada enlace interno en la misma pestana o en una pestana nueva.
3. Registrar codigo HTTP, URL final y contenido visible.
4. Repetir la revision para enlaces principales visibles dentro de cada modulo.

Resultado esperado:

- Todas las rutas internas principales responden 200.
- Los enlaces externos, si existen, abren en destino esperado o nueva pestana.
- No aparecen paginas 404, errores de certificado ni descargas inesperadas.

Criterios de falla:

- Cualquier enlace interno con 404, 500 o timeout.
- Enlace relativo que resuelve fuera de `/HerramientasCTMurcielagas/`.
- Boton con apariencia de link que no informa estado cuando no hay accion posible.

### 4. Consola JavaScript y errores visibles

Estado inicial: navegador limpio con DevTools o captura de consola habilitada.

Pasos:

1. Abrir Home y capturar mensajes `console.error`, `pageerror` y requests fallidos.
2. Navegar a cada modulo principal.
3. En cada modulo, esperar a que termine la carga inicial.
4. Interactuar con controles basicos visibles sin crear datos destructivos.
5. Registrar errores de consola, alertas visibles y mensajes de estado.

Resultado esperado:

- No hay errores JavaScript no controlados.
- Los errores esperables de API o datos se muestran como mensajes claros en la interfaz.
- No hay promesas rechazadas ni fallos de carga de scripts criticos.

Criterios de falla:

- `ReferenceError`, `TypeError` o `Unhandled promise rejection`.
- Pantalla queda parcialmente renderizada.
- Botones principales dejan de responder despues de un error.

### 5. Revision mobile basica

Estado inicial: navegador limpio en viewport mobile, por ejemplo 390 x 844.

Pasos:

1. Abrir Home en viewport mobile.
2. Verificar que login, logos, alertas y tarjetas no se superponen.
3. Navegar a cada modulo principal.
4. Revisar encabezado, enlace Inicio, controles principales y scroll vertical.
5. Confirmar que no exista scroll horizontal no intencional.

Resultado esperado:

- El contenido entra en el ancho del viewport.
- Los botones son tocables y no quedan ocultos.
- El enlace Inicio permanece accesible.
- Los modales o paneles se pueden cerrar en mobile.

Criterios de falla:

- Texto cortado o superpuesto.
- Botones fuera de pantalla.
- Scroll horizontal causado por layout.
- Modales que no permiten cerrar o continuar.

## Home

### 6. Login y estado de acceso

Estado inicial: navegador sin sesion previa.

Pasos:

1. Abrir Home.
2. Verificar que el campo de contrasena y el boton Ingresar sean visibles.
3. Intentar ingresar con campo vacio.
4. Intentar ingresar con contrasena invalida.
5. Ingresar con contrasena valida.

Resultado esperado:

- Los intentos invalidos muestran mensaje claro.
- El intento valido muestra las herramientas.
- No aparecen errores de consola durante el flujo.

Criterios de falla:

- El login acepta campo vacio.
- Mensaje de error ausente o confuso.
- La pantalla queda bloqueada despues de un intento invalido.

### 7. Tarjetas principales de Home

Estado inicial: Home con contenido principal visible.

Pasos:

1. Verificar presencia de tarjetas: Reportes, Tactica, Base de datos, Concentraciones y Analisis.
2. Confirmar que cada tarjeta tiene texto legible y area clickeable.
3. Activar cada tarjeta con mouse.
4. Repetir activacion con teclado si el enlace recibe foco.

Resultado esperado:

- Cada tarjeta navega a la ruta esperada.
- El foco y hover no rompen el layout.
- No hay tarjetas duplicadas ni faltantes.

Criterios de falla:

- Tarjeta visible sin enlace.
- Texto ilegible o truncado en desktop/mobile.
- Navegacion a ruta incorrecta.

## Reportes

### 8. Carga inicial de Reportes

Estado inicial: navegador limpio en `/reportes/`.

Pasos:

1. Abrir `/reportes/`.
2. Verificar titulo o encabezado de Reportes.
3. Confirmar presencia de controles de analisis semanal y periodico.
4. Revisar que el enlace Inicio sea visible.

Resultado esperado:

- El modulo carga sin errores visibles.
- Los controles principales se muestran habilitados o con estado claro.
- Inicio vuelve a Home.

Criterios de falla:

- Error al inicializar datos.
- Controles principales invisibles.
- Inicio resuelve a una ruta incorrecta.

### 9. Controles de periodo y actualizacion

Estado inicial: Reportes cargado.

Pasos:

1. Cambiar entre Analisis por semana y Analisis periodico.
2. Usar botones de periodo anterior, actual y siguiente.
3. Aplicar y limpiar un rango personalizado.
4. Activar Actualizar datos y Actualizar vista.

Resultado esperado:

- Los cambios actualizan la vista sin recargar de forma inesperada.
- Los botones deshabilitan o informan estado mientras cargan.
- Los errores de API se muestran como mensaje controlado.

Criterios de falla:

- La seleccion no se refleja en pantalla.
- Error JavaScript en consola.
- Boton queda cargando indefinidamente.

## Tactica

### 10. Carga del tablero tactico

Estado inicial: navegador limpio en `/tactica/`.

Pasos:

1. Abrir `/tactica/`.
2. Confirmar que el tablero/cancha y la botonera cargan.
3. Verificar el enlace Inicio.
4. Revisar consola despues de la carga.

Resultado esperado:

- Canvas o tablero visible y dimensionado.
- Botones de equipos, jugadoras, arquera, profe, cono, flechas y animacion visibles.
- Inicio vuelve a Home.

Criterios de falla:

- Canvas en blanco por error de script.
- Botonera superpuesta al tablero.
- Error no controlado durante `resize` o dibujo.

### 11. Interacciones basicas del tablero

Estado inicial: Tactica cargada.

Pasos:

1. Agregar una jugadora.
2. Agregar una arquera.
3. Cambiar entre equipo local y visita.
4. Activar modo flechas y seleccionar tipos de flecha.
5. Usar Deshacer y Reiniciar todo.

Resultado esperado:

- Los elementos aparecen en el tablero.
- La seleccion de equipo cambia el estilo o destino de alta.
- Deshacer elimina la ultima accion.
- Reiniciar deja el tablero limpio tras confirmacion si corresponde.

Criterios de falla:

- Elementos no aparecen.
- Touch/mouse queda capturado y no permite continuar.
- Reiniciar borra datos sin confirmacion cuando aplique.

### 12. Tactica en mobile

Estado inicial: `/tactica/` en viewport mobile.

Pasos:

1. Verificar que la cancha sea visible y usable.
2. Probar desplazamiento y botones principales.
3. Abrir y cerrar modal de Nomina.
4. Abrir y cerrar modal de Guardar ejercicio.

Resultado esperado:

- La botonera no tapa permanentemente la cancha.
- Los modales entran en pantalla y se cierran.
- Gestos touch no generan scroll accidental excesivo.

Criterios de falla:

- Botones fuera del viewport.
- Modal imposible de cerrar.
- Canvas con dimensiones incorrectas.

## Base de datos

### 13. Carga inicial de Base de datos

Estado inicial: navegador limpio en `/base-datos/`.

Pasos:

1. Abrir `/base-datos/`.
2. Confirmar encabezado y controles principales del plantel.
3. Verificar el enlace Inicio.
4. Esperar la carga de datos o mensaje de estado.

Resultado esperado:

- La interfaz carga sin errores visibles.
- Si no hay datos o falla API, se informa en pantalla.
- Inicio vuelve a Home.

Criterios de falla:

- Tabla/listado queda vacio sin explicacion.
- Error JavaScript no controlado.
- Inicio no vuelve a Home.

### 14. Navegacion y filtros de Base de datos

Estado inicial: Base de datos cargada.

Pasos:

1. Revisar tabs, filtros o busqueda visibles.
2. Ejecutar una busqueda con texto comun.
3. Limpiar busqueda o filtros.
4. Abrir una ficha si existe una jugadora/listado disponible.

Resultado esperado:

- Los filtros actualizan resultados sin romper la vista.
- Las fichas se abren y cierran correctamente.
- Los estados sin resultados son claros.

Criterios de falla:

- Filtro no responde.
- Resultados desalineados o duplicados.
- Ficha sin boton claro para volver/cerrar.

## Concentraciones

### 15. Carga inicial de Concentraciones

Estado inicial: navegador limpio en `/concentraciones/`.

Pasos:

1. Abrir `/concentraciones/`.
2. Confirmar tabs Concentraciones, Nueva y Detalle si corresponde.
3. Verificar listado inicial o mensaje Sin datos cargados.
4. Verificar el enlace Inicio.

Resultado esperado:

- La seccion carga sin errores visibles.
- El listado muestra datos o estado vacio.
- Inicio vuelve a Home.

Criterios de falla:

- Tabs no cambian de vista.
- Mensaje de carga queda indefinido.
- Inicio roto.

### 16. Creacion validada de concentracion

Estado inicial: Concentraciones cargada.

Pasos:

1. Ir a la tab Nueva.
2. Intentar crear sin fecha de inicio.
3. Completar nombre, lugar y fecha de inicio.
4. No confirmar eliminaciones ni acciones destructivas.

Resultado esperado:

- Sin fecha de inicio aparece validacion clara.
- Con datos validos, la app muestra progreso o resultado controlado.
- No hay error JavaScript en consola.

Criterios de falla:

- Permite crear registro incompleto sin aviso.
- Boton queda bloqueado.
- Error no controlado al llamar API.

### 17. Detalle, convocatoria y documentos

Estado inicial: Concentraciones con al menos una concentracion existente.

Pasos:

1. Abrir una concentracion del listado.
2. Revisar datos generales y boton Volver.
3. Colapsar y expandir Convocatoria.
4. Usar Validar datos sin generar documentos.
5. Abrir modal de documentos y cerrarlo.

Resultado esperado:

- El detalle carga datos coherentes.
- Volver retorna al listado.
- Los modales abren y cierran correctamente.
- Las validaciones informan faltantes sin romper la pagina.

Criterios de falla:

- Detalle no renderiza.
- Modal queda bloqueado.
- Botones de documentos fallan sin mensaje.

## Analisis

### 18. Carga inicial de Analisis

Estado inicial: navegador limpio en `/analisis/`.

Pasos:

1. Abrir `/analisis/`.
2. Verificar tarjetas Penales, Partidos y Rivales.
3. Confirmar enlace Inicio.
4. Revisar consola despues de la carga.

Resultado esperado:

- La landing de Analisis carga sin errores visibles.
- Las tres tarjetas estan visibles y son clickeables.
- Inicio vuelve a Home.

Criterios de falla:

- Tarjeta faltante.
- Enlace roto.
- Error de script al cargar.

### 19. Navegacion interna de Analisis

Estado inicial: `/analisis/` cargado.

Pasos:

1. Abrir Penales.
2. Confirmar que el enlace de retorno dice Analisis y vuelve a `/analisis/`.
3. Repetir con Partidos.
4. Repetir con Rivales.
5. Desde Partidos, abrir Registrar acciones si existe un partido disponible.

Resultado esperado:

- Cada subherramienta carga con HTTP 200 y UI visible.
- Los enlaces de retorno vuelven al nivel correcto.
- Registro de acciones abre `/analisis/partidos/registro/` con parametros cuando corresponde.

Criterios de falla:

- Link de retorno apunta a ruta incorrecta.
- Subherramienta queda en blanco.
- Registro abre sin contexto y no muestra mensaje claro.

### 20. Estados vacios y validaciones de Analisis

Estado inicial: subherramientas de Analisis sin datos garantizados.

Pasos:

1. Abrir Penales y observar estado inicial.
2. Abrir Partidos y observar listado o formulario inicial.
3. Abrir Rivales y observar estado inicial.
4. Intentar acciones principales sin completar campos obligatorios.

Resultado esperado:

- Cada herramienta muestra estados vacios o validaciones comprensibles.
- No hay errores JavaScript no controlados.
- El usuario puede volver a Analisis o Home.

Criterios de falla:

- Validacion ausente.
- Estado vacio indistinguible de error.
- Navegacion de retorno perdida.

## Matriz de rutas esperadas

| Seccion | Ruta | Retorno esperado |
| --- | --- | --- |
| Home | `/HerramientasCTMurcielagas/` | No aplica |
| Reportes | `/HerramientasCTMurcielagas/reportes/` | `../` o Home |
| Tactica | `/HerramientasCTMurcielagas/tactica/` | `../` o Home |
| Base de datos | `/HerramientasCTMurcielagas/base-datos/` | `../` o Home |
| Concentraciones | `/HerramientasCTMurcielagas/concentraciones/` | `../index.html` o Home |
| Analisis | `/HerramientasCTMurcielagas/analisis/` | `../index.html` o Home |
| Analisis - Penales | `/HerramientasCTMurcielagas/analisis/penales/` | `../index.html` o Analisis |
| Analisis - Partidos | `/HerramientasCTMurcielagas/analisis/partidos/` | `../index.html` o Analisis |
| Analisis - Rivales | `/HerramientasCTMurcielagas/analisis/rivales/` | `../index.html` o Analisis |

## Prioridad sugerida de ejecucion

1. Smoke de rutas principales y botones Inicio.
2. Captura de consola en carga inicial de cada modulo.
3. Navegacion interna de Analisis.
4. Mobile smoke en Home, Tactica y Concentraciones.
5. Validaciones de formularios y estados vacios.
