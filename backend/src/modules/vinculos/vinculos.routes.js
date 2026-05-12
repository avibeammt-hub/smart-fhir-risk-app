const express = require('express');

const router = express.Router();

const {
  listarVinculos,
  listarCatalogosVinculo,
  crearVinculo,
  eliminarVinculo
} = require('./vinculos.controller');

const {
  validarToken
} = require('../../middlewares/auth.middleware');

router.get('/', validarToken, listarVinculos);

router.get('/catalogos', validarToken, listarCatalogosVinculo);

router.post('/', validarToken, crearVinculo);

router.delete('/:id', validarToken, eliminarVinculo);

module.exports = router;