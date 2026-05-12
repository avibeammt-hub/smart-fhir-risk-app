let modalOrganizacion = null;

function inicializarOrganizaciones() {
  const modalElement = document.getElementById('modalOrganizacion');

  if (modalElement) {
    modalOrganizacion = new bootstrap.Modal(modalElement);
  }

  cargarOrganizaciones();
}

async function cargarOrganizaciones() {
  try {
    const response = await fetch(`${API_URL}/organizaciones`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    const tbody = document.getElementById('tbodyOrganizaciones');

    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data.data || data.data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted py-4">
            No hay organizaciones registradas
          </td>
        </tr>
      `;
      return;
    }

    data.data.forEach(org => {
      tbody.innerHTML += `
        <tr>
          <td>${org.nit}</td>

          <td>
            <strong>${org.nombre_entidad}</strong>
          </td>

          <td>${org.tipo_entidad || ''}</td>

          <td>${org.telefono || ''}</td>

          <td>
            ${
              org.activo == 1
              ? `<span class="estado-badge estado-activo">Activo</span>`
              : `<span class="estado-badge estado-inactivo">Inactivo</span>`
            }
          </td>

          <td>
            <div class="d-flex gap-2">
              <button
                class="btn-table btn-edit"
                onclick='editarOrganizacion(${JSON.stringify(org)})'>
                <i class="bi bi-pencil-fill"></i>
              </button>

              <button
                class="btn-table btn-delete"
                onclick='eliminarOrganizacion(${org.id_entidad})'>
                <i class="bi bi-trash-fill"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

  } catch (error) {
    console.error(error);
  }
}

function abrirModalCrear() {
  document.getElementById('tituloModal').textContent = 'Nueva organización';
  document.getElementById('idOrganizacion').value = '';

  limpiarFormulario();

  modalOrganizacion.show();
}

function editarOrganizacion(org) {
  document.getElementById('tituloModal').textContent = 'Editar organización';

  document.getElementById('idOrganizacion').value = org.id_entidad;
  document.getElementById('nit').value = org.nit;
  document.getElementById('nombreEntidad').value = org.nombre_entidad;
  document.getElementById('razonSocial').value = org.razon_social || '';
  document.getElementById('tipoEntidad').value = org.tipo_entidad || '';
  document.getElementById('telefono').value = org.telefono || '';
  document.getElementById('correo').value = org.correo || '';
  document.getElementById('direccion').value = org.direccion || '';

  modalOrganizacion.show();
}

async function guardarOrganizacion() {
  try {
    const id = document.getElementById('idOrganizacion').value;

    const payload = {
      nit: document.getElementById('nit').value,
      nombre_entidad: document.getElementById('nombreEntidad').value,
      razon_social: document.getElementById('razonSocial').value,
      tipo_entidad: document.getElementById('tipoEntidad').value,
      telefono: document.getElementById('telefono').value,
      correo: document.getElementById('correo').value,
      direccion: document.getElementById('direccion').value,
      activo: 1
    };

    let url = `${API_URL}/organizaciones`;
    let method = 'POST';

    if (id) {
      url = `${API_URL}/organizaciones/${id}`;
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

    modalOrganizacion.hide();

    await cargarOrganizaciones();

    Swal.fire({
      icon: 'success',
      title: 'Correcto',
      text: data.mensaje,
      timer: 1600,
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

async function eliminarOrganizacion(id) {
  const result = await Swal.fire({
    title: '¿Eliminar organización?',
    text: 'Esta acción no se puede deshacer',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ea580c',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  });

  if (!result.isConfirmed) return;

  try {
    const response = await fetch(`${API_URL}/organizaciones/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    await cargarOrganizaciones();

    Swal.fire({
      icon: 'success',
      title: 'Correcto',
      text: data.mensaje
    });

  } catch (error) {
    console.error(error);
  }
}

function limpiarFormulario() {
  document.getElementById('nit').value = '';
  document.getElementById('nombreEntidad').value = '';
  document.getElementById('razonSocial').value = '';
  document.getElementById('tipoEntidad').value = '';
  document.getElementById('telefono').value = '';
  document.getElementById('correo').value = '';
  document.getElementById('direccion').value = '';
}