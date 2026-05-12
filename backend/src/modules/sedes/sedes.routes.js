const express = require('express');

const router = express.Router();

const {
  listarSedes,
  listarEntidadesActivas,
  crearSede,
  actualizarSede,
  eliminarSede
} = require('./sedes.controller');

const { validarToken } = require('../../middlewares/auth.middleware');

router.get('/', validarToken, listarSedes);

router.get('/entidades', validarToken, listarEntidadesActivas);

router.post('/', validarToken, crearSede);

router.put('/:id', validarToken, actualizarSede);

router.delete('/:id', validarToken, eliminarSede);

module.exports = router;