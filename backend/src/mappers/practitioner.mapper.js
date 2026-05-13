const construirPractitionerFHIR = (profesional) => {
  return {
    resourceType: 'Practitioner',
		
		meta: {
				tag: 
					[
						{
							system: 'https://fhirrisk.local/project',
							code: 'smart-fhir-risk-app'
						}
					]
		},

    active: profesional.activo == 1,

    identifier: [
      {
        system: 'https://fhirrisk.local/profesional',
        value: profesional.codigo_fhir
      },
      {
        system: 'https://fhirrisk.local/documento',
        value: profesional.numero_documento
      }
    ],

    name: [
      {
        use: 'official',
        family: profesional.apellidos,
        given: [
          profesional.nombres
        ]
      }
    ],

    telecom: [
      {
        system: 'phone',
        value: profesional.telefono,
        use: 'work'
      },
      {
        system: 'email',
        value: profesional.correo,
        use: 'work'
      }
    ],

    qualification: [
      {
        identifier: [
          {
            value: profesional.tarjeta_profesional
          }
        ],

        code: {
          text: profesional.especialidad
        }
      }
    ]
  };
};

module.exports = {
  construirPractitionerFHIR
};