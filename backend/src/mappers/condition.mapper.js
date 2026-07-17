const construirConditionFHIR = ({
  uuid_patient,
  uuid_encounter,
  concept_id,
  termino,
  tipo_diagnostico
}) => {
  return {
    resourceType: 'Condition',

    meta: {
      tag: [
        {
          system: 'https://fhirrisk.local/project',
          code: 'smart-fhir-risk-app'
        }
      ]
    },

    clinicalStatus: {
      coding: [
        {
          system:
            'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
          display: 'Active'
        }
      ]
    },

    verificationStatus: {
      coding: [
        {
          system:
            'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
          display: 'Confirmed'
        }
      ]
    },

    category: [
      {
        coding: [
          {
            system:
              'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'encounter-diagnosis',
            display: 'Encounter Diagnosis'
          }
        ]
      }
    ],

    code: {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: concept_id,
          display: termino
        }
      ],
      text: termino
    },

    subject: {
      reference: `Patient/${uuid_patient}`
    },

    encounter: {
      reference: `Encounter/${uuid_encounter}`
    },

    note: [
      {
        text: `Tipo diagnóstico: ${tipo_diagnostico}`
      }
    ]
  };
};

module.exports = {
  construirConditionFHIR
};