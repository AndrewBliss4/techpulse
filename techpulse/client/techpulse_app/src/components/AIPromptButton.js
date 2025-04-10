import React, { useState } from 'react';

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
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInsightsOnly, setIsLoadingInsightsOnly] = useState(false);

  // Fetch all field IDs from the backend
  const fetchAllFieldIds = async () => {
    try {
      const response = await fetch('http://localhost:4000/get-all-field-ids', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch field IDs: ${response.statusText}`);
      }
      const data = await response.json();
      return data.fieldIds;
    } catch (error) {
      console.error('Error fetching field IDs:', error);
      return [];
    }
  };

  // Function to trigger the scraper
  const runScraper = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/run-scraper', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Scraper failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Scraper executed successfully:', data.message);
      return true;
    } catch (error) {
      console.error('Error running scraper:', error);
      throw error;
    }
  };

  const handleGenerateInsightsOnly = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to generate insights without updating fields?"
    );
    if (!isConfirmed) {
      return;
    }

    setIsLoadingInsightsOnly(true);
    setGeneratedText("");
    setLoading(true);
    setCurrentLoaderIndex(0);
    setError(false);
    setRenderText(false);
    setRenderTrends(false);

    try {
      console.log("Proceeding to insight generation...");
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const insightResponse = await fetch('http://localhost:4000/generate-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!insightResponse.ok) {
        const errorData = await insightResponse.json().catch(() => ({}));
        throw new Error(
          `Insight generation failed: ${insightResponse.status} - ${insightResponse.statusText}\n${
            errorData.message || 'No additional error information'
          }`
        );
      }

      const insightData = await insightResponse.json();
      console.log("Insight generated successfully:", insightData);

      if (!insightData.insight) {
        throw new Error("Received empty insight from server");
      }

      setTextResult(insightData.insight);
      setGeneratedText("Insights generated successfully");
      
    } catch (error) {
      console.error('Error generating insights:', error);
      setGeneratedText(`Error: ${error.message}`);
      setError(true);
    } finally {
      setRenderText(true);
      setIsLoadingInsightsOnly(false);
      setLoading(false);
      fetchRadarData();
    }
  };

  const handleButtonClick = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to generate insights?"
    );
    if (!isConfirmed) {
      return;
    }

    setIsLoading(true);
    setGeneratedText("");
    setLoading(true);
    setCurrentLoaderIndex(0);
    setError(false);
    setRenderText(false);
    setRenderTrends(false);

    try {
      console.log("Triggering scraper...");
      const scraperSuccess = await runScraper();
      if (!scraperSuccess) {
        throw new Error("Scraper failed to run.");
      }

      console.log("Scraper executed successfully. Proceeding to metric reevaluation...");
      const fieldIds = await fetchAllFieldIds();
      if (fieldIds.length === 0) {
        throw new Error("No fields found to update.");
      }

      let successfulUpdates = 0;
      let failedUpdates = 0;

      for (const fieldId of fieldIds) {
        try {
          const reevaluateResponse = await fetch('http://localhost:4000/gpt-update-metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field_id: fieldId }),
          });

          if (!reevaluateResponse.ok) {
            throw new Error(`Reevaluation failed for field ID: ${fieldId}`);
          }
          successfulUpdates++;
        } catch (error) {
          console.error(`Error updating metrics for field ID: ${fieldId}`, error);
          failedUpdates++;
        }
      }

      console.log(`Metrics updated successfully. Successfully updated: ${successfulUpdates}, Failed: ${failedUpdates}`);

      console.log("Proceeding to new field generation...");
      const fieldResponse = await fetch('http://localhost:4000/gpt-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!fieldResponse.ok) {
        throw new Error(`Field generation failed: ${fieldResponse.statusText}`);
      }

      console.log("Fields generated successfully. Proceeding to insight generation...");
      const insightResponse = await fetch('http://localhost:4000/generate-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!insightResponse.ok) {
        throw new Error(`Insight generation failed: ${insightResponse.statusText}`);
      }

      const insightData = await insightResponse.json();
      console.log("Insight generated successfully:", insightData.insight);
      setTextResult(insightData.insight);
      setGeneratedText(`Fields updated successfully. Successfully updated: ${successfulUpdates}, Failed: ${failedUpdates}`);
    } catch (error) {
      console.error('Error:', error);
      setGeneratedText(`Error: ${error.message}`);
    } finally {
      setRenderText(true);
      setIsLoading(false);
      setLoading(false);
      fetchRadarData();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
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
    </div>
  );
};

export default AIPromptFieldButton;