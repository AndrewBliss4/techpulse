import React, { useState } from "react";

const ScrapeFieldsButton = ({ setLoading, setError, setSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleScraperCall = async () => {
    const isConfirmed = window.confirm(
      "⚠️ Warning: Are you sure you want to run the scraper? This may take time!"
    );
    if (!isConfirmed) return;

    setIsLoading(true);
    setLoading(true);
    setError(false);
    setSuccess(false);

    try {
      console.log("Triggering scraper...");

      const response = await fetch("http://localhost:4000/api/run-scraper", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Scraper failed: ${response.statusText}`);
      }

      console.log("Scraper ran successfully.");
      setSuccess(true);  // Set success to true if scraping is successful
    } catch (error) {
      console.error("Error running scraper:", error);
      setError(true); // Set error to true if there's an issue
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-medium 
               rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 
               focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200
               disabled:bg-blue-400 disabled:text-gray-200 disabled:cursor-not-allowed"
        onClick={handleScraperCall}
        disabled={isLoading}
      >
        {isLoading ? "Scraping..." : "Run Scraper"}
      </button>
    </div>
  );
};

export default ScrapeFieldsButton;
