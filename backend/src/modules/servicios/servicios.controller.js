const pool = require('../../config/db');
const { crearResourceFHIR } = require('../../services/fhir.service');
const { construirHealthcareServiceFHIR } = require('../../mappers/healthcareService.mapper');

const listarServicios = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.*,
        e.nombre_entidad,
        e.uuid_fhir AS uuid_organizacion,
        p.nombre_punto,
        p.uuid_fhir AS uuid_location
      FROM red_servicios_clinicos s
      INNER JOIN red_entidades_salud e ON e.id_entidad = s.id_entidad
      INNER JOIN red_puntos_atencion p ON p.id_punto_atencion = s.id_punto_atencion
      ORDER BY s.id_servicio_clinico DESC
    `);

    res.json({ ok: true, data: rows });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error listando servicios clínicos'
    });
  }
};

const listarSedesActivas = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id_punto_atencion,
        p.id_entidad,
        p.nombre_punto,
        p.codigo_habilitacion,
        p.uuid_fhir,
        e.nombre_entidad
      FROM red_puntos_atencion p
      INNER JOIN red_entidades_salud e ON e.id_entidad = p.id_entidad
      WHERE p.activo = 1
      ORDER BY e.nombre_entidad, p.nombre_punto
    `);

    res.json({ ok: true, data: rows });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error consultando puntos de atención'
    });
  }
};

const crearServicio = async (req, res) => {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const {
      id_entidad,
      id_punto_atencion,
      codigo_servicio,
      nombre_servicio,
      descripcion,
      nivel_atencion
    } = req.body;

    const [[entidad]] = await conexion.query(`
      SELECT *
      FROM red_entidades_salud
      WHERE id_entidad = ?
      LIMIT 1
    `, [id_entidad]);

    if (!entidad || !entidad.uuid_fhir) {
      throw new Error('La organización no está sincronizada con FHIR');
    }

    const [[sede]] = await conexion.query(`
      SELECT *
      FROM red_puntos_atencion
      WHERE id_punto_atencion = ?
      LIMIT 1
    `, [id_punto_atencion]);

    if (!sede || !sede.uuid_fhir) {
      throw new Error('El punto de atención no está sincronizado con FHIR');
    }

    const [result] = await conexion.query(`
      INSERT INTO red_servicios_clinicos (
        id_entidad,
        id_punto_atencion,
        codigo_servicio,
        nombre_servicio,
        descripcion,
        nivel_atencion
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      id_entidad,
      id_punto_atencion,
      codigo_servicio,
      nombre_servicio,
      descripcion,
      nivel_atencion
    ]);

    const idServicio = result.insertId;
    const codigoFHIR = `HS-${String(idServicio).padStart(5, '0')}`;

    await conexion.query(`
      UPDATE red_servicios_clinicos
      SET codigo_fhir = ?
      WHERE id_servicio_clinico = ?
    `, [codigoFHIR, idServicio]);

    const recursoFHIR = construirHealthcareServiceFHIR({
      codigo_fhir: codigoFHIR,
      codigo_servicio,
      nombre_servicio,
      descripcion,
      nivel_atencion,
      activo: 1,
      uuid_organizacion: entidad.uuid_fhir,
      uuid_location: sede.uuid_fhir
    });

    const respuestaFHIR = await crearResourceFHIR('HealthcareService', recursoFHIR);

    if (!respuestaFHIR.ok) {
      throw new Error(
        typeof respuestaFHIR.error === 'string'
          ? respuestaFHIR.error
          : JSON.stringify(respuestaFHIR.error)
      );
    }

    await conexion.query(`
      UPDATE red_servicios_clinicos
      SET uuid_fhir = ?, fecha_sync_fhir = NOW()
      WHERE id_servicio_clinico = ?
    `, [respuestaFHIR.data.id, idServicio]);

    await conexion.commit();

    res.json({
      ok: true,
      mensaje: 'Servicio clínico creado y sincronizado con FHIR',
      id: idServicio,
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

const actualizarServicio = async (req, res) => {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const { id } = req.params;

    const {
      id_entidad,
      id_punto_atencion,
      codigo_servicio,
      nombre_servicio,
      descripcion,
      nivel_atencion,
      activo
    } = req.body;

    const [[servicioActual]] = await conexion.query(`
      SELECT *
      FROM red_servicios_clinicos
      WHERE id_servicio_clinico = ?
      LIMIT 1
    `, [id]);

    if (!servicioActual) {
      throw new Error('El servicio clínico no existe');
    }

    const [[entidad]] = await conexion.query(`
      SELECT *
      FROM red_entidades_salud
      WHERE id_entidad = ?
      LIMIT 1
    `, [id_entidad]);

    if (!entidad || !entidad.uuid_fhir) {
      throw new Error('La organización no está sincronizada con FHIR');
    }

    const [[sede]] = await conexion.query(`
      SELECT *
      FROM red_puntos_atencion
      WHERE id_punto_atencion = ?
      LIMIT 1
    `, [id_punto_atencion]);

    if (!sede || !sede.uuid_fhir) {
      throw new Error('El punto de atención no está sincronizado con FHIR');
    }

    const codigoFHIR = servicioActual.codigo_fhir || `HS-${String(id).padStart(5, '0')}`;

    await conexion.query(`
      UPDATE red_servicios_clinicos
      SET
        id_entidad = ?,
        id_punto_atencion = ?,
        codigo_servicio = ?,
        nombre_servicio = ?,
        descripcion = ?,
        nivel_atencion = ?,
        codigo_fhir = ?,
        activo = ?
      WHERE id_servicio_clinico = ?
    `, [
      id_entidad,
      id_punto_atencion,
      codigo_servicio,
      nombre_servicio,
      descripcion,
      nivel_atencion,
      codigoFHIR,
      activo,
      id
    ]);

    const recursoFHIR = construirHealthcareServiceFHIR({
      codigo_fhir: codigoFHIR,
      codigo_servicio,
      nombre_servicio,
      descripcion,
      nivel_atencion,
      activo,
      uuid_organizacion: entidad.uuid_fhir,
      uuid_location: sede.uuid_fhir
    });

    const respuestaFHIR = await crearResourceFHIR('HealthcareService', recursoFHIR);

    if (!respuestaFHIR.ok) {
      throw new Error('Error sincronizando HealthcareService en FHIR');
    }

    await conexion.query(`
      UPDATE red_servicios_clinicos
      SET uuid_fhir = ?, fecha_sync_fhir = NOW()
      WHERE id_servicio_clinico = ?
    `, [respuestaFHIR.data.id, id]);

    await conexion.commit();

    res.json({
      ok: true,
      mensaje: 'Servicio clínico actualizado y sincronizado con FHIR'
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

const eliminarServicio = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(`
      DELETE FROM red_servicios_clinicos
      WHERE id_servicio_clinico = ?
    `, [id]);

    res.json({
      ok: true,
      mensaje: 'Servicio clínico eliminado correctamente'
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'No se puede eliminar. Puede tener profesionales asociados.'
    });
  }
};

module.exports = {
  listarServicios,
  listarSedesActivas,
  crearServicio,
  actualizarServicio,
  eliminarServicio
};