const jwt = require('jsonwebtoken');

const validarToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Token no enviado'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = decoded;

    next();

  } catch (error) {
    return res.status(401).json({
      ok: false,
      mensaje: 'Token inválido o expirado'
    });
  }
};

const validarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tiene permisos para esta acción'
      });
    }

    next();
  };
};

module.exports = {
  validarToken,
  validarRol
};