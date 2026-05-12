const API_URL = 'http://localhost:3001/api';

const token = localStorage.getItem('token');

const usuario = JSON.parse(
  localStorage.getItem('usuario') || 'null'
);

if (!token || !usuario) {
  window.location.href = './login.html';
}

document.getElementById('nombreUsuario').textContent = usuario.nombre_completo;
document.getElementById('rolUsuario').textContent = usuario.rol;


const contenidoPrincipal = document.getElementById('contenidoPrincipal');
const loaderGlobal = document.getElementById('loaderGlobal');
const moduloTitulo = document.getElementById('moduloTitulo');
const moduloEtiqueta = document.getElementById('moduloEtiqueta');

const titulosModulo = {
  inicio: {
    etiqueta: 'Panel clínico interoperable',
    titulo: 'Dashboard de riesgo en salud'
  },
  organizaciones: {
    etiqueta: 'Administración',
    titulo: 'Gestión de organizaciones'
  },
  sedes: {
    etiqueta: 'Administración',
    titulo: 'Puntos de atención'
  },
  usuarios: {
    etiqueta: 'Administración',
    titulo: 'Creacion Usuarios'
  },
  servicios: {
    etiqueta: 'Administración',
    titulo: 'Servicios clínicos'
  },
  profesionales: {
    etiqueta: 'Talento humano',
    titulo: 'Profesionales de salud'
  },
  vinculos: {
    etiqueta: 'Talento humano',
    titulo: 'Asignación profesionales'
  },
  pacientes: {
    etiqueta: 'Gestión clínica',
    titulo: 'Pacientes'
  },
  valoracion: {
    etiqueta: 'Valoración clínica',
    titulo: 'Nueva valoración de riesgo'
  },
  'fhir-viewer': {
    etiqueta: 'Interoperabilidad',
    titulo: 'FHIR Viewer'
  }
};

async function cargarVista(nombreVista) {
  try {
    loaderGlobal.classList.remove('d-none');

    const response = await fetch(`./views/${nombreVista}.html`);

    if (!response.ok) {
      contenidoPrincipal.innerHTML = `
        <div class="panel">
          <h4>Módulo en construcción</h4>
          <p>La vista <strong>${nombreVista}</strong> aún no está creada.</p>
        </div>
      `;
      return;
    }

    const html = await response.text();

    contenidoPrincipal.innerHTML = html;

    actualizarMenu(nombreVista);
    actualizarTitulo(nombreVista);

    if (nombreVista === 'inicio') {
      cargarDashboard();
    }

    if (nombreVista === 'organizaciones') {
      inicializarOrganizaciones();
    }
	
	if (nombreVista === 'sedes') {
		inicializarSedes();
	}
	
	if (nombreVista === 'servicios') {
	  inicializarServicios();
	}
	
	if (nombreVista === 'profesionales') {
	  inicializarProfesionales();
	}
	
	if (nombreVista === 'vinculos') {
	  inicializarVinculos();
	}
	
	if (nombreVista === 'pacientes') {
	  inicializarPacientes();
	}
	
	if (nombreVista === 'valoracion') {
	  inicializarValoracion();
	}
	
	if (nombreVista === 'usuarios') {
	  inicializarUsuarios();
	}
	
	if (nombreVista === 'fhir-viewer') {
	  inicializarFhirViewer();
    }	

  } catch (error) {
    console.error(error);

    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No fue posible cargar el módulo'
    });

  } finally {
    loaderGlobal.classList.add('d-none');
  }
}

function actualizarMenu(nombreVista) {
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');

    if (item.dataset.view === nombreVista) {
      item.classList.add('active');
    }
  });
}

function actualizarTitulo(nombreVista) {
  const data = titulosModulo[nombreVista];

  if (!data) return;

  moduloEtiqueta.textContent = data.etiqueta;
  moduloTitulo.textContent = data.titulo;
}

document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();

    const vista = item.dataset.view;

    cargarVista(vista);
  });
});

async function cargarDashboard() {
  try {
    const response = await fetch(`${API_URL}/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.mensaje);
    }

    document.getElementById('kpiPacientes').textContent =
      data.indicadores.pacientes;

    document.getElementById('kpiRiesgoAlto').textContent =
      data.indicadores.riesgo_alto;

    document.getElementById('kpiValoraciones').textContent =
      data.indicadores.valoraciones;

    document.getElementById('kpiFhir').textContent =
      data.indicadores.fhir_enviados;

    const container = document.getElementById('ultimosPacientes');

    if (container) {
      container.innerHTML = '';

      data.ultimosPacientes.forEach(paciente => {
        container.innerHTML += `
          <div class="patient-item">
            <div class="patient-avatar">
              <i class="bi bi-person-fill"></i>
            </div>

            <div class="patient-info">
              <strong>${paciente.nombres} ${paciente.apellidos}</strong>
              <span>${paciente.numero_documento}</span>
            </div>
          </div>
        `;
      });
    }

  } catch (error) {
    console.error(error);
  }
}

function validarMenusPorRol() {

  const rol = (usuario.rol || '').toUpperCase();

  // SOLO MÉDICO
  if (rol === 'PROFESIONAL_CLINICO') {

    document.querySelectorAll('.menu-item').forEach(item => {

      const vista = item.dataset.view;

      // SOLO valoración
      if (vista !== 'valoracion') {
        item.style.display = 'none';
      }

    });

    // abrir valoración automáticamente
    cargarVista('valoracion');
  }
}

function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');

  window.location.href = './login.html';
}

//cargarVista('inicio');
if ((usuario.rol || '').toUpperCase() === 'PROFESIONAL_CLINICO') {
  validarMenusPorRol();
} else {
  cargarVista('inicio');
}