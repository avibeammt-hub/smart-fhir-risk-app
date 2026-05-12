const db = require('../../config/db');

const obtenerPacientes = async () => {
    const [rows] = await db.query(`
        SELECT *
        FROM cli_pacientes
        ORDER BY id_paciente DESC
    `);

    return rows;
};

const crearPaciente = async (data) => {

    const [result] = await db.query(`
        INSERT INTO cli_pacientes (
            tipo_documento,
            numero_documento,
            nombres,
            apellidos,
            sexo,
            fecha_nacimiento,
            telefono,
            correo,
            direccion,
            codigo_fhir,
            uuid_fhir,
            activo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
        data.tipo_documento,
        data.numero_documento,
        data.nombres,
        data.apellidos,
        data.sexo,
        data.fecha_nacimiento,
        data.telefono,
        data.correo,
        data.direccion,
        data.codigo_fhir,
        data.uuid_fhir
    ]);

    return result.insertId;
};

const actualizarPaciente = async (id, data) => {

    await db.query(`
        UPDATE cli_pacientes
        SET
            tipo_documento = ?,
            numero_documento = ?,
            nombres = ?,
            apellidos = ?,
            sexo = ?,
            fecha_nacimiento = ?,
            telefono = ?,
            correo = ?,
            direccion = ?
        WHERE id_paciente = ?
    `, [
        data.tipo_documento,
        data.numero_documento,
        data.nombres,
        data.apellidos,
        data.sexo,
        data.fecha_nacimiento,
        data.telefono,
        data.correo,
        data.direccion,
        id
    ]);
};

const eliminarPaciente = async (id) => {

    await db.query(`
        DELETE FROM cli_pacientes
        WHERE id_paciente = ?
    `, [id]);
};

module.exports = {
    obtenerPacientes,
    crearPaciente,
    actualizarPaciente,
    eliminarPaciente
};