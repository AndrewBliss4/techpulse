const openaiService = require('../services/openaiService');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const fsPromises = fs.promises;
const constants = require('../config/constants');

class AIController {
  constructor() {
    this.responsePatterns = {
      field: {
        name: /field_name:\s*(.+)/i,
        maturity: /metric_1:\s*([\d.]+)/i,
        innovation: /metric_2:\s*([\d.]+)/i,
        relevance: /metric_3:\s*([\d.]+)/i,
        rationale: /rationale:\s*([\s\S]+?)(?:\n|$)source:/i,
        source: /source:\s*(https?:\/\/[^\s]+)/i
      },
      subfield: {
        name: /subfield_name:\s*(.+)/i,
        maturity: /metric_1:\s*([\d.]+)/i,
        innovation: /metric_2:\s*([\d.]+)/i,
        relevance: /metric_3:\s*([\d.]+)/i,
        rationale: /rationale:\s*([\s\S]+?)(?:\n|$)source:/i,
        source: /source:\s*(https?:\/\/[^\s]+)/i
      },
      insight: {
        confidence: /confidence score:\s*([\d.]+)/i
      }
    };
  }

  // FIELD METRICS UPDATE
  async updateMetrics(req, res) {
    const { field_id } = req.body;

    if (!field_id) {
      return res.status(400).json({
        error: "Field ID is required",
        details: "No field_id provided in request body"
      });
    }

    try {
      // 1. Fetch field data
      const field = await this._getFieldData(field_id);

      // 2. Get model parameters
      const { temperature, top_p } = await this._getModelParameters();

      // 3. Prepare prompt data
      const { prompt, articlesData } = await this._prepareFieldPromptData(field);

      // 4. Generate AI response
      const aiResponse = await openaiService.generateResponse(prompt, {
        temperature,
        top_p
      });

      // 5. Parse and validate response
      const parsedResponse = this._parseFieldResponse(aiResponse, field.field_name);

      // 6. Save to database
      const savedMetrics = await db.query(
        `INSERT INTO ${constants.db.metricsTable} (
          metric_1, metric_2, metric_3, metric_date, 
          field_id, rationale, source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          parsedResponse.maturity,
          parsedResponse.innovation,
          parsedResponse.relevance,
          new Date().toISOString(),
          field.field_id,
          parsedResponse.rationale,
          parsedResponse.source
        ]
      );

      return res.status(200).json({
        success: true,
        message: `Metrics updated for ${field.field_name}`,
        data: savedMetrics.rows[0]
      });

    } catch (error) {
      return res.status(500).json({
        error: "Failed to update metrics",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  // SUBFIELD METRICS UPDATE
  async updateSubfieldMetrics(req, res) {
    const { subfield_id, field_id } = req.body;

    if (!subfield_id || !field_id) {
      return res.status(400).json({
        error: "Subfield ID and Field ID are required",
        details: "No subfield_id or field_id provided in request body"
      });
    }

    try {
      // 1. Fetch subfield data
      const subfield = await this._getSubfieldData(subfield_id, field_id);

      // 2. Get model parameters
      const { temperature, top_p } = await this._getModelParameters();

      // 3. Prepare prompt data
      const { prompt, articlesData } = await this._prepareSubfieldPromptData(subfield);

      // 4. Generate AI response
      const aiResponse = await openaiService.generateResponse(prompt, {
        temperature,
        top_p
      });

      // 5. Parse and validate response
      const parsedResponse = this._parseSubfieldResponse(aiResponse, subfield.subfield_name);

      // 6. Save to database
      const savedMetrics = await db.query(
        `INSERT INTO ${constants.db.metricsTable} (
          metric_1, metric_2, metric_3, metric_date,
          field_id, subfield_id, rationale, source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          parsedResponse.maturity,
          parsedResponse.innovation,
          parsedResponse.relevance,
          new Date().toISOString(),
          field_id,
          subfield_id,
          parsedResponse.rationale,
          parsedResponse.source
        ]
      );

      return res.status(200).json({
        success: true,
        message: `Metrics updated for subfield ${subfield.subfield_name}`,
        data: savedMetrics.rows[0]
      });

    } catch (error) {
      return res.status(500).json({
        error: "Failed to update subfield metrics",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async _getSubfieldData(subfieldId, fieldId) {
    const query = `
      SELECT 
        s.subfield_id, s.subfield_name, s.description,
        t.metric_1, t.metric_2, t.metric_3, 
        t.rationale, t.metric_date
      FROM ${constants.db.subfieldTable} s
      JOIN ${constants.db.metricsTable} t ON s.subfield_id = t.subfield_id
      WHERE t.metric_date = (
        SELECT MAX(metric_date) FROM ${constants.db.metricsTable} 
        WHERE subfield_id = s.subfield_id
      )
      AND s.subfield_id = $1
      AND s.field_id = $2
      AND t.subfield_id IS NOT NULL
    `;

    const result = await db.query(query, [subfieldId, fieldId]);

    if (result.rowCount === 0) {
      throw new Error(`Subfield with ID ${subfieldId} not found for field ${fieldId}`);
    }

    return result.rows[0];
  }

  async _prepareSubfieldPromptData(subfield) {
    const articlesPath = path.join(constants.paths.scrapeDb, "arxiv_papers_sf.json");
    const articles = JSON.parse(await fsPromises.readFile(articlesPath, 'utf8'));
    const promptTemplatePath = path.join(constants.paths.prompts, "prompt_update_metrics.txt");
    const promptTemplate = await fsPromises.readFile(promptTemplatePath, 'utf8');

    const subfieldArticles = articles
      .filter(article => article.subfield_id === subfield.subfield_id)
      .sort((a, b) => new Date(b.published) - new Date(a.published))
      .slice(0, constants.amountScrapedsf);

    const articlesData = subfieldArticles.map(article => `
      subfield_name: ${subfield.subfield_name}
      title: ${article.title}
      summary: ${article.summary}
      published: ${article.published}`).join('\n\n');

    const subfieldData = `
      subfield_name: ${subfield.subfield_name}
      metric_1: ${subfield.metric_1}
      metric_2: ${subfield.metric_2}
      metric_3: ${subfield.metric_3}
      rationale: ${subfield.rationale}
      metric_date: ${subfield.metric_date}`;

    const dynamicPrompt = promptTemplate
      .replace("{FIELD_DATA}", subfieldData)
      .replace("{ARTICLES_DATA}", articlesData);

    return { prompt: dynamicPrompt, articlesData };
  }

  _parseSubfieldResponse(response, expectedSubfieldName) {
    const patterns = this.responsePatterns.subfield;

    const subfieldNameMatch = response.match(patterns.name);
    const maturityMatch = response.match(patterns.maturity);
    const innovationMatch = response.match(patterns.innovation);
    const relevanceMatch = response.match(patterns.relevance);
    const rationaleMatch = response.match(patterns.rationale);
    const sourceMatch = response.match(patterns.source);

    if (!subfieldNameMatch || !maturityMatch || !innovationMatch ||
      !relevanceMatch || !rationaleMatch || !sourceMatch) {
      throw new Error('Invalid AI response format for subfield');
    }

    const subfieldName = subfieldNameMatch[1].trim();
    if (subfieldName.toLowerCase() !== expectedSubfieldName.toLowerCase()) {
      throw new Error(`Subfield name mismatch: expected ${expectedSubfieldName}, got ${subfieldName}`);
    }

    return {
      maturity: parseFloat(maturityMatch[1]),
      innovation: parseFloat(innovationMatch[1]),
      relevance: parseFloat(relevanceMatch[1]),
      rationale: rationaleMatch[1].trim(),
      source: sourceMatch[1].trim()
    };
  }

  async _getFieldData(fieldId) {
    const query = `
      SELECT 
        f.field_id, f.field_name, 
        t.metric_1, t.metric_2, t.metric_3, 
        t.rationale, t.metric_date
      FROM ${constants.db.fieldTable} f 
      JOIN ${constants.db.metricsTable} t ON f.field_id = t.field_id 
      WHERE t.metric_date = (
        SELECT MAX(metric_date) FROM ${constants.db.metricsTable} 
        WHERE field_id = f.field_id AND subfield_id IS NULL
      ) 
      AND t.subfield_id IS NULL
      AND f.field_id = $1
    `;

    const result = await db.query(query, [fieldId]);

    if (result.rowCount === 0) {
      throw new Error(`Field with ID ${fieldId} not found`);
    }

    return result.rows[0];
  }

  async _getModelParameters() {
    const result = await db.query(
      `SELECT * FROM ${constants.db.parametersTable} ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rowCount === 0) {
      return {
        temperature: constants.ai.defaultTemp,
        top_p: constants.ai.defaultTopP
      };
    }

    return result.rows[0];
  }

  async _prepareFieldPromptData(field) {
    const articlesPath = path.join(constants.paths.scrapeDb, "arxiv_papers.json");
    const articles = JSON.parse(await fsPromises.readFile(articlesPath, 'utf8'));
    const promptTemplatePath = path.join(constants.paths.prompts, "prompt_update_metrics.txt");
    const promptTemplate = await fsPromises.readFile(promptTemplatePath, 'utf8');

    const fieldArticles = articles
      .filter(article => article.field === field.field_name)
      .sort((a, b) => new Date(b.published) - new Date(a.published))
      .slice(0, constants.amountScraped);

    const articlesData = fieldArticles.map(article => `
      field_name: ${field.field_name}
      title: ${article.title}
      summary: ${article.summary}
      published: ${article.published}`).join('\n\n');

    const fieldData = `
      field_name: ${field.field_name}
      metric_1: ${field.metric_1}
      metric_2: ${field.metric_2}
      metric_3: ${field.metric_3}
      rationale: ${field.rationale}
      metric_date: ${field.metric_date}`;

    const dynamicPrompt = promptTemplate
      .replace("{FIELD_DATA}", fieldData)
      .replace("{ARTICLES_DATA}", articlesData);

    return { prompt: dynamicPrompt, articlesData };
  }

  _parseFieldResponse(response, expectedFieldName) {
    const patterns = this.responsePatterns.field;

    const fieldNameMatch = response.match(patterns.name);
    const maturityMatch = response.match(patterns.maturity);
    const innovationMatch = response.match(patterns.innovation);
    const relevanceMatch = response.match(patterns.relevance);
    const rationaleMatch = response.match(patterns.rationale);
    const sourceMatch = response.match(patterns.source);

    if (!fieldNameMatch || !maturityMatch || !innovationMatch ||
      !relevanceMatch || !rationaleMatch || !sourceMatch) {
      throw new Error('Invalid AI response format');
    }

    const fieldName = fieldNameMatch[1].trim();
    if (fieldName.toLowerCase() !== expectedFieldName.toLowerCase()) {
      throw new Error(`Field name mismatch: expected ${expectedFieldName}, got ${fieldName}`);
    }

    return {
      maturity: parseFloat(maturityMatch[1]),
      innovation: parseFloat(innovationMatch[1]),
      relevance: parseFloat(relevanceMatch[1]),
      rationale: rationaleMatch[1].trim(),
      source: sourceMatch[1].trim()
    };
  }

  // FIELD GENERATION
  async handleNewField(req, res) {
    try {
      const aiResponse = await this._generateNewFieldResponse();

      if (aiResponse === "NUH_UH") {
        return res.status(200).json({
          message: "AI could not suggest new fields at this time"
        });

      }

      const fieldEntries = this._parseFieldEntries(aiResponse);
      const results = [];

      for (const entry of fieldEntries) {
        try {
          const result = await this._processFieldEntry(entry);
          results.push(result);
        } catch (entryError) {
          results.push({
            error: entryError.message,
            entry: entry.substring(0, 100) + '...'
          });
        }
      }

      return res.status(200).json({
        message: "Fields processed",
        results,
        count: results.filter(r => !r.error).length
      });

    } catch (error) {
      return res.status(500).json({
        error: "Failed to generate new fields",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async _generateNewFieldResponse() {
    const fieldQuery = await db.query(
      `SELECT field_name FROM ${constants.db.fieldTable}`
    );
    const fieldNames = fieldQuery.rows.map(row => row.field_name).join(", ");

    const promptTemplatePath = path.join(constants.paths.prompts, "prompt_new_fields.txt");
    const promptTemplate = await fsPromises.readFile(promptTemplatePath, 'utf8');
    const dynamicPrompt = promptTemplate.replace("{CURRENT_FIELDS}", fieldNames);

    const response = await openaiService.generateResponse(dynamicPrompt, {
      temperature: 0,
      max_tokens: constants.ai.maxTokens,
      top_p: 1
    });

    console.log('=== RAW AI RESPONSE ===');
    console.log(response);
    console.log('=======================');

    if (response === "NUH_UH") {
      return "NUH_UH";
    }

    return response;
  }

  _parseFieldEntries(response) {
    // First normalize the response
    const normalized = response
      .replace(/"/g, '') // Remove quotes
      .replace(/\r\n/g, '\n') // Normalize line endings
      .trim();

    // Split into entries (double newline separated)
    const entries = normalized.split(/\n\s*\n/).filter(entry =>
      entry.trim().startsWith("field_name:")
    );

    if (entries.length === 0) {
      throw new Error('No valid field entries found. Expected format:\n' +
        'field_name: Field Name\n' +
        'description: Description text\n' +
        'metric_1: 0.75\n' +
        'metric_2: 0.85\n' +
        'metric_3: 0.65\n' +
        'rationale: Explanation text\n' +
        'source: https://example.com');
    }

    return entries;
  }

  async _processFieldEntry(entry) {
    const patterns = this.responsePatterns.field;

    const fieldNameMatch = entry.match(patterns.name);
    const descriptionMatch = entry.match(/description:\s*([\s\S]+?)\nmetric_1:/);
    const maturityMatch = entry.match(patterns.maturity);
    const innovationMatch = entry.match(patterns.innovation);
    const relevanceMatch = entry.match(patterns.relevance);
    const rationaleMatch = entry.match(patterns.rationale);
    const sourceMatch = entry.match(patterns.source);

    if (!fieldNameMatch || !descriptionMatch || !maturityMatch ||
      !innovationMatch || !relevanceMatch || !rationaleMatch || !sourceMatch) {
      throw new Error('Invalid field entry format');
    }

    const fieldName = fieldNameMatch[1].trim();
    const description = descriptionMatch[1].trim();
    const maturity = parseFloat(maturityMatch[1]);
    const innovation = parseFloat(innovationMatch[1]);
    const relevance = parseFloat(relevanceMatch[1]);
    const rationale = rationaleMatch[1].trim();
    const source = sourceMatch[1].trim();

    // Check if field exists
    let fieldId;
    const existingField = await db.query(
      `SELECT field_id FROM ${constants.db.fieldTable} WHERE field_name = $1`,
      [fieldName]
    );

    if (existingField.rowCount === 0) {
      // Create new field
      const fieldResult = await db.query(
        `INSERT INTO ${constants.db.fieldTable} (field_name, description)
         VALUES ($1, $2) RETURNING field_id`,
        [fieldName, description]
      );
      fieldId = fieldResult.rows[0].field_id;
    } else {
      fieldId = existingField.rows[0].field_id;
    }

    // Create metrics
    const metricsResult = await db.query(
      `INSERT INTO ${constants.db.metricsTable} (
        metric_1, metric_2, metric_3, metric_date, 
        field_id, rationale, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        maturity,
        innovation,
        relevance,
        new Date().toISOString(),
        fieldId,
        rationale,
        source
      ]
    );

    return {
      fieldId,
      fieldName,
      metrics: metricsResult.rows[0]
    };
  }

  // SUBFIELD GENERATION
  async handleNewSubfield(req, res) {
    const { fieldName, fieldId } = req.body;

    if (!fieldName || !fieldId) {
      return res.status(400).json({
        error: "Field name and ID are required",
        details: `Received - fieldName: ${fieldName}, fieldId: ${fieldId}`
      });
    }

    try {
      console.log(`Generating subfields for field: ${fieldName} (ID: ${fieldId})`);

      const aiResponse = await this._generateSubfieldResponse(fieldName);
      console.log("AI Response:", aiResponse);

      const subfieldEntries = this._parseSubfieldEntries(aiResponse);
      console.log("Parsed subfield entries:", subfieldEntries);

      const results = [];

      for (const entry of subfieldEntries) {
        try {
          const result = await this._processSubfieldEntry(entry, fieldId);
          results.push(result);
        } catch (entryError) {
          console.error("Error processing subfield entry:", entryError);
          results.push({
            error: entryError.message,
            entry: entry.substring(0, 100) + '...'
          });
        }
      }

      return res.status(200).json({
        message: "Subfields processed",
        fieldId,
        fieldName,
        results,
        count: results.filter(r => !r.error).length
      });

    } catch (error) {
      console.error("Error in handleNewSubfield:", error);
      return res.status(500).json({
        error: "Failed to generate subfields",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async _generateSubfieldResponse(fieldName) {
    const subfieldQuery = await db.query(
      `SELECT subfield_name FROM ${constants.db.subfieldTable} 
       WHERE field_id = (SELECT field_id FROM ${constants.db.fieldTable} WHERE field_name = $1)`,
      [fieldName]
    );

    const subfieldNames = subfieldQuery.rows.map(row => row.subfield_name).join(", ");
    const promptTemplatePath = path.join(constants.paths.prompts, "prompt_subfield.txt");
    const promptTemplate = await fsPromises.readFile(promptTemplatePath, 'utf8');

    const dynamicPrompt = promptTemplate
      .replace("{FIELD_NAME}", fieldName)
      .replace("{SUBFIELDS}", subfieldNames);

    return await openaiService.generateResponse(dynamicPrompt, {
      temperature: 0,
      max_tokens: constants.ai.maxTokens,
      top_p: 1
    });
  }

  _parseSubfieldEntries(response) {
    // First normalize the response
    const normalized = response
      .replace(/"/g, '') // Remove quotes
      .replace(/\r\n/g, '\n') // Normalize line endings
      .trim();

    // Split into entries (double newline separated)
    const entries = normalized.split(/\n\s*\n/).filter(entry =>
      entry.trim().startsWith("subfield_name:")
    );

    if (entries.length === 0) {
      throw new Error('No valid subfield entries found. Expected format:\n' +
        'subfield_name: Subfield Name\n' +
        'description: Description text\n' +
        'metric_1: 0.75\n' +
        'metric_2: 0.85\n' +
        'metric_3: 0.65\n' +
        'rationale: Explanation text\n' +
        'source: https://example.com');
    }

    // Reconstruct entries in the format expected by _processSubfieldEntry
    const processedEntries = entries.map(entry => {
      const lines = entry.split('\n').map(line => line.trim());

      // Rebuild the entry with consistent formatting
      return lines.join('\n');
    });

    console.log("-=-=-=--=-=-=-==-=-=-=-=-=-=-=-=-=-=");
    console.log("Processed Subfield Entries:", processedEntries);
    console.log("-=-=-=--=-=-=-==-=-=-=-=-=-=-=-=-=-=");

    return processedEntries;
  }

  async _processSubfieldEntry(entry, fieldId) {
    const patterns = this.responsePatterns.subfield;

    const subfieldNameMatch = entry.match(patterns.name);
    const descriptionMatch = entry.match(/description:\s*([\s\S]+?)\nmetric_1:/);
    const maturityMatch = entry.match(patterns.maturity);
    const innovationMatch = entry.match(patterns.innovation);
    const relevanceMatch = entry.match(patterns.relevance);
    const rationaleMatch = entry.match(patterns.rationale);
    const sourceMatch = entry.match(patterns.source);

    if (!subfieldNameMatch || !descriptionMatch || !maturityMatch ||
      !innovationMatch || !relevanceMatch || !rationaleMatch || !sourceMatch) {
      throw new Error('Invalid subfield entry format');
    }

    const subfieldName = subfieldNameMatch[1].trim();
    const description = descriptionMatch[1].trim();
    const maturity = parseFloat(maturityMatch[1]);
    const innovation = parseFloat(innovationMatch[1]);
    const relevance = parseFloat(relevanceMatch[1]);
    const rationale = rationaleMatch[1].trim();
    const source = sourceMatch[1].trim();

    // Check if subfield exists
    let subfieldId;
    const existingSubfield = await db.query(
      `SELECT subfield_id FROM ${constants.db.subfieldTable} 
       WHERE subfield_name = $1 AND field_id = $2`,
      [subfieldName, fieldId]
    );

    if (existingSubfield.rowCount === 0) {
      // Create new subfield
      const subfieldResult = await db.query(
        `INSERT INTO ${constants.db.subfieldTable} 
         (field_id, subfield_name, description)
         VALUES ($1, $2, $3) 
         RETURNING subfield_id`,
        [fieldId, subfieldName, description]
      );
      subfieldId = subfieldResult.rows[0].subfield_id;
    } else {
      subfieldId = existingSubfield.rows[0].subfield_id;
    }

    // Create metrics
    const metricsResult = await db.query(
      `INSERT INTO ${constants.db.metricsTable} (
        metric_1, metric_2, metric_3, metric_date,
        field_id, subfield_id, rationale, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        maturity,
        innovation,
        relevance,
        new Date().toISOString(),
        fieldId,
        subfieldId,
        rationale,
        source
      ]
    );

    return {
      subfieldId,
      subfieldName,
      metrics: metricsResult.rows[0]
    };
  }


  // INSIGHT GENERATION
  async handleGenerateInsight(req, res) {
    try {
      const insight = await this._generateFullInsight();

      if (insight === "NO_METRICS") {
        return res.status(200).json({
          message: "No metrics available for insight generation"
        });
      }

      const confidenceMatch = insight.match(this.responsePatterns.insight.confidence);
      const confidenceScore = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.9;

      const savedInsight = await db.query(
        `INSERT INTO ${constants.db.insightTable} (field_id, insight_text, confidence_score)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [null, insight, confidenceScore]
      );

      //This is the section where we are storing the most recent insight, ideally fix to store in backend - Miruo
      
      // Define the relative path to the Insights directory
      const insightsDir = path.resolve(
        process.cwd(),
        "../../client/techpulse_app/src/components/Insights"
      );

      // Define the file name based on field_id
      let fileName = "MostRecentInsight.txt";

      const filePath = path.join(insightsDir, fileName);

      // Write the insight to the file
      await fsPromises.writeFile(filePath, savedInsight.rows[0].insight_text, 'utf8');
      console.log(`Insight written to ${filePath}`);

      return res.status(200).json({
        success: true,
        insight: savedInsight.rows[0].insight_text,
        confidenceScore: savedInsight.rows[0].confidence_score
      });

    } catch (error) {
      return res.status(500).json({
        error: "Failed to generate insight",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async _generateFullInsight() {
    // 1. Get metrics for all fields
    const metricsQuery = await db.query(`
      WITH recent_metrics AS (
        SELECT
          f.field_id,
          f.field_name,
          t.metric_1,
          t.metric_2,
          t.metric_3,
          t.rationale,
          t.metric_date,
          ROW_NUMBER() OVER (PARTITION BY f.field_id ORDER BY t.metric_date DESC) AS rn
        FROM ${constants.db.fieldTable} f
        JOIN ${constants.db.metricsTable} t ON f.field_id = t.field_id
        WHERE t.subfield_id IS NULL
      )
      SELECT
        field_id,
        field_name,
        metric_1,
        metric_2,
        metric_3,
        rationale,
        metric_date
      FROM recent_metrics
      WHERE rn <= 2
      ORDER BY field_id, metric_date DESC
    `);

    if (metricsQuery.rowCount === 0) {
      return "NO_METRICS";
    }

    // 2. Calculate growth metrics
    const fields = {};
    metricsQuery.rows.forEach(row => {
      if (!fields[row.field_id]) {
        fields[row.field_id] = [];
      }
      fields[row.field_id].push(row);
    });

    const growthData = Object.keys(fields).map(field_id => {
      const fieldMetrics = fields[field_id];

      if (fieldMetrics.length === 1) {
        return {
          field_id,
          field_name: fieldMetrics[0].field_name,
          most_recent_metric_1: fieldMetrics[0].metric_1,
          most_recent_metric_2: fieldMetrics[0].metric_2,
          most_recent_metric_3: fieldMetrics[0].metric_3,
          rationale: fieldMetrics[0].rationale,
          growth_metric_1: 0,
          growth_metric_2: 0,
          growth_metric_3: 0
        };
      }

      const calculateGrowth = (current, previous) => {
        if (previous === 0 || isNaN(previous)) return current > 0 ? 100 : 0;
        return parseFloat((((current - previous) / previous) * 100).toFixed(2));
      };

      const growth_metric_1 = calculateGrowth(fieldMetrics[0].metric_1, fieldMetrics[1].metric_1);
      const growth_metric_2 = calculateGrowth(fieldMetrics[0].metric_2, fieldMetrics[1].metric_2);
      const growth_metric_3 = calculateGrowth(fieldMetrics[0].metric_3, fieldMetrics[1].metric_3);

      return {
        field_id,
        field_name: fieldMetrics[0].field_name,
        most_recent_metric_1: fieldMetrics[0].metric_1,
        most_recent_metric_2: fieldMetrics[0].metric_2,
        most_recent_metric_3: fieldMetrics[0].metric_3,
        rationale: fieldMetrics[0].rationale,
        growth_metric_1,
        growth_metric_2,
        growth_metric_3
      };
    });

    // 3. Get previous insight
    const previousInsight = await db.query(
      `SELECT * FROM ${constants.db.insightTable} 
       WHERE field_id IS NULL 
       ORDER BY generated_at DESC LIMIT 1`
    );

    // 4. Prepare prompt
    const promptTemplatePath = path.join(constants.paths.prompts, "full_radar_insight_generation.txt");
    const promptTemplate = await fsPromises.readFile(promptTemplatePath, 'utf8');

    const growthDataFormatted = growthData.map(item => `
      Field Name: ${item.field_name}
      
      Most Recent Metrics:
        Interest (metric_1): ${item.most_recent_metric_1} (growth: ${item.growth_metric_1}%)
        Innovation (metric_2): ${item.most_recent_metric_2} (growth: ${item.growth_metric_2}%)
        Relevance to Banking (metric_3): ${item.most_recent_metric_3} (growth: ${item.growth_metric_3}%)
      
      Rationale: ${item.rationale}
    `).join('\n\n');

    const previousInsightText = previousInsight.rowCount > 0
      ? `Previous Insight:\n${previousInsight.rows[0].insight_text}\nGenerated At: ${previousInsight.rows[0].generated_at}`
      : "No previous insight available.";

    const dynamicPrompt = promptTemplate
      .replace("{METRICS_DATA}", growthDataFormatted)
      .replace("{PREVIOUS_INSIGHT}", previousInsightText);

    // 5. Save populated prompt for debugging
    const populatedPromptPath = path.join(constants.paths.prompts, "POPULATEDPROMPT.txt");
    await fsPromises.writeFile(populatedPromptPath, dynamicPrompt, 'utf8');

    // 6. Generate insight
    return await openaiService.generateResponse(dynamicPrompt, {
      temperature: 0,
      max_tokens: constants.ai.maxTokens,
      top_p: 1
    });
  }

  // SUBFIELD INSIGHT GENERATION
  async handleGenerateSubInsight(req, res) {
    const { fieldId } = req.body;

    if (!fieldId) {
      return res.status(400).json({
        error: "Field ID is required"
      });
    }

    try {
      const field = await db.query(
        `SELECT field_name FROM ${constants.db.fieldTable} WHERE field_id = $1`,
        [fieldId]
      );

      if (field.rowCount === 0) {
        return res.status(404).json({
          error: "Field not found"
        });
      }

      const { insight, confidenceScore } = await this._generateSubfieldInsight(fieldId);

      const savedInsight = await db.query(
        `INSERT INTO ${constants.db.insightTable} (field_id, insight_text, confidence_score)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [fieldId, insight, confidenceScore]
      );

      return res.status(200).json({
        success: true,
        insight: savedInsight.rows[0].insight_text,
        confidenceScore: savedInsight.rows[0].confidence_score,
        fieldId,
        fieldName: field.rows[0].field_name
      });

    } catch (error) {
      return res.status(500).json({
        error: "Failed to generate subfield insight",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async _generateSubfieldInsight(fieldId) {
    // 1. Get metrics for subfields
    const metricsQuery = await db.query(`
      SELECT 
        s.subfield_id,
        s.subfield_name,
        t.metric_1,
        t.metric_2,
        t.metric_3,
        t.rationale,
        t.metric_date
      FROM ${constants.db.subfieldTable} s
      JOIN ${constants.db.metricsTable} t ON s.subfield_id = t.subfield_id
      WHERE t.metric_date = (
        SELECT MAX(metric_date) FROM ${constants.db.metricsTable} 
        WHERE subfield_id = s.subfield_id
      )
      AND s.field_id = $1
    `, [fieldId]);

    if (metricsQuery.rowCount === 0) {
      return { insight: "NO_METRICS", confidenceScore: 0 };
    }

    // 2. Get previous insight
    const previousInsight = await db.query(
      `SELECT * FROM ${constants.db.insightTable} 
       WHERE field_id = $1 
       ORDER BY generated_at DESC LIMIT 1`,
      [fieldId]
    );

    // 3. Prepare prompt
    const promptTemplatePath = path.join(constants.paths.prompts, "insight_subfield_gen.txt");
    const promptTemplate = await fsPromises.readFile(promptTemplatePath, 'utf8');

    const metricsData = metricsQuery.rows.map(row => `
      subfield_name: ${row.subfield_name}
      Interest: ${row.metric_1}
      Innovation: ${row.metric_2}
      Relevance to RBC: ${row.metric_3}
      rationale: ${row.rationale}
      metric_date: ${row.metric_date}`).join('\n\n');

    const previousInsightText = previousInsight.rowCount > 0
      ? `Previous Insight:\n${previousInsight.rows[0].insight_text}\nGenerated At: ${previousInsight.rows[0].generated_at}`
      : "No previous insight available.";

    const dynamicPrompt = promptTemplate
      .replace("{METRICS_DATA}", metricsData)
      .replace("{PREVIOUS_INSIGHT}", previousInsightText);

    // 4. Generate insight
    const insight = await openaiService.generateResponse(dynamicPrompt, {
      temperature: 0,
      max_tokens: constants.ai.maxTokens,
      top_p: 1
    });

    // 5. Extract confidence score
    const confidenceMatch = insight.match(this.responsePatterns.insight.confidence);
    const confidenceScore = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.9;

    return { insight, confidenceScore };
  }
}

module.exports = new AIController();