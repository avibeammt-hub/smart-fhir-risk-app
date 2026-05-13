const express = require('express');
const cors = require('cors');

const authRoutes = require('./modules/auth/auth.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const organizacionesRoutes = require('./modules/organizaciones/organizaciones.routes');
const sedesRoutes = require('./modules/sedes/sedes.routes');
const serviciosRoutes = require('./modules/servicios/servicios.routes');
const profesionalesRoutes = require('./modules/profesionales/profesionales.routes');
const vinculosRoutes = require('./modules/vinculos/vinculos.routes');
const pacientesRoutes = require('./modules/pacientes/pacientes.routes');
const valoracionRoutes = require('./modules/valoracion/valoracion.routes');
const usuariosRoutes = require('./modules/usuarios/usuarios.routes');
const fhirViewerRoutes = require('./modules/fhir-viewer/fhir-viewer.routes');
const snomedRoutes = require('./modules/snomed/snomed.routes');

const app = express();

app.use(cors());

app.use(express.json({
  limit: '50mb'
}));

app.use(express.urlencoded({
  extended: true
}));

app.get('/', (req, res) => {
  res.json({
    ok: true,
    sistema: 'SMART FHIR RISK APP',
    version: '1.0.0',
    estado: 'Backend funcionando correctamente'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/organizaciones', organizacionesRoutes);
app.use('/api/sedes', sedesRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/profesionales', profesionalesRoutes);
app.use('/api/vinculos', vinculosRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/valoracion', valoracionRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/fhir-viewer', fhirViewerRoutes);
app.use('/api/snomed', snomedRoutes);

module.exports = app;
