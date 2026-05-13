const pool = require('../../config/db');

const buscarConceptosSnomed = async (req, res) => {

  try {

    const texto = req.query.q || '';

    const [rows] = await pool.query(`
      SELECT
        id,
        concept_id,
        term,
        semantic_tag,
        categoria
      FROM snomed_conceptos
      WHERE activo = 1
      AND (
        term LIKE ?
        OR concept_id LIKE ?
      )
      ORDER BY term ASC
      LIMIT 20
    `, [
      `%${texto}%`,
      `%${texto}%`
    ]);

    res.json({
      ok: true,
      data: rows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error consultando SNOMED'
    });

  }

};

module.exports = {
  buscarConceptosSnomed
};