const construirEncounterFHIR = (data) => ({
  resourceType: 'Encounter',
		
		meta: {
				tag: 
					[
						{
							system: 'https://fhirrisk.local/project',
							code: 'smart-fhir-risk-app'
						}
					]
		},
  status: 'finished',
  class: {
    system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
    code: 'AMB',
    display: 'Ambulatory'
  },
  subject: {
    reference: `Patient/${data.uuid_patient}`
  },
  participant: [
    {
      individual: {
        reference: `Practitioner/${data.uuid_practitioner}`
      }
    }
  ],
  serviceProvider: {
    reference: `Organization/${data.uuid_organization}`
  },
  location: [
    {
      location: {
        reference: `Location/${data.uuid_location}`
      }
    }
  ],
  serviceType: {
    text: data.nombre_servicio
  },
  period: {
    start: data.fecha_contacto
  },
  reasonCode: [
    {
      text: data.motivo_consulta
    }
  ]
});

module.exports = { construirEncounterFHIR };