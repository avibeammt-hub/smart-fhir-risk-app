const API_USUARIOS = 'http://localhost:3001/api/usuarios';
const API_PROFESIONALES = 'http://localhost:3001/api/profesionales';

let modalUsuario = null;

async function inicializarUsuarios() {
  modalUsuario = new bootstrap.Modal(
    document.getElementById('modalUsuario')
  );

  await cargarRoles();
  await cargarProfesionales();
  await listarUsuarios();
}

async function listarUsuarios() {
  try {
    const respuesta = await fetch(API_USUARIOS);
    const data = await respuesta.json();

    const tbody = document.getElementById('tbodyUsuarios');
    tbody.innerHTML = '';

    const usuarios = data.data || [];

    if (!usuarios.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted py-4">
            No hay usuarios registrados
          </td>
        </tr>
      `;
      return;
    }

    usuarios.forEach(usuario => {
      tbody.innerHTML += `
        <tr>
          <td><strong>${usuario.usuario}</strong></td>
          <td>${usuario.nombre_completo || ''}</td>
          <td>${usuario.correo || ''}</td>
          <td>
            <span class="badge bg-primary">
              ${usuario.nombre_rol || ''}
            </span>
          </td>
          <td>${usuario.profesional || '-'}</td>
          <td>
            ${
              usuario.activo
                ? '<span class="badge bg-success">Activo</span>'
                : '<span class="badge bg-danger">Inactivo</span>'
            }
          </td>
        </tr>
      `;
    });

  } catch (error) {
    console.error(error);

    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No fue posible cargar usuarios'
    });
  }
}

async function cargarRoles() {
  const roles = [
    { id_rol: 1, nombre_rol: 'ADMINISTRADOR' },
    { id_rol: 2, nombre_rol: 'PROFESIONAL_CLINICO' },
    { id_rol: 3, nombre_rol: 'AUDITOR' }
  ];

  const select = document.getElementById('usrRol');

  select.innerHTML = `
    <option value="">Seleccione...</option>
  `;

  roles.forEach(rol => {
    select.innerHTML += `
      <option value="${rol.id_rol}">
        ${rol.nombre_rol}
      </option>
    `;
  });
}

async function cargarProfesionales() {
  try {
    const respuesta = await fetch(API_PROFESIONALES);
    const data = await respuesta.json();

    const profesionales = data.data || data || [];

    const select = document.getElementById('usrProfesional');

    select.innerHTML = `
      <option value="">Seleccione...</option>
    `;

    profesionales.forEach(item => {
      select.innerHTML += `
        <option value="${item.id_profesional}">
          ${item.nombres} ${item.apellidos}
        </option>
      `;
    });

  } catch (error) {
    console.error(error);
  }
}

function abrirModalUsuario() {
  limpiarFormularioUsuario();
  modalUsuario.show();
}

function controlarProfesionalUsuario() {
  const selectRol = document.getElementById('usrRol');

  const texto = selectRol.selectedOptions[0]
    ? selectRol.selectedOptions[0].textContent.trim().toUpperCase()
    : '';

  const grupo = document.getElementById('grupoProfesionalUsuario');
  const profesional = document.getElementById('usrProfesional');

  if (texto === 'PROFESIONAL_CLINICO') {
    grupo.classList.remove('d-none');
  } else {
    grupo.classList.add('d-none');
    profesional.value = '';
  }
}

async function guardarUsuario() {
  try {
    const rolTexto = document.getElementById('usrRol')
      .selectedOptions[0]
      ?.textContent
      .trim()
      .toUpperCase();

    const body = {
      usuario: document.getElementById('usrUsuario').value.trim(),
      clave: document.getElementById('usrClave').value.trim(),
      nombre_completo: document.getElementById('usrNombre').value.trim(),
      correo: document.getElementById('usrCorreo').value.trim(),
      id_rol: parseInt(document.getElementById('usrRol').value),
      id_profesional:
        rolTexto === 'PROFESIONAL_CLINICO'
          ? document.getElementById('usrProfesional').value || null
          : null
    };

    if (!body.usuario || !body.clave || !body.nombre_completo || !body.id_rol) {
      throw new Error('Complete los campos obligatorios');
    }

    if (rolTexto === 'PROFESIONAL_CLINICO' && !body.id_profesional) {
      throw new Error('Seleccione el profesional clínico');
    }

    const respuesta = await fetch(API_USUARIOS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await respuesta.json();

    if (!data.ok) {
      throw new Error(data.mensaje || 'Error creando usuario');
    }

    Swal.fire({
      icon: 'success',
      title: 'Usuario creado',
      text: data.mensaje || 'Usuario creado correctamente',
      timer: 1500,
      showConfirmButton: false
    });

    modalUsuario.hide();
    await listarUsuarios();

  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message
    });
  }
}

function limpiarFormularioUsuario() {
  document.getElementById('usrUsuario').value = '';
  document.getElementById('usrClave').value = '';
  document.getElementById('usrNombre').value = '';
  document.getElementById('usrCorreo').value = '';
  document.getElementById('usrRol').value = '';
  document.getElementById('usrProfesional').value = '';

  document
    .getElementById('grupoProfesionalUsuario')
    .classList.add('d-none');
}