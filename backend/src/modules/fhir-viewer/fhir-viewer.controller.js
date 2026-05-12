const axios = require('axios');

const FHIR_BASE_URL =
  process.env.FHIR_BASE_URL || 'http://localhost:8085/fhir';

const recursosPermitidos = [
  'Patient',
  'Observation',
  'Encounter',
  'RiskAssessment',
  'Practitioner',
  'Organization',
  'Location',
  'HealthcareService'
];

const consultarRecursos = async (req, res) => {
  try {
    const { resourceType } = req.params;
    const { q } = req.query;

    if (!recursosPermitidos.includes(resourceType)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Recurso FHIR no permitido'
      });
    }

    let url = `${FHIR_BASE_URL}/${resourceType}?_count=50&_tag=https://fhirrisk.local/project|smart-fhir-risk-app;

    if (q) {
      if (resourceType === 'Patient') {
        url = `${FHIR_BASE_URL}/Patient?identifier=${encodeURIComponent(q)}&_count=50`;
      } else if (['Observation', 'Encounter', 'RiskAssessment'].includes(resourceType)) {
        url = `${FHIR_BASE_URL}/${resourceType}?subject=Patient/${encodeURIComponent(q)}&_count=50`;
      } else {
        url = `${FHIR_BASE_URL}/${resourceType}/${encodeURIComponent(q)}`;
      }
    }

    const response = await axios.get(url, {
      headers: {
        Accept: 'application/fhir+json'
      }
    });

    let data = [];

    if (response.data.resourceType === 'Bundle') {
      data = response.data.entry || [];
    } else {
      data = [{ resource: response.data }];
    }

    res.json({
      ok: true,
      data
    });

  } catch (error) {
    console.error(error?.response?.data || error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error consultando recursos FHIR'
    });
  }
};

const consultarLineaClinicaPaciente = async (req, res) => {
  try {
    const { idPaciente } = req.params;

    const headers = {
      Accept: 'application/fhir+json'
    };

    const [encounters, observations, risks] = await Promise.all([
      axios.get(`${FHIR_BASE_URL}/Encounter?subject=Patient/${idPaciente}&_count=100`, { headers }),
      axios.get(`${FHIR_BASE_URL}/Observation?subject=Patient/${idPaciente}&_count=100`, { headers }),
      axios.get(`${FHIR_BASE_URL}/RiskAssessment?subject=Patient/${idPaciente}&_count=100`, { headers })
    ]);

    res.json({
      ok: true,
      data: {
        idPaciente,
        encounters: encounters.data.entry || [],
        observations: observations.data.entry || [],
        riskAssessments: risks.data.entry || []
      }
    });

  } catch (error) {
    console.error(error?.response?.data || error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error consultando línea clínica FHIR'
    });
  }
};

module.exports = {
  consultarRecursos,
  consultarLineaClinicaPaciente
};