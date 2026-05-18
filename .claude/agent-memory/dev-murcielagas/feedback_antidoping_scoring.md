---
name: feedback_antidoping_scoring
description: En resultadoScore() de antidoping, PROHIBIDO devuelve score fijo 10 (inalcanzable por PERMITIDO+datos). Nunca volver al sistema de suma acumulativa.
metadata:
  type: feedback
---

El scoring de selección de resultado en `buscarConAliases()` fue corregido el 2026-05-17.

**Regla:** Si el estado es PROHIBIDO, el score es exactamente 10 (fijo), sin bonus adicionales. Ninguna combinación de PERMITIDO + principio_activo + fuente puede superar ese valor (máximo alcanzable para PERMITIDO = 5).

**Why:** Con el sistema anterior (PROHIBIDO +4, datos +2+1), una búsqueda que devolvía PROHIBIDO sin fuente (score=4) perdía contra una que devolvía PERMITIDO con principio_activo y fuente (score=5). Eso significaba que una búsqueda con alias podía seleccionar PERMITIDO como "mejor resultado" cuando otra variante del alias devolvía PROHIBIDO. Riesgo de seguridad directo.

**How to apply:** Si se modifica la función `resultadoScore()`, mantener que `esProhibido` retorne 10 inmediatamente, sin sumar bonos. El loop de `buscarConAliases` corta temprano cuando `score>=4&&isConclusivo` — con el nuevo sistema, PROHIBIDO (score=10) siempre activa ese corte.
