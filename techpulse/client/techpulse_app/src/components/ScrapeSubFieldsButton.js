import React, { useState } from "react";

/**
 * A button component that triggers a subfield scraping operation when clicked.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.setError - Function to set error state in parent component
 * @param {Function} props.setSuccess - Function to set success state in parent component
 * @returns {JSX.Element} The scrape subfields button component
 */
const ScrapeSubFieldsButton = ({ setError, setSuccess }) => {
  // State to track loading status during scraping operation
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handles the scraping operation when the button is clicked
   * - Shows confirmation dialog before proceeding
   * - Makes API call to trigger the scraper
   * - Updates parent component with success/error status
   */
  const handleScraperCall = async () => {
    // Show confirmation dialog before proceeding
    const isConfirmed = window.confirm(
      "⚠️ Warning: Are you sure you want to run the subfield scraper? This may take time!"
    );
    if (!isConfirmed) return;
    
    // Reset error and success states and set loading state
    setError(false);
    setSuccess(false);
    setIsLoading(true);

    try {
      console.log("Triggering subfield scraper...");

      // Make API call to trigger the scraper
      const response = await fetch("http://localhost:4000/api/scraper/run-scraper-sf", {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Handle non-successful responses
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Subfield scraper failed: ${response.statusText}`);
      }

      // Handle successful scraping
      console.log("Subfield scraper ran successfully.");
      setSuccess(true);
    } catch (error) {
      console.error("Error running subfield scraper:", error);
      setError(error.message || "Failed to run subfield scraper");
    } finally {
      // Reset loading state regardless of outcome
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
        {isLoading ? "Scraping Subfields..." : "Run Subfield Scraper"}
      </button>
    </div>
  );
};

export default ScrapeSubFieldsButton;