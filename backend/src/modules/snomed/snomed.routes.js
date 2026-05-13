const express = require('express');
const router = express.Router();

const {
  buscarConceptosSnomed
} = require('./snomed.controller');

router.get('/buscar', buscarConceptosSnomed);

module.exports = router;