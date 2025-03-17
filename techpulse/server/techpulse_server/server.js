const OpenAI = require('openai');
const dotenv = require("dotenv");
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const { exec } = require("child_process");
const amountScraped = 5; //ensure that this is the same as the one in scraper.js (i cant be asked to remember how to do this tbh) 
dotenv.config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();


// Define the path to your scraper script
const scraperScriptPath = path.join(__dirname, "scraper.js");

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
        f.description AS field_description,
        s.subfield_id,
        s.subfield_name,
        s.description AS subfield_description,
        m.metric_1,
        m.metric_2,
        m.metric_3,
        m.rationale,
        m.metric_date,
        m.source
      FROM 
        public.field f
      LEFT JOIN 
        public.TIMEDMETRICS m
      ON 
        f.field_id = m.field_id
      LEFT JOIN 
        public.Subfield s
      ON 
        m.subfield_id = s.subfield_id
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

app.post('/api/data2', async (req, res) => {
  const { temperature, top_p, parameter_id } = req.body;
  try {
      // Correct the SQL query syntax with `SET` and add a condition for which row to update
      await pool.query('UPDATE public.modelparameters SET temperature = $1, top_p = $2 WHERE parameter_id = $3', [temperature, top_p, parameter_id]);
      res.status(200).send('Data updated successfully');
  } catch (err) {
      console.error(err);
      res.status(500).send('Error updating data');
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
      WHERE t.metric_date = (SELECT MAX(metric_date) FROM TIMEDMETRICS WHERE field_id = f.field_id) AND t.subfield_id IS NULL
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

    const tempTopPQuery = await pool.query(`SELECT top_p,temperature FROM public.modelparameters ORDER BY parameter_id DESC LIMIT 1`);
    
    if (tempTopPQuery.rowCount === 0) {
      console.log("No TempTopP found.");
      return "NO_TempTopP";
    }

    const tempTopPData = tempTopPQuery.rows[0];
    console.log(`update temp:${tempTopPData.temperature} topP:${tempTopPData.top_p}`);

    // Read articles from the JSON file
    const articlesPath = path.join(__dirname, '../../client/techpulse_app/public/arxiv_papers.json');
    const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));

    // Filter articles for each field and limit to the last {amountScraped} articles
    const articlesData = fieldQuery.rows.map(row => {
      const fieldArticles = articles
        .filter(article => article.field === row.field_name) // Match articles by field name
        .sort((a, b) => new Date(b.published) - new Date(a.published)) // Sort by published date (newest first)
        .slice(0, amountScraped); // Limit to the last {amountScraped} articles

      return fieldArticles.map(article => `
        field_name: ${row.field_name}
        title: ${article.title}
        summary: ${article.summary}
        published: ${article.published}`).join('\n\n');
    }).join('\n\n');

    // Read the prompt template from file
    let promptTemplate = await fsPromises.readFile("./prompts/prompt_update_metrics.txt", "utf8");
    let dynamicPrompt = promptTemplate
      .replace("{FIELD_DATA}", fieldData)
      .replace("{ARTICLES_DATA}", articlesData);

    console.log("Generated Prompt:\n", dynamicPrompt);

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: dynamicPrompt }],
      temperature: tempTopPData.temperature,
      max_tokens: 2048,
      top_p: tempTopPData.top_p
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
    let promptTemplate = await fsPromises.readFile("./prompts/prompt_new_fields.txt", "utf8");
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
const generateInsight = async (type, fieldId) => {
  try {
    let metricsQuery;
    let fieldName = null;

    if (fieldId === 0) {
      // Fetch metrics for fields only (no subfields)
      metricsQuery = await pool.query(`
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
          AND t.subfield_id IS NULL -- Ensure we only get field-level metrics
      `);
    } else {
      // Fetch the field_name for the given field_id
      const fieldQuery = await pool.query(`
        SELECT field_name FROM Field WHERE field_id = $1
      `, [fieldId]);

      if (fieldQuery.rowCount === 0) {
        console.log("Field not found.");
        return "NO_FIELD";
      }

      fieldName = fieldQuery.rows[0].field_name;

      // Fetch metrics for subfields belonging to the specified field_id
      metricsQuery = await pool.query(`
        SELECT 
          s.subfield_id,
          s.subfield_name,
          t.metric_1,
          t.metric_2,
          t.metric_3,
          t.rationale,
          t.metric_date
        FROM 
          Subfield s
        JOIN 
          TIMEDMETRICS t 
        ON 
          s.subfield_id = t.subfield_id
        WHERE 
          t.metric_date = (SELECT MAX(metric_date) FROM TIMEDMETRICS WHERE subfield_id = s.subfield_id)
          AND s.field_id = $1
      `, [fieldId]);
    }

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
    let promptTemplate;
    
    switch (type) {
      case "insight":
        promptTemplate = await fsPromises.readFile("./prompts/insight_prompt_insights.txt", "utf8");
        break;
      case "trends":
        promptTemplate = await fsPromises.readFile("./prompts/insight_prompt_trends.txt", "utf8");
        break;
      case "top":
        promptTemplate = await fsPromises.readFile("./prompts/insight_prompt_top.txt", "utf8");
        break;
      default:
        throw new Error("Invalid insight type");
    }

    const metricsData = metricsQuery.rows.map(row => `
      ${row.field_name ? `field_name: ${row.field_name}` : `subfield_name: ${row.subfield_name}`}
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
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: dynamicPrompt }],
      temperature: 0,
      max_tokens: 2048,
      top_p: 1
    });

    let generatedInsight = response.choices[0]?.message?.content?.trim() || "NO_VALID_AI_RESPONSE";

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
        [fieldId === 0 ? null : fieldId, generatedInsight, confidenceScore]
      );
    }

    // Define the relative path to the Insights directory
    const insightsDir = path.resolve(
      process.cwd(),
      "../../client/techpulse_app/src/components/Insights"
    );

    // Define the file name based on field_id
    let fileName;
    if (fieldId === 0) {
      fileName = "MostRecentInsight.txt";
    } else {
      // Use the field_name to create the file name
      fileName = `MostRecent${fieldName}Insight.txt`;
    }
    const filePath = path.join(insightsDir, fileName);

    // Write the insight to the file
    if (type === "insight") {
    await fsPromises.writeFile(filePath, generatedInsight, 'utf8');
    console.log(`Insight written to ${filePath}`);
    }

    return generatedInsight;

  } catch (error) {
    console.error("Error:", error);
    return "ERROR: Unable to process request.";
  }
};
let promptAISubfield = async (fieldName) => {
  try {
    // Fetch current subfields for the given field
    const subfieldQuery = await pool.query(
      `SELECT subfield_name FROM Subfield WHERE field_id = (SELECT field_id FROM Field WHERE field_name = $1)`,
      [fieldName]
    );
    const subfieldNames = subfieldQuery.rows.map(row => row.subfield_name).join(", ");

    // Read and inject into prompt
    let promptTemplate = await fsPromises.readFile("./prompts/prompt_subfield.txt", "utf8");
    let dynamicPrompt = promptTemplate
      .replace("{FIELD_NAME}", fieldName)
      .replace("{SUBFIELDS}", subfieldNames);

    console.log("Generated Prompt:\n", dynamicPrompt);

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: dynamicPrompt }],
      temperature: 0,
      max_tokens: 2048,
      top_p: 1,
    });

    return response.choices[0]?.message?.content?.trim() || "NO_VALID_AI_RESPONSE";

  } catch (error) {
    console.error("Error:", error);
    return "ERROR: Unable to process request.";
  }
};

// New endpoint to handle subfield generation
app.post("/gpt-subfield", async (req, res) => {
  const { fieldName } = req.body; // Get fieldName from the request body
  console.log("Received fieldName:")
  if (!fieldName) {
    return res.status(400).send("Field name is required.");
  }

  let aiResponse = await promptAISubfield(fieldName);
  console.log("Raw AI Response:\n", aiResponse);

  // Split AI response into separate subfield entries
  const subfieldEntries = aiResponse.split(/\n\s*\n/).filter(entry => entry.trim().startsWith("subfield_name:"));

  if (subfieldEntries.length === 0) {
    console.error("Error: AI response contains no valid subfields.");
    res.status(400).send("Invalid AI response format.");
    return;
  }

  try {
    // Fetch the field_id for the given field name
    const fieldResult = await pool.query('SELECT field_id FROM Field WHERE field_name = $1', [fieldName]);
    if (fieldResult.rowCount === 0) {
      console.error("Error: Field not found.");
      res.status(404).send("Field not found.");
      return;
    }
    const fieldId = fieldResult.rows[0].field_id;

    for (const entry of subfieldEntries) {
      console.log("Processing Entry:\n", entry);
    
      // Extract values using regex
      const subfieldNameMatch = entry.match(/subfield_name:\s*(.+)/);
      console.log("Subfield Name Match:", subfieldNameMatch);
    
      const descriptionMatch = entry.match(/description:\s*([\s\S]+?)\s*\nmetric_1:/);
      console.log("Description Match:", descriptionMatch);
    
      const maturityMatch = entry.match(/metric_1:\s*([\d.]+)/);
      console.log("Maturity Match:", maturityMatch);
    
      const innovationMatch = entry.match(/metric_2:\s*([\d.]+)/);
      console.log("Innovation Match:", innovationMatch);
    
      const relevanceMatch = entry.match(/metric_3:\s*([\d.]+)/);
      console.log("Relevance Match:", relevanceMatch);
    
      const rationaleMatch = entry.match(/rationale:\s*([\s\S]+?)\s*\nsource:/);
      console.log("Rationale Match:", rationaleMatch);
    
      const sourceMatch = entry.match(/source:\s*"?(\bhttps?:\/\/[^\s"]+)"?/);
      console.log("Source Match:", sourceMatch);
    
      if (!subfieldNameMatch || !descriptionMatch || !maturityMatch || !innovationMatch || !relevanceMatch || !rationaleMatch || !sourceMatch) {
        console.error("Error: AI response is in an invalid format.");
        console.error("Problematic entry:", entry);
        res.status(400).send("Invalid AI response format.");
        return;
      }


      const subfieldName = subfieldNameMatch[1].trim();
      const description = descriptionMatch[1].trim();
      const maturity = parseFloat(maturityMatch[1]);
      const innovation = parseFloat(innovationMatch[1]);
      const relevance = parseFloat(relevanceMatch[1]);
      const rationale = rationaleMatch[1].trim();
      const source = sourceMatch[1].trim();

      console.log(`Processing subfield: ${subfieldName}`);

      // Check if the subfield exists
      let subfieldId;
      const existingSubfield = await pool.query(
        'SELECT subfield_id FROM Subfield WHERE subfield_name = $1 AND field_id = $2',
        [subfieldName, fieldId]
      );

      if (existingSubfield.rowCount === 0) {
        // Insert new subfield
        const result = await pool.query(
          `INSERT INTO Subfield (field_id, subfield_name, description) VALUES ($1, $2, $3) RETURNING subfield_id`,
          [fieldId, subfieldName, description]
        );
        subfieldId = result.rows[0].subfield_id;
        console.log(`New subfield '${subfieldName}' added.`);
      } else {
        subfieldId = existingSubfield.rows[0].subfield_id;
      }

      // Insert metrics into TIMEDMETRICS
      await pool.query(
        `INSERT INTO TimedMetrics (metric_1, metric_2, metric_3, metric_date, subfield_id, rationale, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [maturity, innovation, relevance, new Date().toISOString(), subfieldId, rationale, source]
      );

      console.log(`Metrics for '${subfieldName}' inserted successfully.`);
    }

    res.send("Subfields processed successfully.");
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Error processing subfields.");
  }
});
let updateSubfieldTimedMetrics = async (fieldName) => {
  try {
    // Fetch the fieldId using the provided field_name
    const fieldIdQuery = await pool.query("SELECT field_id FROM Field WHERE field_name = $1", [fieldName]);

    if (fieldIdQuery.rowCount === 0) {
      console.log(`Field not found: ${fieldName}`);
      return "NO_FIELDS";
    }

    const fieldId = fieldIdQuery.rows[0].field_id;

    // Fetch subfields and their corresponding metrics for the selected field
    const subfieldQuery = await pool.query(`
      SELECT s.subfield_id, s.subfield_name, t.metric_1, t.metric_2, t.metric_3, t.rationale, t.metric_date
      FROM Subfield s 
      JOIN TimedMetrics t ON s.subfield_id = t.subfield_id 
      WHERE s.field_id = $1 AND t.metric_date = (SELECT MAX(metric_date) FROM TimedMetrics WHERE subfield_id = s.subfield_id)
    `, [fieldId]);

    if (subfieldQuery.rowCount === 0) {
      console.log("No subfields found for the selected field.");
      return "NO_SUBFIELDS";
    }

    const subfieldData = subfieldQuery.rows.map(row => `
      subfield_name: ${row.subfield_name}
      metric_1: ${row.metric_1}
      metric_2: ${row.metric_2}
      metric_3: ${row.metric_3}
      rationale: ${row.rationale},
      metric_date: ${row.metric_date}`).join('\n\n');

    const tempTopPQuery = await pool.query(`SELECT top_p,temperature FROM public.modelparameters ORDER BY parameter_id DESC LIMIT 1`);
    
    if(tempTopPQuery.rowCount == 0) {
      console.log("No TempTopP found.");
      return "NO_TempTopP";
    }

    const tempTopPData = tempTopPQuery.rows[0];
    console.log(`update temp:${tempTopPData.temperature} topP:${tempTopPData.top_p}`);

    // Read the prompt template from file
    let promptTemplate = await fsPromises.readFile("./prompts/prompt_update_metrics.txt", "utf8");
    let dynamicPrompt = promptTemplate.replace("{FIELD_DATA}", subfieldData);

    console.log("Generated Prompt:\n", dynamicPrompt);

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: dynamicPrompt }],
      temperature: tempTopPData.temperature,
      max_tokens: 2048,
      top_p: tempTopPData.top_p
    });

    return response.choices[0]?.message?.content?.trim() || "NO_VALID_AI_RESPONSE";

  } catch (error) {
    console.error("Error:", error);
    return "ERROR: Unable to process request.";
  }
};


app.post("/gpt-update-subfield-metrics", async (req, res) => {
  const { fieldId } = req.body; // Assuming fieldId is provided in the request body
  let aiResponse = await updateSubfieldTimedMetrics(fieldId);
  console.log("Raw AI Response:\n", aiResponse);

  if (aiResponse === "NO_SUBFIELDS") {
    return res.status(200).send("No subfields available for update.");
  }

  if (aiResponse === "NO_VALID_AI_RESPONSE") {
    console.warn("AI response was invalid, but proceeding with request completion.");
    return res.status(200).send("AI response was empty or invalid, but request completed.");
  }

  try {
    const subfieldEntries = aiResponse.split(/\n\s*\n/).filter(entry => entry.trim().startsWith("subfield_name:"));

    if (subfieldEntries.length === 0) {
      console.error("Error: AI response contains no valid subfields.");
      return res.status(400).send("Invalid AI response format.");
    }

    for (const entry of subfieldEntries) {
      const subfieldNameMatch = entry.match(/subfield_name:\s*(.+)/);
      const maturityMatch = entry.match(/metric_1:\s*([\d.]+)/);
      const innovationMatch = entry.match(/metric_2:\s*([\d.]+)/);
      const relevanceMatch = entry.match(/metric_3:\s*([\d.]+)/);
      const rationaleMatch = entry.match(/rationale:\s*([\s\S]+?)\nsource:/);
      const sourceMatch = entry.match(/source:\s*"?(\bhttps?:\/\/[^\s"]+)"?/);

      

      if (!subfieldNameMatch || !maturityMatch || !innovationMatch || !relevanceMatch || !rationaleMatch || !sourcesMatch) {
        console.error("Error: AI response is in an invalid format.", entry);
        continue; // Skip invalid entry but continue processing the rest
      }
 
      const subfieldName = subfieldNameMatch[1].trim();
      const maturity = parseFloat(maturityMatch[1]);
      const innovation = parseFloat(innovationMatch[1]);
      const relevance = parseFloat(relevanceMatch[1]);
      const rationale = rationaleMatch[1].trim();
      const source = sourcesMatch[1].trim();

      console.log(`Updating metrics for subfield: ${subfieldName}`);

      // Fetch subfield ID
      const subfieldResult = await pool.query("SELECT subfield_id FROM Subfield WHERE subfield_name = $1 AND field_id = $2", [subfieldName, fieldId]);
      if (subfieldResult.rowCount === 0) {
        console.error(`Subfield not found: ${subfieldName}`);
        continue;
      }
      const subfieldId = subfieldResult.rows[0].subfield_id;

      // Insert new updated metrics into TIMEDMETRICS
      await pool.query(
        `INSERT INTO TimedMetrics (metric_1, metric_2, metric_3, metric_date, subfield_id, rationale, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [maturity, innovation, relevance, new Date().toISOString(), subfieldId, rationale, source]
      );

      console.log(`Updated metrics for subfield '${subfieldName}' successfully.`);
    }

    res.status(200).send("Subfields updated successfully.");
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Error updating subfields.");
  }
});

  

app.post("/generate-insight", async (req, res) => {
  const { fieldId } = req.body;
  let aiResponse = await generateInsight("insight", fieldId);
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

app.post("/generate-insight-trends", async (req, res) => {
  const { fieldId } = req.body;
  let aiResponse = await generateInsight("trends", fieldId);
  console.log("Raw AI Response:\n", aiResponse);

  if (aiResponse === "NO_METRICS") {
    return res.status(200).send("No metrics available for insight generation.");
  }

  res.status(200).json({ trends: aiResponse });
});

app.post("/generate-insight-top", async (req, res) => {
  const { fieldId } = req.body;
  let aiResponse = await generateInsight("top", fieldId);
  console.log("Raw AI Response:\n", aiResponse);

  if (aiResponse === "NO_METRICS") {
    return res.status(200).send("No metrics available for insight generation.");
  }

  res.status(200).json({ top: aiResponse });
});

app.post('/api/subfields', async (req, res) => {
  const { fieldId } = req.body;

  if (!fieldId) {
    return res.status(400).json({ error: 'fieldId is required' });
  }

  try {
    // Fetch subfields for the given fieldId
    const subfields = await pool.query(`
      SELECT 
        subfield_id,
        subfield_name,
        description AS subfield_description
      FROM Subfield
      WHERE field_id = $1
    `, [fieldId]);

    // Fetch metrics for the subfields
    const subfieldMetrics = await pool.query(`
      SELECT 
        m.timed_metric_id,
        m.metric_1,
        m.metric_2,
        m.metric_3,
        m.metric_date,
        m.rationale,
        m.source,
        s.subfield_name,
        s.description AS subfield_description
      FROM TimedMetrics m
      JOIN Subfield s ON m.subfield_id = s.subfield_id
      WHERE s.field_id = $1
      ORDER BY m.metric_date DESC
    `, [fieldId]);

    // Send the response
    res.json({ subfields: subfields.rows, metrics: subfieldMetrics.rows });
  } catch (error) {
    console.error('Error fetching subfields:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API route to trigger the scraper
app.get("/api/run-scraper", (req, res) => {
  console.log("Scraper API called. Running scraper...");

  exec(`node ${scraperScriptPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing scraper: ${error.message}`);
      return res.status(500).json({ success: false, message: "Scraper failed", error: error.message });
    }
    if (stderr) {
      console.error(`Scraper stderr: ${stderr}`);
      return res.status(500).json({ success: false, message: "Scraper encountered an issue", error: stderr });
    }

    console.log("Scraper executed successfully.");
    return res.json({ success: true, message: "Scraper ran successfully", output: stdout });
  });
});
