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
    const result = await pool.query('SELECT * FROM public.field');
    console.log('Data fetched successfully:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/data1', async (req, res) => {
  const { feedback_text, rating } = req.body;
  try {
    await pool.query('INSERT INTO public.feedback (feedback_text, rating) VALUES ($1, $2)', [feedback_text, rating]);
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

// Load prompt_field.txt synchronously
const promptFieldPath = path.join(__dirname, 'prompt_field.txt');
let promptFieldText;
try {
  promptFieldText = fs.readFileSync(promptFieldPath, 'utf8');
  console.log("Loaded prompt_field.txt successfully.");
} catch (err) {
  console.error("Error reading prompt_field.txt:", err);
  process.exit(1); // Exit if the file can't be read
}
let updateExistingFieldMetrics = async () => {
  try {
    // Fetch current field names and most recent scores from the database
    const fieldQuery = await pool.query(
      `SELECT f.field_id, f.field_name, t.metric_1, t.metric_2, t.metric_3, t.rationale 
       FROM Field f 
       JOIN TIMEDMETRICS t ON f.field_id = t.field_id 
       WHERE t.metric_date = (SELECT MAX(metric_date) FROM TIMEDMETRICS WHERE field_id = f.field_id)`
    );

    if (fieldQuery.rowCount === 0) {
      console.log("No fields found in the database.");
      return "NO_FIELDS";
    }

    const fieldData = fieldQuery.rows.map(row => `
      field_name: ${row.field_name}
      metric_1: ${row.metric_1}
      metric_2: ${row.metric_2}
      metric_3: ${row.metric_3}
      rationale: ${row.rationale}`).join('\n\n');

      const dynamicPrompt = `
      You are an RBC analyst responsible for tracking the latest technological advancements relevant to the banking industry. 
      Below are the existing fields, their current metric scores, and rationales:
      ${fieldData}
      
      Please update their metric scores based on their latest developments, maintaining the following format strictly:
      field_name:(insert field name here)
      metric_1: provide your answer on a scale of 0 to 5 (0: No meaningful developments that could impact banking in the foreseeable future.
      1: Early-stage developments with some research or niche use cases, but no mass adoption.
      2: Limited, incremental progress with some prototypes or use cases showing potential, but not yet widely applicable.
      3: Moderate progress; some tangible developments, with a few major players in the industry adopting or testing it.
      4: Near full maturity; there are multiple mainstream implementations, and it is becoming an integral part of banking operations.
      5: Fully mature, mainstream technology with widespread adoption across the banking industry and proven impact on operations.) YOUR RESPONSE MUST ONLY BE A FLOAT

      metric_2: provide your answer on a scale of 0 to 5 (0: No significant innovation in the field within the last 6 months.
      1: Minor innovations or improvements, but not impactful or groundbreaking.
      2: Some notable changes or advancements in the field, but not transformative.
      3: Significant changes or improvements that could potentially change the way banking works, but still evolving.
      4: Major shifts in the field, with some breakthrough technologies emerging that could significantly affect banking operations.
      5: Revolutionary innovation that could radically alter the industry.) YOUR RESPONSE MUST ONLY BE A FLOAT

      metric_3: provide your answer on a scale between 0 to 5 (0: Not at all relevant to the banking industry.
      1: Low relevance; could be tangentially useful in niche cases but not a priority.
      2: Some relevance to banking, but not a key focus or priority for the industry.
      3: Moderate relevance; important for certain banking functions or market segments but not a universal need.
      4: High relevance; expected to impact several areas of banking, with the potential for significant changes.
      5: Critical relevance; projected to revolutionize the banking industry and become essential in the near future.) YOUR RESPONSE MUST ONLY BE A FLOAT
      rationale: Provide a brief explanation of why you are grading these new fields this way FOR EACH OF THE PREVIOUS FLOATS and any potential applications RBC could use to either match or be ahead of its competitors for, YOUR ANSWER MUST BE A STRING

      source: provide where you got this information from YOUR ANSWER MUST BE A STRING AND IDEALLY IS A PLAIN URL and NOT in brackets or quotes.
      ---
      (Repeat the above format for each field)
      **DO NOT** include any extra commentary. **DO NOT** modify the format.
    `;

    console.log("Generated Dynamic Prompt for Updating Metrics:\n", dynamicPrompt);

    // Call OpenAI with the dynamically generated prompt
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ "role": "system", "content": dynamicPrompt }],
      temperature: 0,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    const aiResponse = response.choices[0]?.message?.content?.trim() || "";

    if (!aiResponse) {
      console.error("AI response is empty or invalid.");
      return "NO_VALID_AI_RESPONSE";
    }

    console.log("Raw AI Response:\n", aiResponse);

    return aiResponse;
  } catch (error) {
    console.error("Error fetching fields or calling OpenAI:", error);
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
    // Fetch current field names from the database
    const fieldQuery = await pool.query("SELECT field_name FROM Field");
    const fieldNames = fieldQuery.rows.map(row => row.field_name).join(", ");

    // Inject the field names into the prompt
    const dynamicPrompt = `
      You are one of RBC's most critical and harsh analysts in charge of both keeping track of the current developments in the technology industry that are relevant to RBC and its competitors.
      A current list of fields of technology that are relevant to the banking industry are: ${fieldNames}. 
      Please add any new fields to this list as needed but you must ensure that it is relevant to banking.
      
      Provide the output of the new relevant field IF THERE ARE ANY in the following **STRICT FORMAT**:
        
      field_name: provide the field of technology (MUST BE A STRING).
      description: a brief description of the field of technology on the whole (MUST BE A STRING)
      metric_1: provide your answer on a scale of 0 to +5 (0: No meaningful developments that could impact banking in the foreseeable future.
      1: Early-stage developments with some research or niche use cases, but no mass adoption.
      2: Limited, incremental progress with some prototypes or use cases showing potential, but not yet widely applicable.
      3: Moderate progress; some tangible developments, with a few major players in the industry adopting or testing it.
      4: Near full maturity; there are multiple mainstream implementations, and it is becoming an integral part of banking operations.
      5: Fully mature, mainstream technology with widespread adoption across the banking industry and proven impact on operations.) YOUR RESPONSE MUST ONLY BE A FLOAT

      metric_2: provide your answer on a scale of 0 to +5 (0: No significant innovation in the field within the last 6 months.
      1: Minor innovations or improvements, but not impactful or groundbreaking.
      2: Some notable changes or advancements in the field, but not transformative.
      3: Significant changes or improvements that could potentially change the way banking works, but still evolving.
      4: Major shifts in the field, with some breakthrough technologies emerging that could significantly affect banking operations.
      5: Revolutionary innovation that could radically alter the industry.) YOUR RESPONSE MUST ONLY BE A FLOAT

      metric_3: provide your answer on a scale between 0-5 (0: Not at all relevant to the banking industry.
      1: Low relevance; could be tangentially useful in niche cases but not a priority.
      2: Some relevance to banking, but not a key focus or priority for the industry.
      3: Moderate relevance; important for certain banking functions or market segments but not a universal need.
      4: High relevance; expected to impact several areas of banking, with the potential for significant changes.
      5: Critical relevance; projected to revolutionize the banking industry and become essential in the near future.) YOUR RESPONSE MUST ONLY BE A FLOAT
      rationale: Provide a brief explanation of why you are grading these new fields this way FOR EACH OF THE PREVIOUS FLOATS and any potential applications RBC could use to either match or be ahead of its competitors for, YOUR ANSWER MUST BE A STRING

      source: provide where you got this information from YOUR ANSWER MUST BE A STRING AND IDEALLY IS A PLAIN URL and NOT in brackets or quotes.
      
      (Repeat the above format for each new relevant field)
      **DO NOT** include any extra commentary. **DO NOT** modify the format.
          `;

          console.log("Generated Dynamic Prompt:\n", dynamicPrompt); // Debugging: Check the final prompt

    // Call OpenAI with the dynamically generated prompt
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ "role": "system", "content": dynamicPrompt }],
      temperature: 0,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    return response.choices[0].message.content;

  } catch (error) {
    console.error("Error fetching fields from database or calling OpenAI:", error);
    return "ERROR: Unable to process request.";
  }
};


// New endpoint for prompt_field.txt execution
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
          `INSERT INTO Field (field_name, description, funding) VALUES ($1, $2, $3) RETURNING field_id`,
          [fieldName, description, 0]
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
