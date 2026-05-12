require('dotenv').config();

const app = require('./src/app');
const probarConexion = require('./src/config/probar-conexion');

const PORT = process.env.PORT || 3001;

probarConexion();

app.listen(PORT, () => {
  console.log(`
========================================
 SMART FHIR RISK APP
 Backend ejecutándose
 Puerto: ${PORT}
========================================
  `);
});