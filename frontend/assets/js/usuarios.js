const API_USUARIOS = 'https://smart-fhir-risk-app.onrender.com/api/usuarios';
const API_PROFESIONALES = 'https://smart-fhir-risk-app.onrender.com/api/profesionales';

let modalUsuario = null;
let usuariosMemoria = [];
let usuarioEditando = null;

async function inicializarUsuarios() {
  modalUsuario = new bootstrap.Modal(document.getElementById('modalUsuario'));

  await cargarRoles();
  await cargarProfesionales();
  await listarUsuarios();

  const buscador = document.getElementById('txtBuscarUsuario');
  if (buscador) {
    buscador.addEventListener('input', () => pintarUsuarios());
  }
}

async function listarUsuarios() {
  try {
    const respuesta = await fetch(API_USUARIOS);
    const data = await respuesta.json();

    if (!data.ok) throw new Error(data.mensaje || 'Error cargando usuarios');

    usuariosMemoria = data.data || [];
    pintarUsuarios();

  } catch (error) {
    console.error(error);
    Swal.fire('Error', 'No fue posible cargar usuarios', 'error');
  }
}

function pintarUsuarios() {
  const tbody = document.getElementById('tbodyUsuarios');
  const filtro = document.getElementById('txtBuscarUsuario')?.value.toLowerCase() || '';

  const usuarios = usuariosMemoria.filter(u =>
    `${u.usuario} ${u.nombre_completo} ${u.correo} ${u.nombre_rol} ${u.profesional}`
      .toLowerCase()
      .includes(filtro)
  );

  if (!usuarios.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          No hay usuarios registrados
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = usuarios.map(usuario => `
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
            ? '<span class="estado-badge estado-activo">Activo</span>'
            : '<span class="estado-badge estado-inactivo">Inactivo</span>'
        }
      </td>
      <td>
        <div class="d-flex gap-2">
          <button class="btn-table btn-edit" onclick="editarUsuario(${usuario.id_usuario})" title="Editar">
            <i class="bi bi-pencil-fill"></i>
          </button>

          <button class="btn-table btn-edit" onclick="abrirCambioClave(${usuario.id_usuario})" title="Cambiar clave">
            <i class="bi bi-key-fill"></i>
          </button>

          <button 
            class="btn-table ${usuario.activo ? 'btn-delete' : 'btn-edit'}" 
            onclick="cambiarEstadoUsuario(${usuario.id_usuario}, ${usuario.activo ? 0 : 1})"
            title="${usuario.activo ? 'Inactivar' : 'Activar'}">
            <i class="bi ${usuario.activo ? 'bi-person-x-fill' : 'bi-person-check-fill'}"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function cargarRoles() {
  const roles = [
    { id_rol: 1, nombre_rol: 'ADMINISTRADOR' },
    { id_rol: 2, nombre_rol: 'PROFESIONAL_CLINICO' },
    { id_rol: 3, nombre_rol: 'AUDITOR' }
  ];

  const select = document.getElementById('usrRol');
  select.innerHTML = `<option value="">Seleccione...</option>`;

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

    const token = localStorage.getItem('token');

    const respuesta = await fetch(API_PROFESIONALES, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await respuesta.json();

    const profesionales = Array.isArray(data)
      ? data
      : (data.data || []);

    const select = document.getElementById('usrProfesional');
	
	

    select.innerHTML = `
      <option value="">Seleccione...</option>
    `;

    profesionales
      .filter(p => p.activo == 1)
      .forEach(item => {

        select.innerHTML += `
          <option value="${item.id_profesional}">
            ${item.nombres} ${item.apellidos}
          </option>
        `;

      });

  } catch (error) {

    console.error(error);

    Swal.fire(
      'Error',
      'No fue posible cargar profesionales',
      'error'
    );

  }

}

async function abrirModalUsuario() {

  usuarioEditando = null;
  limpiarFormularioUsuario();

  document.getElementById('tituloModalUsuario').textContent = 'Crear usuario';
  document.getElementById('usrClave').disabled = false;
  document
    .getElementById('grupoClaveUsuario')
    .classList.remove('d-none');

  await cargarProfesionales();
  controlarProfesionalUsuario();
  modalUsuario.show();

}

function editarUsuario(idUsuario) {
  const usuario = usuariosMemoria.find(u => u.id_usuario === idUsuario);
  if (!usuario) return;

  usuarioEditando = usuario;

  document.getElementById('tituloModalUsuario').textContent = 'Editar usuario';
  document.getElementById('usrUsuario').value = usuario.usuario || '';
  document.getElementById('usrNombre').value = usuario.nombre_completo || '';
  document.getElementById('usrCorreo').value = usuario.correo || '';
  document.getElementById('usrRol').value = usuario.id_rol || '';
  document.getElementById('usrProfesional').value = usuario.id_profesional || '';

  document.getElementById('grupoClaveUsuario').classList.add('d-none');
  document.getElementById('usrClave').value = '';

  controlarProfesionalUsuario();
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
      nombre_completo: document.getElementById('usrNombre').value.trim(),
      correo: document.getElementById('usrCorreo').value.trim(),
      id_rol: parseInt(document.getElementById('usrRol').value),
      id_profesional:
        rolTexto === 'PROFESIONAL_CLINICO'
          ? document.getElementById('usrProfesional').value || null
          : null
    };

    if (!usuarioEditando) {
      body.clave = document.getElementById('usrClave').value.trim();
    }

    if (!body.usuario || !body.nombre_completo || !body.id_rol) {
      throw new Error('Complete los campos obligatorios');
    }

    if (!usuarioEditando && !body.clave) {
      throw new Error('Ingrese la contraseña inicial');
    }

    if (rolTexto === 'PROFESIONAL_CLINICO' && !body.id_profesional) {
      throw new Error('Seleccione el profesional clínico');
    }

    const url = usuarioEditando
      ? `${API_USUARIOS}/${usuarioEditando.id_usuario}`
      : API_USUARIOS;

    const method = usuarioEditando ? 'PUT' : 'POST';

    const respuesta = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await respuesta.json();

    if (!data.ok) {
      throw new Error(data.mensaje || 'Error guardando usuario');
    }

    Swal.fire({
      icon: 'success',
      title: usuarioEditando ? 'Usuario actualizado' : 'Usuario creado',
      text: data.mensaje,
      timer: 1500,
      showConfirmButton: false
    });

    modalUsuario.hide();
    await listarUsuarios();

  } catch (error) {
    Swal.fire('Error', error.message, 'error');
  }
}

async function cambiarEstadoUsuario(idUsuario, activo) {
  const confirmar = await Swal.fire({
    icon: 'question',
    title: activo ? '¿Activar usuario?' : '¿Inactivar usuario?',
    text: activo
      ? 'El usuario podrá ingresar nuevamente al sistema.'
      : 'El usuario no podrá ingresar al sistema.',
    showCancelButton: true,
    confirmButtonText: activo ? 'Activar' : 'Inactivar',
    cancelButtonText: 'Cancelar'
  });

  if (!confirmar.isConfirmed) return;

  try {
    const respuesta = await fetch(`${API_USUARIOS}/${idUsuario}/estado`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ activo })
    });

    const data = await respuesta.json();

    if (!data.ok) throw new Error(data.mensaje);

    Swal.fire({
      icon: 'success',
      title: 'Estado actualizado',
      text: data.mensaje,
      timer: 1400,
      showConfirmButton: false
    });

    await listarUsuarios();

  } catch (error) {
    Swal.fire('Error', error.message, 'error');
  }
}

async function abrirCambioClave(idUsuario) {
  const usuario = usuariosMemoria.find(u => u.id_usuario === idUsuario);
  if (!usuario) return;

  const { value: clave } = await Swal.fire({
    title: `Cambiar clave`,
    text: usuario.usuario,
    input: 'password',
    inputPlaceholder: 'Nueva contraseña',
    showCancelButton: true,
    confirmButtonText: 'Actualizar',
    cancelButtonText: 'Cancelar',
    inputValidator: value => {
      if (!value) return 'Ingrese una nueva contraseña';
      if (value.length < 6) return 'La contraseña debe tener mínimo 6 caracteres';
      return null;
    }
  });

  if (!clave) return;

  try {
    const respuesta = await fetch(`${API_USUARIOS}/${idUsuario}/clave`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ clave })
    });

    const data = await respuesta.json();

    if (!data.ok) throw new Error(data.mensaje);

    Swal.fire({
      icon: 'success',
      title: 'Contraseña actualizada',
      timer: 1500,
      showConfirmButton: false
    });

  } catch (error) {
    Swal.fire('Error', error.message, 'error');
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
    //.classList.add('d-none');
	.classList.remove('d-none');
}