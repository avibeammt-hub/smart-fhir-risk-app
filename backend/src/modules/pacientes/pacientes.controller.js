const {
    obtenerPacientes,
    crearPaciente,
    actualizarPaciente,
    eliminarPaciente
} = require('./pacientes.model');

const { crearResourceFHIR } = require('../../services/fhir.service');

const {
    construirPatientFHIR
} = require('../../mappers/patient.mapper');

const listarPacientes = async (req, res) => {

    try {

        const pacientes = await obtenerPacientes();

        res.json(pacientes);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
};

const crearNuevoPaciente = async (req, res) => {

    try {

        const body = req.body;

        const recursoFHIR = construirPatientFHIR({
            ...body,
            activo: 1
        });

        const respuestaFHIR = await crearResourceFHIR(
            'Patient',
            recursoFHIR
        );

        const idFHIR = respuestaFHIR.data.id;
		
		if (!idFHIR) {
			throw new Error('FHIR no retornó ID del Patient');
		}

        const codigoFHIR =
            'PAT-' + String(idFHIR).padStart(5, '0');

        const idPaciente = await crearPaciente({
            ...body,
            codigo_fhir: codigoFHIR,
            uuid_fhir: idFHIR
        });

        res.json({
            ok: true,
            id_paciente: idPaciente,
            codigo_fhir: codigoFHIR,
            uuid_fhir: idFHIR
        });

    } catch (error) {

        console.error('FHIR ERROR:', error);

        res.status(500).json({
            error: error.message
        });
    }
};

const editarPaciente = async (req, res) => {

    try {

        await actualizarPaciente(
            req.params.id,
            req.body
        );

        res.json({
            ok: true
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
};

const borrarPaciente = async (req, res) => {

    try {

        await eliminarPaciente(req.params.id);

        res.json({
            ok: true
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
};

module.exports = {
    listarPacientes,
    crearNuevoPaciente,
    editarPaciente,
    borrarPaciente
};