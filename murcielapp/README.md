# MurcielApp · primera prueba de Entrenar

Esta carpeta contiene la experiencia separada para jugadoras. La primera prueba
permite leer una rutina por día y recorrerla paso a paso. No registra ejecución,
cumplimiento ni estímulos.

La app carga `private/rutina.json` y enlaza `private/rutina-original.pdf`. La carpeta
`private/` queda fuera de Git: permite probar una prescripción real en una red local
sin publicarla en GitHub Pages. Si faltan esos archivos, la pantalla muestra un
estado vacío comprensible y no consulta la API del CT.

Para probar localmente desde `murcielapp/`:

```text
python -m http.server 8765 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8765/` desde la computadora. El servidor expone solamente
esta carpeta al equipo local y debe apagarse al terminar la prueba. Una prueba
posterior en teléfono requerirá decidir cómo habilitar acceso privado entre
dispositivos.

## Alcance de esta etapa

- Una identidad local de prueba indicada en `private/rutina.json`.
- Días de la prescripción sin asignarles fechas del calendario.
- Ver rutina y Paso a paso con controles Anterior, Repetir y Siguiente. Los tres
  bloques de zona media se alternan por vuelta; los de fuerza se completan de a
  un bloque. Las progresiones se presentan como tablas semánticas.
- Enlace al PDF original únicamente en la prueba local.
- Los otros tres accesos del menú identificados como próximos módulos.

La identidad local **no es una cuenta autenticada**. No se cargan ni modifican
datos de la Base Personal, Reportes ni Penales. Antes de utilizar datos personales
o registrar estímulos reales se necesita autorización por jugadora en el servidor.

## Comprobaciones antes de avanzar

Recorrer Día 1 a Día 5, confirmar cada bloque frente al PDF, probar los controles
con teclado y zoom, y completar la tarea con Android TalkBack e iOS VoiceOver.
Las pruebas automáticas son complementarias a esos recorridos reales.
