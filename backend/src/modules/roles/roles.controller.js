const pool = require('../config/db');

const listarRoles = async (req, res) => {

  try {

    const [rows] = await pool.query(`
      SELECT
        id_rol,
        nombre_rol,
        descripcion,
        activo
      FROM seg_roles
      ORDER BY nombre_rol
    `);

    res.json({
      ok: true,
      data: rows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error cargando roles'
    });

  }

};

module.exports = {
  listarRoles
};