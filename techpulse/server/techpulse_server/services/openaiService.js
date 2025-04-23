require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const OpenAI = require('openai');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const constants = require('../config/constants');  // Fixed import
const readFile = promisify(fs.readFile);

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is missing from .env file');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 3
    });
    this.model = constants.ai.defaultModel;  // Now correctly accessing the ai property
    this.fallbackModel = constants.ai.fallbackModel;
  }

  async generateResponse(prompt, options = {}) {
    const {
      temperature = constants.ai.defaultTemp,
      top_p = constants.ai.defaultTopP,
      max_tokens = constants.ai.maxTokens,
      model = this.model
    } = options;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: "system", content: prompt }],
        temperature,
        top_p,
        max_tokens
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      return content;
    } catch (error) {
      if (model !== this.fallbackModel) {
        return this.generateResponse(prompt, {
          ...options,
          model: this.fallbackModel
        });
      }
      throw error;
    }
  }

  async readPromptTemplate(filename) {
    const filePath = path.join(constants.paths.prompts, filename);
    const content = await readFile(filePath, 'utf8');
    return content;
  }

  async parseAIResponse(response, pattern) {
    const matches = response.match(pattern);
    if (!matches) {
      throw new Error('Failed to parse AI response');
    }
    return matches;
  }
}

module.exports = new OpenAIService();