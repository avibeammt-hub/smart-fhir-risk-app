let recursosFhirViewer = [];

async function inicializarFhirViewer() {
  await consultarRecursosFhir();
}

async function consultarRecursosFhir() {
  try {
    const tipo = document.getElementById('filtroRecursoFhir').value;
    const busqueda = document.getElementById('txtBuscarFhir')?.value.trim() || '';

    let url = `${API_URL}/fhir-viewer/${tipo}`;

    if (busqueda) {
      url += `?q=${encodeURIComponent(busqueda)}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!data.ok) throw new Error(data.mensaje);

    recursosFhirViewer = data.data || [];

    pintarRecursosFhir(tipo, recursosFhirViewer);

  } catch (error) {
    console.error(error);
    Swal.fire('Error', error.message, 'error');
  }
}

function pintarRecursosFhir(tipo, lista) {
  const tbody = document.getElementById('tbodyFhirViewer');

  document.getElementById('kpiFhirTotal').textContent = lista.length;
  document.getElementById('kpiFhirTipo').textContent = tipo;

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-5">
          No se encontraron recursos FHIR
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map((item, index) => {
    const recurso = item.resource || item;

    return `
      <tr>
        <td>
          <strong>${recurso.id || 'Sin ID'}</strong>
        </td>

        <td>${recurso.resourceType || tipo}</td>

        <td>${obtenerFechaRecursoFhir(recurso)}</td>

        <td>
          <span class="estado-badge estado-activo">
            ${recurso.status || 'Disponible'}
          </span>
        </td>

        <td>
          <button class="btn-save" onclick="verJsonFhir(${index})">
            <i class="bi bi-code-square"></i>
            Ver JSON
          </button>
		  
		    ${recurso.resourceType === 'Patient' ? `

			<button
			  class="fhir-json-btn ms-2"
			  onclick="verLineaClinicaFhir('${recurso.id}')">

			  <i class="bi bi-diagram-3"></i>
			  Línea clínica

			</button>

		` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function obtenerFechaRecursoFhir(recurso) {
  return (
    recurso.effectiveDateTime ||
    recurso.period?.start ||
    recurso.authoredOn ||
    recurso.meta?.lastUpdated ||
    ''
  ).toString().substring(0, 10) || '-';
}

function verJsonFhir(index) {
  const item = recursosFhirViewer[index];
  const recurso = item.resource || item;

  document.getElementById('jsonFhirViewer').textContent =
    JSON.stringify(recurso, null, 2);

  const modal = new bootstrap.Modal(
    document.getElementById('modalJsonFhir')
  );

  modal.show();
}

async function verLineaClinicaFhir(idPaciente) {
  try {
    const response = await fetch(`${API_URL}/fhir-viewer/paciente/${idPaciente}/linea-clinica`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!data.ok) throw new Error(data.mensaje);

    document.getElementById('jsonFhirViewer').textContent =
      JSON.stringify(data.data, null, 2);

    const modal = new bootstrap.Modal(
      document.getElementById('modalJsonFhir')
    );

    modal.show();

  } catch (error) {
    console.error(error);
    Swal.fire('Error', error.message, 'error');
  }
}