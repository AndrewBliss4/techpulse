const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './../.env') });
const OpenAI = require('openai');
const fs = require('fs').promises;
const constants = require('../config/constants');

class OpenAIService {
  constructor() {
    this.initializeOpenAI();
    this.verifyConstants();
  }

  initializeOpenAI() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is missing from environment variables');
      }

      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY.trim(),
        timeout: 30000,
        maxRetries: 3
      });

      console.log('OpenAI client initialized successfully');
    } catch (error) {
      console.error('OpenAI initialization failed:', error);
      throw error;
    }
  }

  verifyConstants() {
    if (!constants?.ai?.defaultModel) {
      throw new Error('Default AI model not configured in constants');
    }
    if (!constants?.ai?.fallbackModel) {
      console.warn('No fallback model specified in constants');
    }
    
    this.model = constants.ai.defaultModel;
    this.fallbackModel = constants.ai.fallbackModel || this.model;
  }

  async generateResponse(prompt, options = {}) {
    const config = {
      model: options.model || this.model,
      temperature: options.temperature ?? constants.ai.defaultTemp,
      top_p: options.top_p ?? constants.ai.defaultTopP,
      max_tokens: options.max_tokens ?? constants.ai.maxTokens
    };

    try {
      console.log(`Generating response with model: ${config.model}`);
      const response = await this.client.chat.completions.create({
        ...config,
        messages: [{ role: 'system', content: prompt }]
      });

      if (!response.choices?.[0]?.message?.content) {
        throw new Error('Empty response from OpenAI API');
      }

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI API Error:', {
        message: error.message,
        status: error.status,
        code: error.code
      });

      // Try fallback model if different from current model
      if (config.model !== this.fallbackModel) {
        console.log(`Attempting fallback model: ${this.fallbackModel}`);
        return this.generateResponse(prompt, {
          ...options,
          model: this.fallbackModel
        });
      }

      throw new Error(`OpenAI request failed: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      const testPrompt = 'Respond with just the word "SUCCESS"';
      const response = await this.generateResponse(testPrompt);
      
      if (response !== 'SUCCESS') {
        throw new Error('Unexpected test response');
      }
      
      console.log('OpenAI connection test successful');
      return true;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance with verification
const openaiService = new OpenAIService();

// Verify connection on startup
openaiService.testConnection()
  .then(success => {
    if (!success) {
      console.error('Critical: OpenAI service failed to initialize');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Startup verification error:', err);
    process.exit(1);
  });

module.exports = openaiService;