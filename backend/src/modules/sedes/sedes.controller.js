const pool = require('../../config/db');

const { crearResourceFHIR } = require('../../services/fhir.service');

const { construirLocationFHIR } = require('../../mappers/location.mapper');

const listarSedes = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.*,
        e.nombre_entidad,
        e.uuid_fhir AS uuid_organizacion
      FROM red_puntos_atencion s
      INNER JOIN red_entidades_salud e ON e.id_entidad = s.id_entidad
      ORDER BY s.id_punto_atencion DESC
    `);

    res.json({
      ok: true,
      data: rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error listando puntos de atención'
    });
  }
};

const listarEntidadesActivas = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id_entidad, nombre_entidad, nit, uuid_fhir
      FROM red_entidades_salud
      WHERE activo = 1
      ORDER BY nombre_entidad ASC
    `);

    res.json({
      ok: true,
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error consultando organizaciones'
    });
  }
};

const crearSede = async (req, res) => {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const {
      id_entidad,
      codigo_habilitacion,
      nombre_punto,
      tipo_punto,
      ciudad,
      departamento,
      direccion,
      telefono
    } = req.body;

    const [[entidad]] = await conexion.query(
      `
      SELECT *
      FROM red_entidades_salud
      WHERE id_entidad = ?
      LIMIT 1
      `,
      [id_entidad]
    );

    if (!entidad) {
      throw new Error('La organización seleccionada no existe');
    }

    if (!entidad.uuid_fhir) {
      throw new Error('La organización no está sincronizada con FHIR');
    }

    const [result] = await conexion.query(
      `
      INSERT INTO red_puntos_atencion (
        id_entidad,
        codigo_habilitacion,
        nombre_punto,
        tipo_punto,
        ciudad,
        departamento,
        direccion,
        telefono
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id_entidad,
        codigo_habilitacion,
        nombre_punto,
        tipo_punto,
        ciudad,
        departamento,
        direccion,
        telefono
      ]
    );

    const idSede = result.insertId;

    const codigoFHIR = `LOC-${String(idSede).padStart(5, '0')}`;

    await conexion.query(
      `
      UPDATE red_puntos_atencion
      SET codigo_fhir = ?
      WHERE id_punto_atencion = ?
      `,
      [codigoFHIR, idSede]
    );

    const locationFHIR = construirLocationFHIR({
      codigo_fhir: codigoFHIR,
      codigo_habilitacion,
      nombre_punto,
      tipo_punto,
      ciudad,
      departamento,
      direccion,
      telefono,
      activo: 1,
      uuid_organizacion: entidad.uuid_fhir
    });

    const respuestaFHIR = await crearResourceFHIR('Location', locationFHIR);

    if (!respuestaFHIR.ok) {
      throw new Error('Error enviando Location a FHIR');
    }

    await conexion.query(
      `
      UPDATE red_puntos_atencion
      SET 
        uuid_fhir = ?,
        fecha_sync_fhir = NOW()
      WHERE id_punto_atencion = ?
      `,
      [respuestaFHIR.data.id, idSede]
    );

    await conexion.commit();

    res.json({
      ok: true,
      mensaje: 'Punto de atención creado y sincronizado con FHIR',
      id: idSede,
      codigo_fhir: codigoFHIR,
      uuid_fhir: respuestaFHIR.data.id
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

const actualizarSede = async (req, res) => {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const { id } = req.params;

    const {
      id_entidad,
      codigo_habilitacion,
      nombre_punto,
      tipo_punto,
      ciudad,
      departamento,
      direccion,
      telefono,
      activo
    } = req.body;

    const [[sedeActual]] = await conexion.query(
      `
      SELECT *
      FROM red_puntos_atencion
      WHERE id_punto_atencion = ?
      LIMIT 1
      `,
      [id]
    );

    if (!sedeActual) {
      throw new Error('El punto de atención no existe');
    }

    const [[entidad]] = await conexion.query(
      `
      SELECT *
      FROM red_entidades_salud
      WHERE id_entidad = ?
      LIMIT 1
      `,
      [id_entidad]
    );

    if (!entidad || !entidad.uuid_fhir) {
      throw new Error('La organización no está sincronizada con FHIR');
    }

    await conexion.query(
      `
      UPDATE red_puntos_atencion
      SET
        id_entidad = ?,
        codigo_habilitacion = ?,
        nombre_punto = ?,
        tipo_punto = ?,
        ciudad = ?,
        departamento = ?,
        direccion = ?,
        telefono = ?,
        activo = ?
      WHERE id_punto_atencion = ?
      `,
      [
        id_entidad,
        codigo_habilitacion,
        nombre_punto,
        tipo_punto,
        ciudad,
        departamento,
        direccion,
        telefono,
        activo,
        id
      ]
    );

    const codigoFHIR = sedeActual.codigo_fhir || `LOC-${String(id).padStart(5, '0')}`;

    if (!sedeActual.codigo_fhir) {
      await conexion.query(
        `
        UPDATE red_puntos_atencion
        SET codigo_fhir = ?
        WHERE id_punto_atencion = ?
        `,
        [codigoFHIR, id]
      );
    }

    const locationFHIR = construirLocationFHIR({
      codigo_fhir: codigoFHIR,
      codigo_habilitacion,
      nombre_punto,
      tipo_punto,
      ciudad,
      departamento,
      direccion,
      telefono,
      activo,
      uuid_organizacion: entidad.uuid_fhir
    });

    const respuestaFHIR = await crearResourceFHIR('Location', locationFHIR);

    if (!respuestaFHIR.ok) {
      throw new Error('Error actualizando Location en FHIR');
    }

    await conexion.query(
      `
      UPDATE red_puntos_atencion
      SET
        uuid_fhir = ?,
        fecha_sync_fhir = NOW()
      WHERE id_punto_atencion = ?
      `,
      [respuestaFHIR.data.id, id]
    );

    await conexion.commit();

    res.json({
      ok: true,
      mensaje: 'Punto de atención actualizado y sincronizado con FHIR',
      uuid_fhir: respuestaFHIR.data.id
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

const eliminarSede = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      DELETE FROM red_puntos_atencion
      WHERE id_punto_atencion = ?
      `,
      [id]
    );

    res.json({
      ok: true,
      mensaje: 'Punto de atención eliminado correctamente'
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'No se puede eliminar. Puede tener servicios asociados.'
    });
  }
};

module.exports = {
  listarSedes,
  listarEntidadesActivas,
  crearSede,
  actualizarSede,
  eliminarSede
};