const pool = require('../../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    const { usuario, clave } = req.body;

    if (!usuario || !clave) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Usuario y contraseña son obligatorios'
      });
    }

    const [rows] = await pool.query(`
	  SELECT 
		u.id_usuario,
		u.usuario,
		u.clave_hash,
		u.nombre_completo,
		u.correo,
		u.activo,
		u.id_profesional,

		vp.id_servicio AS id_servicio_clinico,
		vp.id_organizacion AS id_entidad,
		vp.id_sede AS id_punto_atencion,

		r.nombre_rol
	  FROM seg_usuarios u
	  INNER JOIN seg_roles r 
		ON r.id_rol = u.id_rol
	  LEFT JOIN cli_vinculos_profesionales vp
		ON vp.id_profesional = u.id_profesional
		AND vp.activo = 1
		AND CURDATE() BETWEEN vp.fecha_inicio AND vp.fecha_fin
	  WHERE u.usuario = ?
	  ORDER BY vp.fecha_inicio DESC
	  LIMIT 1
	`, [usuario]);

    if (rows.length === 0) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Credenciales inválidas'
      });
    }

    const user = rows[0];

    if (!user.activo) {
      return res.status(403).json({
        ok: false,
        mensaje: 'Usuario inactivo'
      });
    }

    const passwordValido = await bcrypt.compare(clave, user.clave_hash);

    if (!passwordValido) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Credenciales inválidas'
      });
    }

    const token = jwt.sign(
	  {
		id_usuario: user.id_usuario,
		usuario: user.usuario,
		nombre_completo: user.nombre_completo,

		id_profesional: user.id_profesional,
		id_servicio_clinico: user.id_servicio_clinico,
		id_entidad: user.id_entidad,
		id_punto_atencion: user.id_punto_atencion,

		rol: user.nombre_rol
	  },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await pool.query(`
      UPDATE seg_usuarios
      SET ultimo_ingreso = NOW()
      WHERE id_usuario = ?
    `, [user.id_usuario]);

    res.json({
	  ok: true,
	  mensaje: 'Login correcto',
	  token,
	  usuario: {
		id_usuario: user.id_usuario,
		usuario: user.usuario,
		nombre_completo: user.nombre_completo,
		correo: user.correo,

		id_profesional: user.id_profesional,
		id_servicio_clinico: user.id_servicio_clinico,
		id_entidad: user.id_entidad,
		id_punto_atencion: user.id_punto_atencion,

		rol: user.nombre_rol
	  }
	});

  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error en login'
    });
  }
};

module.exports = {
  login
};