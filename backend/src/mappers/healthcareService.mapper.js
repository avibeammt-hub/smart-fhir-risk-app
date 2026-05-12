const construirHealthcareServiceFHIR = (servicio) => {
  
	return {
		resourceType: 'HealthcareService',
			
			meta: {
					tag: 
						[
							{
								system: 'https://fhirrisk.local/project',
								code: 'smart-fhir-risk-app'
							}
						]
			},
		
		
		
		active: servicio.activo == 1,

			identifier: [
							  {
								system: 'https://fhirrisk.local/servicio-clinico',
								value: servicio.codigo_fhir
							  },
							  {
								system: 'https://fhirrisk.local/codigo-servicio',
								value: servicio.codigo_servicio
							  }
						],

							providedBy: {
							  reference: `Organization/${servicio.uuid_organizacion}`
							},

			location:   [
							  {
								reference: `Location/${servicio.uuid_location}`
							  }
						],

		name: servicio.nombre_servicio,

		comment: servicio.descripcion || '',

			type: 		[
							  {
								text: servicio.nombre_servicio
							  }
						]
	};
};

module.exports = {
  construirHealthcareServiceFHIR
};