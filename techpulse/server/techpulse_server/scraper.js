const { Client } = require("pg");
const axios = require("axios");
const fs = require("fs");

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

// Function to fetch articles from ArXiv API
async function fetchArxivPapers(field) {
  console.log(`Fetching ArXiv papers for field: ${field}`);
  const query = encodeURIComponent(field);
  const url = `http://export.arxiv.org/api/query?search_query=all:${query}&max_results=50&sortBy=submittedDate`;

  try {
    const response = await axios.get(url);
    console.log(`Received response for field: ${field}`);

    const xmlData = response.data;
    const entries = xmlData.split("<entry>").slice(1);

    return entries.map(entry => {
      const idMatch = entry.match(/<id>(.*?)<\/id>/);
      const titleMatch = entry.match(/<title>(.*?)<\/title>/);
      const authorsMatch = [...entry.matchAll(/<name>(.*?)<\/name>/g)];
      const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
      const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/s);

      return {
        id: idMatch ? idMatch[1].split("/").pop() : "",
        title: titleMatch ? titleMatch[1].trim() : "Unknown Title",
        authors: authorsMatch.map(a => a[1]),
        published: publishedMatch ? publishedMatch[1] : "Unknown Date",
        summary: summaryMatch ? summaryMatch[1].replace(/\s+/g, " ").trim() : "No Summary Available",
        field: field,
      };
    });
  } catch (error) {
    console.error(`Error fetching articles for ${field}:`, error);
    return [];
  }
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

  let articles = [];

  for (const field of fields) {
    console.log(`Processing field: ${field}`);
    const fieldArticles = await fetchArxivPapers(field);
    articles = articles.concat(fieldArticles);
  }

  console.log("Saving dataset to arxiv_papers.json...");
  fs.writeFileSync("arxiv_papers.json", JSON.stringify(articles, null, 4), "utf8");
  console.log("Dataset saved successfully!");
}

// Run the script
main().catch(console.error);
