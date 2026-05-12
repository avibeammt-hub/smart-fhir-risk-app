const construirLocationFHIR = (sede) => {
  return {
    resourceType: 'Location',
    status: sede.activo == 1 ? 'active' : 'inactive',
    name: sede.nombre_punto,
    description: sede.tipo_punto || 'Punto de atención',
    identifier: [
      {
        system: 'https://fhirrisk.local/location-code',
        value: sede.codigo_fhir
      },
      {
        system: 'https://fhirrisk.local/codigo-habilitacion',
        value: sede.codigo_habilitacion
      }
    ],
    telecom: sede.telefono
      ? [
          {
            system: 'phone',
            value: sede.telefono
          }
        ]
      : [],
    address: {
      text: sede.direccion || '',
      city: sede.ciudad || '',
      state: sede.departamento || '',
      country: 'CO'
    },
    managingOrganization: {
      reference: `Organization/${sede.uuid_organizacion}`
    }
  };
};

module.exports = {
  construirLocationFHIR
};