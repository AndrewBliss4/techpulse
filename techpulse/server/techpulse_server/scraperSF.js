const { Client } = require("pg");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

console.log("Starting script...");

// PostgreSQL Configuration
const DB_CONFIG = {
  user: "admin",
  host: "localhost",
  database: "techpulse",
  password: "admin",
  port: 5432,
};

// Function to fetch subfields for a specific field from the database
async function fetchSubfieldsForField(field) {
  console.log(`Fetching subfields for field: ${field}`);
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log("Connected to database!");

    // Query to get subfields for the specific field
    const res = await client.query(`
      SELECT subfield_name
      FROM Subfield
      WHERE field_name = $1
    `, [field]);

    const subfields = res.rows.map(row => row.subfield_name);
    console.log(`Subfields for ${field}:`, subfields);
    return subfields;
  } catch (error) {
    console.error("Error fetching subfields from database:", error);
    return [];
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

// Function to fetch ArXiv papers for a given subfield
async function fetchArxivPapers(subfield) {
  console.log(`Fetching ArXiv papers for subfield: ${subfield}`);
  const categories = ["cs.CR", "q-fin.CP", "q-fin.GN"]; // Example categories
  const categoryQuery = categories.map(cat => `cat:${cat}`).join(" OR ");
  const query = encodeURIComponent(`${subfield} AND (${categoryQuery})`);
  const url = `http://export.arxiv.org/api/query?search_query=${query}&max_results=5&sortBy=submittedDate`;

  try {
    const response = await axios.get(url);
    console.log(`Received response for subfield: ${subfield}`);

    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });
    const jsonObj = parser.parse(response.data);

    if (!jsonObj.feed || !jsonObj.feed.entry) {
      console.error(`No entries found for subfield: ${subfield}`);
      return [];
    }

    const entries = Array.isArray(jsonObj.feed.entry) ? jsonObj.feed.entry : [jsonObj.feed.entry];

    return entries.map(entry => ({
      id: entry.id ? entry.id.split("/").pop() : "Unknown ID",
      title: entry.title ? entry.title.replace(/\s+/g, " ").trim() : "Unknown Title",
      authors: entry.author ? (Array.isArray(entry.author) ? entry.author.map(a => a.name) : [entry.author.name]) : [],
      published: entry.published || "Unknown Date",
      summary: entry.summary ? entry.summary.replace(/\s+/g, " ").trim() : "No Summary Available",
      subfield: subfield,
      link: entry.id || "No Link Available",
    }));
  } catch (error) {
    console.error(`Error fetching articles for ${subfield}:`, error);
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

// Function to merge new and existing articles while preventing duplicates within each subfield
function mergeArticles(existingArticles, newArticles) {
  const articleMap = new Map();

  // Populate map with existing articles
  for (const article of existingArticles) {
    const key = `${article.id}-${article.subfield}`;
    articleMap.set(key, article);
  }

  // Add new articles, replacing duplicates within the same subfield
  for (const article of newArticles) {
    const key = `${article.id}-${article.subfield}`;
    articleMap.set(key, article); // This ensures that if an article already exists for the same subfield, it gets updated.
  }

  return Array.from(articleMap.values());
}

// Main function to scrape subfields and articles for a specific field
async function main() {
  const field = "Computer Science";  // Specify the field for which you want to fetch subfields and articles
  console.log(`Fetching subfields for the field: ${field}`);

  // Fetch subfields for the specified field
  const subfields = await fetchSubfieldsForField(field);

  if (subfields.length === 0) {
    console.error(`No subfields found for field: ${field}. Exiting.`);
    return;
  }

  console.log("Subfields retrieved:", subfields);

  const dbFolderPath = path.join(__dirname, "../../client/techpulse_app/public");

  if (!fs.existsSync(dbFolderPath)) {
    console.log("Creating db folder...");
    fs.mkdirSync(dbFolderPath, { recursive: true });
  }

  const jsonFilePath = path.join(dbFolderPath, "arxiv_papers_with_subfields.json");

  console.log("Loading existing articles...");
  let existingArticles = loadExistingArticles(jsonFilePath);

  let newArticles = [];
  for (const subfield of subfields) {
    console.log(`Processing subfield: ${subfield}`);
    const subfieldArticles = await fetchArxivPapers(subfield);
    newArticles = newArticles.concat(subfieldArticles);
  }

  console.log("Merging new articles with existing ones...");
  const updatedArticles = mergeArticles(existingArticles, newArticles);

  console.log("Saving updated dataset...");
  fs.writeFileSync(jsonFilePath, JSON.stringify(updatedArticles, null, 4), "utf8");
  console.log(`Dataset updated successfully at: ${jsonFilePath}`);
}

// Run the script
main().catch(console.error);
