const construirRiskAssessmentFHIR = (data) => ({
  resourceType: 'RiskAssessment',
  status: 'final',
  subject: {
    reference: `Patient/${data.uuid_patient}`
  },
  encounter: {
    reference: `Encounter/${data.uuid_encounter}`
  },
  occurrenceDateTime: data.fecha_evaluacion,
  prediction: [
    {
      outcome: {
        text: data.riesgo_global
      },
      qualitativeRisk: {
        text: data.riesgo_global
      }
    }
  ],
  note: [
    {
      text: data.recomendacion_general || ''
    }
  ]
});

module.exports = { construirRiskAssessmentFHIR };