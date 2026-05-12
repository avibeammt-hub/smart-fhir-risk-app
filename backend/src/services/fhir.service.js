const axios = require('axios');

const FHIR_BASE_URL =
    process.env.FHIR_BASE_URL ||
    'http://localhost:8080/fhir';


// ============================================
// CREAR RESOURCE
// ============================================

const crearResourceFHIR = async (
    resourceType,
    resource
) => {

    try {

        const response = await axios.post(

            `${FHIR_BASE_URL}/${resourceType}`,

            resource,

            {
                headers: {
                    'Content-Type':'application/fhir+json'
                }
            }

        );

        return {
            ok:true,
            data:response.data
        };

    } catch (error) {

        console.error(
            'FHIR ERROR:',
            error.response?.data || error.message
        );

        return {
            ok:false,
            error:error.response?.data || error.message
        };

    }

};


module.exports = {
    crearResourceFHIR
};