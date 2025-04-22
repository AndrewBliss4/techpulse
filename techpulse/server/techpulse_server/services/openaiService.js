const OpenAI = require('openai');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const { constants } = require('../config');
const readFile = promisify(fs.readFile);

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000, // 30 seconds
      maxRetries: 3
    });
    this.model = constants.ai.defaultModel;
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

      logger.debug('OpenAI response generated successfully');
      return content;
    } catch (error) {
      logger.error('OpenAI API error:', error);

      // Fallback to secondary model if primary fails
      if (model !== this.fallbackModel) {
        logger.warn('Attempting fallback model');
        return this.generateResponse(prompt, {
          ...options,
          model: this.fallbackModel
        });
      }

      throw error;
    }
  }

  async readPromptTemplate(filename) {
    try {
      const filePath = path.join(constants.paths.prompts, filename);
      const content = await readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      logger.error('Error reading prompt template:', error);
      throw error;
    }
  }

  async parseAIResponse(response, pattern) {
    try {
      const matches = response.match(pattern);
      if (!matches) {
        throw new Error('Failed to parse AI response');
      }
      return matches;
    } catch (error) {
      logger.error('Error parsing AI response:', error);
      throw error;
    }
  }
}

module.exports = new OpenAIService();