const construirPractitionerRoleFHIR = (vinculo) => {
  return {
    resourceType: 'PractitionerRole',
	
	resourceType:'Organization',
		
		meta: {
				tag: 
					[
						{
							system: 'https://fhirrisk.local/project',
							code: 'smart-fhir-risk-app'
						}
					]
		},
    active: vinculo.activo == 1,

    practitioner: {
      reference: `Practitioner/${vinculo.uuid_practitioner}`
    },

    organization: {
      reference: `Organization/${vinculo.uuid_organization}`
    },

    location: [
      {
        reference: `Location/${vinculo.uuid_location}`
      }
    ],

    healthcareService: [
      {
        reference: `HealthcareService/${vinculo.uuid_healthcare_service}`
      }
    ],

    code: [
      {
        text: vinculo.cargo || 'Profesional clínico'
      }
    ],

    specialty: vinculo.especialidad
      ? [{ text: vinculo.especialidad }]
      : []
  };
};

module.exports = {
  construirPractitionerRoleFHIR
};