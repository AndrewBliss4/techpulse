const { Client } = require("pg");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");
const amountScrapedsf = 1;
console.log("Starting script...");

// PostgreSQL Configuration
const DB_CONFIG = {
  user: "admin",
  host: "localhost",
  database: "techpulse",
  password: "admin",
  port: 5432,
};

// Function to fetch field and subfield names from the database
async function fetchFieldAndSubfieldNames() {
  console.log("Connecting to database...");
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log("Connected to database!");

    const res = await client.query("SELECT field_name, field_id FROM Field");
    let fields = res.rows;

    // Fetch subfields for each field
    for (let field of fields) {
      const subfieldsRes = await client.query(
        "SELECT subfield_name, subfield_id FROM Subfield WHERE field_id = $1",
        [field.field_id]
      );
      field.subfields = subfieldsRes.rows; // Add subfields to each field object
    }

    console.log("Fields and subfields retrieved:", fields);
    return fields;
  } catch (error) {
    console.error("Error fetching fields and subfields from database:", error);
    return [];
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

// Function to fetch ArXiv papers for a given subfield
async function fetchArxivPapersForSubfield(field, subfield) {
  console.log(`Fetching ArXiv papers for field: ${field.field_name}, subfield: ${subfield.subfield_name}`);
  const categories = ["cs.CR", "q-fin.CP", "q-fin.GN"]; // Example categories
  const categoryQuery = categories.map(cat => `cat:${cat}`).join(" OR ");
  const query = encodeURIComponent(`${field.field_name} AND ${subfield.subfield_name} AND (${categoryQuery})`);
  const url = `http://export.arxiv.org/api/query?search_query=${query}&max_results=${amountScrapedsf}&sortBy=submittedDate`;

  try {
    const response = await axios.get(url);
    console.log(`Received response for subfield: ${subfield.subfield_name}`);

    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });
    const jsonObj = parser.parse(response.data);

    if (!jsonObj.feed || !jsonObj.feed.entry) {
      console.error(`No entries found for subfield: ${subfield.subfield_name}`);
      return [];
    }

    const entries = Array.isArray(jsonObj.feed.entry) ? jsonObj.feed.entry : [jsonObj.feed.entry];

    return entries.map(entry => ({
      id: entry.id ? entry.id.split("/").pop() : "Unknown ID",
      title: entry.title ? entry.title.replace(/\s+/g, " ").trim() : "Unknown Title",
      authors: entry.author ? (Array.isArray(entry.author) ? entry.author.map(a => a.name) : [entry.author.name]) : [],
      published: entry.published || "Unknown Date",
      summary: entry.summary ? entry.summary.replace(/\s+/g, " ").trim() : "No Summary Available",
      field_name: field.field_name,
      field_id: field.field_id,
      subfield_name: subfield.subfield_name,
      subfield_id: subfield.subfield_id,
      link: entry.id || "No Link Available",
    }));
  } catch (error) {
    console.error(`Error fetching articles for subfield ${subfield.subfield_name}:`, error);
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

// Function to merge new and existing articles while preventing duplicates
function mergeArticles(existingArticles, newArticles) {
  const articleMap = new Map();

  // Populate map with existing articles
  for (const article of existingArticles) {
    const key = `${article.id}-${article.field_id}-${article.subfield_id}`;
    articleMap.set(key, article);
  }

  // Add new articles, replacing duplicates within the same field and subfield
  for (const article of newArticles) {
    const key = `${article.id}-${article.field_id}-${article.subfield_id}`;
    articleMap.set(key, article); // This ensures that if an article already exists for the same field and subfield, it gets updated.
  }

  return Array.from(articleMap.values());
}

// Main function to fetch all articles
async function main() {
  console.log("Fetching fields and subfields from database...");
  const fields = await fetchFieldAndSubfieldNames();

  if (fields.length === 0) {
    console.error("No fields found in the database. Exiting.");
    return;
  }

  console.log("Fields and subfields retrieved:", fields);

  const dbFolderPath = path.join(__dirname, "/scrape_db");

  if (!fs.existsSync(dbFolderPath)) {
    console.log("Creating db folder...");
    fs.mkdirSync(dbFolderPath, { recursive: true });
  }

  const jsonFilePath = path.join(dbFolderPath, "arxiv_papers_sf.json");

  console.log("Loading existing articles...");
  let existingArticles = loadExistingArticles(jsonFilePath);

  let newArticles = [];
  for (const field of fields) {
    for (const subfield of field.subfields) {
      console.log(`Processing subfield: ${subfield.subfield_name} under field: ${field.field_name}`);
      const fieldSubfieldArticles = await fetchArxivPapersForSubfield(field, subfield);
      newArticles = newArticles.concat(fieldSubfieldArticles);
    }
  }

  console.log("Merging new articles with existing ones...");
  const updatedArticles = mergeArticles(existingArticles, newArticles);

  console.log("Saving updated dataset...");
  fs.writeFileSync(jsonFilePath, JSON.stringify(updatedArticles, null, 4), "utf8");
  console.log(`Dataset updated successfully at: ${jsonFilePath}`);
}

// Run the script
main().catch(console.error);
