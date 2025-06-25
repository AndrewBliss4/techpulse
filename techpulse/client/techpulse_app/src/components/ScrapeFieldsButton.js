import React, { useState } from "react";

/**
 * Button component that triggers a web scraping operation for research fields.
 * Provides user confirmation, loading state, and error/success feedback.
 * 
 * @param {Object} props - Component properties
 * @param {Function} props.setError - Callback to set error message in parent component
 * @param {Function} props.setSuccess - Callback to set success state in parent component
 */
const ScrapeFieldsButton = ({ setError, setSuccess }) => {
  // State to track whether the scraper is currently running
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handles the scraping operation when the button is clicked:
   * 1. Shows confirmation dialog
   * 2. Makes API request to backend scraper
   * 3. Updates parent component with results
   */
  const handleScraperCall = async () => {
    // Confirm user wants to proceed with potentially time-consuming operation
    const isConfirmed = window.confirm(
      "⚠️ Warning: Are you sure you want to run the scraper? This may take time!"
    );
    if (!isConfirmed) return;
    
    // Reset previous states and indicate loading
    setError(false);
    setSuccess(false);
    setIsLoading(true);

    try {
      console.log("Triggering scraper...");

      // Make GET request to scraper endpoint
      const response = await fetch("http://localhost:4000/api/scraper/run-scraper", {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Scraper failed: ${response.statusText}`);
      }

      // Handle successful scraping operation
      console.log("Scraper ran successfully.");
      setSuccess(true);
    } catch (error) {
      console.error("Error running scraper:", error);
      // Propagate error to parent component
      setError(error.message || "Failed to run scraper");
    } finally {
      // Always reset loading state when operation completes
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* 
        Button with loading state styling:
        - Blue color scheme with hover/focus states
        - Disabled visual feedback during loading
        - Responsive sizing (full width on mobile, auto on larger screens)
      */}
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