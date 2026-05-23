# Pendientes

## Bugs

### Base de datos — Error al abrir ficha desde alertas
`Error al cargar ficha: toInputDate is not defined`
Al navegar desde el panel de alertas a la ficha individual de una jugadora, la función `toInputDate` no está definida en ese contexto. Revisar si la función existe en el scope correcto o si falta incluirla antes de llamarla desde la vista de alertas.

### Antidoping — Acepta medicamentos inventados
Nombres sin existencia real (ej: "yutifurinol") pasan el flujo y reciben una clasificación. El módulo necesita una validación que descarte términos que no aparecen en ninguna fuente conocida (catálogo interno, WADA, prvademecum) antes de emitir resultado.

### Generación de documentos — Entidad convocante dice "FADEC" en lugar del nombre completo
En los documentos generados desde Concentraciones, la entidad convocante aparece como "FADEC" en lugar del nombre completo ("Federación Argentina de Deportes para Ciegos" o el que corresponda). Revisar el placeholder o el valor hardcodeado en el GAS o en el template de Drive.

## Mejoras

### Reportes — Distribución y modelo de IA
- Revisar la distribución visual del módulo; hay margen para mejorar el uso del espacio.
- El prompt enviado a la IA puede mejorarse para producir reportes más específicos y útiles.
- Evaluar si `claude-haiku-4-5-20251001` sigue siendo el modelo adecuado o conviene subir a Sonnet para mejor calidad narrativa.

### Rendimiento — Precarga lenta en algunos módulos
Algunos módulos navegan y precargan lento. Identificar cuáles (probablemente los que hacen llamadas al Worker al montar) y evaluar:
- Mostrar estado de carga visible en lugar de pantalla en blanco.
- Cachear respuestas frecuentes donde tenga sentido.
- Revisar si hay llamadas redundantes al arranque.
