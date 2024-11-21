const OpenAI = require('openai');
const dontenv = require("dotenv");
dontenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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