import React, { useState } from 'react';

/**
 * AIPromptFieldButton component provides buttons for various AI-powered operations:
 * - Full update (scrape, update metrics, generate fields, generate insights)
 * - Generate insights only
 * - Generate new fields only
 * - in short this is the top 3 buttons, the blue one is TechPulse, the green and purple buttons are helpful for testing
 * @param {Object} props - Component props
 * @param {Function} props.setTextResult - Sets the text result state in parent
 * @param {Function} props.setTrendingTopics - Sets trending topics state in parent
 * @param {Function} props.setLatestInsights - Sets latest insights state in parent
 * @param {Function} props.setLoading - Sets loading state in parent
 * @param {Function} props.setCurrentLoaderIndex - Sets loader index state in parent
 * @param {Function} props.setError - Sets error state in parent
 * @param {Function} props.setRenderText - Sets render text state in parent
 * @param {Function} props.setRenderTrends - Sets render trends state in parent
 * @param {Function} props.fetchRadarData - Fetches radar data in parent
 */
const AIPromptFieldButton = ({
  setTextResult,
  setTrendingTopics,
  setLatestInsights,
  setLoading,
  setCurrentLoaderIndex,
  setError,
  setRenderText,
  setRenderTrends,
  fetchRadarData,
}) => {
  // State for tracking generated text and loading states
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInsightsOnly, setIsLoadingInsightsOnly] = useState(false);
  const [isLoadingNewFieldsOnly, setIsLoadingNewFieldsOnly] = useState(false);

  /**
   * Fetches all field IDs from the backend
   * @returns {Promise<Array>} Array of field IDs
   */
  const fetchAllFieldIds = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/db/fields', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch fields: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(data)
      return data.data.map(field => field.field_id); // Extract field IDs from response
    } catch (error) {
      console.error('Error fetching field IDs:', error);
      setError(error.message);
      return []; // Return empty array on error
    }
  };
  
  /**
   * Triggers the scraper to fetch new data
   * @returns {Promise<boolean>} Whether scraping was successful
   */
  const runScraper = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/scraper/run-scraper', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Scraper failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error running scraper:', error);
      return false; // Return false instead of throwing to allow continuation
    }
  };

  /**
   * Handles generating insights only (no field updates)
   */
  const handleGenerateInsightsOnly = async () => {
    // Confirm user action
    const isConfirmed = window.confirm(
      "Are you sure you want to generate insights without updating fields?"
    );
    if (!isConfirmed) return;

    // Set loading states
    setIsLoadingInsightsOnly(true);
    setGeneratedText("");
    setLoading(true);
    setCurrentLoaderIndex(0);
    setError(false);
    setRenderText(false);
    setRenderTrends(false);

    try {
      console.log("Proceeding to insight generation...");

      // Set up timeout and abort controller for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // Fetch insights from API
      const insightResponse = await fetch('http://localhost:4000/api/ai/generate-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!insightResponse.ok) {
        const errorData = await insightResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Insight generation failed: ${insightResponse.statusText}`
        );
      }

      const insightData = await insightResponse.json();
      console.log("Insight generated successfully:", insightData);

      if (!insightData.insight) {
        throw new Error("Received empty insight from server");
      }

      // Update states with the received insight
      setTextResult(insightData.insight);
      setGeneratedText("Insights generated successfully");

    } catch (error) {
      console.error('Error generating insights:', error);
      setGeneratedText(`Error: ${error.message}`);
      setError(true);
    } finally {
      // Reset states and fetch updated data
      setRenderText(true);
      setIsLoadingInsightsOnly(false);
      setLoading(false);
      fetchRadarData();
    }
  };

  /**
   * Handles generating new fields only (no scraping or metric updates)
   */
  const handleGenerateNewFieldsOnly = async () => {
    // Confirm user action
    const isConfirmed = window.confirm(
      "Are you sure you want to generate new fields only? (No scraping or metric updates)"
    );
    if (!isConfirmed) return;

    // Set loading states
    setIsLoadingNewFieldsOnly(true);
    setGeneratedText("");
    setLoading(true);
    setError(false);
    setRenderText(false);

    try {
      console.log("Generating new fields only...");
      const response = await fetch('http://localhost:4000/api/ai/generate-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Field generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      setGeneratedText(result.message || "New fields generated successfully");
    } catch (error) {
      console.error('Error generating new fields:', error);
      setGeneratedText(`Error: ${error.message}`);
      setError(true);
    } finally {
      // Reset states and fetch updated data
      setRenderText(true);
      setIsLoadingNewFieldsOnly(false);
      setLoading(false);
      fetchRadarData();
    }
  };

  /**
   * Handles the full update process:
   * 1. Scrapes new data
   * 2. Updates metrics for all fields
   * 3. Generates new fields
   * 4. Generates insights
   */
  const handleButtonClick = async () => {
    // Confirm user action
    const isConfirmed = window.confirm(
      "Are you sure you want to update fields and generate insights?"
    );
    if (!isConfirmed) return;

    // Set loading states
    setIsLoading(true);
    setGeneratedText("");
    setLoading(true);
    setCurrentLoaderIndex(0);
    setError(false);
    setRenderText(false);
    setRenderTrends(false);

    try {
      console.log("Triggering scraper...");
      console.log("Scraper executed successfully. Proceeding to metric reevaluation...");
      
      // Get all field IDs to update
      const fieldIds = await fetchAllFieldIds();

      let successfulUpdates = 0;
      let failedUpdates = 0;

      if (fieldIds.length > 0) {
        // Run scraper first
        const scraperSuccess = await runScraper();
        if (!scraperSuccess) {
          console.warn("Scraper failed or returned no data - proceeding anyway");
          // Continue execution even if scraper fails
        }

        // Small delay before proceeding
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update metrics for each field
        for (const fieldId of fieldIds) {
          try {
            const reevaluateResponse = await fetch('http://localhost:4000/api/ai/update-metrics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ field_id: fieldId }),
            });

            if (!reevaluateResponse.ok) {
              const errorData = await reevaluateResponse.json();
              throw new Error(errorData.error || `Reevaluation failed for field ID: ${fieldId}`);
            }
            successfulUpdates++;
          } catch (error) {
            console.error(`Error updating metrics for field ID: ${fieldId}`, error);
            failedUpdates++;
          }
        }
      }

      console.log(`Metrics updated successfully. Successfully updated: ${successfulUpdates}, Failed: ${failedUpdates}`);

      // Generate new fields
      console.log("Proceeding to new field generation...");
      const fieldResponse = await fetch('http://localhost:4000/api/ai/generate-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!fieldResponse.ok) {
        const errorData = await fieldResponse.json();
        throw new Error(errorData.error || `Field generation failed: ${fieldResponse.statusText}`);
      }

      // Generate insights
      console.log("Fields generated successfully. Proceeding to insight generation...");
      const insightResponse = await fetch('http://localhost:4000/api/ai/generate-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!insightResponse.ok) {
        const errorData = await insightResponse.json();
        throw new Error(errorData.error || `Insight generation failed: ${insightResponse.statusText}`);
      }

      const insightData = await insightResponse.json();
      console.log("Insight generated successfully:", insightData);
      
      // Update states with results
      setTextResult(insightData.insight);
      setGeneratedText(`Fields updated successfully. Successfully updated: ${successfulUpdates}, Failed: ${failedUpdates}`);
    } catch (error) {
      console.error('Error:', error);
      setGeneratedText(`Error: ${error.message}`);
      setError(true);
    } finally {
      // Reset states and fetch updated data
      setRenderText(true);
      setIsLoading(false);
      setLoading(false);
      fetchRadarData();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Full update button */}
      <button
        type="submit"
        className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-medium 
               rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 
               focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200
               disabled:bg-blue-400 disabled:text-gray-200 disabled:cursor-not-allowed"
        onClick={handleButtonClick}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Update Fields & View Insights'}
      </button>
      
      {/* Insights only button */}
      <button
        type="submit"
        className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white font-medium 
               rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 
               focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200
               disabled:bg-green-400 disabled:text-gray-200 disabled:cursor-not-allowed"
        onClick={handleGenerateInsightsOnly}
        disabled={isLoadingInsightsOnly}
      >
        {isLoadingInsightsOnly ? 'Processing...' : 'View Insights Only'}
      </button>
      
      {/* New fields only button */}
      <button
        type="submit"
        className="w-full sm:w-auto px-6 py-2 bg-purple-600 text-white font-medium 
               rounded-lg shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 
               focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200
               disabled:bg-purple-400 disabled:text-gray-200 disabled:cursor-not-allowed"
        onClick={handleGenerateNewFieldsOnly}
        disabled={isLoadingNewFieldsOnly}
      >
        {isLoadingNewFieldsOnly ? 'Generating...' : 'Generate New Fields Only'}
      </button>
    </div>
  );
};

export default AIPromptFieldButton;