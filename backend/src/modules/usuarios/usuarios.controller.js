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
      INNER JOIN seg_roles r ON r.id_rol = u.id_rol
      LEFT JOIN cli_profesionales p ON p.id_profesional = u.id_profesional
      ORDER BY u.id_usuario DESC
    `);

    res.json({ ok: true, data: usuarios });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: 'Error listando usuarios' });
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
        id_profesional,
        activo,
        debe_cambiar_clave,
        bloqueado,
        intentos_fallidos,
        fecha_creacion
      )
      VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0, 0, NOW())
    `, [
      usuario,
      hash,
      nombre_completo,
      correo,
      id_rol,
      id_profesional || null
    ]);

    res.json({ ok: true, mensaje: 'Usuario creado correctamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: 'Error creando usuario' });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      usuario,
      nombre_completo,
      correo,
      id_rol,
      id_profesional
    } = req.body;

    await pool.query(`
      UPDATE seg_usuarios
      SET
        usuario = ?,
        nombre_completo = ?,
        correo = ?,
        id_rol = ?,
        id_profesional = ?
      WHERE id_usuario = ?
    `, [
      usuario,
      nombre_completo,
      correo,
      id_rol,
      id_profesional || null,
      id
    ]);

    res.json({ ok: true, mensaje: 'Usuario actualizado correctamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: 'Error actualizando usuario' });
  }
};

const cambiarEstadoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    await pool.query(`
      UPDATE seg_usuarios
      SET activo = ?
      WHERE id_usuario = ?
    `, [
      activo ? 1 : 0,
      id
    ]);

    res.json({
      ok: true,
      mensaje: activo ? 'Usuario activado correctamente' : 'Usuario inactivado correctamente'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: 'Error cambiando estado del usuario' });
  }
};

const cambiarClaveUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { clave } = req.body;

    const hash = await bcrypt.hash(clave, 10);

    await pool.query(`
      UPDATE seg_usuarios
      SET clave_hash = ?, debe_cambiar_clave = 0
      WHERE id_usuario = ?
    `, [
      hash,
      id
    ]);

    res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: 'Error actualizando contraseña' });
  }
};

module.exports = {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  cambiarClaveUsuario
};