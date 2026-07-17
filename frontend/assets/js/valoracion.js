let bandejaValoracion = [];
let diagnosticosSeleccionados = [];
let pacienteSeleccionadoValoracion = null;

let catalogosValoracion = {
  pacientes: [],
  profesionales: [],
  servicios: []
};

async function inicializarValoracion() {
  await cargarCatalogosValoracion();
  await cargarBandejaValoracion();
  inicializarEventosRiesgo();
  inicializarBuscadorDiagnosticos();

  setTimeout(() => {
    const buscar = document.getElementById('txtBuscarPacienteValoracion');
    if (buscar) {
      buscar.addEventListener('input', filtrarBandejaValoracion);
    }
  }, 300);
}

async function cargarBandejaValoracion() {
  try {
    const response = await fetch(`${API_URL}/valoracion/bandeja`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();

    if (!data.ok) throw new Error(data.mensaje);

    bandejaValoracion = data.data || [];

    pintarBandejaValoracion(bandejaValoracion);
    pintarKpisValoracion(bandejaValoracion);

  } catch (error) {
    console.error(error);
    Swal.fire('Error', error.message, 'error');
  }
}

function pintarBandejaValoracion(lista) {
  const tbody = document.getElementById('tbodyValoracion');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          No hay pacientes disponibles para valoración
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach(p => {
    const riesgo = p.riesgo_actual || 'Sin riesgo';

    tbody.innerHTML += `
      <tr>
        <td>
          <strong>${p.nombres} ${p.apellidos}</strong>
          <div class="text-muted small">${p.correo || ''}</div>
        </td>

        <td><strong>${p.tipo_documento} ${p.numero_documento}</strong></td>
        <td>${p.edad || ''}</td>
        <td>${p.sexo || ''}</td>

        <td>
          <span class="estado-badge ${claseRiesgo(riesgo)}">
            ${riesgo}
          </span>
        </td>

        <td>
          ${p.ultima_valoracion ? p.ultima_valoracion.substring(0, 10) : 'Sin valoración'}
        </td>

        <td>
          ${
            p.uuid_fhir
              ? `<span class="estado-badge estado-activo">FHIR OK</span>`
              : `<span class="estado-badge estado-inactivo">Sin FHIR</span>`
          }
        </td>

        <td>
          <button class="btn-save" onclick='abrirValoracion(${JSON.stringify(p)})'>
            Abrir valoración
          </button>
        </td>
      </tr>
    `;
  });
}

function pintarKpisValoracion(lista) {
  document.getElementById('kpiTotalPacientes').textContent = lista.length;

  document.getElementById('kpiMedio').textContent =
    lista.filter(p => (p.riesgo_actual || '').toUpperCase() === 'MEDIO').length;

  document.getElementById('kpiAlto').textContent =
    lista.filter(p => ['ALTO', 'CRITICO', 'CRÍTICO'].includes((p.riesgo_actual || '').toUpperCase())).length;

  const hoy = new Date().toISOString().substring(0, 10);

  document.getElementById('kpiHoy').textContent =
    lista.filter(p => p.ultima_valoracion && p.ultima_valoracion.substring(0, 10) === hoy).length;
}

function filtrarBandejaValoracion() {
  const texto = document.getElementById('txtBuscarPacienteValoracion').value.toLowerCase();

  const filtrados = bandejaValoracion.filter(p =>
    `${p.nombres} ${p.apellidos} ${p.tipo_documento} ${p.numero_documento}`
      .toLowerCase()
      .includes(texto)
  );

  pintarBandejaValoracion(filtrados);
}

function abrirValoracion(paciente) {
  pacienteSeleccionadoValoracion = paciente;

  document.getElementById('vistaBandejaValoracion').classList.add('d-none');
  document.getElementById('vistaFormularioValoracion').classList.remove('d-none');

  document.getElementById('tituloPacienteValoracion').textContent =
    `${paciente.nombres} ${paciente.apellidos}`;

  document.getElementById('valPaciente').value =
    `${paciente.tipo_documento} ${paciente.numero_documento} - ${paciente.nombres} ${paciente.apellidos}`;

  limpiarFormularioValoracion();
  activarCalculoRiesgoAutomatico();
  cargarTimelinePaciente(paciente.id_paciente);
  calcularRiesgoAutomatico();
  calcularNEWS2();
  pintarAlertasClinicas(detectarAlertas());

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

async function guardarValoracion() {
  try {
    if (!pacienteSeleccionadoValoracion) {
      throw new Error('Seleccione un paciente');
    }
		
    const payload = {
      id_paciente: pacienteSeleccionadoValoracion.id_paciente,
      id_profesional: obtenerProfesionalActual(),
      id_servicio_clinico: obtenerServicioActual(),
      tipo_contacto: document.getElementById('valTipoContacto').value,
      motivo_consulta: document.getElementById('valMotivoConsulta').value,
      riesgo_global: document.getElementById('valRiesgo').value,
      recomendacion_general: document.getElementById('valRecomendacion').value,
      observaciones: construirObservacionesValoracion(),
	  escalas: construirResultadosEscalas(),
	  alertas: detectarAlertas(),
	  diagnosticos: diagnosticosSeleccionados
    };
	
    if (!payload.motivo_consulta) {
	  throw new Error('Ingrese el motivo de consulta');
	}

	if (!payload.id_profesional) {
	  throw new Error('Seleccione el profesional');
	}

	if (!payload.id_servicio_clinico) {
	  throw new Error('Seleccione el servicio clínico');
	}
	
	

    const response = await fetch(`${API_URL}/valoracion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!data.ok) throw new Error(data.mensaje);

    Swal.fire({
      icon: 'success',
      title: 'Valoración guardada',
      text: data.mensaje,
      timer: 1800,
      showConfirmButton: false
    });

    await cargarBandejaValoracion();
	volverBandejaValoracion();


  } catch (error) {
    Swal.fire('Error', error.message, 'error');
  }
}

function construirResultadosEscalas() {

  const escalas = [];

  const news2 = Number(document.getElementById('scoreNews2').value || 0);
  const clasificacionNews2 = document.getElementById('clasificacionNews2').value || '';

  if (news2) {
    escalas.push({
      nombre_escala: 'NEWS2',
      puntaje: news2,
      porcentaje: news2 >= 7 ? 100 : news2 >= 5 ? 75 : news2 >= 3 ? 50 : 25,
      clasificacion: clasificacionNews2
    });
  }

  const findrisc = Number(document.getElementById('scoreFindrisc').value || 0);
  const clasificacionFindrisc = document.getElementById('clasificacionFindrisc').value || '';

  if (findrisc || clasificacionFindrisc) {
    escalas.push({
      nombre_escala: 'FINDRISC',
      puntaje: findrisc,
      porcentaje: findrisc >= 20 ? 100 : findrisc >= 15 ? 75 : findrisc >= 12 ? 50 : findrisc >= 7 ? 25 : 10,
      clasificacion: clasificacionFindrisc
    });
  }

  const framingham = Number(document.getElementById('scoreFramingham').value || 0);
  const clasificacionFramingham = document.getElementById('clasificacionFramingham').value || '';

  if (framingham || clasificacionFramingham) {
    escalas.push({
      nombre_escala: 'FRAMINGHAM',
      puntaje: framingham,
      porcentaje: framingham >= 10 ? 100 : framingham >= 5 ? 50 : 25,
      clasificacion: clasificacionFramingham
    });
  }

  return escalas;
}

function construirObservacionesValoracion() {
  return [
    { codigo: '8867-4', sistema_codigo: 'http://loinc.org', nombre_observacion: 'Frecuencia cardiaca', valor_numerico: document.getElementById('obsFC').value, unidad: 'lat/min' },
    { codigo: '9279-1', sistema_codigo: 'http://loinc.org', nombre_observacion: 'Frecuencia respiratoria', valor_numerico: document.getElementById('obsFR').value, unidad: 'resp/min' },
    { codigo: '8310-5', sistema_codigo: 'http://loinc.org', nombre_observacion: 'Temperatura corporal', valor_numerico: document.getElementById('obsTemp').value, unidad: '°C' },
    { codigo: '2708-6', sistema_codigo: 'http://loinc.org', nombre_observacion: 'Saturación de oxígeno', valor_numerico: document.getElementById('obsSat').value, unidad: '%' },
    { codigo: '29463-7', sistema_codigo: 'http://loinc.org', nombre_observacion: 'Peso corporal', valor_numerico: document.getElementById('obsPeso').value, unidad: 'kg' },
    { codigo: '8302-2', sistema_codigo: 'http://loinc.org', nombre_observacion: 'Talla', valor_numerico: document.getElementById('obsTalla').value, unidad: 'm' },
	{ codigo: '8480-6', sistema_codigo: 'http://loinc.org', nombre_observacion: 'Presión arterial sistólica', valor_numerico: document.getElementById('obsTas').value, unidad: 'mmHg' },
	{ codigo: '8462-4', sistema_codigo: 'http://loinc.org', nombre_observacion: 'Presión arterial diastólica', valor_numerico: document.getElementById('obsTad').value, unidad: 'mmHg' },
	{ codigo: '8478-0', sistema_codigo: 'http://loinc.org', nombre_observacion: 'Presión arterial media', valor_numerico: document.getElementById('obsPam').value, unidad: 'mmHg' },
	{ codigo: '39156-5', sistema_codigo: 'http://loinc.org', nombre_observacion: 'IMC', valor_numerico: document.getElementById('obsImc').value, unidad: 'kg/m2' },
	{ codigo: '72514-3', sistema_codigo: 'http://loinc.org', nombre_observacion: 'Dolor EVA', valor_numerico: document.getElementById('obsDolor').value, unidad: '0-10' },
	{ codigo: null, sistema_codigo: null, nombre_observacion: 'Clasificación IMC', valor_texto: document.getElementById('obsImcClasificacion').value, unidad: '' },
	{ codigo: '72166-2', sistema_codigo: 'http://loinc.org', nombre_observacion: 'Fumador', valor_texto: document.getElementById('riskFumador').value, unidad: '' },
	{ codigo: '2093-3', sistema_codigo: 'http://loinc.org', nombre_observacion: 'Colesterol total', valor_numerico: document.getElementById('riskColesterolTotal').value, unidad: 'mg/dL' },
	{ codigo: '2085-9', sistema_codigo: 'http://loinc.org', nombre_observacion: 'HDL', valor_numerico: document.getElementById('riskHdl').value, unidad: 'mg/dL' },
	{ codigo: null, sistema_codigo: null, nombre_observacion: 'Actividad física', valor_texto: document.getElementById('riskActividadFisica').value, unidad: '' },
	{ codigo: null, sistema_codigo: null, nombre_observacion: 'Consumo frutas y verduras', valor_texto: document.getElementById('riskFrutasVerduras').value, unidad: '' },
	{ codigo: null, sistema_codigo: null, nombre_observacion: 'Medicamento hipertensión', valor_texto: document.getElementById('riskMedicamentoHTA').value, unidad: '' },
	{ codigo: null, sistema_codigo: null, nombre_observacion: 'Glucosa alta previa', valor_texto: document.getElementById('riskGlucosaAlta').value, unidad: '' },
	{ codigo: null, sistema_codigo: null, nombre_observacion: 'Antecedente familiar diabetes', valor_texto: document.getElementById('riskFamiliarDiabetes').value, unidad: '' }
 ].filter(o => o.valor_numerico !== '' || o.valor_texto !== '');
}

function limpiarFormularioValoracion() {
    document.getElementById('valMotivoConsulta').value = '';
    document.getElementById('obsFC').value = '';
    document.getElementById('obsFR').value = '';
    document.getElementById('obsTemp').value = '';
    document.getElementById('obsSat').value = '';
    document.getElementById('obsPeso').value = '';
    document.getElementById('obsTalla').value = '';
    document.getElementById('valRiesgo').value = 'Bajo';
    document.getElementById('valRecomendacion').value = '';
    document.getElementById('obsTas').value = '';
	document.getElementById('obsTad').value = '';
	document.getElementById('obsPam').value = '';
	document.getElementById('obsImc').value = '';
	document.getElementById('obsImcClasificacion').value = '';
	document.getElementById('obsDolor').value = '';

	document.getElementById('bannerRiesgo').className = 'risk-banner risk-bajo';
	document.getElementById('textoRiesgo').textContent = 'RIESGO BAJO';
	document.getElementById('textoRiesgoDetalle').textContent = 'Paciente estable clínicamente';
	pintarAlertasClinicas([]);
  
}

function claseRiesgo(riesgo) {
  const r = (riesgo || '').toUpperCase();

  if (r === 'ALTO' || r === 'CRITICO' || r === 'CRÍTICO') return 'estado-inactivo';
  if (r === 'MEDIO') return 'estado-alerta';

  return 'estado-activo';
}

function obtenerProfesionalActual() {
  const idProfesional = document.getElementById('valProfesional').value;
  return idProfesional ? Number(idProfesional) : null;
}

function volverBandejaValoracion() {
  document.getElementById('vistaFormularioValoracion').classList.add('d-none');
  document.getElementById('vistaBandejaValoracion').classList.remove('d-none');

  pacienteSeleccionadoValoracion = null;

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

async function cargarTimelinePaciente(idPaciente) {

  try {

    const response = await fetch(
      `${API_URL}/valoracion/timeline/${idPaciente}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    const container = document.getElementById('timelineValoraciones');

    if (!data.ok || !data.data.length) {
      container.innerHTML = `
        <div class="empty-state">
          Sin historial clínico
        </div>
      `;
      return;
    }

    container.innerHTML = data.data.map(item => {

      const fc = item.observaciones.find(
        o => o.nombre_observacion === 'Frecuencia cardiaca'
      );

      const sat = item.observaciones.find(
        o => o.nombre_observacion === 'Saturación O2'
      );
	  
	  const news2 = item.escalas?.find(
	   e => e.nombre_escala === 'NEWS2'
	  );
	  
	  const findrisc = item.escalas?.find(
		  e => e.nombre_escala === 'FINDRISC'
		);

		const framingham = item.escalas?.find(
		  e => e.nombre_escala === 'FRAMINGHAM'
		);
	 
	 const alertas = item.alertas || [];

      return `
        <div class="timeline-card">

          <div class="timeline-top">

            <div>
              <div class="timeline-date">
                ${formatearFecha(item.fecha_contacto)}
              </div>

              <div class="timeline-profesional">
                ${item.profesional_nombres || ''} ${item.profesional_apellidos || ''}
              </div>
            </div>

            <span class="badge-riesgo ${item.riesgo_global?.toLowerCase()}">
              ${item.riesgo_global || 'SIN RIESGO'}
            </span>

          </div>

          <div class="timeline-body">

            <div class="timeline-service">
              <i class="bi bi-hospital"></i>
              ${item.nombre_servicio || 'Sin servicio'}
            </div>

            <div class="timeline-motivo">
              ${item.motivo_consulta || 'Sin motivo de consulta'}
            </div>

            <div class="timeline-signos">

              ${fc ? `
                <span>
                  <strong>FC:</strong> ${fc.valor_numerico}
                </span>
              ` : ''}

              ${sat ? `
                <span>
                  <strong>SatO2:</strong> ${sat.valor_numerico}
                </span>
              ` : ''}
			  
			  ${news2 ? `
				  <span class="timeline-news2">
					<strong>NEWS2:</strong>
					${news2.puntaje}
					(${news2.clasificacion})
				  </span>
				` : ''}
				
			 ${findrisc ? `
				  <span class="timeline-news2">
					<strong>FINDRISC:</strong>
					${findrisc.puntaje}
					(${findrisc.clasificacion})
				  </span>
				` : ''}

			 ${framingham ? `
				  <span class="timeline-news2">
					<strong>FRAMINGHAM:</strong>
					${framingham.puntaje}
					(${framingham.clasificacion})
				  </span>
				` : ''}	

			  ${alertas.length ? `
				  <div class="timeline-alertas">
					<strong>
					  <i class="bi bi-exclamation-triangle-fill"></i>
					  Alertas clínicas
					</strong>

					${alertas.map(a => `
					  <div class="timeline-alerta-item">
						<span>${a.tipo_alerta}</span>
						<small>${a.descripcion}</small>
					  </div>
					`).join('')}
				  </div>
				` : ''}
			
			
			
			</div>

          </div>

        </div>
      `;

    }).join('');

  } catch (error) {

    console.error(error);

  }
}

function formatearFecha(fecha) {
  if (!fecha) return '';

  const f = new Date(fecha);

  return f.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function obtenerServicioActual() {
  const idServicio = document.getElementById('valServicio').value;
  return idServicio ? Number(idServicio) : null;
}

function calcularRiesgoAutomatico() {
  const fc = Number(document.getElementById('obsFC').value || 0);
  const fr = Number(document.getElementById('obsFR').value || 0);
  const temp = Number(document.getElementById('obsTemp').value || 0);
  const sat = Number(document.getElementById('obsSat').value || 0);
  const peso = Number(document.getElementById('obsPeso').value || 0);
  const talla = Number(document.getElementById('obsTalla').value || 0);

  let puntos = 0;
  let alertas = [];

  if (fc > 120 || fc < 50) {
    puntos += 3;
    alertas.push('Frecuencia cardiaca fuera de rango');
  } else if (fc >= 100 || fc <= 59) {
    puntos += 1;
  }

  if (fr > 30 || fr < 8) {
    puntos += 3;
    alertas.push('Frecuencia respiratoria crítica');
  } else if (fr >= 22 || fr <= 10) {
    puntos += 1;
  }

  if (sat > 0 && sat < 90) {
    puntos += 4;
    alertas.push('Saturación de oxígeno crítica');
  } else if (sat >= 90 && sat < 94) {
    puntos += 2;
  }

  if (temp >= 39 || temp < 35) {
    puntos += 3;
    alertas.push('Temperatura fuera de rango');
  } else if (temp >= 37.8) {
    puntos += 1;
  }

  if (peso > 0 && talla > 0) {
    const imc = peso / (talla * talla);

    if (imc >= 35) {
      puntos += 2;
      alertas.push(`IMC elevado: ${imc.toFixed(1)}`);
    } else if (imc >= 30) {
      puntos += 1;
    }
  }

  let riesgo = 'Bajo';

  if (puntos >= 7) riesgo = 'Crítico';
  else if (puntos >= 5) riesgo = 'Alto';
  else if (puntos >= 2) riesgo = 'Moderado';

  document.getElementById('valRiesgo').value = riesgo;

  generarRecomendacionAutomatica(riesgo, alertas);
  pintarRiesgoVisual(riesgo);
}

function generarRecomendacionAutomatica(riesgo, alertas) {
  let recomendacion = '';

  if (riesgo === 'Bajo') {
    recomendacion = 'Paciente con signos clínicos dentro de rangos esperados. Continuar seguimiento según criterio médico.';
  }

  if (riesgo === 'Moderado') {
    recomendacion = 'Paciente con riesgo moderado. Se recomienda seguimiento clínico y reevaluación de signos vitales.';
  }

  if (riesgo === 'Alto') {
    recomendacion = 'Paciente con riesgo alto. Se recomienda valoración prioritaria y seguimiento estrecho.';
  }

  if (riesgo === 'Crítico') {
    recomendacion = 'Paciente con riesgo crítico. Se recomienda atención inmediata según protocolo institucional.';
  }

  if (alertas.length) {
    recomendacion += '\n\nAlertas detectadas:\n- ' + alertas.join('\n- ');
  }

  document.getElementById('valRecomendacion').value = recomendacion;
}

function pintarRiesgoVisual(riesgo) {
  const select = document.getElementById('valRiesgo');

  select.classList.remove(
    'riesgo-bajo',
    'riesgo-moderado',
    'riesgo-alto',
    'riesgo-critico'
  );

  if (riesgo === 'Bajo') select.classList.add('riesgo-bajo');
  if (riesgo === 'Moderado') select.classList.add('riesgo-moderado');
  if (riesgo === 'Alto') select.classList.add('riesgo-alto');
  if (riesgo === 'Crítico') select.classList.add('riesgo-critico');
}

function calcularIndicadoresClinicos() {

  const peso = parseFloat(document.getElementById('obsPeso').value) || 0;
  const talla = parseFloat(document.getElementById('obsTalla').value) || 0;

  const tas = parseFloat(document.getElementById('obsTas').value) || 0;
  const tad = parseFloat(document.getElementById('obsTad').value) || 0;

  const fc = parseFloat(document.getElementById('obsFC').value) || 0;
  const fr = parseFloat(document.getElementById('obsFR').value) || 0;
  const sat = parseFloat(document.getElementById('obsSat').value) || 0;
  const temp = parseFloat(document.getElementById('obsTemp').value) || 0;
  
  if (!fc && !fr && !sat && !temp) {
	  document.getElementById('textoRiesgo').textContent = 'SIN CALCULAR';
	  document.getElementById('textoRiesgoDetalle').textContent = 'Ingrese signos vitales para calcular el riesgo';
	  document.getElementById('bannerRiesgo').className = 'risk-banner risk-bajo';
	  document.getElementById('valRiesgo').value = '';
  return;
 }

  // PAM
  if (tas && tad) {
    const pam = ((tas + (2 * tad)) / 3).toFixed(1);
    document.getElementById('obsPam').value = pam;
  }

  // IMC
  if (peso && talla) {

    const imc = (peso / (talla * talla)).toFixed(1);

    document.getElementById('obsImc').value = imc;

    let clasificacion = '';

    if (imc < 18.5) clasificacion = 'Bajo peso';
    else if (imc < 25) clasificacion = 'Normal';
    else if (imc < 30) clasificacion = 'Sobrepeso';
    else clasificacion = 'Obesidad';

    document.getElementById('obsImcClasificacion').value = clasificacion;
  }

  // RIESGO AUTOMÁTICO
  let riesgo = 'BAJO';
  let clase = 'risk-bajo';
  let detalle = 'Paciente estable clínicamente';

  if (
    sat < 85 ||
    fr > 35 ||
    fc > 150 ||
    temp > 40
  ) {
    riesgo = 'CRÍTICO';
    clase = 'risk-critico';
    detalle = 'Requiere atención inmediata';
  }

  else if (
    sat < 90 ||
    fr > 28 ||
    fc > 130
  ) {
    riesgo = 'ALTO';
    clase = 'risk-alto';
    detalle = 'Paciente con deterioro clínico';
  }

  else if (
    sat < 94 ||
    fr > 22 ||
    fc > 110
  ) {
    riesgo = 'MODERADO';
    clase = 'risk-moderado';
    detalle = 'Paciente en vigilancia';
  }

  document.getElementById('textoRiesgo').textContent =
    `RIESGO ${riesgo}`;

  document.getElementById('textoRiesgoDetalle').textContent =
    detalle;

  document.getElementById('bannerRiesgo').className =
    `risk-banner ${clase}`;

  document.getElementById('valRiesgo').value =
    riesgo.charAt(0) + riesgo.slice(1).toLowerCase();
	
	calcularNEWS2();
}

function calcularNEWS2() {
	
  const fr = parseFloat(document.getElementById('obsFR').value) || 0;
  const sat = parseFloat(document.getElementById('obsSat').value) || 0;
  const temp = parseFloat(document.getElementById('obsTemp').value) || 0;
  const fc = parseFloat(document.getElementById('obsFC').value) || 0;
  const tas = parseFloat(document.getElementById('obsTas').value) || 0;
  
  if (!fr || !sat || !temp || !fc || !tas) {
	  document.getElementById('scoreNews2').value = '';
	  document.getElementById('clasificacionNews2').value = '';
	  document.getElementById('interpretacionNews2').value = '';
	  return;
  }

  let score = 0;

  // FR
  if (fr <= 8) score += 3;
  else if (fr <= 11) score += 1;
  else if (fr <= 20) score += 0;
  else if (fr <= 24) score += 2;
  else score += 3;

  // Sat O2
  if (sat <= 91) score += 3;
  else if (sat <= 93) score += 2;
  else if (sat <= 95) score += 1;

  // Temperatura
  if (temp <= 35) score += 3;
  else if (temp <= 36) score += 1;
  else if (temp <= 38) score += 0;
  else if (temp <= 39) score += 1;
  else score += 2;

  // FC
  if (fc <= 40) score += 3;
  else if (fc <= 50) score += 1;
  else if (fc <= 90) score += 0;
  else if (fc <= 110) score += 1;
  else if (fc <= 130) score += 2;
  else score += 3;

  // TAS
  if (tas <= 90) score += 3;
  else if (tas <= 100) score += 2;
  else if (tas <= 110) score += 1;
  else if (tas <= 219) score += 0;
  else score += 3;

  let clasificacion = 'Bajo';
  let interpretacion = 'Paciente estable';

  if (score >= 7) {
    clasificacion = 'Crítico';
    interpretacion = 'Respuesta clínica inmediata';
  }
  else if (score >= 5) {
    clasificacion = 'Alto';
    interpretacion = 'Urgente valoración médica';
  }
  else if (score >= 3) {
    clasificacion = 'Moderado';
    interpretacion = 'Requiere seguimiento estrecho';
  }

  document.getElementById('scoreNews2').value = score;
  document.getElementById('clasificacionNews2').value = clasificacion;
  document.getElementById('interpretacionNews2').value = interpretacion;

}

function activarCalculoRiesgoAutomatico() {
  [
    'obsFC',
    'obsFR',
    'obsTemp',
    'obsSat',
    'obsPeso',
    'obsTalla',
    'obsTas',
    'obsTad'
  ].forEach(id => {
    const input = document.getElementById(id);

    if (input) {
      input.oninput = () => {
		  calcularIndicadoresClinicos();
		  calcularRiesgoAutomatico();
		  calcularNEWS2();
		  pintarAlertasClinicas(detectarAlertas());
		};
    }
  });

  calcularIndicadoresClinicos();
  calcularRiesgoAutomatico();
  calcularNEWS2();
}

function detectarAlertas() {
    
	const alertas = [];
  
    const fcRaw = document.getElementById('obsFC').value;
	const frRaw = document.getElementById('obsFR').value;
	const satRaw = document.getElementById('obsSat').value;
	const tempRaw = document.getElementById('obsTemp').value;
	const tasRaw = document.getElementById('obsTas').value;
	const tadRaw = document.getElementById('obsTad').value;
	const news2Raw = document.getElementById('scoreNews2').value;

	const fc = fcRaw === '' ? null : Number(fcRaw);
	const fr = frRaw === '' ? null : Number(frRaw);
	const sat = satRaw === '' ? null : Number(satRaw);
	const temp = tempRaw === '' ? null : Number(tempRaw);
	const tas = tasRaw === '' ? null : Number(tasRaw);
	const tad = tadRaw === '' ? null : Number(tadRaw);
	const news2 = news2Raw === '' ? null : Number(news2Raw);

  if (sat !== null && sat < 90){
    alertas.push({
      tipo_alerta: 'SATURACION_CRITICA',
      descripcion: 'Saturación de oxígeno críticamente baja',
      severidad: 'CRITICA'
    });
  }

  if (fc !== null && (fc >= 130 || fc <= 40)) {
    alertas.push({
      tipo_alerta: 'FC_CRITICA',
      descripcion: 'Frecuencia cardiaca extrema',
      severidad: 'ALTA'
    });
  }

  if (fr !== null && (fr >= 30 || fr <= 8)) {
    alertas.push({
      tipo_alerta: 'FR_CRITICA',
      descripcion: 'Frecuencia respiratoria fuera de rango',
      severidad: 'ALTA'
    });
  }

  if (temp !== null && (temp >= 39 || temp <= 35)) {
    alertas.push({
      tipo_alerta: 'TEMPERATURA_CRITICA',
      descripcion: 'Temperatura corporal fuera de rango',
      severidad: 'ALTA'
    });
  }

  if ((tas !== null && tas >= 180) || (tad !== null && tad >= 120)) {
    alertas.push({
      tipo_alerta: 'HTA_SEVERA',
      descripcion: 'Presión arterial severamente elevada',
      severidad: 'ALTA'
    });
  }

  if (news2 !== null && news2 >= 7) {
    alertas.push({
      tipo_alerta: 'NEWS2_CRITICO',
      descripcion: 'NEWS2 con riesgo clínico crítico',
      severidad: 'CRITICA'
    });
  }

  return alertas;
}

async function cargarCatalogosValoracion() {
  try {
    const response = await fetch(`${API_URL}/valoracion/catalogos`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();

    if (!data.ok) throw new Error(data.mensaje);

    catalogosValoracion = data.data;

    cargarSelectProfesionales();
    cargarSelectServicios();
	seleccionarDatosSesionValoracion();

  } catch (error) {
    console.error(error);
    Swal.fire('Error', error.message, 'error');
  }
}

function cargarSelectProfesionales() {
  const select = document.getElementById('valProfesional');
  if (!select) return;

  select.innerHTML = '<option value="">Seleccione profesional...</option>';

  catalogosValoracion.profesionales.forEach(p => {
    select.innerHTML += `
      <option value="${p.id_profesional}">
        ${p.nombres} ${p.apellidos} - ${p.especialidad || 'Sin especialidad'}
      </option>
    `;
  });
}

function cargarSelectServicios() {
  const select = document.getElementById('valServicio');
  if (!select) return;

  select.innerHTML = '<option value="">Seleccione servicio...</option>';

  catalogosValoracion.servicios.forEach(s => {
    select.innerHTML += `
      <option value="${s.id_servicio_clinico}">
        ${s.nombre_entidad} / ${s.nombre_punto} / ${s.nombre_servicio}
      </option>
    `;
  });
}

function seleccionarDatosSesionValoracion() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  if (!usuario) return;

  const selectProfesional = document.getElementById('valProfesional');
  const selectServicio = document.getElementById('valServicio');

  if (selectProfesional && usuario.id_profesional) {
    selectProfesional.value = usuario.id_profesional;
    selectProfesional.disabled = true;
  }

  if (selectServicio && usuario.id_servicio_clinico) {
    selectServicio.value = usuario.id_servicio_clinico;
    selectServicio.disabled = true;
    return;
  }

  if (selectServicio && catalogosValoracion.servicios.length === 1) {
    selectServicio.value = catalogosValoracion.servicios[0].id_servicio_clinico;
    selectServicio.disabled = true;
  }
}

function inicializarEventosRiesgo() {

  [
    'obsPeso',
    'obsTalla',
    'obsTas',
    'riskActividadFisica',
    'riskFrutasVerduras',
    'riskMedicamentoHTA',
    'riskGlucosaAlta',
    'riskFamiliarDiabetes',
    'riskFumador',
    'riskColesterolTotal',
    'riskHdl'
  ].forEach(id => {

    const control = document.getElementById(id);

    if (control) {
      control.addEventListener('change', calcularRiesgos);
      control.addEventListener('keyup', calcularRiesgos);
    }

  });

}

function calcularRiesgos() {
  calcularFindrisc();
  calcularFramingham();
}

function calcularFindrisc() {

  let puntos = 0;

  const peso = parseFloat(document.getElementById('obsPeso')?.value || 0);
  const talla = parseFloat(document.getElementById('obsTalla')?.value || 0);

  const actividad = document.getElementById('riskActividadFisica')?.value;
  const frutas = document.getElementById('riskFrutasVerduras')?.value;
  const hta = document.getElementById('riskMedicamentoHTA')?.value;
  const glucosa = document.getElementById('riskGlucosaAlta')?.value;
  const familiar = document.getElementById('riskFamiliarDiabetes')?.value;

  let imc = 0;

  if (peso > 0 && talla > 0) {
    imc = peso / (talla * talla);
  }

  if (imc >= 25 && imc < 30) puntos += 1;
  if (imc >= 30) puntos += 3;

  if (actividad === 'NO') puntos += 2;

  if (frutas === 'NO_DIARIO') puntos += 1;

  if (hta === 'SI') puntos += 2;

  if (glucosa === 'SI') puntos += 5;

  if (familiar === 'SEGUNDO_GRADO') puntos += 3;

  if (familiar === 'PRIMER_GRADO') puntos += 5;

  let clasificacion = 'Bajo';

  if (puntos >= 7 && puntos <= 11) {
    clasificacion = 'Ligeramente elevado';
  }

  if (puntos >= 12 && puntos <= 14) {
    clasificacion = 'Moderado';
  }

  if (puntos >= 15 && puntos <= 20) {
    clasificacion = 'Alto';
  }

  if (puntos > 20) {
    clasificacion = 'Muy alto';
  }

  document.getElementById('scoreFindrisc').value = puntos;
  document.getElementById('clasificacionFindrisc').value = clasificacion;

}

function calcularFramingham() {

  let puntos = 0;

  const fumador = document.getElementById('riskFumador')?.value;
  const colesterol = parseFloat(document.getElementById('riskColesterolTotal')?.value || 0);
  const hdl = parseFloat(document.getElementById('riskHdl')?.value || 0);
  const sistolica = parseFloat(document.getElementById('obsTas')?.value || 0);

  if (fumador === 'SI') puntos += 4;

  if (colesterol >= 200) puntos += 2;

  if (colesterol >= 240) puntos += 4;

  if (hdl < 40) puntos += 2;

  if (sistolica >= 140) puntos += 2;

  if (sistolica >= 160) puntos += 3;

  let clasificacion = 'Bajo';

  if (puntos >= 5 && puntos <= 9) {
    clasificacion = 'Moderado';
  }

  if (puntos >= 10) {
    clasificacion = 'Alto';
  }

  document.getElementById('scoreFramingham').value = puntos;
  document.getElementById('clasificacionFramingham').value = clasificacion;

}

function inicializarBuscadorDiagnosticos() {

  const input =
    document.getElementById('txtBusquedaDiagnostico');

  if (!input) return;

  input.addEventListener('keyup', async e => {

    const texto = e.target.value.trim();

    if (texto.length < 2) {
      limpiarResultadosDiagnostico();
      return;
    }

    await buscarDiagnosticosSnomed(texto);

  });

}

async function buscarDiagnosticosSnomed(texto) {

  try {

    const response = await fetch(
      `${API_URL}/snomed/buscar?q=${texto}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    pintarResultadosDiagnostico(data.data || []);

  } catch (error) {

    console.error(error);

  }

}

function pintarResultadosDiagnostico(items) {

  const container =
    document.getElementById('listaResultadosDiagnostico');

  if (!items.length) {

    container.innerHTML = `
      <div class="empty-snomed">
        Sin resultados
      </div>
    `;

    return;
  }

  container.innerHTML = items.map(item => `

    <div
      class="item-snomed"
      onclick='agregarDiagnosticoSeleccionado(${JSON.stringify(item)})'
    >

      <div>

        <div class="snomed-term">
          ${item.term}
        </div>

        <div class="snomed-code">
          ${item.concept_id}
        </div>

      </div>

      <span class="badge bg-primary">
        SNOMED
      </span>

    </div>

  `).join('');

}

function agregarDiagnosticoSeleccionado(item) {

  const existe = diagnosticosSeleccionados.find(
    x => x.concept_id === item.concept_id
  );

  if (existe) return;

  diagnosticosSeleccionados.push({
    ...item,
    tipo_diagnostico: 'PRINCIPAL'
  });

  pintarDiagnosticosSeleccionados();

  limpiarResultadosDiagnostico();

  document.getElementById(
    'txtBusquedaDiagnostico'
  ).value = '';

}

function pintarDiagnosticosSeleccionados() {

  const container =
    document.getElementById(
      'contenedorDiagnosticosSeleccionados'
    );

  if (!diagnosticosSeleccionados.length) {

    container.innerHTML = `
      <div class="empty-snomed">
        No hay diagnósticos seleccionados
      </div>
    `;

    return;
  }

  container.innerHTML =
    diagnosticosSeleccionados.map((item, index) => `

      <div class="diagnostico-card">

        <div>

          <div class="diagnostico-title">
            ${item.term}
          </div>

          <div class="diagnostico-code">
            ${item.concept_id}
          </div>

        </div>

        <div class="d-flex gap-2 align-items-center">

          <select
            class="form-control select-diagnostico"	
            onchange="cambiarTipoDiagnostico(${index}, this.value)"
          >
            <option value="PRINCIPAL"
              ${item.tipo_diagnostico === 'PRINCIPAL' ? 'selected' : ''}
            >
              Principal
            </option>

            <option value="RELACIONADO"
              ${item.tipo_diagnostico === 'RELACIONADO' ? 'selected' : ''}
            >
              Relacionado
            </option>

            <option value="COMPLICACION"
              ${item.tipo_diagnostico === 'COMPLICACION' ? 'selected' : ''}
            >
              Complicación
            </option>

          </select>

          <button
            <button class="btn-table btn-delete"
            onclick="eliminarDiagnosticoSeleccionado('${item.concept_id}')"
          >
            <i class="bi bi-trash"></i>
          </button>

        </div>

      </div>

    `).join('');

}

function cambiarTipoDiagnostico(index, valor) {

  diagnosticosSeleccionados[index]
    .tipo_diagnostico = valor;

}

function eliminarDiagnosticoSeleccionado(conceptId) {

  diagnosticosSeleccionados =
    diagnosticosSeleccionados.filter(
      x => x.concept_id !== conceptId
    );

  pintarDiagnosticosSeleccionados();

}

function limpiarResultadosDiagnostico() {

  document.getElementById(
    'listaResultadosDiagnostico'
  ).innerHTML = '';

}

function pintarAlertasClinicas(alertas) {

  const container = document.getElementById('contenedorAlertasClinicas');

  if (!alertas.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="alert alert-danger shadow-sm mb-4">

      <div class="d-flex align-items-center gap-2 mb-2">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <strong>ALERTAS CLÍNICAS DETECTADAS</strong>
      </div>

      <ul class="mb-0">

        ${alertas.map(a => `
          <li>
            <strong>${a.tipo_alerta}</strong>:
            ${a.descripcion}
          </li>
        `).join('')}

      </ul>

    </div>
  `;
}