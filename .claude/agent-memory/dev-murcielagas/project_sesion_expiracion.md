---
name: project_sesion_expiracion
description: La sesión expira a 30 días usando mrcl_auth_ts (timestamp). Implementado en todos los módulos en 2026-05-17.
metadata:
  type: project
---

La expiración de sesión fue implementada el 2026-05-17.

- `mrcl_auth` = '1' indica sesión activa (como antes).
- `mrcl_auth_ts` = timestamp en ms (Date.now()) guardado al hacer login.
- Expiración: 30 días (30*24*60*60*1000 ms).
- Al vencer o si falta el timestamp, se limpian ambas claves y se redirige al login.

**Why:** Una sesión en una tablet o PC compartida podía quedar activa indefinidamente. La expiración es una medida mínima de seguridad.

**How to apply:** Si se agrega un módulo nuevo, usar el mismo guard:
```js
(function(){var a=localStorage.getItem('mrcl_auth'),ts=Number(localStorage.getItem('mrcl_auth_ts')||0);if(a!=='1'||!ts||(Date.now()-ts)>=30*24*60*60*1000){localStorage.removeItem('mrcl_auth');localStorage.removeItem('mrcl_auth_ts');location.replace('../index.html');}})();
```
Ajustar la ruta de redirect según la profundidad del módulo (`../` o `../../`).
