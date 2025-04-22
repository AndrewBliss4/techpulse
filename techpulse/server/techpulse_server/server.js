const OpenAI = require('openai');
const dotenv = require("dotenv");
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const { exec } = require("child_process");
dotenv.config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const amountScraped = 5;
const amountScrapedsf = 1;

// Define the path to your scraper script
const scraperScriptPath = path.join(__dirname, "scraper.js");
// Define the path to your scraper script
const subfieldScraperScriptPath = path.join(__dirname, "scraper_sf.js");

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
app.get("/get-all-field-ids", async (req, res) => {
  try {
    const result = await pool.query("SELECT field_id FROM Field");
    const fieldIds = result.rows.map(row => row.field_id);
    res.status(200).json({ fieldIds });
  } catch (error) {
    console.error("Error fetching field IDs:", error);
    res.status(500).send("Error fetching field IDs.");
  }
});
app.get("/get-all-subfield-ids", async (req, res) => {
  const { fieldId } = req.query;

  if (!fieldId) {
    return res.status(400).send("Field ID is required.");
  }

  try {
    const result = await pool.query("SELECT subfield_id FROM Subfield WHERE field_id = $1", [fieldId]);
    const subfieldIds = result.rows.map(row => row.subfield_id);
    res.status(200).json({ subfieldIds });
  } catch (error) {
    console.error("Error fetching subfield IDs:", error);
    res.status(500).send("Error fetching subfield IDs.");
  }
});
app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT top_p,temperature FROM public.modelparameters ORDER BY parameter_id DESC LIMIT 1');
    //console.log('Data fetched successfully:', result.rows);
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
    //console.log('Joined data fetched successfully:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching joined data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/latest-id', async (req, res) => {
  try {
    const result = await pool.query('SELECT insight_id FROM public.insight ORDER BY insight_id DESC LIMIT 1');
    //console.log('Data fetched successfully:', result.rows[0]);
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


app.post("/gpt-update-metrics", async (req, res) => {
  const { field_id } = req.body; // Accept field_id from the request body

  if (!field_id) {
    return res.status(400).send("Field ID is required.");
  }

  try {
    // Fetch the specific field from the database
    const fieldQuery = await pool.query(`
      SELECT f.field_id, f.field_name, t.metric_1, t.metric_2, t.metric_3, t.rationale 
      FROM Field f 
      JOIN TIMEDMETRICS t 
          ON f.field_id = t.field_id 
      WHERE t.metric_date = (
          SELECT MAX(metric_date) 
          FROM TIMEDMETRICS 
          WHERE field_id = f.field_id 
            AND subfield_id IS NULL  -- Exclude rows where subfield_id is NOT NULL
      ) 
      AND t.subfield_id IS NULL
      AND f.field_id = $1;
    `, [field_id]);

    if (fieldQuery.rowCount === 0) {
      console.log(`No field found with ID: ${field_id}`);
      return res.status(404).send("Field not found.");
    }

    const row = fieldQuery.rows[0];
    const fieldName = row.field_name;

    // Fetch temperature and top_p parameters
    const tempTopPQuery = await pool.query(`SELECT top_p, temperature FROM public.modelparameters ORDER BY parameter_id DESC LIMIT 1`);
    if (tempTopPQuery.rowCount === 0) {
      console.log("No TempTopP found.");
      return res.status(404).send("No TempTopP found.");
    }
    const tempTopPData = tempTopPQuery.rows[0];
    console.log(`Update temp: ${tempTopPData.temperature}, topP: ${tempTopPData.top_p}`);

    // Read articles from the JSON file
    const articlesPath = path.join(__dirname, "scrape_db", "arxiv_papers.json");
    const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));

    // Read the prompt template from file
    let promptTemplate = await fsPromises.readFile("./prompts/prompt_update_metrics.txt", "utf8");

    // Filter articles for the current field and limit to the last {amountScraped} articles
    const fieldArticles = articles
      .filter(article => article.field === fieldName) // Match articles by field name
      .sort((a, b) => new Date(b.published) - new Date(a.published)) // Sort by published date (newest first)
      .slice(0, amountScraped); // Limit to the last {amountScraped} articles

    // Construct articles data string for the current field
    const articlesData = fieldArticles.map(article => `
      field_name: ${fieldName}
      title: ${article.title}
      summary: ${article.summary}
      published: ${article.published}`).join('\n\n');

    // Construct field data string for the current field
    const fieldData = `
      field_name: ${fieldName}
      metric_1: ${row.metric_1}
      metric_2: ${row.metric_2}
      metric_3: ${row.metric_3}
      rationale: ${row.rationale},
      metric_date: ${row.metric_date}`;

    // Construct the dynamic prompt for the current field
    let dynamicPrompt = promptTemplate
      .replace("{FIELD_DATA}", fieldData)
      .replace("{ARTICLES_DATA}", articlesData);

    //console.log(`Generated Prompt for ${fieldName}:\n`, dynamicPrompt);

    // Call OpenAI API for the current field
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: dynamicPrompt }],
      temperature: tempTopPData.temperature,
      max_tokens: 2048,
      top_p: tempTopPData.top_p,
    });

    const aiResponse = response.choices[0]?.message?.content?.trim() || "NO_VALID_AI_RESPONSE";
    //console.log(`Raw AI Response for ${fieldName}:\n`, aiResponse);

    if (aiResponse === "NO_VALID_AI_RESPONSE") {
      console.warn(`AI response was invalid for field: ${fieldName}`);
      return res.status(400).send("AI response was invalid.");
    }

    // Parse the AI response for the current field
    const fieldNameMatch = aiResponse.match(/field_name:\s*(.+)/);
    const maturityMatch = aiResponse.match(/metric_1:\s*([\d.]+)/);
    const innovationMatch = aiResponse.match(/metric_2:\s*([\d.]+)/);
    const relevanceMatch = aiResponse.match(/metric_3:\s*([\d.]+)/);
    const rationaleMatch = aiResponse.match(/rationale:\s*([\s\S]+?)\nsource:/);
    const sourcesMatch = aiResponse.match(/source:\s*(https?:\/\/[^\s]+)/);

    if (!fieldNameMatch || !maturityMatch || !innovationMatch || !relevanceMatch || !rationaleMatch || !sourcesMatch) {
      console.error(`Error: AI response is in an invalid format for field: ${fieldName}`);
      return res.status(400).send("AI response is in an invalid format.");
    }

    const maturity = parseFloat(maturityMatch[1]);
    const innovation = parseFloat(innovationMatch[1]);
    const relevance = parseFloat(relevanceMatch[1]);
    const rationale = rationaleMatch[1].trim();
    const source = sourcesMatch[1].trim();

    console.log(`Updating metrics for field: ${fieldName}`);

    // Insert new updated metrics into TIMEDMETRICS
    await pool.query(
      `INSERT INTO TIMEDMETRICS (metric_1, metric_2, metric_3, metric_date, field_id, rationale, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [maturity, innovation, relevance, new Date().toISOString(), row.field_id, rationale, source]
    );

    //console.log(`Updated metrics for '${fieldName}' successfully.`);
    return res.status(200).send(`Metrics updated successfully for field: ${fieldName}`);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Error updating metrics.");
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

    //console.log("Generated Prompt:\n", dynamicPrompt);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: dynamicPrompt }],
      temperature: 0,
      max_tokens: 2048,
      top_p: 1,
    });

    const aiResponse = response.choices[0]?.message?.content?.trim() || "NO_VALID_AI_RESPONSE";

    // Log the raw AI response for debugging
    //console.log("Raw AI Response:\n", aiResponse);

    // Check if the AI response is "NUH_UH"
    if (aiResponse === "NUH_UH") {
      console.log("AI could not think of any new fields.");
      return "NUH_UH";
    }

    return aiResponse;
  } catch (error) {
    console.error("Error:", error);
    return "ERROR: Unable to process request.";
  }
};

// New field endpoint 
app.post("/gpt-field", async (req, res) => {
  let aiResponse = await promptAIField();
  //console.log("Raw AI Response in Endpoint:\n", aiResponse);

  // Handle the "NUH_UH" case
  if (aiResponse === "NUH_UH") {
    return res.status(200).send("AI could not think of any new fields.");
  }

  // Handle invalid AI response
  if (aiResponse === "NO_VALID_AI_RESPONSE" || aiResponse === "ERROR: Unable to process request.") {
    return res.status(400).send("Invalid AI response.");
  }

  // Split AI response into separate field entries
  const fieldEntries = aiResponse.split(/\n\s*\n/).filter(entry => entry.trim().startsWith("field_name:"));

  if (fieldEntries.length === 0) {
    console.error("Error: AI response contains no valid fields.");
    return res.status(400).send("Invalid AI response format.");
  }

  try {
    for (const entry of fieldEntries) {
      //console.log("Processing Entry:\n", entry);

      // Extract values using regex
      const fieldNameMatch = entry.match(/field_name:\s*(.+)/);
      const descriptionMatch = entry.match(/description:\s*([\s\S]+?)\nmetric_1:/);
      const maturityMatch = entry.match(/metric_1:\s*([\d.]+)/);
      const innovationMatch = entry.match(/metric_2:\s*([\d.]+)/);
      const relevanceMatch = entry.match(/metric_3:\s*([\d.]+)/);
      const rationaleMatch = entry.match(/rationale:\s*([\s\S]+?)\nsource:/);
      const sourcesMatch = entry.match(/source:\s*(https?:\/\/[^\s]+)/);

      // Validate extracted values
      if (
        !fieldNameMatch ||
        !descriptionMatch ||
        !maturityMatch ||
        !innovationMatch ||
        !relevanceMatch ||
        !rationaleMatch ||
        !sourcesMatch
      ) {
        console.error("Error: AI response is in an invalid format.", entry);
        continue; // Skip invalid entry but continue processing the rest
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

    res.status(200).send("Fields processed successfully.");
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Error processing fields.");
  }
});

//insight generation
const generateInsight = async (type) => {
  try {
    // Fetch the two most recent timed metrics for each field
    const metricsQuery = await pool.query(`
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
        FROM 
          Field f
        JOIN 
          TIMEDMETRICS t 
        ON 
          f.field_id = t.field_id
        WHERE 
          t.subfield_id IS NULL  -- Ensure no subfield_id is present
      )
      SELECT
        field_id,
        field_name,
        metric_1,
        metric_2,
        metric_3,
        rationale,
        metric_date
      FROM 
        recent_metrics
      WHERE 
        rn <= 2
      ORDER BY 
        field_id, metric_date DESC;
    `);

    if (metricsQuery.rowCount === 0) {
      console.log("No metrics found.");
      return "NO_METRICS";
    }

    // Group metrics by field_id to calculate the growth for each metric
    const fields = {};
    metricsQuery.rows.forEach(row => {
      if (!fields[row.field_id]) {
        fields[row.field_id] = [];
      }
      fields[row.field_id].push(row);
    });

    // Calculate growths for each field (metric_1, metric_2, and metric_3)
    const growthData = Object.keys(fields).map(field_id => {
      const fieldMetrics = fields[field_id];

      // If only one metric is available, the growths are 0
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
        // Avoid division by zero and handle new trends (no previous data)
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
    let promptTemplate= await fsPromises.readFile("./prompts/full_radar_insight_generation.txt", "utf8");

    // Format the growth data to include both the most recent metrics and growths
    const growthDataFormatted = growthData.map(item => `
      Field Name: ${item.field_name}
      
      Most Recent Metrics:
        Interest (metric_1): ${item.most_recent_metric_1} (growth: ${item.growth_metric_1})
        Innovation (metric_2): ${item.most_recent_metric_2} (growth: ${item.growth_metric_2})
        Relevance to Banking (metric_3): ${item.most_recent_metric_3} (growth: ${item.growth_metric_3})
      
      Rationale: ${item.rationale}
    `).join('\n\n');

    const previousInsightText = previousInsight ? `Previous Insight:\n${previousInsight.insight_text}\nGenerated At: ${previousInsight.generated_at}` : "No previous insight available.";

    // Replace {METRICS_DATA} with the formatted growth data
    const dynamicPrompt = promptTemplate
      .replace("{METRICS_DATA}", growthDataFormatted)
      .replace("{PREVIOUS_INSIGHT}", previousInsightText);

    //console.log("Generated Prompt:\n", dynamicPrompt);

    // Save the dynamic prompt to the /prompts folder as POPULATEDPROMPT.txt
    const promptsDir = path.resolve(process.cwd(), "prompts");
    if (!fs.existsSync(promptsDir)) {
      fs.mkdirSync(promptsDir, { recursive: true });
    }
    const populatedPromptFilePath = path.join(promptsDir, "POPULATEDPROMPT.txt");
    await fsPromises.writeFile(populatedPromptFilePath, dynamicPrompt, 'utf8');
    console.log(`Dynamic prompt saved to ${populatedPromptFilePath}`);

    // Call OpenAI to generate the insight
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: dynamicPrompt }],
      temperature: 0,
      max_tokens: 3000,
      top_p: 1
    });

    const generatedInsight = response.choices[0]?.message?.content?.trim() || "NO_VALID_AI_RESPONSE";

    // Log the raw AI response for debugging
    //console.log("Raw AI Response:\n", generatedInsight);

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

      // Define the relative path to the Insights directory
      const insightsDir = path.resolve(
        process.cwd(),
        "../../client/techpulse_app/src/components/Insights"
      );

      // Define the file name based on field_id
      let fileName = "MostRecentInsight.txt";
      
      const filePath = path.join(insightsDir, fileName);

      // Write the insight to the file
      if (type === "insight") {
        await fsPromises.writeFile(filePath, generatedInsight, 'utf8');
        console.log(`Insight written to ${filePath}`);
      }
    }

    return generatedInsight;

  } catch (error) {
    console.error("Error:", error);
    return "ERROR: Unable to process request.";
  }
}



//sub insight generation
const generateSubInsight = async (type, fieldId) => {
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
        return { insight: "NO_FIELD", confidenceScore: 0 };
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
      return { insight: "NO_METRICS", confidenceScore: 0 };
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
        promptTemplate = await fsPromises.readFile("./prompts/insight_subfield_gen.txt", "utf8");
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
      Interest: ${row.metric_1}
      Innovation: ${row.metric_2}
      Relevance to RBC: ${row.metric_3}
      rationale: ${row.rationale}
      metric_date: ${row.metric_date}`).join('\n\n');

    const previousInsightText = previousInsight ? `
      Previous Insight:
      ${previousInsight.insight_text}
      Generated At: ${previousInsight.generated_at}` : "No previous insight available.";

    const dynamicPrompt = promptTemplate
      .replace("{METRICS_DATA}", metricsData)
      .replace("{PREVIOUS_INSIGHT}", previousInsightText);

    //console.log("Generated Prompt:\n", dynamicPrompt);

    // Call OpenAI to generate the insight
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: dynamicPrompt }],
      temperature: 0,
      max_tokens: 2048,
      top_p: 1
    });

    let generatedInsight = response.choices[0]?.message?.content?.trim() || "NO_VALID_AI_RESPONSE";

    // Log the raw AI response for debugging
    //console.log("Raw AI Response:\n", generatedInsight);

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

    // Return both the generated insight and the confidence score
    return { insight: generatedInsight, confidenceScore };

  } catch (error) {
    console.error("Error:", error);
    return { insight: "ERROR: Unable to process request.", confidenceScore: 0 };
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

    //console.log("Generated Prompt:\n", dynamicPrompt);

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
  const { fieldName, fieldId } = req.body; // Get fieldName and fieldId from the request body
  console.log("Received fieldName:", fieldName);
  if (!fieldName || !fieldId) {
    return res.status(400).send("Field name and field ID are required.");
  }

  let aiResponse = await promptAISubfield(fieldName);
  //console.log("Raw AI Response:\n", aiResponse);

  // Split AI response into separate subfield entries
  const subfieldEntries = aiResponse.split(/\n\s*\n/).filter(entry => entry.trim().startsWith("subfield_name:"));

  if (subfieldEntries.length === 0) {
    console.error("Error: AI response contains no valid subfields.");
    return res.status(400).send("Invalid AI response format.");
  }

  try {
    // Fetch the field_id for the given field name
    const fieldResult = await pool.query('SELECT field_id FROM Field WHERE field_name = $1', [fieldName]);
    if (fieldResult.rowCount === 0) {
      console.error("Error: Field not found.");
      return res.status(404).send("Field not found.");
    }
    const fieldId = fieldResult.rows[0].field_id;

    for (const entry of subfieldEntries) {
      //console.log("Processing Entry:\n", entry);

      // Extract values using regex
      const subfieldNameMatch = entry.match(/subfield_name:\s*(.+)/);
      //console.log("Subfield Name Match:", subfieldNameMatch);

      const descriptionMatch = entry.match(/description:\s*([\s\S]+?)\s*\nmetric_1:/);
      //console.log("Description Match:", descriptionMatch);

      const maturityMatch = entry.match(/metric_1:\s*([\d.]+)/);
      //console.log("Maturity Match:", maturityMatch);

      const innovationMatch = entry.match(/metric_2:\s*([\d.]+)/);
     //console.log("Innovation Match:", innovationMatch);

      const relevanceMatch = entry.match(/metric_3:\s*([\d.]+)/);
      //console.log("Relevance Match:", relevanceMatch);

      const rationaleMatch = entry.match(/rationale:\s*([\s\S]+?)\s*\nsource:/);
      //console.log("Rationale Match:", rationaleMatch);

      const sourceMatch = entry.match(/source:\s*"?(\bhttps?:\/\/[^\s"]+)"?/);
      //console.log("Source Match:", sourceMatch);

      if (!subfieldNameMatch || !descriptionMatch || !maturityMatch || !innovationMatch || !relevanceMatch || !rationaleMatch || !sourceMatch) {
        console.error("Error: AI response is in an invalid format.");
        console.error("Problematic entry:", entry);
        return res.status(400).send("Invalid AI response format.");
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
        `INSERT INTO TimedMetrics (metric_1, metric_2, metric_3, metric_date, field_id, subfield_id, rationale, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [maturity, innovation, relevance, new Date().toISOString(), fieldId, subfieldId, rationale, source]
      );

      console.log(`Metrics for '${subfieldName}' inserted successfully.`);
    }

    // Return success response after processing subfields
    res.status(200).json({
      message: "Subfields processed successfully.",
    });

  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Error processing subfields.");
  }
});

app.post("/gpt-update-subfield-metrics", async (req, res) => {
  const { subfield_id, field_id } = req.body; // Accept subfield_id and field_id from the request body

  if (!subfield_id || !field_id) {
    return res.status(400).send("Subfield ID and Field ID are required.");
  }

  try {
    // Fetch the specific subfield from the database
    const subfieldQuery = await pool.query(`
      SELECT s.subfield_id, s.subfield_name, t.metric_1, t.metric_2, t.metric_3, t.rationale 
      FROM Subfield s 
      JOIN TIMEDMETRICS t ON s.subfield_id = t.subfield_id 
      WHERE t.metric_date = (
          SELECT MAX(metric_date) 
          FROM TIMEDMETRICS 
          WHERE subfield_id = s.subfield_id
      ) 
      AND s.subfield_id = $1
      AND s.field_id = $2
      AND t.subfield_id IS NOT NULL;
    `, [subfield_id, field_id]);

    if (subfieldQuery.rowCount === 0) {
      console.log(`No subfield found with ID: ${subfield_id} for field ID: ${field_id}`);
      return res.status(404).send("Subfield not found.");
    }

    const row = subfieldQuery.rows[0];
    const subfieldName = row.subfield_name;

    // Fetch temperature and top_p parameters
    const tempTopPQuery = await pool.query(`SELECT top_p, temperature FROM public.modelparameters ORDER BY parameter_id DESC LIMIT 1`);
    if (tempTopPQuery.rowCount === 0) {
      console.log("No TempTopP found.");
      return res.status(404).send("No TempTopP found.");
    }
    const tempTopPData = tempTopPQuery.rows[0];
    console.log(`Update temp: ${tempTopPData.temperature}, topP: ${tempTopPData.top_p}`);

    // Read articles from the JSON file
    const articlesPath = path.join(__dirname, "scrape_db", "arxiv_papers_sf.json");
    const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));

    // Read the prompt template from file
    let promptTemplate = await fsPromises.readFile("./prompts/prompt_update_metrics.txt", "utf8");

    // Filter articles for the current subfield and limit to the last {amountScrapedsf} articles
    const subfieldArticles = articles
      .filter(article => article.subfield_id === subfield_id) // Match articles by subfield_id
      .sort((a, b) => new Date(b.published) - new Date(a.published)) // Sort by published date (newest first)
      .slice(0, amountScrapedsf); // Limit to the last {amountScrapedsf} articles

    // Construct articles data string for the current subfield
    const articlesData = subfieldArticles.map(article => `
      subfield_name: ${subfieldName}
      title: ${article.title}
      summary: ${article.summary}
      published: ${article.published}`).join('\n\n');

    // Construct subfield data string for the current subfield
    const subfieldData = `
      subfield_name: ${subfieldName}
      metric_1: ${row.metric_1}
      metric_2: ${row.metric_2}
      metric_3: ${row.metric_3}
      rationale: ${row.rationale},
      metric_date: ${row.metric_date}`;

    // Construct the dynamic prompt for the current subfield
    let dynamicPrompt = promptTemplate
      .replace("{FIELD_DATA}", subfieldData)
      .replace("{ARTICLES_DATA}", articlesData);

    //console.log(`Generated Prompt for ${subfieldName}:\n`, dynamicPrompt);

    // Call OpenAI API for the current subfield
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: dynamicPrompt }],
      temperature: tempTopPData.temperature,
      max_tokens: 2048,
      top_p: tempTopPData.top_p,
    });

    const aiResponse = response.choices[0]?.message?.content?.trim() || "NO_VALID_AI_RESPONSE";
    //console.log(`Raw AI Response for ${subfieldName}:\n`, aiResponse);

    if (aiResponse === "NO_VALID_AI_RESPONSE") {
      console.warn(`AI response was invalid for subfield: ${subfieldName}`);
      return res.status(400).send("AI response was invalid.");
    }

    // Parse the AI response for the current subfield
    const subfieldNameMatch = aiResponse.match(/field_name:\s*(.+)/);
    const maturityMatch = aiResponse.match(/metric_1:\s*([\d.]+)/);
    const innovationMatch = aiResponse.match(/metric_2:\s*([\d.]+)/);
    const relevanceMatch = aiResponse.match(/metric_3:\s*([\d.]+)/);
    const rationaleMatch = aiResponse.match(/rationale:\s*([\s\S]+?)\nsource:/);
    const sourcesMatch = aiResponse.match(/source:\s*(https?:\/\/[^\s]+)/);

    if (!subfieldNameMatch || !maturityMatch || !innovationMatch || !relevanceMatch || !rationaleMatch || !sourcesMatch) {
      console.error(`Error: AI response is in an invalid format for subfield: ${subfieldName}`);
      return res.status(400).send("AI response is in an invalid format.");
    }

    const maturity = parseFloat(maturityMatch[1]);
    const innovation = parseFloat(innovationMatch[1]);
    const relevance = parseFloat(relevanceMatch[1]);
    const rationale = rationaleMatch[1].trim();
    const source = sourcesMatch[1].trim();

    console.log(`Updating metrics for subfield: ${subfieldName}`);

    // Insert new updated metrics into TIMEDMETRICS
    await pool.query(
      `INSERT INTO TIMEDMETRICS (metric_1, metric_2, metric_3, metric_date, subfield_id, field_id, rationale, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [maturity, innovation, relevance, new Date().toISOString(), row.subfield_id, field_id, rationale, source]
    );

    console.log(`Updated metrics for '${subfieldName}' successfully.`);
    return res.status(200).send(`Metrics updated successfully for subfield: ${subfieldName}`);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Error updating metrics.");
  }
});

app.post("/generate-insight", async (req, res) => {
  let aiResponse = await generateInsight("insight");
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

app.post("/generate-sub-insight", async (req, res) => {
  const { fieldId } = req.body; // Get fieldId from the request body

  if (!fieldId) {
    return res.status(400).send("Field ID is required.");
  }

  try {
    // Fetch field details from the database
    const fieldResult = await pool.query('SELECT * FROM Field WHERE field_id = $1', [fieldId]);
    if (fieldResult.rowCount === 0) {
      return res.status(404).send("Field not found.");
    }

    //what is this line
    const fieldName = fieldResult.rows[0].field_name;

    // Call the AI to generate insight
    const { insight, confidenceScore } = await generateSubInsight("insight", fieldId);

    // Save the generated insight to the database (optional)
    await pool.query(
      `INSERT INTO Insight (field_id, insight_text, confidence_score)
        VALUES ($1, $2, $3)`,
      [fieldId, insight, confidenceScore]
    );

    // Return the generated insight
    res.json({ insight });
  } catch (err) {
    console.error("Error generating insight:", err);
    res.status(500).send("Error generating insight.");
  }
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

    // Log stderr but don't treat it as an error
    if (stderr) {
      console.warn(`Scraper stderr: ${stderr}`);
    }

    console.log("Scraper executed successfully.");
    return res.json({ success: true, message: "Scraper ran successfully", output: stdout });
  });
});

// API route to trigger the scraper
app.get("/api/run-scraper-sf", (req, res) => {
  console.log("Scraper API called. Running scraper...");

  exec(`node ${subfieldScraperScriptPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing scraper: ${error.message}`);
      return res.status(500).json({ success: false, message: "Scraper failed", error: error.message });
    }

    // Log stderr but don't treat it as an error
    if (stderr) {
      console.warn(`Scraper stderr: ${stderr}`);
    }

    console.log("Scraper executed successfully.");
    return res.json({ success: true, message: "Scraper ran successfully", output: stdout });
  });
});


app.get("/api/arxiv-papers", (req, res) => {
  const filePath = path.join(__dirname, "scrape_db", "arxiv_papers.json");

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading JSON file:", err);
      return res.status(500).json({ error: "Failed to read JSON file" });
    }

    res.json(JSON.parse(data));
  });
});

app.get("/api/arxiv-papers-sf", (req, res) => {
  const filePath = path.join(__dirname, "scrape_db", "arxiv_papers_sf.json");

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading JSON file:", err);
      return res.status(500).json({ error: "Failed to read JSON file" });
    }

    res.json(JSON.parse(data));
  });
});