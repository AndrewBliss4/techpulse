const OpenAI = require('openai');
const dontenv = require("dotenv");

dontenv.config();

const express = require("express");
const bodyParser = require("body-parser");

const app = express();

app.use(bodyParser.json());

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
          "text": "Summarize the topic you are provided with for technology insights catered to RBC's business, including implications for the banking industry. Generate the insights by topic. 1. The trend and why it matters. 2. Latest developments. 3. Adoption developments across the globe. 4. Real-world examples 5. Underlying technologies 6. Key uncertainties 7. Big questions about the future. The total response should be at least 500 words. Format the titles with <strong>title</strong> and the text with <p>text</p>."
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