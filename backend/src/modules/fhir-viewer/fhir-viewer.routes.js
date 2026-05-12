const express = require('express');
const router = express.Router();

const {
  consultarRecursos,
  consultarLineaClinicaPaciente
} = require('./fhir-viewer.controller');

router.get('/paciente/:idPaciente/linea-clinica', consultarLineaClinicaPaciente);
router.get('/:resourceType', consultarRecursos);


module.exports = router;