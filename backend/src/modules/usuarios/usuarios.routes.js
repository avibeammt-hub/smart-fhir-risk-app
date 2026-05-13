const express = require('express');
const router = express.Router();

const {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  cambiarClaveUsuario
} = require('./usuarios.controller');

router.get('/', listarUsuarios);
router.post('/', crearUsuario);
router.put('/:id', actualizarUsuario);
router.patch('/:id/estado', cambiarEstadoUsuario);
router.patch('/:id/clave', cambiarClaveUsuario);

module.exports = router;