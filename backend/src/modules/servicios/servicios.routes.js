const express = require('express');
const router = express.Router();

const {
  listarServicios,
  listarSedesActivas,
  crearServicio,
  actualizarServicio,
  eliminarServicio
} = require('./servicios.controller');

const { validarToken } = require('../../middlewares/auth.middleware');

router.get('/', validarToken, listarServicios);
router.get('/sedes', validarToken, listarSedesActivas);
router.post('/', validarToken, crearServicio);
router.put('/:id', validarToken, actualizarServicio);
router.delete('/:id', validarToken, eliminarServicio);

module.exports = router;