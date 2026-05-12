const pool = require('../../config/db');

const {
    crearResourceFHIR
} = require('../../services/fhir.service');

const {
    construirOrganizationFHIR
} = require('../../mappers/organization.mapper');


// ==========================================
// LISTAR
// ==========================================

const listarOrganizaciones = async (req, res) => {

    try {

        const [rows] = await pool.query(`
            SELECT *
            FROM red_entidades_salud
            ORDER BY id_entidad DESC
        `);

        res.json({
            ok: true,
            data: rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error listando organizaciones'
        });

    }

};


// ==========================================
// CREAR
// ==========================================

const crearOrganizacion = async (req, res) => {

    const conexion = await pool.getConnection();

    try {

        await conexion.beginTransaction();

        const {
            nit,
            nombre_entidad,
            razon_social,
            tipo_entidad,
            telefono,
            correo,
            direccion
        } = req.body;

        // =====================================
        // INSERT MYSQL
        // =====================================

        const [result] = await conexion.query(`
        
            INSERT INTO red_entidades_salud (
                nit,
                nombre_entidad,
                razon_social,
                tipo_entidad,
                telefono,
                correo,
                direccion
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        
        `,[
            nit,
            nombre_entidad,
            razon_social,
            tipo_entidad,
            telefono,
            correo,
            direccion
        ]);

        const idEntidad = result.insertId;

        // =====================================
        // CODIGO FHIR
        // =====================================

        const codigoFHIR =
            `ORG-${String(idEntidad).padStart(5,'0')}`;

        await conexion.query(`
        
            UPDATE red_entidades_salud
            SET codigo_fhir = ?
            WHERE id_entidad = ?
        
        `,[
            codigoFHIR,
            idEntidad
        ]);

        // =====================================
        // RESOURCE FHIR
        // =====================================

        const organizationFHIR =
            construirOrganizationFHIR({

                nit,
                nombre_entidad,
                telefono,
                correo,
                direccion,
                codigo_fhir:codigoFHIR

            });

        // =====================================
        // ENVIAR A HAPI
        // =====================================

        const responseFHIR =
            await crearResourceFHIR(
                'Organization',
                organizationFHIR
            );

        if(!responseFHIR.ok){

            throw new Error(
                'Error enviando Organization a FHIR'
            );

        }

        const uuidFHIR =
            responseFHIR.data.id;

        // =====================================
        // GUARDAR UUID
        // =====================================

        await conexion.query(`
        
            UPDATE red_entidades_salud
            SET
                uuid_fhir = ?,
                fecha_sync_fhir = NOW()
            WHERE id_entidad = ?
        
        `,[
            uuidFHIR,
            idEntidad
        ]);

        // =====================================
        // COMMIT
        // =====================================

        await conexion.commit();

        res.json({

            ok:true,

            mensaje:
                'Organización creada y sincronizada con FHIR',

            id:idEntidad,

            uuid_fhir:uuidFHIR,

            codigo_fhir:codigoFHIR

        });

    } catch (error) {

        await conexion.rollback();

        console.error(error);

        res.status(500).json({

            ok:false,

            mensaje:error.message

        });

    } finally {

        conexion.release();

    }

};


// ==========================================
// ACTUALIZAR
// ==========================================

const actualizarOrganizacion = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            nit,
            nombre_entidad,
            razon_social,
            tipo_entidad,
            telefono,
            correo,
            direccion,
            activo
        } = req.body;

        await pool.query(`
            UPDATE red_entidades_salud
            SET
                nit = ?,
                nombre_entidad = ?,
                razon_social = ?,
                tipo_entidad = ?,
                telefono = ?,
                correo = ?,
                direccion = ?,
                activo = ?
            WHERE id_entidad = ?
        `, [
            nit,
            nombre_entidad,
            razon_social,
            tipo_entidad,
            telefono,
            correo,
            direccion,
            activo,
            id
        ]);

        res.json({
            ok: true,
            mensaje: 'Organización actualizada'
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error actualizando organización'
        });

    }

};


// ==========================================
// ELIMINAR
// ==========================================

const eliminarOrganizacion = async (req, res) => {

    try {

        const { id } = req.params;

        await pool.query(`
            DELETE FROM red_entidades_salud
            WHERE id_entidad = ?
        `, [id]);

        res.json({
            ok: true,
            mensaje: 'Organización eliminada'
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error eliminando organización'
        });

    }

};


module.exports = {
    listarOrganizaciones,
    crearOrganizacion,
    actualizarOrganizacion,
    eliminarOrganizacion
};