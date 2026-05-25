// Override pequeno para mantener el nombre completo de la entidad convocante
// sin reescribir el archivo principal del modulo Base de Deporte.

var FADEC_NOMBRE_COMPLETO_ = 'Federación Argentina de Deportes para Ciegos (FADeC)';
var FADEC_DOCUMENTO_CONVOCATORIA_ = 'Convocatoria oficial ' + FADEC_NOMBRE_COMPLETO_;

function _nombreDocumentoConcentraciones(tipo, conc, persona) {
  var base = _nombreConcentracionHumana_(conc);
  var mapa = {
    convocatoria_fadec: FADEC_DOCUMENTO_CONVOCATORIA_,
    certificacion_participacion: 'Certificacion de participacion efectiva',
    licencia_agencia_cordoba: 'Licencia Agencia Cordoba',
    licencia_municipalidad_cordoba: 'Licencia Municipalidad Cordoba',
  };
  var nombre = (mapa[tipo] || tipo) + ' - ' + base;
  if (persona && persona.nombreCompleto) nombre += ' - ' + persona.nombreCompleto;
  return nombre;
}

function _resolverCampoDocumentoConcentracion_(campo, data, nombres, tablaTexto) {
  var conc = data.conc || {};
  var baseCtx = data.baseCtx || {};
  var fechaInicioRaw = conc.fechaInicio || conc.fecha_inicio || '';
  var fechaFinRaw = conc.fechaFin || conc.fecha_fin || fechaInicioRaw;

  switch (String(campo || '').trim()) {
    case 'nombre':
    case 'nombre_evento':
      return _nombreConcentracionHumana_(conc);
    case 'lugar':
      return conc.lugar || conc.sede || conc.lugar_evento || '';
    case 'lugar_evento':
      return _textoLugarEventoConcentracion_(conc);
    case 'lugar_evento_completo':
      return _textoLugarEventoConcentracion_(conc);
    case 'direccion':
      return conc.direccion || conc.direccion_sede || conc.direccion_lugar || '';
    case 'ciudad':
    case 'ciudad_evento':
      return conc.ciudad || conc.localidad || '';
    case 'fecha_inicio':
      return formatFechaTextoGas_(fechaInicioRaw);
    case 'fecha_fin':
      return formatFechaTextoGas_(fechaFinRaw);
    case 'fecha_inicio_raw':
      return fechaInicioRaw;
    case 'fecha_fin_raw':
      return fechaFinRaw;
    case 'tipo_actividad':
      return baseCtx.tipoActividad || _nombreConcentracionHumana_(conc);
    case 'tabla_convocadas':
      return tablaTexto;
    case 'convocadas_cantidad':
      return String((nombres || []).length);
    case 'convocadas_nombres':
      return (nombres || []).map(function(p) { return p.nombre; }).join(', ');
    case 'participantes_presentes': {
      var asistencia = Array.isArray(data.baseCtx && data.baseCtx.asistencia) ? data.baseCtx.asistencia : (Array.isArray(data.asistencia) ? data.asistencia : []);
      var convocadas = Array.isArray(data.baseCtx && data.baseCtx.convocadas) ? data.baseCtx.convocadas : (Array.isArray(data.convocadas) ? data.convocadas : []);
      var presentes = _presentesDesdeAsistencia_(asistencia, convocadas);
      var presentesInfo = _armarConvocatoriaParticipantes_(data.plantel || [], presentes);
      return (presentesInfo || []).map(function(p) { return p.nombre; }).join(', ');
    }
    case 'resumen_asistencia': {
      var asistenciaR = Array.isArray(data.baseCtx && data.baseCtx.asistencia) ? data.baseCtx.asistencia : (Array.isArray(data.asistencia) ? data.asistencia : []);
      var convocadasR = Array.isArray(data.baseCtx && data.baseCtx.convocadas) ? data.baseCtx.convocadas : (Array.isArray(data.convocadas) ? data.convocadas : []);
      if (!convocadasR.length) return 'Sin convocatoria cargada.';
      var presentesR = _presentesDesdeAsistencia_(asistenciaR, convocadasR);
      var presentesInfoR = _armarConvocatoriaParticipantes_(data.plantel || [], presentesR);
      return 'Participaron ' + String((presentesInfoR || []).length) + ' de ' + String(convocadasR.length) + ' personas convocadas.';
    }
    case 'cuerpo_certificacion': {
      var asistenciaC = Array.isArray(data.baseCtx && data.baseCtx.asistencia) ? data.baseCtx.asistencia : (Array.isArray(data.asistencia) ? data.asistencia : []);
      var convocadasC = Array.isArray(data.baseCtx && data.baseCtx.convocadas) ? data.baseCtx.convocadas : (Array.isArray(data.convocadas) ? data.convocadas : []);
      if (!convocadasC.length) return 'No hay convocatoria cargada para esta concentración.';
      var presentesC = _presentesDesdeAsistencia_(asistenciaC, convocadasC);
      var presentesInfoC = _armarConvocatoriaParticipantes_(data.plantel || [], presentesC);
      var tipoActividadTexto = baseCtx.tipoActividad || _nombreConcentracionHumana_(conc);
      var textoC = FADEC_NOMBRE_COMPLETO_ + ' certifica que, durante ' + tipoActividadTexto + ', desarrollada en ' + (conc.lugar || conc.sede || 'el lugar informado') + ' entre el ' + formatFechaTextoGas_(fechaInicioRaw) + ' y el ' + formatFechaTextoGas_(fechaFinRaw) + ', participaron las personas detalladas en el presente documento.';
      if ((presentesInfoC || []).length) textoC += ' Se registraron como presentes: ' + (presentesInfoC || []).map(function(p) { return p.nombre; }).join(', ') + '.';
      textoC += ' En función de lo establecido por la Ley N° 20.596, se solicita a todas las instituciones públicas o privadas, educativas, laborales o de cualquier otra índole, donde los atletas convocados intervengan, a prestar su mayor colaboración mediante el otorgamiento de la correspondiente licencia deportiva y por cualquier otro medio de apoyo que pudiera corresponder.';
      textoC += ' Solicitamos tengan a bien considerar esta certificación para los fines que correspondan. La comisión directiva de ' + FADEC_NOMBRE_COMPLETO_ + ' queda a disposición ante cualquier consulta o aclaración que pudiera corresponder.';
      return textoC;
    }
    case 'federacion_convocante':
      return FADEC_NOMBRE_COMPLETO_;
    default:
      return conc[campo] || '';
  }
}

function _plantillaFijaDocumento_(clave, cfg) {
  cfg = cfg || {};
  var mapa = {
    convocatoria_fadec: {
      plantillaId: CONFIG_DOC.PLANTILLA_CONVOCATORIA,
      nombreArchivo: 'Plantilla - ' + FADEC_DOCUMENTO_CONVOCATORIA_
    },
    licencia_agencia_cordoba: {
      plantillaId: CONFIG_DOC.PLANTILLA_LICENCIA_AGENCIA_CORDOBA,
      nombreArchivo: 'Plantilla - Licencia deportiva Agencia Cordoba Deportes'
    },
    licencia_municipalidad_cordoba: {
      plantillaId: CONFIG_DOC.PLANTILLA_LICENCIA_MUNICIPALIDAD_CORDOBA,
      nombreArchivo: 'Plantilla - Solicitud de licencia Municipalidad de Cordoba'
    }
  };
  var item = mapa[String(clave || '').trim()];
  if (!item) return cfg || {};
  return {
    ...cfg,
    plantillaId: item.plantillaId || cfg.plantillaId || '',
    nombreArchivo: item.nombreArchivo || cfg.nombreArchivo || ''
  };
}

function _defaultDocumentDefinitions_() {
  return [
    {
      tipo_documento: 'convocatoria_fadec',
      nombre_visible: FADEC_DOCUMENTO_CONVOCATORIA_,
      template_id: CONFIG_DOC.PLANTILLA_CONVOCATORIA,
      carpeta_id: CONFIG_DOC.CARPETA_GENERADOS,
      tipo_salida: 'colectivo',
      activo: true,
      requiere_persona: false,
      requiere_nombre: true,
      requiere_fecha: true,
      requiere_convocadas: true,
      requiere_tabla_convocadas: true,
      descripcion: 'Documento colectivo para toda la convocatoria'
    },
    {
      tipo_documento: 'certificacion_participacion',
      nombre_visible: 'Certificacion de participacion efectiva',
      template_id: CONFIG_DOC.PLANTILLA_CERTIFICACION_PARTICIPACION,
      carpeta_id: CONFIG_DOC.CARPETA_GENERADOS,
      tipo_salida: 'colectivo',
      activo: true,
      requiere_persona: false,
      requiere_nombre: true,
      requiere_fecha: true,
      requiere_convocadas: true,
      requiere_tabla_convocadas: true,
      descripcion: 'Documento colectivo para toda la convocatoria'
    },
    {
      tipo_documento: 'licencia_agencia_cordoba',
      nombre_visible: 'Licencia deportiva - Agencia Cordoba Deportes',
      template_id: CONFIG_DOC.PLANTILLA_LICENCIA_AGENCIA_CORDOBA,
      carpeta_id: CONFIG_DOC.CARPETA_GENERADOS,
      tipo_salida: 'individual',
      activo: true,
      requiere_persona: true,
      requiere_nombre: true,
      requiere_fecha: true,
      requiere_convocadas: false,
      requiere_tabla_convocadas: false,
      descripcion: 'Formulario individual para solicitud ante Agencia Cordoba Deportes'
    },
    {
      tipo_documento: 'licencia_municipalidad_cordoba',
      nombre_visible: 'Solicitud de licencia - Municipalidad de Cordoba',
      template_id: CONFIG_DOC.PLANTILLA_LICENCIA_MUNICIPALIDAD_CORDOBA,
      carpeta_id: CONFIG_DOC.CARPETA_GENERADOS,
      tipo_salida: 'individual_compuesto',
      activo: true,
      requiere_persona: true,
      requiere_nombre: true,
      requiere_fecha: true,
      requiere_convocadas: false,
      requiere_tabla_convocadas: false,
      descripcion: 'Paquete individual con nota del agente y nota de elevacion'
    }
  ];
}

function _defaultDocumentPlaceholders_() {
  return [
    ['convocatoria_fadec','{{FECHA_EMISION}}','sistema','fecha_emision','texto',true,'',''],
    ['convocatoria_fadec','{{LUGAR}}','concentracion','lugar','texto',true,'',''],
    ['convocatoria_fadec','{{SEDE}}','concentracion','lugar','texto',false,'',''],
    ['convocatoria_fadec','{{DIRECCION_LUGAR}}','concentracion','direccion','texto',false,'',''],
    ['convocatoria_fadec','{{DIRECCION_SEDE}}','concentracion','direccion','texto',false,'',''],
    ['convocatoria_fadec','{{CIUDAD}}','concentracion','ciudad','texto',false,'',''],
    ['convocatoria_fadec','{{CIUDAD_SEDE}}','concentracion','ciudad','texto',false,'',''],
    ['convocatoria_fadec','{{FECHA_INICIO_TEXTO}}','concentracion','fecha_inicio','texto',true,'',''],
    ['convocatoria_fadec','{{FECHA_FIN_TEXTO}}','concentracion','fecha_fin','texto',true,'',''],
    ['convocatoria_fadec','{{TIPO_ACTIVIDAD}}','concentracion','tipo_actividad','texto',false,'',''],
    ['convocatoria_fadec','{{NOMBRE_CONCENTRACION}}','concentracion','nombre','texto',true,'',''],
    ['convocatoria_fadec','{{CONCENTRACION_NOMBRE}}','concentracion','nombre','texto',true,'',''],
    ['convocatoria_fadec','{{TABLA_CONVOCADAS}}','concentracion','tabla_convocadas','tabla',true,'',''],
    ['convocatoria_fadec','{{CONVOCADAS_TEXTO}}','concentracion','tabla_convocadas','texto',true,'',''],
    ['convocatoria_fadec','{{CONVOCADAS_CANTIDAD}}','concentracion','convocadas_cantidad','numero',true,'',''],
    ['convocatoria_fadec','{{CONVOCADAS_NOMBRES}}','concentracion','convocadas_nombres','texto',true,'',''],
    ['certificacion_participacion','{{FECHA_EMISION}}','sistema','fecha_emision','texto',true,'',''],
    ['certificacion_participacion','{{LUGAR}}','concentracion','lugar','texto',true,'',''],
    ['certificacion_participacion','{{SEDE}}','concentracion','lugar','texto',false,'',''],
    ['certificacion_participacion','{{DIRECCION_LUGAR}}','concentracion','direccion','texto',false,'',''],
    ['certificacion_participacion','{{DIRECCION_SEDE}}','concentracion','direccion','texto',false,'',''],
    ['certificacion_participacion','{{CIUDAD}}','concentracion','ciudad','texto',false,'',''],
    ['certificacion_participacion','{{CIUDAD_SEDE}}','concentracion','ciudad','texto',false,'',''],
    ['certificacion_participacion','{{FECHA_INICIO_TEXTO}}','concentracion','fecha_inicio','texto',true,'',''],
    ['certificacion_participacion','{{FECHA_FIN_TEXTO}}','concentracion','fecha_fin','texto',true,'',''],
    ['certificacion_participacion','{{TIPO_ACTIVIDAD}}','concentracion','tipo_actividad','texto',false,'',''],
    ['certificacion_participacion','{{NOMBRE_CONCENTRACION}}','concentracion','nombre','texto',true,'',''],
    ['certificacion_participacion','{{CONCENTRACION_NOMBRE}}','concentracion','nombre','texto',true,'',''],
    ['certificacion_participacion','{{RESUMEN_ASISTENCIA}}','concentracion','resumen_asistencia','texto',true,'',''],
    ['certificacion_participacion','{{CUERPO_CERTIFICACION}}','concentracion','cuerpo_certificacion','texto',true,'',''],
    ['certificacion_participacion','{{PARTICIPANTES_PRESENTES}}','concentracion','participantes_presentes','texto',true,'',''],
    ['licencia_agencia_cordoba','{{AUTORIDAD_INSTITUCION}}','persona','autoridad_institucion','texto',true,'','Completar en Config_Doc_Personas'],
    ['licencia_agencia_cordoba','{{NOMBRE_COMPLETO}}','persona','nombre_completo','texto',true,'',''],
    ['licencia_agencia_cordoba','{{DNI}}','persona','dni','texto',true,'',''],
    ['licencia_agencia_cordoba','{{FECHA_NACIMIENTO}}','persona','fecha_nacimiento','fecha_corta_anio',true,'',''],
    ['licencia_agencia_cordoba','{{FEDERACION_CONVOCANTE}}','fijo','federacion_convocante','texto',true,FADEC_NOMBRE_COMPLETO_,'Editable si cambia la entidad convocante'],
    ['licencia_agencia_cordoba','{{NOMBRE_EVENTO}}','concentracion','nombre','texto',true,'',''],
    ['licencia_agencia_cordoba','{{ROL_EVENTO}}','persona','rol_evento','texto',true,'','Completar en Config_Doc_Personas'],
    ['licencia_agencia_cordoba','{{LUGAR_EVENTO}}','concentracion','lugar_evento','texto',true,'',''],
    ['licencia_agencia_cordoba','{{LUGAR_EVENTO_COMPLETO}}','concentracion','lugar_evento_completo','texto',false,'',''],
    ['licencia_agencia_cordoba','{{FECHA_SALIDA}}','concentracion','fecha_inicio','texto',true,'',''],
    ['licencia_agencia_cordoba','{{FECHA_REGRESO}}','concentracion','fecha_fin','texto',true,'',''],
    ['licencia_agencia_cordoba','{{FECHA_EMISION}}','sistema','fecha_emision','texto',true,'',''],
    ['licencia_municipalidad_cordoba','{{FECHA_EMISION}}','sistema','fecha_emision','texto',true,'',''],
    ['licencia_municipalidad_cordoba','{{DESTINATARIO_NOMBRE}}','persona','destinatario_nombre','texto',true,'','Completar en Config_Doc_Personas'],
    ['licencia_municipalidad_cordoba','{{NOMBRE_EVENTO}}','concentracion','nombre','texto',true,'',''],
    ['licencia_municipalidad_cordoba','{{FECHA_INICIO_CORTA}}','concentracion','fecha_inicio','fecha_corta',true,'',''],
    ['licencia_municipalidad_cordoba','{{FECHA_FIN_CORTA}}','concentracion','fecha_fin','fecha_corta',true,'',''],
    ['licencia_municipalidad_cordoba','{{LUGAR_EVENTO}}','concentracion','lugar_evento','texto',true,'',''],
    ['licencia_municipalidad_cordoba','{{CIUDAD_EVENTO}}','concentracion','ciudad','texto',false,'',''],
    ['licencia_municipalidad_cordoba','{{FEDERACION_CONVOCANTE}}','fijo','federacion_convocante','texto',true,FADEC_NOMBRE_COMPLETO_,'Editable si cambia la entidad convocante'],
    ['licencia_municipalidad_cordoba','{{ROL_EVENTO}}','persona','rol_evento','texto',true,'','Completar en Config_Doc_Personas'],
    ['licencia_municipalidad_cordoba','{{AGENTE_APELLIDO_NOMBRE_MAYUS}}','persona','apellido_nombre_mayus','texto',true,'',''],
    ['licencia_municipalidad_cordoba','{{DNI}}','persona','dni','texto',true,'',''],
    ['licencia_municipalidad_cordoba','{{CARGO_ADMINISTRATIVO}}','persona','cargo_administrativo','texto',true,'','Completar en Config_Doc_Personas'],
    ['licencia_municipalidad_cordoba','{{FECHA_INICIO_CORTA_ANIO}}','concentracion','fecha_inicio','fecha_corta_anio',true,'',''],
    ['licencia_municipalidad_cordoba','{{FECHA_FIN_CORTA_ANIO}}','concentracion','fecha_fin','fecha_corta_anio',true,'',''],
    ['licencia_municipalidad_cordoba','{{AGENTE_NOMBRE_COMPLETO}}','persona','nombre_completo','texto',true,'',''],
    ['licencia_municipalidad_cordoba','{{AGENTE_APELLIDO_NOMBRE}}','persona','apellido_nombre','texto',true,'','']
  ].map(function(r) {
    return {
      tipo_documento: r[0],
      placeholder: r[1],
      fuente: r[2],
      campo: r[3],
      formato: r[4],
      obligatorio: r[5],
      valor_fijo: r[6],
      notas: r[7]
    };
  });
}
