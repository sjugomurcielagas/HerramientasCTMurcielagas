const DEFAULT_API_BASE = 'https://murcielagas-reportes-api.sjugomurcielagas.workers.dev';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  const next = process.argv[i + 1];
  if (next && !next.startsWith('--')) {
    args.set(key, next);
    i += 1;
  } else {
    args.set(key, '1');
  }
}

const apiBase = args.get('api-base') || process.env.PARTIDOS_VERIFY_API_BASE || DEFAULT_API_BASE;
const partidoId = args.get('partido-id') || process.env.PARTIDOS_VERIFY_PARTIDO_ID || '';
const writeBatch = args.get('write-batch') === '1' || process.env.PARTIDOS_VERIFY_WRITE_BATCH === '1';

function apiUrl(action, params = {}) {
  const url = new URL(apiBase);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  return url;
}

async function readAction(action, params = {}) {
  const response = await fetch(apiUrl(action, params), { headers: { Accept: 'application/json' } });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(`${action}: ${response.status} ${data.error || 'respuesta no ok'}`);
  }
  return data.data;
}

async function postAction(payload) {
  const response = await fetch(apiBase, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(`${payload.action}: ${response.status} ${data.error || 'respuesta no ok'}`);
  }
  return data.data;
}

const acciones = await readAction('partidos_getAcciones', { partido_id: partidoId });
console.log('partidos_getAcciones ok', Array.isArray(acciones) ? acciones.length : 'no-array');

const resumen = await readAction('partidos_getAccionesResumen', partidoId ? { partido_id: partidoId } : {});
console.log('partidos_getAccionesResumen ok', Number(resumen?.total || 0));

if (writeBatch) {
  if (!partidoId) throw new Error('--partido-id es requerido para --write-batch');
  const localId = `verify-${Date.now()}`;
  const batch = await postAction({
    action: 'partidos_registrarAccionesBatch',
    partido_id: partidoId,
    acciones: [{
      local_id: localId,
      equipo: 'propio',
      tipo_partido: 'verificacion',
      contexto: 'juego_libre',
      accion: 'Verificacion',
      zona: '',
      jugadora_id: '',
      valoracion: 0,
      resultado: '',
      arquera_valoracion: '',
      es_pase_relevante: '',
      tiempo_neto: '',
      jugadora_anterior_id: '',
      narracion: 'Verificacion post-deploy',
      observacion_tactica: 'Verificacion post-deploy'
    }]
  });
  const item = Array.isArray(batch?.items) ? batch.items[0] : null;
  if (!item?.ok || item.local_id !== localId) throw new Error('Batch no confirmo el item de verificacion');
  console.log('partidos_registrarAccionesBatch ok', item.id);
} else {
  console.log('partidos_registrarAccionesBatch skipped readonly');
}
