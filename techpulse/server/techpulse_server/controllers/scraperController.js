const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const constants = require('../config/constants');
const db = require('../config/db'); 

const execPromise = promisify(exec);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

class ScraperController {
  constructor() {
    this.scrapers = {
      main: constants.paths.scraper,
      subfield: constants.paths.subfieldScraper
    };
    this.dataFiles = {
      main: path.join(constants.paths.scrapeDb, "arxiv_papers.json"),
      subfield: path.join(constants.paths.scrapeDb, "arxiv_papers_sf.json")
    };
  }

  async runScraper(req, res) {
    try {
      const { stdout, stderr } = await this._executeScraper('main');
      
      return res.json({
        success: true,
        message: "Main scraper executed successfully",
        output: stdout,
        warnings: stderr ? [stderr] : []
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Main scraper failed",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        output: error.stdout,
        errors: error.stderr ? [error.stderr] : []
      });
    }
  }

  async runSubfieldScraper(req, res) {
    try {
      const { stdout, stderr } = await this._executeScraper('subfield');
      
      return res.json({
        success: true,
        message: "Subfield scraper executed successfully",
        output: stdout,
        warnings: stderr ? [stderr] : []
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Subfield scraper failed",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        output: error.stdout,
        errors: error.stderr ? [error.stderr] : []
      });
    }
  }

  async getScrapedArticles(req, res) {
    try {
      const data = await this._readScrapedData('main');
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: "Failed to read scraped articles",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getScrapedSubfieldArticles(req, res) {
    try {
      const data = await this._readScrapedData('subfield');
      return res.json(data);
    } catch (error) {
      return res.status(500).json({
        error: "Failed to read subfield scraped articles",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async backupScrapedData(req, res) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backups = {};
      
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
        backups
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to backup scraped data",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async _executeScraper(type) {
    if (!this.scrapers[type]) {
      throw new Error(`Invalid scraper type: ${type}`);
    }

    const { stdout, stderr } = await execPromise(`node ${this.scrapers[type]}`);
    return { stdout, stderr };
  }

  async _readScrapedData(type) {
    if (!this.dataFiles[type]) {
      throw new Error(`Invalid data type: ${type}`);
    }

    const rawData = await readFile(this.dataFiles[type], 'utf8');
    return JSON.parse(rawData);
  }

  async _backupFile(sourcePath, targetPath) {
    const data = await readFile(sourcePath, 'utf8');
    await writeFile(targetPath, data);
  }
}

module.exports = new ScraperController();