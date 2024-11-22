const OpenAI = require('openai');
const dontenv = require("dotenv");

dontenv.config();

const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.listen(4000, () => {
    console.log("Server is running on port 4000")
})

//Server APIs
app.post("/gpt", async (req, res) => {
    let prompt = req.body.prompt;
    let response = await promptAI(prompt);
    res.send(response);
})

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
          "text": "Summarize content you are provided with for technology insights catered to banking."
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": prompt,
        }
      ]
    }
  ],
  response_format: {
    "type": "text"
  },
  temperature: 0,
  max_tokens: 2048,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0
});
    return response.choices[0].message.content;
};

//Testing API
promptAI("Quantum computing").then((res) => console.log(res));