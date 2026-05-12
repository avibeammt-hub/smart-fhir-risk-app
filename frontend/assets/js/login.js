//const API_URL = 'http://localhost:3001/api';
const API_URL = 'https://smart-fhir-risk-app.onrender.com/api';

const formLogin = document.getElementById('formLogin');

formLogin.addEventListener('submit', async (e) => {

    e.preventDefault();

    const usuario = document.getElementById('usuario').value;
    const clave = document.getElementById('clave').value;

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

        if(!data.ok){

            Swal.fire({
                icon:'error',
                title:'Error',
                text:data.mensaje
            });

            return;
        }

        localStorage.setItem('token', data.token);

        localStorage.setItem('usuario', JSON.stringify(data.usuario));

        Swal.fire({
            icon:'success',
            title:'Bienvenido',
            text:data.usuario.nombre_completo,
            timer:1500,
            showConfirmButton:false
        });

        setTimeout(() => {
            window.location.href = './dashboard.html';
        }, 1500);

    } catch (error) {

        console.error(error);

        Swal.fire({
            icon:'error',
            title:'Error',
            text:'No fue posible conectar con el servidor'
        });

    }

});