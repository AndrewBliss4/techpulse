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
  let response = await promptAIField();
  res.send(response);
});
