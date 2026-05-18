---
name: feedback_tactica_celeste
description: En tactica/index.html, --celeste es #4a9fd4 (azul del campo de juego), diferente al --celeste del sistema (#22a8e8). Nunca unificarlos.
metadata:
  type: feedback
---

En `tactica/index.html`, la variable `--celeste` tiene el valor `#4a9fd4`, que representa el azul del campo de juego y los elementos táctiles del tablero.

El sistema de diseño estándar define `--celeste` como `#22a8e8`. Son colores distintos con significados distintos.

**Why:** Si se renombrara o unificara, la paleta visual del tablero táctico (colores de equipo, botones del sidebar, statusbar) cambiaría visualmente y rompería la coherencia del tablero de juego.

**How to apply:** Al alinear variables CSS en táctico, agregar las del sistema estándar como variables nuevas (ej: `--azul-sistema: #22a8e8`) pero nunca sobreescribir `--celeste` en ese módulo. Ver implementación en commit c996884.
