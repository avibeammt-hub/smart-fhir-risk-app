// const API_URL = 'http://localhost:3001/api';
const API_URL = 'https://smart-fhir-risk-app.onrender.com/api';

const formLogin = document.getElementById('formLogin');

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();

  const btnLogin = document.getElementById('btnLogin');

  if (Loading.isButtonLoading(btnLogin)) {
    return;
  }

  const usuario = document.getElementById('usuario').value.trim();
  const clave = document.getElementById('clave').value;

  Loading.showButton(btnLogin, 'Validando credenciales...');

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usuario,
        clave
      })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      Loading.hideButton(btnLogin);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: data.mensaje || 'Credenciales inválidas'
      });

      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));

    Swal.fire({
      icon: 'success',
      title: 'Bienvenido',
      text: data.usuario.nombre_completo,
      timer: 1500,
      showConfirmButton: false
    });

    setTimeout(() => {
      window.location.href = './dashboard.html';
    }, 1500);

  } catch (error) {
    Loading.hideButton(btnLogin);

    console.error(error);

    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No fue posible conectar con el servidor'
    });
  }
});