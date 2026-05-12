let modalSede = null;
let sedesCache = [];

function inicializarSedes() {
  const modalElement = document.getElementById('modalSede');

  if (modalElement) {
    modalSede = new bootstrap.Modal(modalElement);
  }

  cargarSedes();
}

async function cargarEntidadesSelect() {
  const response = await fetch(`${API_URL}/sedes/entidades`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  const select = document.getElementById('idEntidadSede');

  select.innerHTML = `<option value="">Seleccione organización</option>`;

  data.data.forEach(entidad => {
    select.innerHTML += `
      <option value="${entidad.id_entidad}">
        ${entidad.nombre_entidad} - ${entidad.nit}
      </option>
    `;
  });
}

async function cargarSedes() {
  try {
    const response = await fetch(`${API_URL}/sedes`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    sedesCache = data.data || [];

    pintarSedes(sedesCache);
  } catch (error) {
    console.error(error);
  }
}

function pintarSedes(lista) {
  const tbody = document.getElementById('tbodySedes');

  if (!tbody) return;

  tbody.innerHTML = '';

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          No hay puntos de atención registrados
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach(sede => {
    tbody.innerHTML += `
      <tr>
        <td>
          <strong>${sede.nombre_entidad}</strong>
        </td>

        <td>${sede.codigo_habilitacion}</td>

        <td>
          <strong>${sede.nombre_punto}</strong>
          <div class="text-muted small">${sede.tipo_punto || ''}</div>
        </td>

        <td>${sede.ciudad || ''}</td>

        <td>
          <span class="fhir-code">${sede.codigo_fhir || 'Sin generar'}</span>
        </td>

        <td>
          <span class="uuid-chip">${sede.uuid_fhir || 'Sin UUID'}</span>
        </td>

        <td>
          ${
            sede.uuid_fhir
              ? `<span class="estado-badge estado-activo">FHIR OK</span>`
              : `<span class="estado-badge estado-inactivo">Sin FHIR</span>`
          }
        </td>

        <td>
          <div class="d-flex gap-2">
            <button
              class="btn-table btn-edit"
              onclick='editarSede(${JSON.stringify(sede)})'>
              <i class="bi bi-pencil-fill"></i>
            </button>

            <button
              class="btn-table btn-delete"
              onclick='eliminarSede(${sede.id_punto_atencion})'>
              <i class="bi bi-trash-fill"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
}

async function abrirModalCrearSede() {
  document.getElementById('tituloModalSede').textContent = 'Nuevo punto de atención';
  document.getElementById('idSede').value = '';

  limpiarFormularioSede();

  await cargarEntidadesSelect();

  modalSede.show();
}

async function editarSede(sede) {
  document.getElementById('tituloModalSede').textContent = 'Editar punto de atención';

  await cargarEntidadesSelect();

  document.getElementById('idSede').value = sede.id_punto_atencion;
  document.getElementById('idEntidadSede').value = sede.id_entidad;
  document.getElementById('codigoHabilitacion').value = sede.codigo_habilitacion || '';
  document.getElementById('nombrePunto').value = sede.nombre_punto || '';
  document.getElementById('tipoPunto').value = sede.tipo_punto || '';
  document.getElementById('departamentoSede').value = sede.departamento || '';
  document.getElementById('ciudadSede').value = sede.ciudad || '';
  document.getElementById('telefonoSede').value = sede.telefono || '';
  document.getElementById('direccionSede').value = sede.direccion || '';

  modalSede.show();
}

async function guardarSede() {
  try {
    const id = document.getElementById('idSede').value;

    const payload = {
      id_entidad: document.getElementById('idEntidadSede').value,
      codigo_habilitacion: document.getElementById('codigoHabilitacion').value,
      nombre_punto: document.getElementById('nombrePunto').value,
      tipo_punto: document.getElementById('tipoPunto').value,
      departamento: document.getElementById('departamentoSede').value,
      ciudad: document.getElementById('ciudadSede').value,
      telefono: document.getElementById('telefonoSede').value,
      direccion: document.getElementById('direccionSede').value,
      activo: 1
    };

    let url = `${API_URL}/sedes`;
    let method = 'POST';

    if (id) {
      url = `${API_URL}/sedes/${id}`;
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

    modalSede.hide();

    await cargarSedes();

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

async function eliminarSede(id) {
  const result = await Swal.fire({
    title: '¿Eliminar punto de atención?',
    text: 'Esta acción no se puede deshacer',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ea580c',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  });

  if (!result.isConfirmed) return;

  const response = await fetch(`${API_URL}/sedes/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  await cargarSedes();

  Swal.fire({
    icon: data.ok ? 'success' : 'error',
    title: data.ok ? 'Correcto' : 'Error',
    text: data.mensaje
  });
}

function limpiarFormularioSede() {
  document.getElementById('idEntidadSede').innerHTML = '';
  document.getElementById('codigoHabilitacion').value = '';
  document.getElementById('nombrePunto').value = '';
  document.getElementById('tipoPunto').value = '';
  document.getElementById('departamentoSede').value = '';
  document.getElementById('ciudadSede').value = '';
  document.getElementById('telefonoSede').value = '';
  document.getElementById('direccionSede').value = '';
}