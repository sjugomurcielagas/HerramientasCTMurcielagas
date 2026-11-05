// Revisión para fútbol para ciegas, Argentina. Actualizar con cada lista vigente.
var ANTIDOPING_LISTA_2026 = 'https://www.wada-ama.org/sites/default/files/2025-09/2026list_en_final_clean_september_2025.pdf';
var ANTIDOPING_FECHA_REVISION = '2026-11-05';
var ANTIDOPING_DEPORTE = 'Fútbol para ciegas';
var ANTIDOPING_SIN_PROHIBICION = 'SIN PROHIBICIÓN IDENTIFICADA';

var ANTIDOPING_ACTIVOS_AR = [
  { nombre: 'Paracetamol', alias: ['acetaminofén', 'acetaminophen'] },
  { nombre: 'Ibuprofeno', alias: ['ibuprofen'] },
  { nombre: 'Diclofenac', alias: ['diclofenaco', 'diclofenac sódico', 'diclofenac potásico'] },
  { nombre: 'Dipirona', alias: ['metamizol', 'dipirona sódica'] },
  { nombre: 'Loratadina' },
  { nombre: 'Cetirizina' },
  { nombre: 'Bromhexina', alias: ['bromhexina clorhidrato', 'clorhidrato de bromhexina'] },
  { nombre: 'Clorfeniramina', alias: ['clorfeniramina maleato', 'maleato de clorfeniramina'] },
  { nombre: 'Trehalosa', alias: ['trehalose'], via: 'oftálmica' },
  { nombre: 'Hialuronato de sodio', alias: ['hialuronato sódico', 'sodium hyaluronate'], via: 'oftálmica' },
  { nombre: 'Dexpantenol', alias: ['D-pantenol', 'dexpanthenol'], via: 'oftálmica' },
  { nombre: 'Fucoidano', alias: ['fucoidan', 'fucoidán'], via: 'oftálmica' },
  { nombre: 'Dorzolamida', alias: ['dorzolamide', 'dorzolamida clorhidrato'],
    estado: 'EXCEPCIÓN S5: VÍA OFTÁLMICA TÓPICA', pagina: 12,
    detalle: 'No prohibida por vía oftálmica tópica (gotas para los ojos), dentro y fuera de competencia. La excepción corresponde a esa vía.' },
  { nombre: 'Brinzolamida', alias: ['brinzolamide'],
    estado: 'EXCEPCIÓN S5: VÍA OFTÁLMICA TÓPICA', pagina: 12,
    detalle: 'No prohibida por vía oftálmica tópica, dentro y fuera de competencia.' },
  { nombre: 'Brimonidina', alias: ['brimonidina tartrato'],
    estado: 'EXCEPCIÓN S6: VÍA OFTÁLMICA TÓPICA', pagina: 16,
    detalle: 'La vía oftálmica está contemplada entre las excepciones de S6 para derivados de imidazolina.' },
  { nombre: 'Acetazolamida', alias: ['acetazolamide'],
    estado: 'PROHIBIDA EN TODO MOMENTO', pagina: 12,
    detalle: 'Figura en S5 como diurético prohibido en competencia y fuera de competencia. La excepción oftálmica de S5 corresponde a la administración oftálmica tópica.' },
  { nombre: 'Timolol', alias: ['timolol maleato', 'maleato de timolol'],
    estado: 'RESTRICCIÓN POR DEPORTE (P1)', pagina: 20,
    detalle: 'No prohibido en fútbol para ciegas, dentro ni fuera de competencia. P1 restringe los betabloqueantes en los deportes enumerados en esa sección.' },
  { nombre: 'Pseudoefedrina', alias: ['pseudoephedrine', 'pseudoefedrina sulfato', 'sulfato de pseudoefedrina'],
    estado: 'CONDICIONADO POR UMBRAL EN COMPETENCIA', pagina: 16,
    detalle: 'Prohibida en competencia si la concentración en orina supera 150 µg/mL. Los miligramos del envase no permiten determinar ese resultado. La combinación con diuréticos o agentes enmascarantes puede cambiar el criterio (S5).' },
  { nombre: 'Fenilefrina', alias: ['phenylephrine', 'fenilefrina clorhidrato', 'clorhidrato de fenilefrina'],
    estado: 'EN MONITOREO, SIN PROHIBICIÓN', pagina: 16,
    detalle: 'La fenilefrina figura en el Programa de Monitoreo 2026 en competencia y la AMA no la considera una sustancia prohibida.' },
  { nombre: 'Salbutamol', alias: ['albuterol', 'salbutamol sulfato'],
    estado: 'CONDICIONADO POR VÍA, DOSIS Y UMBRAL', pagina: 9,
    detalle: 'S3 contempla una excepción para salbutamol inhalado de hasta 1600 µg en 24 horas, en dosis divididas, y hasta 600 µg en cualquier intervalo de 8 horas. Una concentración urinaria superior a 1000 ng/mL requiere evaluar el criterio analítico de S3. Confirmá la vía y el esquema con el equipo médico.' },
  { nombre: 'Prednisona', alias: ['prednisone'], estado: 'CONDICIONADO POR VÍA EN COMPETENCIA', pagina: 19,
    detalle: 'Los glucocorticoides están prohibidos en competencia por vía oral (incluida la oromucosal), rectal o inyectable. Consultar el intervalo de eliminación y la eventual AUT con el equipo médico.' },
  { nombre: 'Dexametasona', alias: ['dexamethasone'], estado: 'CONDICIONADO POR VÍA EN COMPETENCIA', pagina: 19,
    detalle: 'Prohibida en competencia por vía oral, rectal o inyectable. La vía oftálmica tópica está contemplada como excepción dentro de las dosis e indicaciones autorizadas.' },
  { nombre: 'Tramadol', estado: 'PROHIBIDO EN COMPETENCIA', pagina: 17,
    detalle: 'Figura en S7 como narcótico prohibido en competencia. El equipo médico debe evaluar el momento de administración y la eventual AUT.' }
];

var ANTIDOPING_PRODUCTOS_AR = [
  { marca: 'Refrianex', laboratorio: 'Montpellier', presentacion: 'Comprimidos recubiertos', consulta: 'Refrianex comprimidos',
    fuente: 'https://www.montpellier.com.ar/Uploads/Productos/REFRIANEX.pdf',
    componentes: [['Paracetamol', '500 mg por comprimido'], ['Pseudoefedrina', '60 mg de sulfato por comprimido'], ['Bromhexina', '8 mg de clorhidrato por comprimido']] },
  { marca: 'Refrianex', laboratorio: 'Montpellier', presentacion: 'Jarabe', consulta: 'Refrianex jarabe',
    fuente: 'https://www.montpellier.com.ar/Uploads/Productos/REFRIANEX.pdf',
    componentes: [['Paracetamol', '2500 mg por 100 mL'], ['Pseudoefedrina', '600 mg de sulfato por 100 mL'], ['Bromhexina', '80 mg de clorhidrato por 100 mL']] },
  { marca: 'Refrianex Compuesto', laboratorio: 'Montpellier', presentacion: 'Comprimidos recubiertos', consulta: 'Refrianex Compuesto comprimidos',
    fuente: 'https://www.montpellier.com.ar/Uploads/Productos/REFRIANEX%20COMPUESTO.pdf',
    componentes: [['Paracetamol', '500 mg por comprimido'], ['Pseudoefedrina', '60 mg de sulfato por comprimido'], ['Bromhexina', '8 mg de clorhidrato por comprimido'], ['Clorfeniramina', '4 mg de maleato por comprimido']] },
  { marca: 'Refrianex Compuesto', laboratorio: 'Montpellier', presentacion: 'Jarabe', consulta: 'Refrianex Compuesto jarabe',
    fuente: 'https://www.montpellier.com.ar/Uploads/Productos/REFRIANEX%20COMPUESTO.pdf',
    componentes: [['Paracetamol', '2500 mg por 100 mL'], ['Pseudoefedrina', '600 mg de sulfato por 100 mL'], ['Bromhexina', '80 mg de clorhidrato por 100 mL'], ['Clorfeniramina', '40 mg de maleato por 100 mL']] },
  { marca: 'Refrianex Antigripal', laboratorio: 'Montpellier', presentacion: 'Comprimidos', consulta: 'Refrianex Antigripal comprimidos',
    fuente: 'https://www.montpellier.com.ar/Uploads/Productos/REFRIANEX%20ANTIGRIPAL.pdf',
    componentes: [['Paracetamol', '500 mg por comprimido'], ['Fenilefrina', '6 mg de clorhidrato por comprimido']] },
  { marca: 'Artelac Ultra 4S', laboratorio: 'Bausch + Lomb', presentacion: 'Gotas oftálmicas, frasco de 10 mL', consulta: 'Artelac Ultra 4S',
    alias: ['Artelac 4S Ultra'], via: 'oftálmica',
    fuente: 'https://www.bausch.com.pt/fileadmin/media/documents/IFUS/IFU_Artelac_Ultra_4S_PT-dp-ver2_1.pdf',
    registro: 'https://helena.anmat.gob.ar/uploads/pdfs/CE-2026-40786299-APN-ANMAT%20MS.pdf',
    componentes: [['Hialuronato de sodio', '0,15 %'], ['Trehalosa', '3 %'], ['Fucoidano', '0,1 %'], ['Dexpantenol', '2 %']] },
  { marca: 'Dorzoflax', laboratorio: 'Sidus', presentacion: 'Solución oftálmica estéril, frasco de 5 mL',
    consulta: 'Dorzoflax', via: 'oftálmica', fuente: 'https://sidus.com.ar/productos/dorzoflax/',
    componentes: [['Dorzolamida', '2 %'], ['Timolol', '0,50 %']] },
  { marca: 'Salbutral', laboratorio: 'Cassará', presentacion: 'Aerosol de 250 dosis', consulta: 'Salbutral aerosol 250 dosis',
    via: 'inhalatoria', fuente: 'https://cassara.com.ar/productos/salbutral-aerosol-250-dosis/',
    componentes: [['Salbutamol', '100 µg por dosis']] },
  { marca: 'Anaflex Paracetamol', laboratorio: 'Bagó', presentacion: 'Comprimidos de 500 mg', consulta: 'Anaflex Paracetamol 500',
    via: 'oral', fuente: 'https://www.bago.com.ar/vademecum/anaflex-comprimidos',
    componentes: [['Paracetamol', '500 mg por comprimido']] },
  { marca: 'Anaflex', laboratorio: 'Bagó', presentacion: 'Cápsulas blandas de diclofenac 25 mg', consulta: 'Anaflex diclofenac 25',
    via: 'oral', fuente: 'https://boletin.anmat.gob.ar/julio_2023/Dispo_5221-23.pdf',
    componentes: [['Diclofenac', '25 mg de diclofenac sódico por cápsula']] },
  { marca: 'Anaflex Plus Rápida Acción', laboratorio: 'Bagó', presentacion: 'Cápsulas blandas', consulta: 'Anaflex Plus Rápida Acción',
    via: 'oral', fuente: 'https://consumomasivo.bago.com.ar/wp-content/uploads/2025/12/Prospecto-ANAFLEX-PLUS-disp.-3073-25-Y-ANAFLEX-Disp.-4816-25.pdf',
    componentes: [['Diclofenac', '25 mg de diclofenac sódico por cápsula'], ['Paracetamol', '300 mg por cápsula']] },
  { marca: 'Tafirol 500', laboratorio: 'Genomma', presentacion: 'Comprimidos de 500 mg', consulta: 'Tafirol 500',
    via: 'oral', fuente: 'https://tafirol.com/hubfs/Tafirol%20500_Prospecto.pdf',
    componentes: [['Paracetamol', '500 mg por comprimido']] },
  { marca: 'Tafirol Duo', laboratorio: 'Genomma', presentacion: 'Comprimidos recubiertos', consulta: 'Tafirol Duo',
    via: 'oral', fuente: 'https://boletin.anmat.gob.ar/julio_2023/Dispo_5910-23.pdf',
    componentes: [['Paracetamol', '500 mg por comprimido'], ['Ibuprofeno', '200 mg por comprimido']] }
];

function antidoping_reglaRevisada_(consulta) {
  var clave = normalizeText(consulta);
  return ANTIDOPING_ACTIVOS_AR.find(function(regla) {
    return [regla.nombre].concat(regla.alias || []).some(function(nombre) {
      return normalizeText(nombre) === clave;
    });
  });
}

function antidoping_evidenciaActiva_(regla, listaVigente) {
  if (!regla || !listaVigente) {
    return {
      estado: 'REQUIERE REVISIÓN',
      detalle: regla ? 'Esta ficha se revisó con la Lista AMA 2026. Confirmá el estado en la lista vigente.' :
        'Este componente está pendiente de revisión.',
      fuente_wada_url: 'https://www.wada-ama.org/en/prohibited-list'
    };
  }
  var alcance = regla.via ? ' para la vía ' + regla.via : ' como principio activo único';
  var detalle = regla.detalle || 'Sin prohibición identificada' + alcance + ' en el contexto de fútbol para ciegas.';
  return {
    estado: regla.estado || ANTIDOPING_SIN_PROHIBICION,
    detalle: detalle,
    fuente_wada_url: ANTIDOPING_LISTA_2026 + (regla.pagina ? '#page=' + regla.pagina : '')
  };
}

function antidoping_buscarEvidencia_(consulta, ahora) {
  var clave = normalizeText(consulta);
  var listaVigente = Utilities.formatDate(ahora, 'America/Argentina/Buenos_Aires', 'yyyy') === '2026';
  var base = {
    deporte: ANTIDOPING_DEPORTE,
    fecha_revision: ANTIDOPING_FECHA_REVISION,
    fuente_wada: 'Lista de Prohibiciones AMA 2026'
  };
  var regla = antidoping_reglaRevisada_(clave);
  if (regla) {
    var evidencia = antidoping_evidenciaActiva_(regla, listaVigente);
    return [Object.assign({}, base, {
      tipo_resultado: 'principio_activo',
      medicamento: regla.nombre,
      principio_activo: regla.nombre,
      via: regla.via || '',
      estado: evidencia.estado,
      criterio_wada: evidencia.detalle,
      advertencia_detalle: evidencia.detalle,
      fuente_wada_url: evidencia.fuente_wada_url
    })];
  }

  var exactos = ANTIDOPING_PRODUCTOS_AR.filter(function(producto) {
    return [producto.consulta].concat(producto.alias || []).some(function(nombre) {
      return normalizeText(nombre) === clave;
    });
  });
  var familias = ['refrianex', 'tafirol', 'anaflex'];
  var productos = exactos.length ? exactos : ANTIDOPING_PRODUCTOS_AR.filter(function(producto) {
    var marca = normalizeText(producto.marca);
    return marca === clave || (familias.indexOf(clave) !== -1 && marca.indexOf(clave + ' ') === 0);
  });
  return productos.map(function(producto) {
    var componentes = producto.componentes.map(function(par) {
      var resultado = antidoping_evidenciaActiva_(antidoping_reglaRevisada_(par[0]), listaVigente);
      return Object.assign({ nombre: par[0], cantidad: par[1] }, resultado);
    });
    var prioridades = [/^PROHIBID/, /^REQUIERE/, /^CONDICIONADO/, /^EXCEPCIÓN/, /^RESTRICCIÓN/, /^EN MONITOREO/];
    var destacado = prioridades.map(function(prioridad) {
      return componentes.find(function(componente) { return prioridad.test(componente.estado); });
    }).find(Boolean);
    var requierePresentacion = productos.length > 1 || !exactos.length;
    var estado = listaVigente ? (destacado ? destacado.estado : ANTIDOPING_SIN_PROHIBICION) : 'REQUIERE REVISIÓN';
    var detalle = listaVigente ? (destacado ? destacado.nombre + ': ' + destacado.detalle :
      'Sin prohibición identificada para la fórmula documentada' + (producto.via ? ' por vía ' + producto.via : '') + '.') : componentes[0].detalle;
    return Object.assign({}, base, {
      tipo_resultado: 'producto',
      medicamento: producto.marca,
      laboratorio: producto.laboratorio,
      presentacion: producto.presentacion,
      via: producto.via || 'oral',
      principio_activo: componentes.map(function(componente) { return componente.nombre; }).join(' + '),
      componentes: componentes,
      requiere_presentacion: requierePresentacion,
      consulta_presentacion: producto.consulta,
      estado: requierePresentacion ? 'CONFIRMAR PRESENTACIÓN' : estado,
      criterio_wada: requierePresentacion ? 'Elegí la presentación que figura en el envase para ver el resultado.' : detalle,
      advertencia_detalle: requierePresentacion ? '' : detalle,
      fuente_argentina: producto.registro ? 'Instrucciones del fabricante y registro ANMAT' : 'Ficha o prospecto de la presentación argentina',
      fuente_url: producto.fuente,
      fuente_secundaria_url: producto.registro || '',
      fuente_wada_url: destacado ? destacado.fuente_wada_url : componentes[0].fuente_wada_url
    });
  });
}

function antidoping_comoCandidato_(item) {
  return {
    tipo_resultado: 'candidato',
    medicamento: item.medicamento,
    principio_activo: item.principio_activo,
    presentacion: item.presentacion,
    laboratorio: item.laboratorio,
    estado: 'REQUIERE VERIFICACIÓN',
    criterio_wada: 'La coincidencia de búsqueda está pendiente de verificar con el prospecto de la presentación y la Lista AMA vigente.',
    fuente_argentina: item.fuente_argentina,
    fuente_url: item.fuente_url,
    fuente_wada_url: 'https://www.wada-ama.org/en/prohibited-list'
  };
}

function antidoping_buscarIndiceArgentino_(consulta) {
  if (!/^[a-z0-9][a-z0-9 .+/-]{2,79}$/i.test(normalizeText(consulta))) return [];
  var base = 'https://api.argly.com.ar/v1/medicamentos?nombre=';
  try {
    var response = UrlFetchApp.fetch(base + encodeURIComponent(consulta), { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) return [];
    var payload = JSON.parse(response.getContentText());
    if (!payload.data || !Array.isArray(payload.data.results)) return [];
    return payload.data.results.filter(function(item) {
      return item && typeof item.nombre === 'string' && item.nombre.trim();
    }).slice(0, 6).map(function(item) {
      return antidoping_comoCandidato_({
        medicamento: item.nombre,
        principio_activo: typeof item.droga === 'string' ? item.droga : '',
        presentacion: typeof item.presentacion === 'string' ? item.presentacion : '',
        laboratorio: typeof item.laboratorio === 'string' ? item.laboratorio : '',
        fuente_argentina: 'Argly · índice de presentaciones argentinas',
        fuente_url: base + encodeURIComponent(consulta)
      });
    });
  } catch (_) {
    return [];
  }
}
