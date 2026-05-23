# Pendientes

## Hecho

### Base de datos — Error al abrir ficha desde alertas
Resuelto: `toInputDate` ya quedó disponible en el contexto compartido y la ficha abre sin romper desde alertas.

### Base de datos — Duplicación en la ficha
Resuelto: se limpiaron los bloques repetidos y quedaron solo las tarjetas finales de archivos / estados.

### Antidoping — Medicamentos inventados y variantes comerciales
Ya quedó endurecida la búsqueda: ahora se muestran variantes separadas, se evita elegir una sola respuesta a ciegas y la carga de frecuentes quedó diferida hasta abrir esa pestaña.

### Generación de documentos — Entidad convocante con nombre completo
Resuelto: la convocatoria y los placeholders ahora priorizan el nombre completo de la Federación Argentina de Deportes para Ciegos.

### Reportes — Prompt y modelo de IA
Ya quedó el prompt más guiado y el backend sigue con `gpt-4.1-mini` por defecto, configurable desde Script Properties.

### Rendimiento — Precargas iniciales
Se achicó la carga inicial: Antidoping ahora difiere frecuentes y Reportes difiere el contexto analítico pesado hasta que realmente hace falta.

## Por validar

### Antidoping — Revisión con casos reales
Probar con ejemplos concretos de nombres comerciales y ver que cada versión aparezca con su propio veredicto.

### Reportes — Ajuste visual final
Hacer una pasada visual en navegador para confirmar que el panel de referencias quedó más liviano y que no se rompió la composición.

### Rendimiento — Otros módulos
Seguir mirando si hay otro módulo que siga precargando de más o mostrando pantallas vacías al inicio.