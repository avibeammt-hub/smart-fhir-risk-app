const construirPatientFHIR = (paciente) => {

    return {
        resourceType: 'Patient',

        active: paciente.activo == 1,

        identifier: [
            {
                system: 'http://smartfhir.com/pacientes',
                value: paciente.numero_documento
            }
        ],

        name: [
            {
                family: paciente.apellidos,
                given: [paciente.nombres]
            }
        ],

        telecom: [
            {
                system: 'phone',
                value: paciente.telefono
            },
            {
                system: 'email',
                value: paciente.correo
            }
        ],

        gender:
            paciente.sexo === 'M'
                ? 'male'
                : paciente.sexo === 'F'
                    ? 'female'
                    : 'unknown',

        birthDate: paciente.fecha_nacimiento,

        address: [
            {
                text: paciente.direccion
            }
        ]
    };
};

module.exports = {
    construirPatientFHIR
};