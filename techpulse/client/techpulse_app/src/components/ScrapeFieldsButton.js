import React, { useState } from "react";

const ScrapeFieldsButton = ({ setError, setSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleScraperCall = async () => {
    const isConfirmed = window.confirm(
      "⚠️ Warning: Are you sure you want to run the scraper? This may take time!"
    );
    if (!isConfirmed) return;
    
    setError(false);
    setSuccess(false);
    setIsLoading(true);

    try {
      console.log("Triggering scraper...");

      const response = await fetch("http://localhost:4000/api/scraper/run-scraper", {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Scraper failed: ${response.statusText}`);
      }

      console.log("Scraper ran successfully.");
      setSuccess(true);
    } catch (error) {
      console.error("Error running scraper:", error);
      setError(error.message || "Failed to run scraper");
    } finally {
      setIsLoading(false);
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