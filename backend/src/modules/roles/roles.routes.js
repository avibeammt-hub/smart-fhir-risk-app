const express = require('express');
const router = express.Router();

const {
  listarRoles
} = require('../roles.controller');

router.get('/', listarRoles);

module.exports = router;