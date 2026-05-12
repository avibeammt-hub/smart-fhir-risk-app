const express = require('express');

const router = express.Router();

const {
  listarProfesionales,
  crearProfesional,
  actualizarProfesional,
  eliminarProfesional
} = require('./profesionales.controller');

const {
  validarToken
} = require('../../middlewares/auth.middleware');

router.get('/', validarToken, listarProfesionales);

router.post('/', validarToken, crearProfesional);

router.put('/:id', validarToken, actualizarProfesional);

router.delete('/:id', validarToken, eliminarProfesional);

module.exports = router;