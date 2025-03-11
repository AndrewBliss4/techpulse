const OpenAI = require('openai');
const dotenv = require("dotenv");
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');

dotenv.config();

const express = require("express");
const bodyParser = require("body-parser");
const app = express();

// Connection to postgres
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: "admin",
  password: "admin",
  database: "techpulse"
});

app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

// ----------- POSTGRES BACKEND ----------- //

app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT top_p,temperature FROM public.modelparameters ORDER BY parameter_id DESC LIMIT 1');
    console.log('Data fetched successfully:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/radar', async (req, res) => {
  try {
      const query = `
          SELECT 
              f.field_id,
              f.field_name,
              f.description,
              m.metric_1,
              m.metric_2,
              m.metric_3,
              m.rationale,
              m.metric_date,
              m.source
          FROM 
              public.field f
          JOIN 
              public.TIMEDMETRICS m
          ON 
              f.field_id = m.field_id
      `;

      const result = await pool.query(query);
      console.log('Joined data fetched successfully:', result.rows);
      res.json(result.rows);
  } catch (error) {
      console.error('Error fetching joined data:', error.message);
      res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/latest-id', async (req, res) => {
  try {
      const result = await pool.query('SELECT insight_id FROM public.insight ORDER BY insight_id DESC LIMIT 1');
      console.log('Data fetched successfully:', result.rows[0]);
      res.json({ latestId: result.rows[0]?.insight_id });
  } catch (error) {
      console.error('Error fetching data:', error.message);
      res.status(500).json({ error: 'Internal server error' });
  }
});

// Example API endpoint to insert data into feeback table
app.post('/api/data1', async (req, res) => {
    const { insight_id, feedback_text, rating } = req.body;
    try {
        await pool.query('INSERT INTO public.feedback (insight_id ,feedback_text, rating) VALUES ($1, $2, $3)', [insight_id, feedback_text, rating]);
        res.status(201).send('Data inserted');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error inserting data');
    }
});

// ----------- AI BACKEND ----------- //

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.listen(4000, () => {
  console.log("Server is running on port 4000");
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const fsPromises = require("fs").promises;

let updateExistingFieldMetrics = async () => {
  try {
    // Fetch field data
    const fieldQuery = await pool.query(`
      SELECT f.field_id, f.field_name, t.metric_1, t.metric_2, t.metric_3, t.rationale 
      FROM Field f 
      JOIN TIMEDMETRICS t ON f.field_id = t.field_id 
      WHERE t.metric_date = (SELECT MAX(metric_date) FROM TIMEDMETRICS WHERE field_id = f.field_id)
    `);

    if (fieldQuery.rowCount === 0) {
      console.log("No fields found.");
      return "NO_FIELDS";
    }

    const fieldData = fieldQuery.rows.map(row => `
      field_name: ${row.field_name}
      metric_1: ${row.metric_1}
      metric_2: ${row.metric_2}
      metric_3: ${row.metric_3}
      rationale: ${row.rationale},
      metric_date: ${row.metric_date}`).join('\n\n');
      

    // Read the prompt template from file
    let promptTemplate = await fsPromises.readFile("prompt_update_metrics.txt", "utf8");
    let dynamicPrompt = promptTemplate.replace("{FIELD_DATA}", fieldData);

    console.log("Generated Prompt:\n", dynamicPrompt);

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: dynamicPrompt }],
      temperature: 0,
      max_tokens: 2048,
      top_p: 1
    });

    return response.choices[0]?.message?.content?.trim() || "NO_VALID_AI_RESPONSE";

  } catch (error) {
    console.error("Error:", error);
    return "ERROR: Unable to process request.";
  }
};

app.post("/gpt-update-metrics", async (req, res) => {
  let aiResponse = await updateExistingFieldMetrics();
  console.log("Raw AI Response:\n", aiResponse);

  if (aiResponse === "NO_FIELDS") {
    return res.status(200).send("No fields available for update.");
  }

  if (aiResponse === "NO_VALID_AI_RESPONSE") {
    console.warn("AI response was invalid, but proceeding with request completion.");
    return res.status(200).send("AI response was empty or invalid, but request completed.");
  }

  try {
    const fieldEntries = aiResponse.split(/\n\s*\n/).filter(entry => entry.trim().startsWith("field_name:"));

    if (fieldEntries.length === 0) {
      console.error("Error: AI response contains no valid fields.");
      return res.status(400).send("Invalid AI response format.");
    }

    for (const entry of fieldEntries) {
      const fieldNameMatch = entry.match(/field_name:\s*(.+)/);
      const maturityMatch = entry.match(/metric_1:\s*([\d.]+)/);
      const innovationMatch = entry.match(/metric_2:\s*([\d.]+)/);
      const relevanceMatch = entry.match(/metric_3:\s*([\d.]+)/);
      const rationaleMatch = entry.match(/rationale:\s*([\s\S]+?)\nsource:/);
      const sourcesMatch = entry.match(/source:\s*(https?:\/\/[^\s]+)/);

      if (!fieldNameMatch || !maturityMatch || !innovationMatch || !relevanceMatch || !rationaleMatch || !sourcesMatch) {
        console.error("Error: AI response is in an invalid format.", entry);
        continue; // Skip invalid entry but continue processing the rest
      }

      const fieldName = fieldNameMatch[1].trim();
      const maturity = parseFloat(maturityMatch[1]);
      const innovation = parseFloat(innovationMatch[1]);
      const relevance = parseFloat(relevanceMatch[1]);
      const rationale = rationaleMatch[1].trim();
      const source = sourcesMatch[1].trim();

      console.log(`Updating metrics for field: ${fieldName}`);

      // Fetch field ID
      const fieldResult = await pool.query("SELECT field_id FROM Field WHERE field_name = $1", [fieldName]);
      if (fieldResult.rowCount === 0) {
        console.error(`Field not found: ${fieldName}`);
        continue;
      }
      const fieldId = fieldResult.rows[0].field_id;

      // Insert new updated metrics into TIMEDMETRICS
      await pool.query(
        `INSERT INTO TIMEDMETRICS (metric_1, metric_2, metric_3, metric_date, field_id, rationale, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [maturity, innovation, relevance, new Date().toISOString(), fieldId, rationale, source]
      );

      console.log(`Updated metrics for '${fieldName}' successfully.`);
    }

    res.status(200).send("Fields updated successfully.");
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Error updating fields.");
  }
});

// Used for new fields generation
let promptAIField = async () => {
  try {
    // Fetch current field names
    const fieldQuery = await pool.query("SELECT field_name FROM Field");
    const fieldNames = fieldQuery.rows.map(row => row.field_name).join(", ");

    // Read and inject into prompt
    let promptTemplate = await fsPromises.readFile("prompt_new_fields.txt", "utf8");
    let dynamicPrompt = promptTemplate.replace("{CURRENT_FIELDS}", fieldNames);

    console.log("Generated Prompt:\n", dynamicPrompt);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: dynamicPrompt }],
      temperature: 0,
      max_tokens: 2048,
      top_p: 1
    });

    return response.choices[0]?.message?.content?.trim() || "NO_VALID_AI_RESPONSE";

  } catch (error) {
    console.error("Error:", error);
    return "ERROR: Unable to process request.";
  }
};



// New endpoint
app.post("/gpt-field", async (req, res) => {
  let aiResponse = await promptAIField();
  console.log("Raw AI Response:\n", aiResponse);

  // Split AI response into separate field entries
  const fieldEntries = aiResponse.split(/\n\s*\n/).filter(entry => entry.trim().startsWith("field_name:"));

  if (fieldEntries.length === 0) {
    console.error("Error: AI response contains no valid fields.");
    res.status(400).send("Invalid AI response format.");
    return;
  }

  try {
    for (const entry of fieldEntries) {
      // Extract values using regex
      const fieldNameMatch = entry.match(/field_name:\s*(.+)/);
      const descriptionMatch = entry.match(/description:\s*([\s\S]+?)\nmetric_1:/);
      const maturityMatch = entry.match(/metric_1:\s*([\d.]+)/);
      const innovationMatch = entry.match(/metric_2:\s*([\d.]+)/);
      const relevanceMatch = entry.match(/metric_3:\s*([\d.]+)/);
      const rationaleMatch = entry.match(/rationale:\s*([\s\S]+?)\nsource:/);
      const sourcesMatch = entry.match(/source:\s*(https?:\/\/[^\s]+)/);

      if (!fieldNameMatch || !descriptionMatch || !maturityMatch || !innovationMatch || !relevanceMatch || !rationaleMatch || !sourcesMatch) {
        console.error("Error: AI response is in an invalid format.");
        res.status(400).send("Invalid AI response format.");
        return;
      }

      const fieldName = fieldNameMatch[1].trim();
      const description = descriptionMatch[1].trim();
      const maturity = parseFloat(maturityMatch[1]);
      const innovation = parseFloat(innovationMatch[1]);
      const relevance = parseFloat(relevanceMatch[1]);
      const rationale = rationaleMatch[1].trim();
      const source = sourcesMatch[1].trim();

      console.log(`Processing field: ${fieldName}`);

      // Check if the field exists
      let fieldId;
      const existingField = await pool.query('SELECT field_id FROM Field WHERE field_name = $1', [fieldName]);

      if (existingField.rowCount === 0) {
        // Insert new field
        const result = await pool.query(
          `INSERT INTO Field (field_name, description) VALUES ($1, $2) RETURNING field_id`,
          [fieldName, description]
        );
        fieldId = result.rows[0].field_id;
        console.log(`New field '${fieldName}' added.`);
      } else {
        fieldId = existingField.rows[0].field_id;
      }

      // Insert metrics into TIMEDMETRICS
      await pool.query(
        `INSERT INTO TIMEDMETRICS (metric_1, metric_2, metric_3, metric_date, field_id, rationale, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [maturity, innovation, relevance, new Date().toISOString(), fieldId, rationale, source]
      );

      console.log(`Metrics for '${fieldName}' inserted successfully.`);
    }

    res.send("Fields processed successfully.");
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Error processing fields.");
  }
});


//insight generation
const generateInsight = async () => {
  try {
    // Fetch the most recent timed metrics and rationales for each field
    const metricsQuery = await pool.query(`
      SELECT 
        f.field_id,
        f.field_name,
        t.metric_1,
        t.metric_2,
        t.metric_3,
        t.rationale,
        t.metric_date
      FROM 
        Field f
      JOIN 
        TIMEDMETRICS t 
      ON 
        f.field_id = t.field_id
      WHERE 
        t.metric_date = (SELECT MAX(metric_date) FROM TIMEDMETRICS WHERE field_id = f.field_id)
    `);

    if (metricsQuery.rowCount === 0) {
      console.log("No metrics found.");
      return "NO_METRICS";
    }

    // Fetch the previous insight, if it exists
    const previousInsightQuery = await pool.query(`
      SELECT 
        i.insight_text,
        i.generated_at
      FROM 
        Insight i
      ORDER BY 
        i.generated_at DESC
      LIMIT 1
    `);

    const previousInsight = previousInsightQuery.rowCount > 0 ? previousInsightQuery.rows[0] : null;

    // Construct the dynamic prompt
    let promptTemplate = await fsPromises.readFile("insight_prompt.txt", "utf8");

    const metricsData = metricsQuery.rows.map(row => `
      field_name: ${row.field_name}
      metric_1: ${row.metric_1}
      metric_2: ${row.metric_2}
      metric_3: ${row.metric_3}
      rationale: ${row.rationale}
      metric_date: ${row.metric_date}`).join('\n\n');

    const previousInsightText = previousInsight ? `
      Previous Insight:
      ${previousInsight.insight_text}
      Generated At: ${previousInsight.generated_at}` : "No previous insight available.";

    const dynamicPrompt = promptTemplate
      .replace("{METRICS_DATA}", metricsData)
      .replace("{PREVIOUS_INSIGHT}", previousInsightText);

    console.log("Generated Prompt:\n", dynamicPrompt);

    // Call OpenAI to generate the insight
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: dynamicPrompt }],
      temperature: 0,
      max_tokens: 2048,
      top_p: 1
    });

    const generatedInsight = response.choices[0]?.message?.content?.trim() || "NO_VALID_AI_RESPONSE";

    // Log the raw AI response for debugging
    console.log("Raw AI Response:\n", generatedInsight);

    // Extract the confidence score from the generated insight
    let confidenceScore = 0.9; // Default value if extraction fails
    const confidenceScoreMatch = generatedInsight.match(/Confidence Score:(\s*[\d.]+)/);

    if (confidenceScoreMatch && confidenceScoreMatch[1]) {
      confidenceScore = parseFloat(confidenceScoreMatch[1]);
      console.log("Extracted Confidence Score:", confidenceScore);
    } else {
      console.warn("Confidence score not found in AI response. Using default value:", confidenceScore);
    }

    // Insert the generated insight into the Insight table
    if (generatedInsight !== "NO_VALID_AI_RESPONSE") {
      await pool.query(
        `INSERT INTO Insight (field_id, insight_text, confidence_score)
         VALUES ($1, $2, $3)`,
        [null, generatedInsight, confidenceScore]
      );
    }

    return generatedInsight;

  } catch (error) {
    console.error("Error:", error);
    return "ERROR: Unable to process request.";
  }
};
app.post("/generate-insight", async (req, res) => {
  let aiResponse = await generateInsight();
  console.log("Raw AI Response:\n", aiResponse);

  if (aiResponse === "NO_METRICS") {
    return res.status(200).send("No metrics available for insight generation.");
  }

  if (aiResponse === "NO_VALID_AI_RESPONSE") {
    console.warn("AI response was invalid, but proceeding with request completion.");
    return res.status(200).send("AI response was empty or invalid, but request completed.");
  }

  res.status(200).json({ insight: aiResponse });
});