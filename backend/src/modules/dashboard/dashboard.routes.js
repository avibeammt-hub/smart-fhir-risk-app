const express = require('express');

const router = express.Router();

const {
    obtenerDashboard
} = require('./dashboard.controller');

const {
    validarToken
} = require('../../middlewares/auth.middleware');

router.get(
    '/',
    validarToken,
    obtenerDashboard
);

module.exports = router;