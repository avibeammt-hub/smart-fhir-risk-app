const pool = require('../../config/db');

const obtenerDashboard = async (req, res) => {

    try {

        // ==========================
        // PACIENTES
        // ==========================

        const [[pacientes]] = await pool.query(`
            SELECT COUNT(*) total
            FROM cli_pacientes
        `);

        // ==========================
        // RIESGO ALTO
        // ==========================

        const [[riesgoAlto]] = await pool.query(`
            SELECT COUNT(*) total
            FROM riesgo_evaluaciones
            WHERE UPPER(riesgo_global) = 'ALTO'
        `);

        // ==========================
        // VALORACIONES
        // ==========================

        const [[valoraciones]] = await pool.query(`
            SELECT COUNT(*) total
            FROM atn_contactos_clinicos
        `);

        // ==========================
        // FHIR ENVIADOS
        // ==========================

        const [[fhirEnviados]] = await pool.query(`
            SELECT COUNT(*) total
            FROM int_recursos_fhir
            WHERE estado_sincronizacion = 'ENVIADO'
        `);

        // ==========================
        // PENDIENTES
        // ==========================

        const [[fhirPendientes]] = await pool.query(`
            SELECT COUNT(*) total
            FROM int_recursos_fhir
            WHERE estado_sincronizacion = 'PENDIENTE'
        `);

        // ==========================
        // ERRORES
        // ==========================

        const [[fhirErrores]] = await pool.query(`
            SELECT COUNT(*) total
            FROM int_recursos_fhir
            WHERE estado_sincronizacion = 'ERROR'
        `);

        // ==========================
        // ÚLTIMOS PACIENTES
        // ==========================

        const [ultimosPacientes] = await pool.query(`
            SELECT
                nombres,
                apellidos,
                numero_documento,
                fecha_creacion
            FROM cli_pacientes
            ORDER BY id_paciente DESC
            LIMIT 5
        `);

        res.json({
            ok: true,

            indicadores: {
                pacientes: pacientes.total,
                riesgo_alto: riesgoAlto.total,
                valoraciones: valoraciones.total,
                fhir_enviados: fhirEnviados.total,
                fhir_pendientes: fhirPendientes.total,
                fhir_errores: fhirErrores.total
            },

            ultimosPacientes

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error cargando dashboard'
        });

    }

};

module.exports = {
    obtenerDashboard
};