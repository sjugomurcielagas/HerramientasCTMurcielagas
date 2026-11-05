# Actualización visual de Herramientas CT a partir de Reportes

Revisión del código al 5 de noviembre de 2026. Referencia: la vista actual de `reportes/`, incluida la compactación de tablas del cambio `c54e5ff`. La comparación se hizo sobre HTML y CSS; queda pendiente validar capturas en navegador.

## Qué cambió y qué conviene adoptar

| Elemento | Reportes frente al resto del sitio | Propuesta |
| --- | --- | --- |
| Fondo y superficies | Reportes usa fondo liso `#f4f8fc`, paneles blancos, bordes suaves y radio de 16 px. Inicio y Análisis usan gradientes y más relieve. El azul institucional `#0b2f5f` ya coincide. | Compartir la paleta de Reportes y usar bordes como separación principal. |
| Tipografía y títulos | Reportes usa fuente del sistema, texto de 16 px y títulos fluidos. Inicio y Análisis usan Barlow y títulos más grandes en Barlow Condensed; Entrenar y Gestión ya usan fuente del sistema a 18 px. | Fuente del sistema en pantallas operativas. Probar el título institucional en la portada como acento de marca y conservar 18 px en Entrenar. |
| Navegación y controles | Reportes separa marca, título y acciones; usa azul sólido para la acción principal y permite que los filtros pasen a otra línea. | Compartir estilos de cabecera, botones y campos. Mantener 44 px como referencia para controles táctiles y conservar los 48 px de Gestión. |
| Tablas | El último ajuste alinea números a la derecha, usa cifras de ancho uniforme, permite títulos de columna en dos líneas y fija el nombre al desplazar la tabla. | Usar este patrón en tablas anchas de comparación. Mantener la densidad de 13 px como variante; en las tablas de consulta, empezar con texto más grande. |
| Resúmenes y estados | Los indicadores de Reportes resaltan el dato, los paneles vacíos tienen tratamiento propio y la impresión quita controles. | Reusar avisos y estados vacíos. Mostrar indicadores solo donde ayuden a decidir. Mantener impresión y navegación de períodos como funciones de Reportes. |

## Orden de implementación

1. **Inicio, Análisis y Partidos como piloto.** Cubren tres superficies distintas: portada, navegación por tarjetas y pantalla con datos. Crear una hoja común en `assets/` con variables de color, tipografía y espaciado y clases explícitas para cabecera, panel, botón, campo y tabla. Migrar los tres módulos usando esas clases y mantener Reportes como referencia visual.
2. **Extender a los módulos de consulta y registro.** Aplicar la base a Concentraciones, Base de Datos, Antidoping, Rivales, Penales, Pre-partido, Registro de acciones y Gestión. Revisar cada tabla antes de aplicar la versión compacta o fijar la primera columna. Adoptar luego los estilos comunes en Reportes para que la referencia y el resto del sitio evolucionen juntas.
3. **Adaptar Táctica y Entrenar.** Llevar la base a los elementos de navegación y presentación compatibles con cada módulo. En Táctica, preservar el contraste y los colores del campo y las fichas. En Entrenar, preservar alto contraste, modo oscuro, tamaño de letra y controles. Las interfaces históricas de Apps Script requieren su propia revisión.

## Cómo comprobarlo

- Comparar capturas de Reportes y las tres pantallas piloto en escritorio y móvil (por ejemplo, 390 px). Confirmar que solo la tabla se desplace horizontalmente y que los controles no se corten con zoom.
- Recorrer con teclado la navegación, los filtros y las tablas ordenables. Comprobar que el foco sea visible y que los colores de texto, controles y estados cumplan contraste antes de compartirlos; el celeste de foco actual merece revisión sobre blanco.
- Revisar estados de carga, vacío y error, y la impresión de Reportes. Verificar los recorridos de acceso, filtros, exportación y registro con las pruebas existentes.
- Comprobar la actualización de la hoja de estilos con una sesión que ya tenga la PWA instalada y versionar el recurso según la estrategia de caché del sitio.

## Primera consulta en Reportes

- **¿Qué muestran estas cifras?** Al cambiar las fechas se oculta el reporte anterior y se indica que hay que pulsar «Ver reporte». Los botones de período anterior y siguiente siguen consultando directamente.
- **¿Cómo veo a una jugadora?** El selector superior muestra el equipo o una jugadora; junto a la tabla se explica que su nombre también abre el reporte individual.
- **¿Por qué veo ceros?** Un aviso explica que no hay registros para esa selección y ofrece alternativas. El cálculo de los promedios queda disponible al desplegar una pregunta.
- **Siguiente prueba con alguien que no conozca el sitio:** pedirle que encuentre el resumen de la semana anterior de una jugadora y explique qué cuentan «F + T» y «Total». Observar también si espera que «Ver estímulos registrados» muestre el detalle de todo lo que aparece en los totales.
