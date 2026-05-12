let modalServicio = null;
let serviciosCache = [];
let sedesServiciosCache = [];

function inicializarServicios() {
  const modalElement = document.getElementById('modalServicio');

  if (modalElement) {
    modalServicio = new bootstrap.Modal(modalElement);
  }

  cargarServicios();
}

async function cargarSedesServicioSelect() {
  const response = await fetch(`${API_URL}/servicios/sedes`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  sedesServiciosCache = data.data || [];

  const select = document.getElementById('idSedeServicio');

  select.innerHTML = `<option value="">Seleccione punto de atención</option>`;

  sedesServiciosCache.forEach(sede => {
    select.innerHTML += `
      <option 
        value="${sede.id_punto_atencion}" 
        data-entidad="${sede.id_entidad}">
        ${sede.nombre_entidad} / ${sede.nombre_punto}
      </option>
    `;
  });
}

async function cargarServicios() {
  try {
    const response = await fetch(`${API_URL}/servicios`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    serviciosCache = data.data || [];

    pintarServicios(serviciosCache);

  } catch (error) {
    console.error(error);
  }
}

function pintarServicios(lista) {
  const tbody = document.getElementById('tbodyServicios');

  if (!tbody) return;

  tbody.innerHTML = '';

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted py-4">
          No hay servicios clínicos registrados
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach(servicio => {
    tbody.innerHTML += `
      <tr>
        <td><strong>${servicio.nombre_entidad}</strong></td>

        <td>${servicio.nombre_punto}</td>

        <td>${servicio.codigo_servicio}</td>

        <td>
          <strong>${servicio.nombre_servicio}</strong>
          <div class="text-muted small">${servicio.descripcion || ''}</div>
        </td>

        <td>${servicio.nivel_atencion || ''}</td>

        <td>
          <span class="fhir-code">${servicio.codigo_fhir || 'Sin generar'}</span>
        </td>

        <td>
          <span class="uuid-chip">${servicio.uuid_fhir || 'Sin UUID'}</span>
        </td>

        <td>
          ${
            servicio.uuid_fhir
              ? `<span class="estado-badge estado-activo">FHIR OK</span>`
              : `<span class="estado-badge estado-inactivo">Sin FHIR</span>`
          }
        </td>

        <td>
          <div class="d-flex gap-2">
            <button
              class="btn-table btn-edit"
              onclick='editarServicio(${JSON.stringify(servicio)})'>
              <i class="bi bi-pencil-fill"></i>
            </button>

            <button
              class="btn-table btn-delete"
              onclick='eliminarServicio(${servicio.id_servicio_clinico})'>
              <i class="bi bi-trash-fill"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
}

async function abrirModalCrearServicio() {
  document.getElementById('tituloModalServicio').textContent = 'Nuevo servicio clínico';
  document.getElementById('idServicio').value = '';

  limpiarFormularioServicio();

  await cargarSedesServicioSelect();

  modalServicio.show();
}

async function editarServicio(servicio) {
  document.getElementById('tituloModalServicio').textContent = 'Editar servicio clínico';

  await cargarSedesServicioSelect();

  document.getElementById('idServicio').value = servicio.id_servicio_clinico;
  document.getElementById('idSedeServicio').value = servicio.id_punto_atencion;
  document.getElementById('codigoServicio').value = servicio.codigo_servicio || '';
  document.getElementById('nombreServicio').value = servicio.nombre_servicio || '';
  document.getElementById('descripcionServicio').value = servicio.descripcion || '';
  document.getElementById('nivelAtencion').value = servicio.nivel_atencion || '';

  modalServicio.show();
}

async function guardarServicio() {
  try {
    const id = document.getElementById('idServicio').value;
    const selectSede = document.getElementById('idSedeServicio');

    const idPuntoAtencion = selectSede.value;
    const idEntidad = selectSede.options[selectSede.selectedIndex]?.dataset.entidad;

    const payload = {
      id_entidad: idEntidad,
      id_punto_atencion: idPuntoAtencion,
      codigo_servicio: document.getElementById('codigoServicio').value,
      nombre_servicio: document.getElementById('nombreServicio').value,
      descripcion: document.getElementById('descripcionServicio').value,
      nivel_atencion: document.getElementById('nivelAtencion').value,
      activo: 1
    };

    let url = `${API_URL}/servicios`;
    let method = 'POST';

    if (id) {
      url = `${API_URL}/servicios/${id}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.mensaje);
    }

    modalServicio.hide();

    await cargarServicios();

    Swal.fire({
      icon: 'success',
      title: 'Correcto',
      text: data.mensaje,
      timer: 1800,
      showConfirmButton: false
    });

  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message
    });
  }
}

async function eliminarServicio(id) {
  const result = await Swal.fire({
    title: '¿Eliminar servicio clínico?',
    text: 'Esta acción no se puede deshacer',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ea580c',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  });

  if (!result.isConfirmed) return;

  const response = await fetch(`${API_URL}/servicios/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  await cargarServicios();

  Swal.fire({
    icon: data.ok ? 'success' : 'error',
    title: data.ok ? 'Correcto' : 'Error',
    text: data.mensaje
  });
}

function limpiarFormularioServicio() {
  document.getElementById('idSedeServicio').innerHTML = '';
  document.getElementById('codigoServicio').value = '';
  document.getElementById('nombreServicio').value = '';
  document.getElementById('descripcionServicio').value = '';
  document.getElementById('nivelAtencion').value = '';
}