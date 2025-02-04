const OpenAI = require('openai');
const dontenv = require("dotenv");
const fs = require('fs');
const { Pool } = require('pg');
const cors = require('cors');

dontenv.config();

const express = require("express");
const bodyParser = require("body-parser");
const app = express();

//Connection to postgres, may need to change values to get methods working
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

// Example API endpoint to fetch data from public.field
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

// Example API endpoint to insert data into feeback table
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

//CORS settings
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

//Server port
app.listen(4000, () => {
    console.log("Server is running on port 4000")
})

//Server REST APIs
app.post("/gpt", async (req, res) => {
    let prompt = req.body.prompt;
    let response = await promptAI(prompt);
    res.send(response);
})

//Import API key from .env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//Set the prompt
let promptText;

fs.readFile('prompt.txt', 'utf8', (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    promptText = data;
});

//Prompt function
let promptAI = async (prompt) => {
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      "role": "system",
      "content": [
        {
          "type": "text",
          //Initial prompt
          "text": promptText,
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          //User prompt passed from client
          "text": prompt,
        }
      ]
    }
  ],
  //Other settings
  response_format: {
    "type": "text"
  },
  temperature: 0,
  max_tokens: 2048,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0
});

    //Returns the text output from the response
    return response.choices[0].message.content;
};