let modalVinculo = null;

let catalogosVinculo = {
  profesionales: [],
  organizaciones: [],
  sedes: [],
  servicios: []
};

function inicializarVinculos() {

  const modalElement =
    document.getElementById('modalVinculo');

  if (modalElement) {
    modalVinculo =
      new bootstrap.Modal(modalElement);
  }

  cargarVinculos();
}

async function cargarVinculos() {

  try {

    const response = await fetch(
      `${API_URL}/vinculos`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    pintarVinculos(data.data || []);

  } catch (error) {

    console.error(error);

  }

}

function pintarVinculos(lista) {

  const tbody =
    document.getElementById('tbodyVinculos');

  if (!tbody) return;

  tbody.innerHTML = '';

  if (!lista.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted py-4">
            class="text-center text-muted py-4">

          No hay vínculos registrados

        </td>
      </tr>
    `;

    return;
  }

  lista.forEach(v => {

    tbody.innerHTML += `
	  <tr>
		<td>
		  <strong>${v.nombres} ${v.apellidos}</strong>
		  <div class="text-muted small">${v.especialidad || ''}</div>
		</td>

		<td><strong>${v.nombre_entidad}</strong></td>

		<td>${v.nombre_punto}</td>

		<td>${v.nombre_servicio}</td>

		<td>${v.cargo || ''}</td>

		<td>
		  <span class="fhir-code">
			${v.codigo_fhir || 'PRROLE-' + String(v.id_vinculo).padStart(5, '0')}
		  </span>
		</td>

		<td>
		  <span class="uuid-chip">${v.uuid_fhir || 'Sin UUID'}</span>
		</td>

		<td>
		  ${
			v.uuid_fhir
			  ? `<span class="estado-badge estado-activo">FHIR OK</span>`
			  : `<span class="estado-badge estado-inactivo">Sin FHIR</span>`
		  }
		</td>

		<td>
		  <div class="d-flex gap-2">
			<button class="btn-table btn-edit" onclick='editarVinculo(${JSON.stringify(v)})'>
			  <i class="bi bi-pencil-fill"></i>
			</button>

			<button class="btn-table btn-delete" onclick="eliminarVinculo(${v.id_vinculo})">
			  <i class="bi bi-trash-fill"></i>
			</button>
		  </div>
		</td>
	  </tr>
	`;
  });
}

async function abrirModalCrearVinculo() {

  await cargarCatalogosVinculo();

  limpiarFormularioVinculo();

  modalVinculo.show();
}

async function cargarCatalogosVinculo() {

  const response = await fetch(
    `${API_URL}/vinculos/catalogos`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.mensaje);
  }

  catalogosVinculo = data.data;

  pintarSelectProfesionales();
  pintarSelectOrganizaciones();
  pintarSelectSedes();
  pintarSelectServicios();
}

function pintarSelectProfesionales() {

  const select =
    document.getElementById('idProfesionalVinculo');

  select.innerHTML = `
    <option value="">Seleccione</option>
  `;

  catalogosVinculo.profesionales.forEach(p => {

    select.innerHTML += `
      <option value="${p.id_profesional}">
        ${p.nombres} ${p.apellidos}
        - ${p.especialidad || ''}
      </option>
    `;
  });
}

function pintarSelectOrganizaciones() {

  const select =
    document.getElementById('idOrganizacionVinculo');

  select.innerHTML = `
    <option value="">Seleccione</option>
  `;

  catalogosVinculo.organizaciones.forEach(o => {

    select.innerHTML += `
      <option value="${o.id_entidad}">
        ${o.nombre_entidad}
      </option>
    `;
  });
}

function pintarSelectSedes() {

  const select =
    document.getElementById('idSedeVinculo');

  select.innerHTML = `
    <option value="">Seleccione</option>
  `;

  catalogosVinculo.sedes.forEach(s => {

    select.innerHTML += `
      <option value="${s.id_punto_atencion}">
        ${s.nombre_punto}
      </option>
    `;
  });
}

function pintarSelectServicios() {

  const select =
    document.getElementById('idServicioVinculo');

  select.innerHTML = `
    <option value="">Seleccione</option>
  `;

  catalogosVinculo.servicios.forEach(s => {

    select.innerHTML += `
      <option value="${s.id_servicio_clinico}">
        ${s.nombre_servicio}
      </option>
    `;
  });
}

async function guardarVinculo() {

  try {

    const payload = {

      id_profesional:
        document.getElementById('idProfesionalVinculo').value,

      id_organizacion:
        document.getElementById('idOrganizacionVinculo').value,

      id_sede:
        document.getElementById('idSedeVinculo').value,

      id_servicio:
        document.getElementById('idServicioVinculo').value,

      cargo:
        document.getElementById('cargoVinculo').value,

      modalidad:
        document.getElementById('modalidadVinculo').value,

      fecha_inicio:
        document.getElementById('fechaInicioVinculo').value,

      fecha_fin:
        document.getElementById('fechaFinVinculo').value

    };

    const response = await fetch(
      `${API_URL}/vinculos`,
      {
        method: 'POST',

        headers: {
          'Content-Type':'application/json',
          Authorization:`Bearer ${token}`
        },

        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.mensaje);
    }

    modalVinculo.hide();

    await cargarVinculos();

    Swal.fire({
      icon:'success',
      title:'Correcto',
      text:data.mensaje,
      timer:1800,
      showConfirmButton:false
    });

  } catch (error) {

    Swal.fire({
      icon:'error',
      title:'Error',
      text:error.message
    });

  }

}

async function editarVinculo(v) {
  await cargarCatalogosVinculo();

  document.getElementById('idProfesionalVinculo').value = v.id_profesional;
  document.getElementById('idOrganizacionVinculo').value = v.id_organizacion;
  document.getElementById('idSedeVinculo').value = v.id_sede;
  document.getElementById('idServicioVinculo').value = v.id_servicio;
  document.getElementById('cargoVinculo').value = v.cargo || '';
  document.getElementById('modalidadVinculo').value = v.modalidad || '';
  document.getElementById('fechaInicioVinculo').value = v.fecha_inicio ? v.fecha_inicio.substring(0, 10) : '';
  document.getElementById('fechaFinVinculo').value = v.fecha_fin ? v.fecha_fin.substring(0, 10) : '';

  Swal.fire({
    icon: 'info',
    title: 'Edición pendiente',
    text: 'Ya abrimos los datos. Falta conectar el endpoint PUT para actualizar vínculos.',
    timer: 1800,
    showConfirmButton: false
  });

  modalVinculo.show();
}

async function eliminarVinculo(id) {

  const result = await Swal.fire({
    title:'¿Eliminar vínculo?',
    text:'Esta acción no se puede deshacer',
    icon:'warning',
    showCancelButton:true,
    confirmButtonColor:'#ea580c',
    cancelButtonColor:'#64748b',
    confirmButtonText:'Eliminar',
    cancelButtonText:'Cancelar'
  });

  if (!result.isConfirmed) return;

  const response = await fetch(
    `${API_URL}/vinculos/${id}`,
    {
      method:'DELETE',
      headers:{
        Authorization:`Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  await cargarVinculos();

  Swal.fire({
    icon:data.ok ? 'success' : 'error',
    title:data.ok ? 'Correcto' : 'Error',
    text:data.mensaje
  });
}

function limpiarFormularioVinculo() {

  document.getElementById('cargoVinculo').value = '';
  document.getElementById('modalidadVinculo').value = '';
  document.getElementById('fechaInicioVinculo').value = '';
  document.getElementById('fechaFinVinculo').value = '';
}