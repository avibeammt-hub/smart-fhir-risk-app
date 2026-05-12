const pool = require('../../config/db');
const bcrypt = require('bcryptjs');

const listarUsuarios = async (req, res) => {
  try {

    const [usuarios] = await pool.query(`
      SELECT
        u.id_usuario,
        u.usuario,
        u.nombre_completo,
        u.correo,
        u.activo,
        u.bloqueado,
        u.debe_cambiar_clave,

        r.id_rol,
        r.nombre_rol,

        p.id_profesional,
        CONCAT(p.nombres, ' ', p.apellidos) AS profesional

      FROM seg_usuarios u

      INNER JOIN seg_roles r
        ON r.id_rol = u.id_rol

      LEFT JOIN cli_profesionales p
        ON p.id_profesional = u.id_profesional

      ORDER BY u.id_usuario DESC
    `);

    res.json({
      ok: true,
      data: usuarios
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error listando usuarios'
    });

  }
};

const crearUsuario = async (req, res) => {

  try {

    const {
      usuario,
      clave,
      nombre_completo,
      correo,
      id_rol,
      id_profesional
    } = req.body;

    const hash = await bcrypt.hash(clave, 10);

    await pool.query(`
      INSERT INTO seg_usuarios
      (
        usuario,
        clave_hash,
        nombre_completo,
        correo,
        id_rol,
        id_profesional
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      usuario,
      hash,
      nombre_completo,
      correo,
      id_rol,
      id_profesional || null
    ]);

    res.json({
      ok: true,
      mensaje: 'Usuario creado correctamente'
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error creando usuario'
    });

  }

};

module.exports = {
  listarUsuarios,
  crearUsuario
};