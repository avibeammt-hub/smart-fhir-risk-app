const express = require('express');

const router = express.Router();

const {
    listarOrganizaciones,
    crearOrganizacion,
    actualizarOrganizacion,
    eliminarOrganizacion
} = require('./organizaciones.controller');


// ============================
// RUTAS
// ============================

router.get('/', listarOrganizaciones);

router.post('/', crearOrganizacion);

router.put('/:id', actualizarOrganizacion);

router.delete('/:id', eliminarOrganizacion);


module.exports = router;