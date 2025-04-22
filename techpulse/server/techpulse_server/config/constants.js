// techpulse/server/techpulse_server/config/constants.js

const path = require('path');

const constants = {
  amountScraped: 5,
  amountScrapedsf: 1,

  paths: {
    root: path.resolve(__dirname, '..'),
    scraper: path.join(__dirname, '../scraper.js'),
    subfieldScraper: path.join(__dirname, '../scraper_sf.js'),
    prompts: path.join(__dirname, '../prompts'),
    scrapeDb: path.join(__dirname, '../scrape_db'),
    insights: path.join(__dirname, '../../client/techpulse_app/src/components/Insights')
  },

  db: {
    fieldTable: 'Field',
    subfieldTable: 'Subfield',
    metricsTable: 'TIMEDMETRICS',
    insightTable: 'Insight',
    feedbackTable: 'Feedback',
    parametersTable: 'ModelParameters'
  },

  ai: {
    defaultModel: 'gpt-4',
    fallbackModel: 'gpt-3.5-turbo',
    maxTokens: 2048,
    defaultTemp: 0.7,
    defaultTopP: 1
  }
};

module.exports = constants;
