# Arquitectura V1 estable

Este documento registra la direccion tecnica para convertir el conjunto actual de herramientas en una primera version estable, menos dependiente de cuentas personales, Drive, Apps Script y GitHub Pages como infraestructura operativa.

## Objetivo

Llegar a una V1 estable que pueda operar con infraestructura propia, deploy reproducible, datos con esquema definido y backups claros.

La app no deberia depender criticamente de:

- Google Drive o Google Sheets como base operativa principal.
- Apps Script como backend critico.
- GitHub Pages como unico hosting.
- Datos dispersos sin esquema, versionado ni estrategia de migracion.

## Arquitectura objetivo

- Frontend web empaquetado y desplegable.
- Backend API unico para todos los modulos.
- Base de datos propia con esquema estable.
- Storage propio para PDFs, documentos y reportes generados.
- Backups y exportacion de datos.
- Deploy reproducible por comandos y variables documentadas.

Una ruta natural para el proyecto es Cloudflare:

- Cloudflare Pages para frontend.
- Cloudflare Workers para API.
- D1 como base SQL.
- R2 para PDFs, documentos y reportes.
- KV o Durable Objects solo si aparece una necesidad concreta de estado rapido, sesiones o coordinacion.

GitHub puede seguir como repositorio de codigo, pero no deberia ser una dependencia operativa de la app.

## Fases

1. Congelar V1 funcional
   - Definir modulos incluidos: Reportes, Base de datos, Concentraciones, Tactica, Antidoping y Analisis.
   - Documentar reglas de negocio importantes.
   - Mantener tests smoke por modulo.

2. Disenar esquema de datos
   - Personas y plantel.
   - Reportes de entrenamiento.
   - Concentraciones, actividades y asistencias.
   - Documentos generados.
   - Auditorias.
   - TUE y antidoping.
   - Partidos y analisis.

3. Crear backend propio
   - Replicar endpoints actuales del Worker.
   - Mantener compatibilidad con el frontend durante la transicion.
   - Primero permitir lectura desde Sheets como fallback.
   - Luego pasar progresivamente la operacion a la base propia.

4. Migrar datos
   - Exportar Sheets a JSON o CSV.
   - Importar a D1.
   - Validar conteos, fechas, personas y relaciones por modulo.
   - Dejar una auditoria de migracion.

5. Desacoplar documentos
   - Guardar PDFs, reportes y documentos generados en R2.
   - Exponer URLs propias.
   - Mantener Drive solo como fuente historica o respaldo temporal.

6. Empaquetar deploy
   - Comandos esperados: build, test y deploy.
   - Variables y secrets documentados.
   - Backups periodicos.
   - Procedimiento de recuperacion.

## Criterio de transicion

No conviene eliminar Google Drive al inicio. Debe quedar como fuente historica o fallback mientras se valida la nueva base.

La V1 estable deberia poder funcionar aunque Drive, Sheets o permisos personales fallen.

