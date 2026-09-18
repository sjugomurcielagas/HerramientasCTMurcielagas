# MurcielApp · prueba pública de Entrenar

Esta carpeta contiene la primera prueba funcional de la experiencia para
jugadoras. Permite consultar una rutina real por día o recorrerla paso a paso.
No registra ejecución, cumplimiento ni estímulos, y no consume APIs de
Herramientas CT.

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
- Los otros tres accesos del menú quedan identificados como próximos módulos.

Esta versión no crea cuentas ni carga datos personales. El acceso individual y
el registro de datos reales requieren autenticación y autorización en el servidor.

## Comprobaciones antes de ampliar el alcance

Recorrer Día 1 a Día 5, confirmar cada bloque frente al PDF y probar la tarea
principal con Android TalkBack e iOS VoiceOver. Registrar el dispositivo, versión
del sistema, lector usado, tarea, resultado y observaciones de cada prueba.
