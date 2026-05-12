const express = require('express');

const router = express.Router();

const {
  listarCatalogosValoracion,
  crearValoracion,
  listarBandejaPacientes,
  obtenerTimelinePaciente
} = require('./valoracion.controller');

const {
  validarToken
} = require('../../middlewares/auth.middleware');

router.get('/bandeja', validarToken, listarBandejaPacientes);
router.get('/catalogos', validarToken, listarCatalogosValoracion);
router.get('/timeline/:idPaciente', validarToken, obtenerTimelinePaciente);

router.post('/', validarToken, crearValoracion);


module.exports = router;