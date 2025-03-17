const { Client } = require("pg");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");
const amountScraped = 5;
console.log("Starting script...");

// PostgreSQL Configuration
const DB_CONFIG = {
  user: "admin",
  host: "localhost",
  database: "techpulse",
  password: "admin",
  port: 5432,
};

// Function to fetch field names from the database
async function fetchFieldNames() {
  console.log("Connecting to database...");
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log("Connected to database!");

    const res = await client.query("SELECT field_name FROM Field");
    let fields = res.rows.map(row => row.field_name);

    // Exclude "Test" field
    fields = fields.filter(field => field !== "TEST");

    console.log("Filtered field names:", fields);
    return fields;
  } catch (error) {
    console.error("Error fetching fields from database:", error);
    return [];
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

// Function to fetch ArXiv papers for a given field
async function fetchArxivPapers(field) {
  console.log(`Fetching ArXiv papers for field: ${field}`);
  const categories = ["cs.CR", "q-fin.CP", "q-fin.GN"]; // Example categories
  const categoryQuery = categories.map(cat => `cat:${cat}`).join(" OR ");
  const query = encodeURIComponent(`${field} AND (${categoryQuery})`);
  const url = `http://export.arxiv.org/api/query?search_query=${query}&max_results=${amountScraped}&sortBy=submittedDate`;

  try {
    const response = await axios.get(url);
    console.log(`Received response for field: ${field}`);

    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });
    const jsonObj = parser.parse(response.data);

    if (!jsonObj.feed || !jsonObj.feed.entry) {
      console.error(`No entries found for field: ${field}`);
      return [];
    }

    const entries = Array.isArray(jsonObj.feed.entry) ? jsonObj.feed.entry : [jsonObj.feed.entry];

    return entries.map(entry => ({
      id: entry.id ? entry.id.split("/").pop() : "Unknown ID",
      title: entry.title ? entry.title.replace(/\s+/g, " ").trim() : "Unknown Title",
      authors: entry.author ? (Array.isArray(entry.author) ? entry.author.map(a => a.name) : [entry.author.name]) : [],
      published: entry.published || "Unknown Date",
      summary: entry.summary ? entry.summary.replace(/\s+/g, " ").trim() : "No Summary Available",
      field: field,
      link: entry.id || "No Link Available",
    }));
  } catch (error) {
    console.error(`Error fetching articles for ${field}:`, error);
    return [];
  }
}

// Function to load existing JSON data
function loadExistingArticles(jsonFilePath) {
  if (fs.existsSync(jsonFilePath)) {
    try {
      const data = fs.readFileSync(jsonFilePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading existing JSON file:", error);
      return [];
    }
  }
  return [];
}

// Function to merge new and existing articles while preventing duplicates within each field
function mergeArticles(existingArticles, newArticles) {
  const articleMap = new Map();

  // Populate map with existing articles
  for (const article of existingArticles) {
    const key = `${article.id}-${article.field}`;
    articleMap.set(key, article);
  }

  // Add new articles, replacing duplicates within the same field
  for (const article of newArticles) {
    const key = `${article.id}-${article.field}`;
    articleMap.set(key, article); // This ensures that if an article already exists for the same field, it gets updated.
  }

  return Array.from(articleMap.values());
}

// Main function to fetch all articles
async function main() {
  console.log("Fetching fields from database...");
  const fields = await fetchFieldNames();

  if (fields.length === 0) {
    console.error("No fields found in the database. Exiting.");
    return;
  }

  console.log("Fields retrieved:", fields);

  const dbFolderPath = path.join(__dirname, "../../client/techpulse_app/public");

  if (!fs.existsSync(dbFolderPath)) {
    console.log("Creating db folder...");
    fs.mkdirSync(dbFolderPath, { recursive: true });
  }

  const jsonFilePath = path.join(dbFolderPath, "arxiv_papers.json");

  console.log("Loading existing articles...");
  let existingArticles = loadExistingArticles(jsonFilePath);

  let newArticles = [];
  for (const field of fields) {
    console.log(`Processing field: ${field}`);
    const fieldArticles = await fetchArxivPapers(field);
    newArticles = newArticles.concat(fieldArticles);
  }

  console.log("Merging new articles with existing ones...");
  const updatedArticles = mergeArticles(existingArticles, newArticles);

  console.log("Saving updated dataset...");
  fs.writeFileSync(jsonFilePath, JSON.stringify(updatedArticles, null, 4), "utf8");
  console.log(`Dataset updated successfully at: ${jsonFilePath}`);
}

// Run the script
main().catch(console.error);
