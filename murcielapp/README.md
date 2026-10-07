# MurcielApp · Entrenar y Registrar estímulo

Esta carpeta contiene la primera prueba funcional de la experiencia para
jugadoras. Permite consultar una rutina real por día o recorrerla paso a paso.
Permite registrar estímulos con un acceso personal de un solo uso y consultar
los registros recientes en Mi semana. El registro es una declaración de la
jugadora; no infiere ejecución ni cumplimiento.

La rutina estructurada fue revisada manualmente contra el PDF antes de su
publicación. La aplicación carga `rutina.json` y permite ver o descargar
`rutina-original.pdf`.

## Alcance de esta etapa

- Entrenar abre dos caminos: Ver rutina o Paso a paso.
- Cada camino permite elegir el día con botones.
- Ver rutina también ofrece el PDF completo.
- Paso a paso tiene controles Anterior y Siguiente. Al entrar, el foco queda en
  Siguiente; al avanzar, el navegador conserva el foco sin reasignarlo.
  Entre ambos aparece Cronómetro, con Iniciar, Pausar, Continuar y Reiniciar.
  El tiempo continúa al cambiar de aplicación y no se anuncia cada segundo.
  Los avisos opcionales cada 10 segundos permiten elegir Sin aviso (inicial),
  Voz o Bip. La voz dice solo el número: 10, 20, 30. La elección se recuerda
  en el navegador. Al volver a la app no se reproducen avisos atrasados.
  El audio requiere la página visible; el navegador puede suspenderlo al
  bloquear la pantalla o cambiar de aplicación, sin perder el tiempo acumulado.
  El navegador conserva el día y la indicación para recuperarlos tras una
  recarga, junto con el cronómetro. Ese estado es navegación local, no un
  registro de cumplimiento, y se descarta cuando cambia la rutina publicada.
- Los tres bloques de zona media se alternan por vuelta.
- Los bloques de fuerza se recorren completos, con sus progresiones y ejercicios
  combinados juntos.
- Registrar estímulo permite elegir Físico, Técnico-táctico u Otros, declarar una
  fecha anterior, ingresar duración en horas y minutos y revisar los datos.
  Físico y Técnico-táctico piden sRPE de 0 a 10; Otros no lo pide. Desde el
  final de Paso a paso, Físico aparece preseleccionado sin registrar ejecución.
  Otros muestra Psicología por defecto y permite elegir Nutrición,
  Kinesiología, Consulta médica u Otro con una descripción breve.
  El formulario sigue el orden Fecha, Tipo, Duración y sRPE. Físico aparece
  preseleccionado para que el campo de intensidad esté disponible al ingresar.
  La escala sRPE tiene referencias rápidas y una explicación opcional con
  criterios concretos para aprender a elegir el valor, basada en Foster y
  colaboradores (2001): https://pubmed.ncbi.nlm.nih.gov/11708692/.
  El resumen muestra la referencia junto al valor elegido; 6, 8 y 9 se ubican
  entre los anclajes verbales vecinos, sin atribuirles una leyenda original.
  La explicación y el campo sRPE se ocultan para Otros.
  Las casillas de horas y minutos empiezan vacías; alcanza con completar una.
  Los minutos pueden superar 60 y se convierten en horas y minutos al avanzar.
  Siguiente lleva a la revisión de datos.
  Registrar guarda el estímulo declarado en la base, asociado a la jugadora.
  Mi semana aparece a la derecha como botón secundario siempre disponible dentro
  de Registrar estímulo y muestra sus registros de los últimos siete días.
- Penales y Mi perfil quedan identificados como próximos módulos.
- Inicio está siempre disponible en el encabezado y vuelve directamente a la
  pantalla inicial de Entrenar. Inicio y Accesibilidad usan íconos compactos en
  pantalla, pero conservan sus nombres completos para lectores de pantalla.
- Accesibilidad permite elegir contraste nativo, oscuro o claro; texto nativo o
  grande; y destacar acciones en naranja. Cada ajuste es independiente, se
  aplica al instante y se guarda solo en este navegador. Restablecer ajustes
  devuelve los tres valores iniciales. El panel usa radios HTML nativos y
  queda separado de los cuatro accesos principales.

## Acceso y publicación

- Las jugadoras reciben por correo un código personal de ocho números,
  agrupados de a cuatro. El mismo código sirve para volver a entrar desde otro
  teléfono o navegador. Los códigos ya emitidos también son reutilizables; las
  fechas de vencimiento anteriores dejan de aplicarse. Solo sirve el último
  código enviado a cada jugadora, y se limitan los intentos fallidos. La sesión
  se conserva en el navegador por hasta 180 días. La API valida la identidad
  antes de guardar o devolver registros.
- Gestión de MurcielApp consulta el plantel activo y muestra una vista previa
  con nombres, correos y estado. Ninguna destinataria aparece seleccionada al
  abrir la lista. Los envíos se procesan en lotes de cinco. Si una jugadora ya
  perdió su código, Gestión permite cambiarlo y enviar uno nuevo al correo
  registrado. El anterior deja de servir. Se limita el cambio a una vez cada
  diez minutos; las sesiones existentes y los estímulos guardados se conservan.
- Configurar `MURCIELAPP_ADMIN_KEY` como propiedad de script en el proyecto
  Base de datos de Apps Script, con al menos 32 caracteres aleatorios. No
  escribir la clave en el repositorio. Gestión de MurcielApp la usa para crear
  una sesión administrativa de 30 días. La opción «Recordar este dispositivo»
  guarda únicamente el token temporal en ese navegador; «Cerrar sesión» lo
  revoca en el servidor y lo borra del navegador. Sin marcar la opción, la
  sesión dura solo mientras la página siga abierta.
- Publicar una versión nueva de la aplicación web de Apps Script con el alcance
  `script.send_mail`. El Worker solo reenvía las acciones exactas de MurcielApp
  por POST al módulo Base de datos.
- El botón de prueba genera un código para Santiago sin enviar correo. Sus
  registros se guardan bajo `TEST_SANTIAGO` y se pueden quitar después desde
  las hojas de auditoría.
- Un fallo temporal de conexión al restaurar el acceso no borra la sesión
  guardada. Si el navegador no permite guardarla, la sesión queda disponible
  mientras la pestaña permanezca abierta.

## Comprobaciones antes de ampliar el alcance

Recorrer Día 1 a Día 5, confirmar cada bloque frente al PDF y probar la tarea
principal con Android TalkBack e iOS VoiceOver. Registrar el dispositivo, versión
del sistema, lector usado, tarea, resultado y observaciones de cada prueba.
Probar especialmente el anuncio de los radios, el cambio de contraste mientras
está activo el lector y el uso con zoom del sistema.
