# Reportes de MurcielApp y corrección de estímulos

## Estado de publicación · 20/10/2026

Publicado e integrado mediante el PR #2 (merge `de9ed9724891da4cc0b2c4b17e303c22ce86e0fd`). Base/MurcielApp usa la versión 137, que reemplaza a la 136; Reportes usa la versión 40, que reemplaza a la 39. Se conservaron los dos identificadores y URLs de implementación. El Worker se publica desde main mediante su integración existente con GitHub.

Comprobado en producción con la sesión administrativa existente: Reportes de entrenamiento carga los registros diarios reales, sus totales coinciden con la tabla de detalle y la vista individual abre correctamente. El histórico del 05–11/10 conserva datos y permanece separado del período diario. Gestión ya no contiene tabla, filtros ni exportación de estímulos, y enlaza a Reportes. Las consultas directas a Apps Script sin sesión y los GET del CT al Worker se rechazan. No se modificaron estímulos reales ni se enviaron correos o solicitudes a OpenAI durante la comprobación.

Pruebas locales: 27 aprobadas y recorrido original de creación aprobado. La comprobación real de edición/eliminación se mantiene limitada a los recorridos con datos ficticios; la producción se verificó sin alterar registros personales. Los informes con IA de registros diarios y la protección frente a tráfico sostenido siguen pendientes.

## Qué cambia

Reportes abre con la semana del equipo, con selección de jugadora, navegación entre semanas y rango de fechas. Muestra estímulos por tipo, minutos, carga interna, detalle por día y evolución semanal si el rango abarca varias semanas. Permite exportar el detalle visible a CSV e imprimir el informe. Las jugadoras sin registros permanecen en el plantel con «Sin datos registrados».

**Reportes de entrenamiento (`/reportes/`) es el único lugar de análisis del CT.** Gestión de MurcielApp queda para accesos, códigos e invitaciones; su antigua tabla de estímulos se retira y se reemplaza por un enlace a Reportes. MurcielApp de jugadoras conserva Mi semana para consultar y corregir los registros propios.

El corte sigue siendo el **19/10/2026**, por fecha del entrenamiento, según Argentina. Los registros diarios anteriores aparecen como detalle de transición, sin sumarse a los totales. Los formularios semanales históricos se consultan en una sección separada, limitada a semanas entrenadas anteriores al corte. Los informes con IA existentes permanecen dentro del histórico; esta versión no envía los registros diarios nuevos a OpenAI ni genera conclusiones clínicas.

En MurcielApp, Mi semana ofrece **Editar** y **Eliminar** en cada estímulo. Editar reutiliza el formulario y confirma con «Guardar cambios». Eliminar pide confirmación. No se reemplazan otros entrenamientos para compensar una carga equivocada.

Ejemplo de corrección: abrir la semana anterior, corregir el estímulo original de 110 a 80 minutos y, si también existe una segunda carga duplicada, eliminar únicamente el duplicado después de identificarlo. El entrenamiento real del viernes se registra normalmente. **Las pruebas de esta implementación usan datos simulados; no se corrigieron registros reales de las jugadoras.**

## Identidad y conservación de datos

- El ingreso del CT crea las mismas sesiones administrativas de MurcielApp con su contraseña habitual. Por pedido de Santiago, la contraseña por defecto vuelve a ser `1`. Puede configurarse mediante `MURCIELAPP_CT_PASSWORD`; la propiedad interna `MURCIELAPP_ADMIN_KEY` se conserva separada, sin modificarla. La contraseña por sí sola no reemplaza el token en las consultas del CT.
- Las operaciones del CT, incluyendo las lecturas, usan POST con sesión validada en el servidor. No se agregan estímulos diarios a los contextos generales del sitio.
- El Worker y Apps Script verifican el acceso. El Apps Script de Reportes valida la sesión contra `MurcielApp_AdminSesiones` de la base compartida. La cuenta que publica Reportes necesita acceso a esa planilla.
- Los registros de prueba no entran en Reportes. Las jugadoras solo pueden modificar estímulos asociados a su propia sesión.
- `MurcielApp_Estimulos` conserva sus ocho columnas y los valores originales. La nueva hoja `MurcielApp_Correcciones` se crea automáticamente con `Request_ID`, `Estimulo_ID`, `Persona_ID`, `Accion`, `Revision`, `Datos`, `Fecha`.
- Cada corrección agrega una fila bajo bloqueo. Las lecturas de Mi semana y Reportes aplican esas revisiones. Una eliminación retira el registro de las vistas y totales, conservando el original y su auditoría. No borrar filas de correcciones manualmente.
- Cada operación admite reintentos con el mismo identificador. La revisión evita sobrescribir cambios hechos desde otra pestaña. Una corrección inconsistente se informa como error y no se interpreta como cero entrenamiento.
- Los datos de API se mantienen en memoria de la página. La nueva versión retira la caché anterior de localStorage y deja de cachear respuestas de Apps Script en el service worker. El token administrativo se guarda únicamente cuando se elige recordar acceso, salvo el ingreso principal del CT, que mantiene su sesión habitual de 30 días.
- Los códigos personales válidos siguen funcionando aunque se alcance el contador global de códigos incorrectos. Esto evita el bloqueo colectivo; no reemplaza una regla de limitación de tráfico en Cloudflare para ataques sostenidos.
- La generación de informes con IA exige sesión y limita a cinco solicitudes por sesión en diez minutos. Es un límite operativo, no un techo de gasto de la cuenta. No se hicieron llamadas reales a OpenAI durante estas pruebas.

## Publicación coordinada

**Las futuras publicaciones deben coordinar los dos proyectos de Apps Script y el Worker con el sitio.** GitHub Pages se despliega desde main; subir solamente el frontend deja acciones desconocidas en el backend anterior. Actualizar solamente el backend endurecido interrumpe temporalmente el CT anterior. La publicación requiere una ventana breve para coordinar las tres piezas.

1. Guardar una copia de las hojas de estímulos y sesiones y anotar las versiones/implementaciones vigentes de ambos Apps Script y del Worker. No rotar claves ni regenerar códigos de las jugadoras.
2. Confirmar que el ingreso del CT puede crear una sesión con su contraseña configurada (`MURCIELAPP_CT_PASSWORD`, o el valor por defecto si no existe). No copiar la propiedad interna `MURCIELAPP_ADMIN_KEY` al repositorio, al navegador de pruebas ni a la descripción del PR.
3. Publicar `gas/base-deporte/Código.js` y `gas/base-deporte/MurcielApp.js` en el proyecto indicado por su `.clasp.json`, conservando `ZZ_FADEC_override.js` y el manifiesto. Actualizar la implementación existente a una versión nueva para conservar la URL de `BASE_DEPORTE_SCRIPT_URL`.
4. Publicar `gas/reportes/Código.js` en su proyecto e implementación existentes. Confirmar acceso de la cuenta publicadora a la planilla de sesiones. Conservar la propiedad de OpenAI existente; esta publicación no necesita una clave nueva.
5. Publicar `worker.js` usando `wrangler.toml`, manteniendo el nombre y las URLs existentes. No se requieren bindings nuevos ni claves nuevas.
6. Integrar la rama a main y esperar la verificación y publicación de Pages. La verificación no necesita credenciales ni datos reales.
7. Abrir el sitio con una recarga completa. Ingresar al CT con su contraseña habitual. Verificar la nueva UI `2026.10.20.1`; el service worker pasa a v9. Las sesiones anteriores basadas únicamente en la contraseña vieja deben volver a entrar para obtener un token del servidor.

La publicación se realizó desde los editores de Apps Script con la sesión de Google existente y mediante la integración de GitHub del Worker. No se configuraron credenciales nuevas de clasp o Wrangler. El bloqueo inicial de carga del panel de Cloudflare se resolvió antes de publicar.

## Comprobación posterior a la publicación

- Sin sesión: consultar fichas, modificar datos y generar informes debe fallar, incluso invocando Apps Script directamente. Los parámetros de autenticación no deben aparecer en las URLs.
- Con sesión del CT: consultar Reportes y comparar con la hoja fuente para el mismo rango. Comparar cantidad, minutos y carga para al menos dos jugadoras y para una sin datos. Incluir «Otros» y sRPE cero.
- Comparar 12–18/10 y 19–25/10: el primer período usa el histórico; el segundo, MurcielApp. Una carga retrospectiva conserva su fecha entrenada.
- Con el acceso de prueba de Santiago ya existente, crear un estímulo, editarlo y eliminarlo. Confirmar que no aparece en los totales del CT. No generar códigos ni enviar correos a las jugadoras para esta verificación.
- Confirmar que Reportes refleja las correcciones y que el CSV coincide con la vista y que cerrar sesión retira los datos de pantalla. Probar un acceso administrativo revocado.
- Probar acceso desde celular, teclado y lector de pantalla, incluyendo los botones de edición y el diálogo de eliminación.

## Pruebas locales

`npm ci --ignore-scripts` y `npm test` ejecutan las pruebas unitarias, de permisos, integración del Worker y recorridos de navegador con datos simulados. En Windows usan Edge; en CI usan Chromium con `PLAYWRIGHT_CHANNEL=chromium`. `npm run test:smoke` verifica la creación original de estímulos.

Las capturas de escritorio y celular se generan en `.tmp/` y no se publican. Las pruebas de navegador no llaman a las APIs reales.

## Reversión

No eliminar `MurcielApp_Correcciones` ni volver a un lector que ignore esa hoja: reaparecerían estímulos eliminados y duraciones anteriores. Si falla la nueva interfaz, mantener el backend que aplica correcciones y cerrar temporalmente la sección de Reportes. Una reversión completa requiere conciliar primero las revisiones sobre una copia de respaldo y coordinar las tres versiones. Evitar restaurar el backend público sin controles de acceso.
