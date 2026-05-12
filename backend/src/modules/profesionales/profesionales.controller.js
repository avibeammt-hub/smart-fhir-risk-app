const pool = require('../../config/db');

const {
  crearResourceFHIR
} = require('../../services/fhir.service');

const {
  construirPractitionerFHIR
} = require('../../mappers/practitioner.mapper');

const listarProfesionales = async (req, res) => {
  try {

    const [rows] = await pool.query(`
      SELECT *
      FROM cli_profesionales
      ORDER BY id_profesional DESC
    `);

    res.json({
      ok: true,
      data: rows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error consultando profesionales'
    });
  }
};

const crearProfesional = async (req, res) => {

  const conexion = await pool.getConnection();

  try {

    await conexion.beginTransaction();

    const {
      tipo_documento,
      numero_documento,
      nombres,
      apellidos,
      especialidad,
      tarjeta_profesional,
      telefono,
      correo
    } = req.body;

    const [result] = await conexion.query(`
      INSERT INTO cli_profesionales (
        tipo_documento,
        numero_documento,
        nombres,
        apellidos,
        especialidad,
        tarjeta_profesional,
        telefono,
        correo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tipo_documento,
      numero_documento,
      nombres,
      apellidos,
      especialidad,
      tarjeta_profesional,
      telefono,
      correo
    ]);

    const idProfesional = result.insertId;

    const codigoFHIR = `PR-${String(idProfesional).padStart(5, '0')}`;

    await conexion.query(`
      UPDATE cli_profesionales
      SET codigo_fhir = ?
      WHERE id_profesional = ?
    `, [codigoFHIR, idProfesional]);

    const recursoFHIR = construirPractitionerFHIR({
      codigo_fhir: codigoFHIR,
      numero_documento,
      nombres,
      apellidos,
      especialidad,
      tarjeta_profesional,
      telefono,
      correo,
      activo: 1
    });

    const respuestaFHIR = await crearResourceFHIR(
      'Practitioner',
      recursoFHIR
    );

    if (!respuestaFHIR.ok) {
      throw new Error('Error enviando Practitioner a FHIR');
    }

    await conexion.query(`
      UPDATE cli_profesionales
      SET
        uuid_fhir = ?,
        fecha_sync_fhir = NOW()
      WHERE id_profesional = ?
    `, [
      respuestaFHIR.data.id,
      idProfesional
    ]);

    await conexion.commit();

    res.json({
      ok: true,
      mensaje: 'Profesional creado y sincronizado con FHIR',
      id: idProfesional
    });

  } catch (error) {

    await conexion.rollback();

    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: error.message
    });

  } finally {
    conexion.release();
  }
};

const actualizarProfesional = async (req, res) => {

  const conexion = await pool.getConnection();

  try {

    await conexion.beginTransaction();

    const { id } = req.params;

    const {
      tipo_documento,
      numero_documento,
      nombres,
      apellidos,
      especialidad,
      tarjeta_profesional,
      telefono,
      correo,
      activo
    } = req.body;

    const [[profesionalActual]] = await conexion.query(`
      SELECT *
      FROM cli_profesionales
      WHERE id_profesional = ?
      LIMIT 1
    `, [id]);

    if (!profesionalActual) {
      throw new Error('El profesional no existe');
    }

    const codigoFHIR =
      profesionalActual.codigo_fhir ||
      `PR-${String(id).padStart(5, '0')}`;

    await conexion.query(`
      UPDATE cli_profesionales
      SET
        tipo_documento = ?,
        numero_documento = ?,
        nombres = ?,
        apellidos = ?,
        especialidad = ?,
        tarjeta_profesional = ?,
        telefono = ?,
        correo = ?,
        activo = ?,
        codigo_fhir = ?
      WHERE id_profesional = ?
    `, [
      tipo_documento,
      numero_documento,
      nombres,
      apellidos,
      especialidad,
      tarjeta_profesional,
      telefono,
      correo,
      activo,
      codigoFHIR,
      id
    ]);

    const recursoFHIR = construirPractitionerFHIR({
      codigo_fhir: codigoFHIR,
      numero_documento,
      nombres,
      apellidos,
      especialidad,
      tarjeta_profesional,
      telefono,
      correo,
      activo
    });

    const respuestaFHIR = await crearResourceFHIR(
      'Practitioner',
      recursoFHIR
    );

    if (!respuestaFHIR.ok) {
      throw new Error('Error actualizando Practitioner en FHIR');
    }

    await conexion.query(`
      UPDATE cli_profesionales
      SET
        uuid_fhir = ?,
        fecha_sync_fhir = NOW()
      WHERE id_profesional = ?
    `, [
      respuestaFHIR.data.id,
      id
    ]);

    await conexion.commit();

    res.json({
      ok: true,
      mensaje: 'Profesional actualizado correctamente'
    });

  } catch (error) {

    await conexion.rollback();

    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: error.message
    });

  } finally {
    conexion.release();
  }
};

const eliminarProfesional = async (req, res) => {
  try {

    const { id } = req.params;

    await pool.query(`
      DELETE FROM cli_profesionales
      WHERE id_profesional = ?
    `, [id]);

    res.json({
      ok: true,
      mensaje: 'Profesional eliminado correctamente'
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'No se puede eliminar el profesional'
    });
  }
};

module.exports = {
  listarProfesionales,
  crearProfesional,
  actualizarProfesional,
  eliminarProfesional
};