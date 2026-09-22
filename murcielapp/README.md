# MurcielApp · prueba pública de Entrenar y Registrar estímulo

Esta carpeta contiene la primera prueba funcional de la experiencia para
jugadoras. Permite consultar una rutina real por día o recorrerla paso a paso.
Permite probar el formulario de Registrar estímulo hasta la revisión de datos.
Todavía no envía ni guarda registros, no infiere ejecución o cumplimiento y no
consume APIs de Herramientas CT.

La rutina estructurada fue revisada manualmente contra el PDF antes de su
publicación. La aplicación carga `rutina.json` y permite ver o descargar
`rutina-original.pdf`.

## Alcance de esta etapa

- Entrenar abre dos caminos: Ver rutina o Paso a paso.
- Cada camino permite elegir el día con botones.
- Ver rutina también ofrece el PDF completo.
- Paso a paso tiene controles Anterior y Siguiente. Al entrar, el foco queda en
  Siguiente; al avanzar, el navegador conserva el foco sin reasignarlo.
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
  Registrar (prueba) completa el recorrido sin guardar ni enviar datos.
  Mi semana aparece a la derecha como botón secundario siempre disponible dentro
  de Registrar estímulo. En esta prueba muestra un estado vacío porque los
  registros todavía no se guardan.
- Penales y Mi perfil quedan identificados como próximos módulos.
- Inicio está siempre disponible en el encabezado y vuelve directamente a la
  pantalla inicial de Entrenar. Inicio y Accesibilidad usan íconos compactos en
  pantalla, pero conservan sus nombres completos para lectores de pantalla.
- Accesibilidad permite elegir contraste nativo, oscuro o claro; texto nativo o
  grande; y destacar acciones en naranja. Cada ajuste es independiente, se
  aplica al instante y se guarda solo en este navegador. Restablecer ajustes
  devuelve los tres valores iniciales. El panel usa radios HTML nativos y
  queda separado de los cuatro accesos principales.

Esta versión no crea cuentas ni carga datos personales. El acceso individual,
el envío del formulario y Mi semana requieren autenticación, autorización y
persistencia en el servidor.

## Comprobaciones antes de ampliar el alcance

Recorrer Día 1 a Día 5, confirmar cada bloque frente al PDF y probar la tarea
principal con Android TalkBack e iOS VoiceOver. Registrar el dispositivo, versión
del sistema, lector usado, tarea, resultado y observaciones de cada prueba.
Probar especialmente el anuncio de los radios, el cambio de contraste mientras
está activo el lector y el uso con zoom del sistema.
