let modalPaciente = null;
let pacientesCache = [];

function inicializarPacientes() {
  const modalElement = document.getElementById('modalPaciente');

  if (modalElement) {
    modalPaciente = new bootstrap.Modal(modalElement);
  }

  cargarPacientes();
}

async function cargarPacientes() {
  try {
    const response = await fetch(`${API_URL}/pacientes`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    pacientesCache = Array.isArray(data) ? data : data.data || [];

    pintarPacientes(pacientesCache);

  } catch (error) {
    console.error(error);
  }
}

function pintarPacientes(lista) {
  const tbody = document.getElementById('tbodyPacientes');

  if (!tbody) return;

  tbody.innerHTML = '';

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted py-4">
          No hay pacientes registrados
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach(p => {
    tbody.innerHTML += `
      <tr>
        <td>
          <strong>${p.tipo_documento || ''} ${p.numero_documento || ''}</strong>
        </td>

        <td>
          <strong>${p.nombres} ${p.apellidos}</strong>
          <div class="text-muted small">${p.correo || ''}</div>
        </td>

        <td>${p.sexo || ''}</td>

        <td>${p.fecha_nacimiento ? p.fecha_nacimiento.substring(0, 10) : ''}</td>

        <td>${p.telefono || ''}</td>

        <td>
          <span class="fhir-code">${p.codigo_fhir || 'Sin generar'}</span>
        </td>

        <td>
          <span class="uuid-chip">${p.uuid_fhir || 'Sin UUID'}</span>
        </td>

        <td>
          ${
            p.uuid_fhir
              ? `<span class="estado-badge estado-activo">FHIR OK</span>`
              : `<span class="estado-badge estado-inactivo">Sin FHIR</span>`
          }
        </td>

        <td>
          <div class="d-flex gap-2">
            <button class="btn-table btn-edit" onclick='editarPaciente(${JSON.stringify(p)})'>
              <i class="bi bi-pencil-fill"></i>
            </button>

            <button class="btn-table btn-delete" onclick="eliminarPaciente(${p.id_paciente})">
              <i class="bi bi-trash-fill"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
}

function abrirModalPaciente() {
  limpiarFormularioPaciente();
  document.getElementById('idPaciente').value = '';
  modalPaciente.show();
}

function editarPaciente(p) {
  document.getElementById('idPaciente').value = p.id_paciente;
  document.getElementById('tipoDocumentoPaciente').value = p.tipo_documento || 'CC';
  document.getElementById('numeroDocumentoPaciente').value = p.numero_documento || '';
  document.getElementById('nombresPaciente').value = p.nombres || '';
  document.getElementById('apellidosPaciente').value = p.apellidos || '';
  document.getElementById('sexoPaciente').value = p.sexo || 'M';
  document.getElementById('fechaNacimientoPaciente').value = p.fecha_nacimiento ? p.fecha_nacimiento.substring(0, 10) : '';
  document.getElementById('telefonoPaciente').value = p.telefono || '';
  document.getElementById('correoPaciente').value = p.correo || '';
  document.getElementById('direccionPaciente').value = p.direccion || '';

  modalPaciente.show();
}

async function guardarPaciente() {
  try {
    const id = document.getElementById('idPaciente').value;

    const payload = {
      tipo_documento: document.getElementById('tipoDocumentoPaciente').value,
      numero_documento: document.getElementById('numeroDocumentoPaciente').value,
      nombres: document.getElementById('nombresPaciente').value,
      apellidos: document.getElementById('apellidosPaciente').value,
      sexo: document.getElementById('sexoPaciente').value,
      fecha_nacimiento: document.getElementById('fechaNacimientoPaciente').value,
      telefono: document.getElementById('telefonoPaciente').value,
      correo: document.getElementById('correoPaciente').value,
      direccion: document.getElementById('direccionPaciente').value
    };

    let url = `${API_URL}/pacientes`;
    let method = 'POST';

    if (id) {
      url = `${API_URL}/pacientes/${id}`;
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
      throw new Error(data.mensaje || data.error || 'No fue posible guardar el paciente');
    }

    modalPaciente.hide();

    await cargarPacientes();

    Swal.fire({
      icon: 'success',
      title: 'Correcto',
      text: data.mensaje || 'Paciente guardado correctamente',
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

async function eliminarPaciente(id) {
  const result = await Swal.fire({
    title: '¿Eliminar paciente?',
    text: 'Esta acción no se puede deshacer',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ea580c',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  });

  if (!result.isConfirmed) return;

  const response = await fetch(`${API_URL}/pacientes/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  await cargarPacientes();

  Swal.fire({
    icon: data.ok ? 'success' : 'error',
    title: data.ok ? 'Correcto' : 'Error',
    text: data.mensaje || data.error || 'Proceso finalizado'
  });
}

function limpiarFormularioPaciente() {
  document.getElementById('tipoDocumentoPaciente').value = 'CC';
  document.getElementById('numeroDocumentoPaciente').value = '';
  document.getElementById('nombresPaciente').value = '';
  document.getElementById('apellidosPaciente').value = '';
  document.getElementById('sexoPaciente').value = 'M';
  document.getElementById('fechaNacimientoPaciente').value = '';
  document.getElementById('telefonoPaciente').value = '';
  document.getElementById('correoPaciente').value = '';
  document.getElementById('direccionPaciente').value = '';
}