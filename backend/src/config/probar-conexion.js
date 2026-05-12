const pool = require('./db');

const probarConexion = async () => {

  try {

    const conexion = await pool.getConnection();

    console.log('✅ MySQL conectado correctamente');

    conexion.release();

  } catch (error) {

    console.error('❌ Error conexión MySQL');
    console.error(error);

  }

};

module.exports = probarConexion;