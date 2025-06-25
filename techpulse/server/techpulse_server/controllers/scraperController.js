const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises; // Using promises version of fs for async/await
const path = require('path');
const constants = require('../config/constants');
const logger = require('../config/logger'); // Logger for consistent logging

// Promisify the exec function from child_process to use with async/await
const execPromise = promisify(exec);

class ScraperController {
  constructor() {
    // Define scraper scripts paths (main and subfield)
    this.scrapers = {
      main: constants.paths.scraper,
      subfield: constants.paths.subfieldScraper
    };
    
    // Define paths for scraped data files
    this.dataFiles = {
      main: path.join(constants.paths.scrapeDb, "arxiv_papers.json"),
      subfield: path.join(constants.paths.scrapeDb, "arxiv_papers_sf.json")
    };
    
    // Timeout for scraper execution (30 minutes in milliseconds)
    this.scraperTimeout = 30 * 60 * 1000;
  }

  /**
   * Internal method to execute a scraper process
   * @param {string} type - Type of scraper ('main' or 'subfield')
   * @returns {Promise<{stdout: string, stderr: string}>} - Process output
   * @throws {Error} If scraper execution fails or invalid type
   */
  async _executeScraper(type) {
    // Validate scraper type
    if (!this.scrapers[type]) {
      throw new Error(`Invalid scraper type: ${type}`);
    }

    logger.info(`Starting ${type} scraper...`);
    const command = `node ${this.scrapers[type]}`;
    
    try {
      // Execute the scraper with timeout
      const { stdout, stderr } = await execPromise(command, { 
        timeout: this.scraperTimeout 
      });
      
      logger.info(`${type} scraper completed successfully`);
      return { stdout, stderr };
    } catch (error) {
      // Log detailed error information
      logger.error(`${type} scraper failed: ${error.message}`, { 
        command,
        error: error.stack 
      });
      throw error;
    }
  }

  /**
   * Internal method to read scraped data from file
   * @param {string} type - Type of data ('main' or 'subfield')
   * @returns {Promise<object>} - Parsed JSON data
   * @throws {Error} If file read fails or invalid type
   */
  async _readScrapedData(type) {
    // Validate data type
    if (!this.dataFiles[type]) {
      throw new Error(`Invalid data type: ${type}`);
    }

    try {
      // Read and parse the data file
      const rawData = await fs.readFile(this.dataFiles[type], 'utf8');
      return JSON.parse(rawData);
    } catch (error) {
      logger.error(`Failed to read ${type} scraped data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Internal method to create a backup of scraped data
   * @param {string} sourcePath - Path to source file
   * @param {string} targetPath - Path to backup file
   * @returns {Promise<void>}
   * @throws {Error} If backup operation fails
   */
  async _backupFile(sourcePath, targetPath) {
    try {
      // Read source and write to backup location
      const data = await fs.readFile(sourcePath, 'utf8');
      await fs.writeFile(targetPath, data);
      logger.info(`Created backup: ${targetPath}`);
    } catch (error) {
      logger.error(`Backup failed for ${sourcePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * API Endpoint: Run main scraper
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async runScraper(req, res) {
    try {
      const { stdout } = await this._executeScraper('main');
      return res.json({ 
        success: true, 
        message: "Main scraper executed successfully",
        log: stdout // Include scraper output in response
      });
    } catch (error) {
      return this._handleError(res, error, "Main scraper failed");
    }
  }

  /**
   * API Endpoint: Run subfield scraper
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async runSubfieldScraper(req, res) {
    try {
      const { stdout } = await this._executeScraper('subfield');
      return res.json({ 
        success: true, 
        message: "Subfield scraper executed successfully",
        log: stdout // Include scraper output in response
      });
    } catch (error) {
      return this._handleError(res, error, "Subfield scraper failed");
    }
  }

  /**
   * API Endpoint: Get scraped articles
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getScrapedArticles(req, res) {
    try {
      const data = await this._readScrapedData('main');
      return res.json(data);
    } catch (error) {
      return this._handleError(res, error, "Failed to read scraped articles");
    }
  }

  /**
   * API Endpoint: Get scraped subfield articles
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getScrapedSubfieldArticles(req, res) {
    try {
      const data = await this._readScrapedData('subfield');
      return res.json(data);
    } catch (error) {
      return this._handleError(res, error, "Failed to read subfield scraped articles");
    }
  }

  /**
   * API Endpoint: Backup all scraped data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async backupScrapedData(req, res) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backups = {};

      // Backup both main and subfield data files
      for (const [type, filePath] of Object.entries(this.dataFiles)) {
        const backupPath = path.join(
          constants.paths.scrapeDb,
          `backup_${type}_${timestamp}.json`
        );

        await this._backupFile(filePath, backupPath);
        backups[type] = backupPath;
      }

      return res.json({
        success: true,
        message: "Scraped data backed up successfully",
        backups // Return paths to created backups
      });
    } catch (error) {
      return this._handleError(res, error, "Failed to backup scraped data");
    }
  }

  /**
   * Internal method to handle errors consistently across all endpoints
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @param {string} message - User-friendly error message
   * @returns {Object} - Error response
   */
  _handleError(res, error, message) {
    // Log the full error
    logger.error(`${message}: ${error.message}`, { error: error.stack });
    
    // Prepare error response
    const response = {
      success: false,
      error: message,
      // Only include error details in development
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };

    return res.status(500).json(response);
  }
}

// Export singleton instance of the controller
module.exports = new ScraperController();