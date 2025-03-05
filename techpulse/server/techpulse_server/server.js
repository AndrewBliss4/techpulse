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

// AI request function (no user input needed)
let promptAIField = async () => {
  console.log('Using prompt from file:', promptFieldText);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { "role": "system", "content": promptFieldText }
    ],
    temperature: 0,
    max_tokens: 2048,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  });

  return response.choices[0].message.content;
};

// New endpoint for prompt_field.txt execution
app.post("/gpt-field", async (req, res) => {
  let prompt = req.body.prompt;
  let aiResponse = await promptAIField(prompt);

  // Check if there are no new fields
  if (aiResponse === "NONEWFIELDS") {
    res.send("No new fields to add.");
    return;
  }

  // Extract values from AI response
  const fieldNameMatch = aiResponse.match(/field_name:\s*(.+)/);
  const maturityMatch = aiResponse.match(/field_1:\s*([\d.]+)/);
  const innovationMatch = aiResponse.match(/field_2:\s*([\d.]+)/);
  const relevanceMatch = aiResponse.match(/field_3:\s*([\d.]+)/);
  const rationaleMatch = aiResponse.match(/rationale:\s*(.+?)(?=\n|$)/); // non-greedy match until newline
  const sourcesMatch = aiResponse.match(/source:\s*"([^"]+)"/); // match source inside quotes

  // Check if any match failed
  if (!fieldNameMatch || !maturityMatch || !innovationMatch || !relevanceMatch || !rationaleMatch || !sourcesMatch) {
    res.status(400).send("Invalid AI response format.");
    return;
  }

  const fieldName = fieldNameMatch[1].trim();
  const maturity = parseFloat(maturityMatch[1]);
  const innovation = parseFloat(innovationMatch[1]);
  const relevance = parseFloat(relevanceMatch[1]);
  const rationale = rationaleMatch[1].trim();
  const source = sourcesMatch[1].trim();

  // Check if field exists, if not, insert it
  const existingField = await pool.query(
    'SELECT * FROM Field WHERE field_name = $1',
    [fieldName]
  );

  let fieldId;
  if (existingField.rowCount === 0) {
    // Insert new field
    const result = await pool.query(
      `INSERT INTO Field (field_name, description, funding) 
       VALUES ($1, $2, $3) RETURNING field_id`,
      [fieldName, 'Description from AI response', 0]
    );
    fieldId = result.rows[0].field_id;
    console.log(`New field '${fieldName}' added.`);
  } else {
    fieldId = existingField.rows[0].field_id;
  }

  // Insert metrics into TIMEDMETRICS
  try {
    await pool.query(
      `INSERT INTO TIMEDMETRICS (metric_1, metric_2, metric_3, metric_date, field_id, rationale, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [maturity, innovation, relevance, new Date(), fieldId, rationale, source]
    );
    console.log('Metrics inserted successfully.');
    res.send(aiResponse); // Send the AI response back to the frontend
  } catch (err) {
    console.error('Error inserting metrics:', err);
    res.status(500).send('Error inserting metrics into the database.');
  }
});
