const construirOrganizationFHIR = (
    organizacion
) => {

    return {

        resourceType:'Organization',

        active:true,

        identifier:[

            {
                system:'https://fhirrisk.local/organizations',
                value:organizacion.codigo_fhir
            },

            {
                system:'https://fhirrisk.local/nit',
                value:organizacion.nit
            }

        ],

        name:organizacion.nombre_entidad,

        telecom:[

            organizacion.telefono
            ?
            {
                system:'phone',
                value:organizacion.telefono
            }
            :
            null,

            organizacion.correo
            ?
            {
                system:'email',
                value:organizacion.correo
            }
            :
            null

        ].filter(Boolean),

        address:[

            {
                text:organizacion.direccion || ''
            }

        ]

    };

};

module.exports = {
    construirOrganizationFHIR
};