const OpenAI = require('openai');
const dontenv = require("dotenv");
const fs = require('fs');
const { Pool } = require('pg');

dontenv.config();

const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const pool = new Pool({
  host: 'db',
  port: 5432,
  user: "admin",
  password: "admin",
  database: "techpulse_db"
});

app.use(bodyParser.json());

//app.use(express.json());

// Example API endpoint to fetch data from database
app.get('/api/data', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM your_table');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

// Example API endpoint to insert data from database
app.post('/api/data', async (req, res) => {
    const { field1, field2 } = req.body;
    try {
        await pool.query('INSERT INTO your_table (field1, field2) VALUES ($1, $2)', [field1, field2]);
        res.status(201).send('Data inserted');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error inserting data');
    }
});

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
  model: "gpt-4o-mini",
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