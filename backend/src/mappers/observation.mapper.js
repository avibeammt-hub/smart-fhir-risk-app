const construirObservationFHIR = (obs) => ({
  resourceType: 'Observation',
  status: 'final',
  code: {
    coding: obs.codigo
      ? [
          {
            system: obs.sistema_codigo || 'http://loinc.org',
            code: obs.codigo,
            display: obs.nombre_observacion
          }
        ]
      : [],
    text: obs.nombre_observacion
  },
  subject: {
    reference: `Patient/${obs.uuid_patient}`
  },
  encounter: {
    reference: `Encounter/${obs.uuid_encounter}`
  },
  effectiveDateTime: obs.fecha_observacion,
  valueQuantity:
    obs.valor_numerico !== null && obs.valor_numerico !== undefined && obs.valor_numerico !== ''
      ? {
          value: Number(obs.valor_numerico),
          unit: obs.unidad || ''
        }
      : undefined,
  valueString:
    obs.valor_texto && !obs.valor_numerico
      ? obs.valor_texto
      : undefined
});

module.exports = { construirObservationFHIR };