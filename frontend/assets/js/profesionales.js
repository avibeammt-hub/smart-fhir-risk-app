let modalProfesional = null;
let profesionalesCache = [];

function inicializarProfesionales() {
  const modalElement = document.getElementById('modalProfesional');

  if (modalElement) {
    modalProfesional = new bootstrap.Modal(modalElement);
  }

  cargarProfesionales();
}

async function cargarProfesionales() {
  try {
    const response = await fetch(`${API_URL}/profesionales`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    profesionalesCache = data.data || [];

    pintarProfesionales(profesionalesCache);

  } catch (error) {
    console.error(error);
  }
}

function pintarProfesionales(lista) {
  const tbody = document.getElementById('tbodyProfesionales');

  if (!tbody) return;

  tbody.innerHTML = '';

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          No hay profesionales registrados
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach(pro => {
    tbody.innerHTML += `
      <tr>
        <td>
          <strong>${pro.tipo_documento || ''} ${pro.numero_documento || ''}</strong>
        </td>

        <td>
          <strong>${pro.nombres} ${pro.apellidos}</strong>
          <div class="text-muted small">${pro.correo || ''}</div>
        </td>

        <td>${pro.especialidad || ''}</td>

        <td>${pro.tarjeta_profesional || ''}</td>

        <td>
          <span class="fhir-code">${pro.codigo_fhir || 'Sin generar'}</span>
        </td>

        <td>
          <span class="uuid-chip">${pro.uuid_fhir || 'Sin UUID'}</span>
        </td>

        <td>
          ${
            pro.uuid_fhir
              ? `<span class="estado-badge estado-activo">FHIR OK</span>`
              : `<span class="estado-badge estado-inactivo">Sin FHIR</span>`
          }
        </td>

        <td>
          <div class="d-flex gap-2">
            <button class="btn-table btn-edit" onclick='editarProfesional(${JSON.stringify(pro)})'>
              <i class="bi bi-pencil-fill"></i>
            </button>

            <button class="btn-table btn-delete" onclick='eliminarProfesional(${pro.id_profesional})'>
              <i class="bi bi-trash-fill"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
}

function abrirModalCrearProfesional() {
  document.getElementById('tituloModalProfesional').textContent = 'Nuevo profesional';
  document.getElementById('idProfesional').value = '';

  limpiarFormularioProfesional();

  modalProfesional.show();
}

function editarProfesional(pro) {
  document.getElementById('tituloModalProfesional').textContent = 'Editar profesional';

  document.getElementById('idProfesional').value = pro.id_profesional;
  document.getElementById('tipoDocumentoProfesional').value = pro.tipo_documento || '';
  document.getElementById('numeroDocumentoProfesional').value = pro.numero_documento || '';
  document.getElementById('nombresProfesional').value = pro.nombres || '';
  document.getElementById('apellidosProfesional').value = pro.apellidos || '';
  document.getElementById('especialidadProfesional').value = pro.especialidad || '';
  document.getElementById('tarjetaProfesional').value = pro.tarjeta_profesional || '';
  document.getElementById('telefonoProfesional').value = pro.telefono || '';
  document.getElementById('correoProfesional').value = pro.correo || '';

  modalProfesional.show();
}

async function guardarProfesional() {
  try {
    const id = document.getElementById('idProfesional').value;

    const payload = {
      tipo_documento: document.getElementById('tipoDocumentoProfesional').value,
      numero_documento: document.getElementById('numeroDocumentoProfesional').value,
      nombres: document.getElementById('nombresProfesional').value,
      apellidos: document.getElementById('apellidosProfesional').value,
      especialidad: document.getElementById('especialidadProfesional').value,
      tarjeta_profesional: document.getElementById('tarjetaProfesional').value,
      telefono: document.getElementById('telefonoProfesional').value,
      correo: document.getElementById('correoProfesional').value,
      activo: 1
    };

    let url = `${API_URL}/profesionales`;
    let method = 'POST';

    if (id) {
      url = `${API_URL}/profesionales/${id}`;
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

    modalProfesional.hide();

    await cargarProfesionales();

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

async function eliminarProfesional(id) {
  const result = await Swal.fire({
    title: '¿Eliminar profesional?',
    text: 'Esta acción no se puede deshacer',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ea580c',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  });

  if (!result.isConfirmed) return;

  const response = await fetch(`${API_URL}/profesionales/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  await cargarProfesionales();

  Swal.fire({
    icon: data.ok ? 'success' : 'error',
    title: data.ok ? 'Correcto' : 'Error',
    text: data.mensaje
  });
}

function limpiarFormularioProfesional() {
  document.getElementById('tipoDocumentoProfesional').value = '';
  document.getElementById('numeroDocumentoProfesional').value = '';
  document.getElementById('nombresProfesional').value = '';
  document.getElementById('apellidosProfesional').value = '';
  document.getElementById('especialidadProfesional').value = '';
  document.getElementById('tarjetaProfesional').value = '';
  document.getElementById('telefonoProfesional').value = '';
  document.getElementById('correoProfesional').value = '';
}