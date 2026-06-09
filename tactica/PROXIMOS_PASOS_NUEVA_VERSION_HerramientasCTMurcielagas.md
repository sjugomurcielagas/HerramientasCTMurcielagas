# HerramientasCTMurcielagas - Auditoria integrada y base de trabajo para nueva version

**Proyecto:** HerramientasCTMurcielagas  
**Uso:** herramienta interna del Cuerpo Tecnico de Las Murcielagas - FADEC  
**URL principal:** https://sjugomurcielagas.github.io/HerramientasCTMurcielagas/  
**Version auditada:** UI 2026.05.17 - build cde78f1  
**Fecha de consolidacion:** 26 de mayo de 2026  

---

## 1. Proposito de este documento

Este documento unifica los hallazgos de tres auditorias realizadas sobre el sitio **HerramientasCTMurcielagas**. Su finalidad es dejar una base ordenada para planificar la proxima version del sistema, convertir los problemas detectados en tareas progresivas y evitar que el crecimiento de la herramienta se vuelva desordenado.

No es todavia un backlog tecnico definitivo. Es un documento puente: resume el estado actual, identifica coincidencias entre auditorias, prioriza mejoras y deja preparada una estructura para transformar cada punto en instrucciones de desarrollo.

---

## 2. Sintesis ejecutiva integrada

Las tres auditorias coinciden en que el sitio presenta una base solida, con identidad institucional clara, buena organizacion conceptual y una arquitectura adecuada para una herramienta interna de cuerpo tecnico. El proyecto ya supera ampliamente el nivel habitual de herramientas artesanales usadas en contextos deportivos, especialmente por su enfoque modular, su orientacion mobile-first y su aspiracion PWA.

El home carga correctamente, los modulos principales estan visibles y la estructura general transmite profesionalismo. Tambien se destaca que el sistema responde a necesidades reales: seguimiento de entrenamiento, tablero tactico, base de datos, concentraciones, antidoping y analisis de rendimiento.

La principal necesidad de la nueva version no parece ser sumar mas modulos, sino **consolidar estabilidad, navegacion, persistencia, feedback de estados y experiencia mobile**. Dicho de otro modo: el sistema ya crecio lo suficiente como para necesitar una etapa de ordenamiento tecnico y operativo antes de seguir incorporando funciones nuevas.

---

## 3. Diagnostico general

### 3.1 Estado global del proyecto

El proyecto se encuentra en una etapa funcional avanzada para una herramienta interna. Tiene una estructura clara, rutas principales accesibles, modulos diferenciados y un lenguaje adecuado para el cuerpo tecnico.

La version auditada muestra consistencia visual y tecnica entre modulos. En una de las auditorias se detecto uniformidad de version UI en todos los modulos, lo que indica un deployment coherente y sin pantallas desactualizadas.

### 3.2 Riesgo principal

El riesgo principal no esta en una falla aislada, sino en el crecimiento del ecosistema. Si se siguen agregando funciones sin reforzar la base comun, pueden aparecer problemas de navegacion, duplicacion de datos, estados ambiguos, perdida de informacion local o dificultades de uso en mobile.

La nueva version deberia enfocarse en que el sistema sea mas confiable, mas claro y mas facil de usar por cualquier integrante del cuerpo tecnico, incluso en contexto de cancha, concentracion o baja conectividad.

---

## 4. Estado integrado por modulo

| Modulo | Estado integrado | Observacion principal |
|---|---|---|
| Home | OK con ajustes necesarios | Carga branding y accesos, pero debe mejorar feedback de alertas y evitar ambiguedad en estados de carga. |
| Reportes | Parcial / requiere validacion funcional | Estructura visible y logica clara, pero falta validar carga real, persistencia, duplicacion y generacion de informes. |
| Tactica | Funcional con problema mobile critico | Buen nivel de controles, pero el drag-and-drop en pantallas chicas presenta friccion importante. |
| Base de datos | OK parcial | Consulta y estructura visual correctas; alta de integrantes pendiente o sin alternativa suficientemente documentada. |
| Concentraciones | OK parcial | Buena estructura para convocatorias, documentos, licencias y certificaciones; requiere validacion funcional completa. |
| Antidoping | OK con refuerzo de advertencias | Modulo valioso y bien planteado; debe reforzar que los resultados son orientativos y requieren verificacion. |
| Analisis - Penales | OK parcial | Registro y cruces utiles; puede requerir acceso mas directo desde home si se usa cotidianamente. |
| Analisis - Partidos | OK parcial / sin datos | Estructura visible, pero no se pudo evaluar con carga real de partidos. |
| PWA / Offline | A validar | Service Worker, localStorage, instalacion, notificaciones y cola offline requieren auditoria manual en Chrome DevTools y Android real. |

---

## 5. Hallazgos principales consolidados

### 5.1 Navegacion transversal limitada

Las auditorias coinciden en que el sistema necesita una navegacion global mas integrada. Actualmente, para moverse entre modulos, el usuario depende demasiado del regreso al home o del boton atras del navegador.

**Impacto:** en uso mobile o durante una concentracion, esto puede volver lento el cambio entre herramientas.

**Linea de mejora:** implementar una navegacion comun en todos los modulos, ya sea mediante navbar superior, menu hamburguesa o bottom navigation en mobile.

---

### 5.2 Estado de alertas ambiguo en el home

Se detecto que la seccion de alertas puede quedar mostrando textos del tipo `Cargando estado...` si el JavaScript no resuelve correctamente la consulta o si hay demoras de conexion.

**Impacto:** el cuerpo tecnico no sabe si el sistema esta cargando, fallo o no encontro datos.

**Linea de mejora:** agregar timeout visible, boton de reintento y mensajes concretos de error o estado.

---

### 5.3 Validacion incompleta de PWA, Service Worker y modo offline

Las auditorias destacan el valor de que el sistema funcione como PWA, pero tambien remarcan que falta una validacion funcional completa del Service Worker, localStorage, almacenamiento local, instalacion, notificaciones y comportamiento offline.

**Impacto:** si el CT carga datos en contexto de baja conectividad, debe tener certeza de que los registros no se pierden.

**Linea de mejora:** realizar auditoria manual en Chrome DevTools y dispositivo Android real.

---

### 5.4 Riesgo de duplicacion de registros en formularios

Una auditoria advierte que, si el boton de envio no se deshabilita inmediatamente, multiples clics pueden generar registros duplicados.

**Impacto:** afecta la calidad de datos, especialmente en reportes de entrenamiento o formularios sRPE.

**Linea de mejora:** deshabilitar botones durante procesamiento, generar UUID unico por registro y aplicar deduplicacion.

---

### 5.5 Tablero tactico con friccion alta en mobile

El tablero tactico aparece como uno de los modulos mas completos, pero se detecta una limitacion importante en mobile: los elementos arrastrables pueden interferir con el scroll vertical de la pagina.

**Impacto:** en celulares de 375px o similares, mover fichas puede volverse dificil o casi imposible.

**Linea de mejora:** aplicar `touch-action: none` en la zona del tablero, revisar Pointer Events / Touch Events y separar correctamente gesto de scroll y gesto de arrastre.

---

### 5.6 Alta de integrantes en Base de datos pendiente o poco clara

El boton de agregar integrante aparece como proximo o inhabilitado. Mientras esa funcion no este disponible, no queda suficientemente documentado el flujo alternativo.

**Impacto:** ante una nueva convocatoria, el CT puede no saber como incorporar una jugadora o integrante nuevo.

**Linea de mejora:** habilitar funcion o mostrar instruccion clara: donde cargar el dato, quien lo hace y como se refleja en el sistema.

---

### 5.7 Antidoping: riesgo de interpretacion definitiva del resultado

El modulo antidoping esta bien valorado por sus criterios y fuentes, pero se recomienda reforzar que cada resultado es orientativo y debe verificarse antes de tomar una decision.

**Impacto:** en materia antidoping, una mala interpretacion puede tener consecuencias deportivas y administrativas graves.

**Linea de mejora:** cada tarjeta de resultado deberia incluir una advertencia breve y visible.

---

### 5.8 Acceso al modulo Analisis

Se observa que el acceso a Penales y Partidos puede requerir demasiados pasos: home, modulo Analisis y luego submodulo.

**Impacto:** si Penales o Partidos se usan con frecuencia, el flujo puede resultar lento.

**Linea de mejora:** evaluar acceso directo desde home o conservar pantalla intermedia solo si el modulo Analisis crecera con mas herramientas.

---

## 6. Aspectos positivos consolidados

- Identidad visual institucional clara y profesional.
- Arquitectura modular coherente.
- Enfoque real en necesidades del cuerpo tecnico.
- Buen uso conceptual de PWA para contextos de campo y concentracion.
- Lenguaje apropiado, claro y sin tecnicismos innecesarios.
- Tablero tactico con alto nivel de funcionalidades.
- Modulo Antidoping con criterios responsables y valor operativo alto.
- Concentraciones integra tareas documentales que reducen trabajo manual repetitivo.
- Base de datos conserva historial al marcar inactivos en lugar de borrar registros.
- Penales permite cruces valiosos entre jugadora y arquera.

---

## 7. Prioridades para la nueva version

### Prioridad 1 - Estabilidad operativa y confianza del sistema

Antes de sumar nuevas funciones, asegurar que las funciones existentes respondan bien en escenarios reales: conexion lenta, modo offline, mobile, doble clic accidental, datos incompletos y errores de API.

Tareas asociadas:

- Auditar Service Worker, Manifest, Cache Storage y localStorage.
- Validar instalacion como PWA en Android.
- Verificar comportamiento offline y recuperacion al volver la conexion.
- Agregar indicadores visuales de estado online/offline.
- Evitar duplicacion de registros en formularios.
- Agregar mensajes claros ante errores de carga.

---

### Prioridad 2 - Navegacion global y experiencia mobile

El sistema ya tiene suficientes modulos como para necesitar una navegacion transversal. La experiencia mobile debe ser el criterio principal, porque es el contexto mas probable de uso por parte del cuerpo tecnico.

Tareas asociadas:

- Definir componente global de navegacion.
- Implementar menu comun en todos los modulos.
- Evaluar bottom navigation en mobile.
- Asegurar boton de regreso al home sin romper el flujo.
- Revisar cantidad de pasos para llegar a Penales y Partidos.
- Resolver friccion tactil en Tablero Tactico.

---

### Prioridad 3 - Integridad de datos

La herramienta depende de la calidad de los datos. Por eso, la nueva version debe impedir duplicados, conservar registros, avisar estados pendientes y diferenciar claramente datos guardados, datos en cola y datos sincronizados.

Tareas asociadas:

- UUID por registro.
- Botones disabled durante envio.
- Deduplicacion automatica.
- Mensajes de confirmacion de guardado.
- Indicador de datos en cola offline.
- Auditoria de persistencia local.

---

### Prioridad 4 - Documentacion funcional dentro de la interfaz

Algunas funciones no disponibles o sensibles necesitan explicacion visible en la propia herramienta.

Tareas asociadas:

- Explicar flujo alternativo para alta de integrantes.
- Reforzar advertencia en resultados de Antidoping.
- Documentar estados de carga, error y reintento.
- Incluir ayudas breves en formularios criticos.

---

## 8. Backlog inicial propuesto

### 8.1 Tareas criticas

1. Corregir drag-and-drop del Tablero Tactico en mobile.
2. Implementar control de doble envio en formularios.
3. Validar Service Worker, localStorage, Manifest y modo offline.
4. Agregar feedback claro en alertas del home.
5. Incorporar indicador online/offline y datos pendientes de sincronizacion.

### 8.2 Tareas importantes

1. Crear navegacion global comun.
2. Revisar acceso a submodulos de Analisis.
3. Documentar flujo alternativo de alta de integrantes.
4. Agregar advertencia en cada resultado de Antidoping.
5. Verificar flujo de identificacion por DNI.

### 8.3 Tareas de mejora

1. Revisar posible saturacion del home.
2. Unificar patrones visuales entre modulos.
3. Mejorar mensajes vacios: sin datos, sin conexion, sin registros.
4. Agregar microayudas contextuales en funciones sensibles.
5. Preparar checklist de testeo antes de cada deploy.

---

## 9. Instrucciones progresivas pendientes de desarrollar

Esta seccion queda preparada para transformar el diagnostico en instrucciones tecnicas progresivas. La recomendacion es avanzar por bloques, sin mezclar demasiados cambios en un mismo deploy.

### Bloque 1 - Auditoria tecnica manual

Objetivo: confirmar el estado real de PWA, almacenamiento, modo offline y carga de datos.

Pendiente de convertir en instrucciones:

- Abrir Chrome DevTools.
- Revisar Application - Manifest.
- Revisar Application - Service Workers.
- Revisar Application - Storage / localStorage.
- Probar instalacion PWA en Android.
- Probar navegacion offline.
- Probar carga de formularios offline y reconexion.

### Bloque 2 - Correcciones de seguridad de datos

Objetivo: evitar duplicados y asegurar confirmaciones de guardado.

Pendiente de convertir en instrucciones:

- Deshabilitar botones durante envio.
- Agregar estado `isSubmitting`.
- Generar UUID por registro.
- Crear control de deduplicacion.
- Mostrar confirmacion clara de guardado.
- Mostrar error recuperable si falla el guardado.

### Bloque 3 - Navegacion global

Objetivo: permitir moverse entre modulos sin volver siempre al home.

Pendiente de convertir en instrucciones:

- Definir estructura de navegacion comun.
- Crear componente navbar / menu mobile.
- Integrarlo en Home, Reportes, Tactica, Base de datos, Concentraciones, Antidoping y Analisis.
- Evitar duplicar codigo innecesario.
- Probar rutas relativas en GitHub Pages.

### Bloque 4 - Mobile del Tablero Tactico

Objetivo: resolver el conflicto entre arrastre de fichas y scroll de pantalla.

Pendiente de convertir en instrucciones:

- Aplicar `touch-action: none` solo en el area del tablero.
- Revisar Pointer Events.
- Evitar bloquear scroll fuera del tablero.
- Probar en ancho 375px.
- Probar en tablet vertical y horizontal.

### Bloque 5 - Feedback de estados

Objetivo: que el usuario siempre sepa que esta pasando.

Pendiente de convertir en instrucciones:

- Estados de carga.
- Estados de error.
- Estados sin datos.
- Estados offline.
- Estados de sincronizacion pendiente.
- Boton reintentar.

### Bloque 6 - Ajustes de modulos sensibles

Objetivo: reforzar funciones donde una mala interpretacion puede generar problemas.

Pendiente de convertir en instrucciones:

- Antidoping: advertencia por resultado.
- Base de datos: alta de integrantes o flujo alternativo visible.
- Reportes: validacion de DNI y carga real.
- Analisis: acceso directo o decision justificada de mantener pantalla intermedia.

---

## 10. Checklist de prueba sugerido antes de publicar nueva version

### Home

- Carga logos y accesos.
- Alertas no quedan indefinidamente en `Cargando...`.
- Boton de instalacion PWA aparece cuando corresponde.
- Mensajes de error son claros.

### Reportes

- Carga datos reales.
- No duplica registros por doble clic.
- Confirma guardado.
- Maneja falta de conexion.
- Genera informe IA sin bloquear la vista operativa.

### Tactica

- Arrastre funciona en desktop.
- Arrastre funciona en mobile.
- Scroll no interfiere dentro del tablero.
- Botones principales son usables en pantalla chica.
- Exportacion o guardado no rompe la sesion.

### Base de datos

- Busca integrante correctamente.
- Muestra faltantes y vencimientos por separado.
- Explica como agregar integrante si el alta no esta habilitada.
- No borra historial por error.

### Concentraciones

- Lista concentraciones.
- Crea o edita datos segun corresponda.
- Genera documentos esperados.
- No duplica convocatorias.

### Antidoping

- Busca medicamento.
- Muestra fuente o criterio utilizado.
- Incluye advertencia orientativa en cada resultado.
- Registra consulta si corresponde.

### Analisis

- Penales carga jugadoras y arqueras.
- Partidos permite registro basico.
- Accesos son claros desde mobile.

### PWA / Offline

- Manifest valido.
- Service Worker activo.
- App instalable.
- Recursos cargan offline.
- Datos offline quedan en cola o se informa que no se puede guardar.
- Al volver conexion, el usuario sabe que hacer.

---

## 11. Criterio de orden para la proxima version

La proxima version deberia seguir este orden:

1. Validar lo que ya existe.
2. Corregir errores de confianza y persistencia.
3. Mejorar navegacion global.
4. Optimizar mobile, especialmente Tactica.
5. Reforzar modulos sensibles.
6. Recien despues, sumar nuevas funcionalidades.

Este orden evita que el proyecto crezca sobre una base inestable. La prioridad no es hacer mas grande el sistema, sino hacerlo mas confiable, mas usable y mas facil de sostener.

---

## 12. Nota final

HerramientasCTMurcielagas ya funciona como algo mas que una pagina web: es un sistema de gestion interna para un cuerpo tecnico de seleccion nacional. La nueva version deberia consolidar esa identidad, cuidando tres ideas centrales:

- que el CT pueda usarlo sin pensar demasiado;
- que los datos no se pierdan ni se dupliquen;
- que cada modulo tenga una funcion clara dentro de un ecosistema comun.

La herramienta tiene una base muy valiosa. La etapa que sigue es hacerla mas robusta, mas ordenada y mas preparada para sostener el crecimiento futuro.
