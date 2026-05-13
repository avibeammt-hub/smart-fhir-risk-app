const pool = require('../../config/db');

const { crearResourceFHIR } = require('../../services/fhir.service');

const {
  construirEncounterFHIR
} = require('../../mappers/encounter.mapper');

const {
  construirObservationFHIR
} = require('../../mappers/observation.mapper');

const {
  construirRiskAssessmentFHIR
} = require('../../mappers/riskAssessment.mapper');

const { construirConditionFHIR
} = require('../../mappers/condition.mapper');

const listarBandejaPacientes = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.id_paciente,
        p.tipo_documento,
        p.numero_documento,
        p.nombres,
        p.apellidos,
        p.sexo,
        p.fecha_nacimiento,
        p.telefono,
        p.correo,
        p.uuid_fhir,

        TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) AS edad,

        MAX(c.fecha_contacto) AS ultima_valoracion,

        (
          SELECT r.riesgo_global
          FROM riesgo_evaluaciones r
          WHERE r.id_paciente = p.id_paciente
          ORDER BY r.fecha_evaluacion DESC
          LIMIT 1
        ) AS riesgo_actual,

        (
          SELECT r.recomendacion_general
          FROM riesgo_evaluaciones r
          WHERE r.id_paciente = p.id_paciente
          ORDER BY r.fecha_evaluacion DESC
          LIMIT 1
        ) AS recomendacion_actual

      FROM cli_pacientes p

      LEFT JOIN atn_contactos_clinicos c
        ON c.id_paciente = p.id_paciente

      WHERE p.activo = 1

      GROUP BY
        p.id_paciente,
        p.tipo_documento,
        p.numero_documento,
        p.nombres,
        p.apellidos,
        p.sexo,
        p.fecha_nacimiento,
        p.telefono,
        p.correo,
        p.uuid_fhir

      ORDER BY ultima_valoracion DESC, p.nombres ASC
    `);

    res.json({
      ok: true,
      data: rows
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error cargando bandeja de pacientes'
    });
  }
};

const listarCatalogosValoracion = async (req, res) => {
  try {
    const [pacientes] = await pool.query(`
      SELECT id_paciente, tipo_documento, numero_documento, nombres, apellidos, uuid_fhir
      FROM cli_pacientes
      WHERE activo = 1
      ORDER BY nombres, apellidos
    `);

    const [profesionales] = await pool.query(`
      SELECT id_profesional, nombres, apellidos, especialidad, uuid_fhir
      FROM cli_profesionales
      WHERE activo = 1
      ORDER BY nombres, apellidos
    `);

    const [servicios] = await pool.query(`
      SELECT 
        s.id_servicio_clinico,
        s.id_entidad,
        s.id_punto_atencion,
        s.nombre_servicio,
        s.uuid_fhir,
        e.nombre_entidad,
        e.uuid_fhir AS uuid_organization,
        p.nombre_punto,
        p.uuid_fhir AS uuid_location
      FROM red_servicios_clinicos s
      INNER JOIN red_entidades_salud e ON e.id_entidad = s.id_entidad
      INNER JOIN red_puntos_atencion p ON p.id_punto_atencion = s.id_punto_atencion
      WHERE s.activo = 1
      ORDER BY e.nombre_entidad, p.nombre_punto, s.nombre_servicio
    `);

    res.json({
      ok: true,
      data: {
        pacientes,
        profesionales,
        servicios
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error cargando catálogos de valoración'
    });
  }
};

const crearValoracion = async (req, res) => {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const {
      id_paciente,
      id_profesional,
      id_servicio_clinico,
      tipo_contacto,
      motivo_consulta,
      observaciones,
      riesgo_global,
      recomendacion_general
    } = req.body;

    const [[paciente]] = await conexion.query(`
      SELECT *
      FROM cli_pacientes
      WHERE id_paciente = ?
      LIMIT 1
    `, [id_paciente]);

    const [[profesional]] = await conexion.query(`
      SELECT *
      FROM cli_profesionales
      WHERE id_profesional = ?
      LIMIT 1
    `, [id_profesional]);

    const [[servicio]] = await conexion.query(`
      SELECT 
        s.*,
        e.uuid_fhir AS uuid_organization,
        p.uuid_fhir AS uuid_location
      FROM red_servicios_clinicos s
      INNER JOIN red_entidades_salud e ON e.id_entidad = s.id_entidad
      INNER JOIN red_puntos_atencion p ON p.id_punto_atencion = s.id_punto_atencion
      WHERE s.id_servicio_clinico = ?
      LIMIT 1
    `, [id_servicio_clinico]);

    if (!paciente?.uuid_fhir) throw new Error('El paciente no está sincronizado con FHIR');
    if (!profesional?.uuid_fhir) throw new Error('El profesional no está sincronizado con FHIR');
    if (!servicio?.uuid_fhir) throw new Error('El servicio no está sincronizado con FHIR');
    if (!servicio?.uuid_organization) throw new Error('La organización no está sincronizada con FHIR');
    if (!servicio?.uuid_location) throw new Error('La sede no está sincronizada con FHIR');

    const fechaContacto = new Date();

    const [contactoResult] = await conexion.query(`
      INSERT INTO atn_contactos_clinicos (
        id_paciente,
        id_profesional,
        id_entidad,
        id_punto_atencion,
        id_servicio_clinico,
        fecha_contacto,
        tipo_contacto,
        motivo_consulta,
        estado
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'FINALIZADO')
    `, [
      id_paciente,
      id_profesional,
      servicio.id_entidad,
      servicio.id_punto_atencion,
      id_servicio_clinico,
      fechaContacto,
      tipo_contacto,
      motivo_consulta
    ]);

    const idContacto = contactoResult.insertId;

    const encounterFHIR = construirEncounterFHIR({
      uuid_patient: paciente.uuid_fhir,
      uuid_practitioner: profesional.uuid_fhir,
      uuid_organization: servicio.uuid_organization,
      uuid_location: servicio.uuid_location,
      nombre_servicio: servicio.nombre_servicio,
      fecha_contacto: fechaContacto.toISOString(),
      motivo_consulta
    });

    const respuestaEncounter = await crearResourceFHIR('Encounter', encounterFHIR);

    if (!respuestaEncounter.ok) {
      throw new Error('Error creando Encounter en FHIR');
    }

    const uuidEncounter = respuestaEncounter.data.id;

    await conexion.query(`
      UPDATE atn_contactos_clinicos
      SET fhir_encounter_id = ?
      WHERE id_contacto_clinico = ?
    `, [uuidEncounter, idContacto]);

    for (const obs of observaciones || []) {
      if (!obs.nombre_observacion) continue;

      const fechaObs = new Date();

      const [obsResult] = await conexion.query(`
        INSERT INTO val_observaciones_clinicas (
          id_paciente,
          id_contacto_clinico,
          codigo,
          sistema_codigo,
          nombre_observacion,
          valor_numerico,
          valor_texto,
          unidad,
          fecha_observacion
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id_paciente,
        idContacto,
        obs.codigo || null,
        obs.sistema_codigo || null,
        obs.nombre_observacion,
        obs.valor_numerico || null,
        obs.valor_texto || null,
        obs.unidad || null,
        fechaObs
      ]);

      const observationFHIR = construirObservationFHIR({
        ...obs,
        uuid_patient: paciente.uuid_fhir,
        uuid_encounter: uuidEncounter,
        fecha_observacion: fechaObs.toISOString()
      });

      const respuestaObs = await crearResourceFHIR('Observation', observationFHIR);

      if (!respuestaObs.ok) {
        throw new Error(`Error creando Observation: ${obs.nombre_observacion}`);
      }

      await conexion.query(`
        UPDATE val_observaciones_clinicas
        SET fhir_observation_id = ?
        WHERE id_observacion_clinica = ?
      `, [
        respuestaObs.data.id,
        obsResult.insertId
      ]);
    }

    const userId =
      req.usuario?.id_usuario ||
      req.usuario?.id ||
      1;

    const [riesgoResult] = await conexion.query(`
      INSERT INTO riesgo_evaluaciones (
        id_paciente,
        id_contacto_clinico,
        riesgo_global,
        recomendacion_general,
        creado_por
      )
      VALUES (?, ?, ?, ?, ?)
    `, [
      id_paciente,
      idContacto,
      riesgo_global,
      recomendacion_general,
      userId
    ]);
	
	// =========================
	// GUARDAR ESCALAS
	// =========================

	if (req.body.escalas?.length) {

	  for (const escala of req.body.escalas) {

		await conexion.query(`
		  INSERT INTO riesgo_resultados_escalas (
			id_evaluacion_riesgo,
			nombre_escala,
			puntaje,
			porcentaje,
			clasificacion
		  )
		  VALUES (?, ?, ?, ?, ?)
		`, [
		  riesgoResult.insertId,
		  escala.nombre_escala,
		  escala.puntaje,
		  escala.porcentaje,
		  escala.clasificacion
		]);

	  }

	}
	
	// =========================
	// GUARDAR ALERTAS
	// =========================

	if (req.body.alertas?.length) {

	  for (const alerta of req.body.alertas) {

		await conexion.query(`
		  INSERT INTO cuidado_alertas_detectadas (
			id_paciente,
			id_evaluacion_riesgo,
			tipo_alerta,
			descripcion,
			severidad,
			activa
		  )
		  VALUES (?, ?, ?, ?, ?, 1)
		`, [
		  id_paciente,
		  riesgoResult.insertId,
		  alerta.tipo_alerta,
		  alerta.descripcion,
		  alerta.severidad
		]);

	  }

	}
	
	
	// =========================
// GUARDAR DIAGNÓSTICOS SNOMED
// =========================

if (req.body.diagnosticos?.length) {

  for (const diag of req.body.diagnosticos) {

    const [diagResult] = await conexion.query(`
      INSERT INTO val_diagnosticos (
        id_valoracion,
        concept_id,
        termino,
        tipo_diagnostico,
        observacion
      )
      VALUES (?, ?, ?, ?, ?)
    `, [
      riesgoResult.insertId,
      diag.concept_id,
      diag.term,
      diag.tipo_diagnostico || 'PRINCIPAL',
      diag.observacion || null
    ]);

    // ======================
    // CONDITION FHIR
    // ======================

    const conditionFHIR = construirConditionFHIR({
      uuid_patient: paciente.uuid_fhir,
      uuid_encounter: uuidEncounter,

      concept_id: diag.concept_id,
      termino: diag.term,

      tipo_diagnostico: diag.tipo_diagnostico
    });

    const respuestaCondition =
      await crearResourceFHIR(
        'Condition',
        conditionFHIR
      );

    if (!respuestaCondition.ok) {

      throw new Error(
        `Error creando Condition FHIR: ${diag.term}`
      );

    }

  }

}

    const riskFHIR = construirRiskAssessmentFHIR({
      uuid_patient: paciente.uuid_fhir,
      uuid_encounter: uuidEncounter,
      fecha_evaluacion: fechaContacto.toISOString(),
      riesgo_global,
      recomendacion_general
    });

    const respuestaRisk = await crearResourceFHIR('RiskAssessment', riskFHIR);

    if (!respuestaRisk.ok) {
      throw new Error('Error creando RiskAssessment en FHIR');
    }

    await conexion.query(`
      UPDATE riesgo_evaluaciones
      SET fhir_riskassessment_id = ?
      WHERE id_evaluacion_riesgo = ?
    `, [
      respuestaRisk.data.id,
      riesgoResult.insertId
    ]);

    await conexion.commit();

    res.json({
      ok: true,
      mensaje: 'Valoración clínica creada y sincronizada con FHIR',
      data: {
        id_contacto_clinico: idContacto,
        encounter_fhir_id: uuidEncounter,
        riskassessment_fhir_id: respuestaRisk.data.id
      }
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

const obtenerTimelinePaciente = async (req, res) => {
  try {
    const { idPaciente } = req.params;

    const [contactos] = await pool.query(`
      SELECT
        c.id_contacto_clinico,
        c.fecha_contacto,
        c.tipo_contacto,
        c.motivo_consulta,
        c.estado,
        c.fhir_encounter_id,

        r.id_evaluacion_riesgo,
        r.riesgo_global,
        r.recomendacion_general,
        r.fhir_riskassessment_id,

        pr.nombres AS profesional_nombres,
        pr.apellidos AS profesional_apellidos,
        s.nombre_servicio
      FROM atn_contactos_clinicos c
      LEFT JOIN riesgo_evaluaciones r
        ON r.id_contacto_clinico = c.id_contacto_clinico
      LEFT JOIN cli_profesionales pr
        ON pr.id_profesional = c.id_profesional
      LEFT JOIN red_servicios_clinicos s
        ON s.id_servicio_clinico = c.id_servicio_clinico
      WHERE c.id_paciente = ?
      ORDER BY c.fecha_contacto DESC
    `, [idPaciente]);

    const [observaciones] = await pool.query(`
      SELECT
        id_contacto_clinico,
        nombre_observacion,
        valor_numerico,
        valor_texto,
        unidad,
        fecha_observacion,
        fhir_observation_id
      FROM val_observaciones_clinicas
      WHERE id_paciente = ?
      ORDER BY fecha_observacion DESC
    `, [idPaciente]);

    const [escalas] = await pool.query(`
      SELECT
        id_evaluacion_riesgo,
        nombre_escala,
        puntaje,
        porcentaje,
        clasificacion,
        fecha_creacion
      FROM riesgo_resultados_escalas
      ORDER BY fecha_creacion DESC
    `);
	
	const [alertas] = await pool.query(`
	  SELECT
		id_evaluacion_riesgo,
		tipo_alerta,
		descripcion,
		severidad,
		activa,
		fecha_creacion
	  FROM cuidado_alertas_detectadas
	  WHERE id_paciente = ?
	  ORDER BY fecha_creacion DESC
	`, [idPaciente]);

    const timeline = contactos.map(c => ({
      ...c,

      observaciones: observaciones.filter(
        o => o.id_contacto_clinico === c.id_contacto_clinico
      ),

      escalas: escalas.filter(
        e => e.id_evaluacion_riesgo === c.id_evaluacion_riesgo
      ),
	  
	  alertas: alertas.filter(
		a => a.id_evaluacion_riesgo === c.id_evaluacion_riesgo
	  )
    }));

    res.json({
      ok: true,
      data: timeline
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error consultando timeline clínico'
    });
  }
};

module.exports = {
  listarCatalogosValoracion,
  crearValoracion,
  listarBandejaPacientes,
  obtenerTimelinePaciente
};