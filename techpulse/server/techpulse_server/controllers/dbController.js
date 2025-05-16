const db = require('../config/db');
const constants = require('../config/constants');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const fsPromises = fs.promises;

class DBController {
  constructor() {
    this.tableNames = constants.db;
  }

  // FIELD OPERATIONS
  async getAllFields() {
    try {
      const query = `SELECT * FROM ${this.tableNames.fieldTable} ORDER BY field_name`;
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      throw new Error('Failed to fetch fields');
    }
  }

  async getFieldById(fieldId) {
    try {
      const query = `SELECT * FROM ${this.tableNames.fieldTable} WHERE field_id = $1`;
      const result = await db.query(query, [fieldId]);
      
      if (result.rowCount === 0) {
        throw new Error(`Field with ID ${fieldId} not found`);
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async createField(fieldName, description) {
    try {
      const query = `
        INSERT INTO ${this.tableNames.fieldTable} (field_name, description)
        VALUES ($1, $2)
        RETURNING *
      `;
      const result = await db.query(query, [fieldName, description]);
      return result.rows[0];
    } catch (error) {
      throw new Error('Failed to create field');
    }
  }

  // SUBFIELD OPERATIONS
  async getSubfieldsByFieldId(fieldId) {
    try {
      const query = `
        SELECT * FROM ${this.tableNames.subfieldTable} 
        WHERE field_id = $1
        ORDER BY subfield_name
      `;
      const result = await db.query(query, [fieldId]);
      return result.rows;
    } catch (error) {
      throw new Error('Failed to fetch subfields');
    }
  }

  async createSubfield(fieldId, subfieldName, description) {
    try {
      const query = `
        INSERT INTO ${this.tableNames.subfieldTable} 
          (field_id, subfield_name, description)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const result = await db.query(query, [fieldId, subfieldName, description]);
      return result.rows[0];
    } catch (error) {
      throw new Error('Failed to create subfield');
    }
  }

  // METRICS OPERATIONS
  async getLatestMetrics(fieldId, subfieldId = null) {
    try {
      let query, params;

      if (subfieldId) {
        query = `
          SELECT * FROM ${this.tableNames.metricsTable}
          WHERE field_id = $1 AND subfield_id = $2
          ORDER BY metric_date DESC
          LIMIT 1
        `;
        params = [fieldId, subfieldId];
      } else {
        query = `
          SELECT * FROM ${this.tableNames.metricsTable}
          WHERE field_id = $1 AND subfield_id IS NULL
          ORDER BY metric_date DESC
          LIMIT 1
        `;
        params = [fieldId];
      }

      const result = await db.query(query, params);
      return result.rowCount > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new Error('Failed to fetch metrics');
    }
  }

  async createMetrics(metricsData) {
    try {
      const {
        field_id,
        subfield_id = null,
        metric_1,
        metric_2,
        metric_3,
        rationale,
        source
      } = metricsData;

      const query = `
        INSERT INTO ${this.tableNames.metricsTable} (
          field_id, subfield_id, metric_1, metric_2, 
          metric_3, rationale, source, metric_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const result = await db.query(query, [
        field_id,
        subfield_id,
        metric_1,
        metric_2,
        metric_3,
        rationale,
        source,
        new Date().toISOString()
      ]);

      return result.rows[0];
    } catch (error) {
      throw new Error('Failed to create metrics');
    }
  }

  // INSIGHT OPERATIONS
  async getLatestInsight(fieldId = null) {
    try {
      let query, params;

      if (fieldId) {
        query = `
          SELECT * FROM ${this.tableNames.insightTable}
          WHERE field_id = $1
          ORDER BY generated_at DESC
          LIMIT 1
        `;
        params = [fieldId];
      } else {
        query = `
          SELECT * FROM ${this.tableNames.insightTable}
          WHERE field_id IS NULL
          ORDER BY generated_at DESC
          LIMIT 1
        `;
        params = [];
      }

      const result = await db.query(query, params);
      return result.rowCount > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new Error('Failed to fetch insight');
    }
  }

  async createInsight(fieldId, insightText, confidenceScore) {
    try {
      const query = `
        INSERT INTO ${this.tableNames.insightTable} (
          field_id, insight_text, confidence_score
        )
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const result = await db.query(query, [
        fieldId,
        insightText,
        confidenceScore
      ]);

      // Save to file system
      if (insightText) {
        await this.saveInsightToFile(fieldId, insightText);
      }

      return result.rows[0];
    } catch (error) {
      throw new Error('Failed to create insight');
    }
  }

  async saveInsightToFile(fieldId, content) {
    try {
      const fileName = fieldId 
        ? `MostRecentField${fieldId}Insight.txt`
        : 'MostRecentInsight.txt';
      
      const filePath = path.join(constants.paths.insights, fileName);
      await fsPromises.writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new Error('Failed to save insight file');
    }
  }

  // FEEDBACK OPERATIONS
  async createFeedback(insightId, feedbackText, rating) {
    try {
      const query = `
        INSERT INTO ${this.tableNames.feedbackTable} (
          insight_id, feedback_text, rating
        )
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const result = await db.query(query, [
        insightId,
        feedbackText,
        rating
      ]);

      return result.rows[0];
    } catch (error) {
      throw new Error('Failed to create feedback');
    }
  }

  // MODEL PARAMETERS OPERATIONS
  async getModelParameters() {
    try {
      const query = `
        SELECT * FROM ${this.tableNames.parametersTable}
        ORDER BY parameter_id DESC
        LIMIT 1
      `;
      const result = await db.query(query);
      return result.rowCount > 0 ? [result.rows[0]] : [];
    } catch (error) {
      throw new Error('Failed to fetch parameters');
    }
  }

  async updateModelParameters(parameterId, temperature, topP) {
    try {
      const query = `
        UPDATE ${this.tableNames.parametersTable}
        SET temperature = $1, top_p = $2
        WHERE parameter_id = $3
        RETURNING *
      `;
      
      const result = await db.query(query, [
        temperature,
        topP,
        parameterId
      ]);

      return result.rows[0];
    } catch (error) {
      throw new Error('Failed to update parameters');
    }
  }

  // COMPLEX QUERIES
  async getRadarData(fieldId = null) {
    try {
      if (fieldId) {
        const query = `
          WITH latest_subfield_metrics AS (
            SELECT 
              subfield_id,
              MAX(metric_date) AS latest_date
            FROM ${this.tableNames.metricsTable}
            WHERE field_id = $1 AND subfield_id IS NOT NULL
            GROUP BY subfield_id
          )
          SELECT 
            f.field_id,
            f.field_name,
            f.description AS field_description,
            s.subfield_id,
            s.subfield_name,
            s.description AS subfield_description,
            tm.metric_1,
            tm.metric_2,
            tm.metric_3,
            tm.rationale,
            tm.metric_date,
            tm.source
          FROM latest_subfield_metrics lsm
          JOIN ${this.tableNames.metricsTable} tm 
            ON tm.subfield_id = lsm.subfield_id AND tm.metric_date = lsm.latest_date
          JOIN ${this.tableNames.subfieldTable} s ON s.subfield_id = lsm.subfield_id
          JOIN ${this.tableNames.fieldTable} f ON f.field_id = s.field_id
          WHERE f.field_id = $1
          ORDER BY s.subfield_name
        `;
        const result = await db.query(query, [fieldId]);
        return result.rows;
      } else {
        const query = `
          WITH latest_metrics AS (
            SELECT 
              field_id,
              subfield_id,
              MAX(metric_date) as latest_date
            FROM ${this.tableNames.metricsTable}
            GROUP BY field_id, subfield_id
          )
          SELECT 
            f.field_id,
            f.field_name,
            f.description AS field_description,
            s.subfield_id,
            s.subfield_name,
            s.description AS subfield_description,
            COALESCE(ms.metric_1, m.metric_1) AS metric_1,
            COALESCE(ms.metric_2, m.metric_2) AS metric_2,
            COALESCE(ms.metric_3, m.metric_3) AS metric_3,
            COALESCE(ms.rationale, m.rationale) AS rationale,
            COALESCE(ms.metric_date, m.metric_date) AS metric_date,
            COALESCE(ms.source, m.source) AS source
          FROM ${this.tableNames.fieldTable} f
          LEFT JOIN latest_metrics lm ON f.field_id = lm.field_id AND lm.subfield_id IS NULL
          LEFT JOIN ${this.tableNames.metricsTable} m ON 
            m.field_id = lm.field_id AND 
            m.metric_date = lm.latest_date AND
            m.subfield_id IS NULL
          LEFT JOIN ${this.tableNames.subfieldTable} s ON f.field_id = s.field_id
          LEFT JOIN latest_metrics lms ON 
            s.subfield_id = lms.subfield_id AND 
            lms.field_id = f.field_id
          LEFT JOIN ${this.tableNames.metricsTable} ms ON 
            ms.subfield_id = lms.subfield_id AND 
            ms.metric_date = lms.latest_date
          ORDER BY f.field_name, s.subfield_name
        `;
        const result = await db.query(query);
        return result.rows;
      }
    } catch (error) {
      throw new Error('Failed to fetch radar data');
    }
  }
  

  async getFieldGrowthMetrics(fieldId) {
    try {
      const query = `
        WITH ranked_metrics AS (
          SELECT 
            metric_1,
            metric_2,
            metric_3,
            metric_date,
            ROW_NUMBER() OVER (ORDER BY metric_date DESC) as rn
          FROM ${this.tableNames.metricsTable}
          WHERE field_id = $1 AND subfield_id IS NULL
          ORDER BY metric_date DESC
          LIMIT 2
        )
        SELECT 
          current.metric_1 as current_metric_1,
          current.metric_2 as current_metric_2,
          current.metric_3 as current_metric_3,
          previous.metric_1 as previous_metric_1,
          previous.metric_2 as previous_metric_2,
          previous.metric_3 as previous_metric_3,
          CASE 
            WHEN previous.metric_1 = 0 THEN current.metric_1 * 100
            ELSE ((current.metric_1 - previous.metric_1) / previous.metric_1) * 100
          END as metric_1_growth,
          CASE 
            WHEN previous.metric_2 = 0 THEN current.metric_2 * 100
            ELSE ((current.metric_2 - previous.metric_2) / previous.metric_2) * 100
          END as metric_2_growth,
          CASE 
            WHEN previous.metric_3 = 0 THEN current.metric_3 * 100
            ELSE ((current.metric_3 - previous.metric_3) / previous.metric_3) * 100
          END as metric_3_growth
        FROM ranked_metrics current
        LEFT JOIN ranked_metrics previous ON previous.rn = 2
        WHERE current.rn = 1
      `;
      
      const result = await db.query(query, [fieldId]);
      return result.rowCount > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new Error('Failed to fetch growth metrics');
    }
  }
}

module.exports = new DBController();