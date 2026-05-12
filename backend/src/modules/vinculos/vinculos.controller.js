const pool = require('../../config/db');

const {
  crearResourceFHIR
} = require('../../services/fhir.service');

const {
  construirPractitionerRoleFHIR
} = require('../../mappers/practitionerRole.mapper');

const listarVinculos = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        v.*,

        p.nombres,
        p.apellidos,
        p.especialidad,
        p.uuid_fhir AS uuid_practitioner,

        o.nombre_entidad,
        o.uuid_fhir AS uuid_organization,

        s.nombre_punto,
        s.uuid_fhir AS uuid_location,

        sc.nombre_servicio,
        sc.uuid_fhir AS uuid_healthcare_service

      FROM cli_vinculos_profesionales v

      INNER JOIN cli_profesionales p
        ON p.id_profesional = v.id_profesional

      INNER JOIN red_entidades_salud o
        ON o.id_entidad = v.id_organizacion

      INNER JOIN red_puntos_atencion s
        ON s.id_punto_atencion = v.id_sede

      INNER JOIN red_servicios_clinicos sc
        ON sc.id_servicio_clinico = v.id_servicio

      ORDER BY v.id_vinculo DESC
    `);

    res.json({
      ok: true,
      data: rows
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error listando vínculos profesionales'
    });
  }
};

const listarCatalogosVinculo = async (req, res) => {
  try {
    const [profesionales] = await pool.query(`
      SELECT id_profesional, nombres, apellidos, especialidad, uuid_fhir
      FROM cli_profesionales
      WHERE activo = 1
      ORDER BY nombres, apellidos
    `);

    const [organizaciones] = await pool.query(`
      SELECT id_entidad, nombre_entidad, uuid_fhir
      FROM red_entidades_salud
      WHERE activo = 1
      ORDER BY nombre_entidad
    `);

    const [sedes] = await pool.query(`
      SELECT id_punto_atencion, id_entidad, nombre_punto, uuid_fhir
      FROM red_puntos_atencion
      WHERE activo = 1
      ORDER BY nombre_punto
    `);

    const [servicios] = await pool.query(`
      SELECT id_servicio_clinico, id_entidad, id_punto_atencion, nombre_servicio, uuid_fhir
      FROM red_servicios_clinicos
      WHERE activo = 1
      ORDER BY nombre_servicio
    `);

    res.json({
      ok: true,
      data: {
        profesionales,
        organizaciones,
        sedes,
        servicios
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error cargando catálogos del vínculo'
    });
  }
};

const crearVinculo = async (req, res) => {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const {
      id_profesional,
      id_organizacion,
      id_sede,
      id_servicio,
      cargo,
      modalidad,
      fecha_inicio,
      fecha_fin
    } = req.body;

    const [[data]] = await conexion.query(`
      SELECT
        p.uuid_fhir AS uuid_practitioner,
        p.especialidad,

        o.uuid_fhir AS uuid_organization,

        s.uuid_fhir AS uuid_location,

        sc.uuid_fhir AS uuid_healthcare_service

      FROM cli_profesionales p
      INNER JOIN red_entidades_salud o
        ON o.id_entidad = ?
      INNER JOIN red_puntos_atencion s
        ON s.id_punto_atencion = ?
      INNER JOIN red_servicios_clinicos sc
        ON sc.id_servicio_clinico = ?
      WHERE p.id_profesional = ?
      LIMIT 1
    `, [
      id_organizacion,
      id_sede,
      id_servicio,
      id_profesional
    ]);

    if (!data) {
      throw new Error('No fue posible validar los datos del vínculo');
    }

    if (!data.uuid_practitioner) {
      throw new Error('El profesional no está sincronizado con FHIR');
    }

    if (!data.uuid_organization) {
      throw new Error('La organización no está sincronizada con FHIR');
    }

    if (!data.uuid_location) {
      throw new Error('El punto de atención no está sincronizado con FHIR');
    }

    if (!data.uuid_healthcare_service) {
      throw new Error('El servicio clínico no está sincronizado con FHIR');
    }

    const [result] = await conexion.query(`
      INSERT INTO cli_vinculos_profesionales (
        id_profesional,
        id_organizacion,
        id_sede,
        id_servicio,
        cargo,
        modalidad,
        fecha_inicio,
        fecha_fin,
        activo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      id_profesional,
      id_organizacion,
      id_sede,
      id_servicio,
      cargo,
      modalidad,
      fecha_inicio || null,
      fecha_fin || null
    ]);

    const idVinculo = result.insertId;

    const codigoFHIR = `PRROLE-${String(idVinculo).padStart(5, '0')}`;

    await conexion.query(`
      UPDATE cli_vinculos_profesionales
      SET codigo_fhir = ?
      WHERE id_vinculo = ?
    `, [
      codigoFHIR,
      idVinculo
    ]);

    const recursoFHIR = construirPractitionerRoleFHIR({
      activo: 1,
      cargo,
      modalidad,
      fecha_inicio,
      fecha_fin,
      especialidad: data.especialidad,
      uuid_practitioner: data.uuid_practitioner,
      uuid_organization: data.uuid_organization,
      uuid_location: data.uuid_location,
      uuid_healthcare_service: data.uuid_healthcare_service
    });

    const respuestaFHIR = await crearResourceFHIR(
      'PractitionerRole',
      recursoFHIR
    );

    if (!respuestaFHIR.ok) {
      throw new Error(
        typeof respuestaFHIR.error === 'string'
          ? respuestaFHIR.error
          : JSON.stringify(respuestaFHIR.error)
      );
    }

    await conexion.query(`
      UPDATE cli_vinculos_profesionales
      SET
        uuid_fhir = ?,
        fecha_sync_fhir = NOW()
      WHERE id_vinculo = ?
    `, [
      respuestaFHIR.data.id,
      idVinculo
    ]);

    await conexion.commit();

    res.json({
      ok: true,
      mensaje: 'Vínculo profesional creado y sincronizado con FHIR',
      id: idVinculo,
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

const eliminarVinculo = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(`
      DELETE FROM cli_vinculos_profesionales
      WHERE id_vinculo = ?
    `, [id]);

    res.json({
      ok: true,
      mensaje: 'Vínculo eliminado correctamente'
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'No se puede eliminar el vínculo'
    });
  }
};

module.exports = {
  listarVinculos,
  listarCatalogosVinculo,
  crearVinculo,
  eliminarVinculo
};