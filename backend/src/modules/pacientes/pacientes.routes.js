const express = require('express');

const router = express.Router();

const {
    listarPacientes,
    crearNuevoPaciente,
    editarPaciente,
    borrarPaciente
} = require('./pacientes.controller');

router.get('/', listarPacientes);

router.post('/', crearNuevoPaciente);

router.put('/:id', editarPaciente);

router.delete('/:id', borrarPaciente);

module.exports = router;