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
  const [isLoadingNewFieldsOnly, setIsLoadingNewFieldsOnly] = useState(false);

  const handleGenerateInsightsOnly = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to generate insights without updating fields?"
    );
    if (!isConfirmed) return;

    setIsLoadingInsightsOnly(true);
    setGeneratedText("");
    setLoading(true);
    setCurrentLoaderIndex(0);
    setError(false);
    setRenderText(false);
    setRenderTrends(false);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const insightResponse = await fetch('http://localhost:4000/generate-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!insightResponse.ok) {
        throw new Error(`Insight generation failed: ${insightResponse.statusText}`);
      }

      const insightData = await insightResponse.json();
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

  const handleGenerateNewFieldsOnly = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to generate new fields only?"
    );
    if (!isConfirmed) return;

    setIsLoadingNewFieldsOnly(true);
    setGeneratedText("");
    setLoading(true);
    setError(false);
    setRenderText(false);

    try {
      const response = await fetch('http://localhost:4000/gpt-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Field generation failed: ${response.statusText}`);
      }

      setGeneratedText("New fields generated successfully");
    } catch (error) {
      console.error('Error generating new fields:', error);
      setGeneratedText(`Error: ${error.message}`);
      setError(true);
    } finally {
      setRenderText(true);
      setIsLoadingNewFieldsOnly(false);
      setLoading(false);
      fetchRadarData();
    }
  };

  const handleFullUpdate = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to update fields and generate insights?"
    );
    if (!isConfirmed) return;

    setIsLoading(true);
    setGeneratedText("");
    setLoading(true);
    setCurrentLoaderIndex(0);
    setError(false);
    setRenderText(false);
    setRenderTrends(false);

    try {
      // Fetch all field IDs
      const fieldIdsResponse = await fetch('http://localhost:4000/get-all-field-ids');
      if (!fieldIdsResponse.ok) throw new Error("Failed to fetch field IDs");
      const { fieldIds } = await fieldIdsResponse.json();

      // Update metrics for existing fields
      let successfulUpdates = 0;
      for (const fieldId of fieldIds) {
        try {
          await fetch('http://localhost:4000/gpt-update-metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field_id: fieldId }),
          });
          successfulUpdates++;
        } catch (error) {
          console.error(`Error updating field ${fieldId}:`, error);
        }
      }

      // Generate new fields
      await fetch('http://localhost:4000/gpt-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // Generate insights
      const insightResponse = await fetch('http://localhost:4000/generate-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const insightData = await insightResponse.json();
      setTextResult(insightData.insight);
      setGeneratedText(`Updated ${successfulUpdates} fields and generated new insights`);
    } catch (error) {
      console.error('Error in full update:', error);
      setGeneratedText(`Error: ${error.message}`);
      setError(true);
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
        onClick={handleFullUpdate}
        disabled={isLoading}
        className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-medium 
               rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 
               focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200
               disabled:bg-blue-400 disabled:text-gray-200 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : 'Full Update'}
      </button>
      <button
        onClick={handleGenerateInsightsOnly}
        disabled={isLoadingInsightsOnly}
        className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white font-medium 
               rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 
               focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200
               disabled:bg-green-400 disabled:text-gray-200 disabled:cursor-not-allowed"
      >
        {isLoadingInsightsOnly ? 'Processing...' : 'Insights Only'}
      </button>
      <button
        onClick={handleGenerateNewFieldsOnly}
        disabled={isLoadingNewFieldsOnly}
        className="w-full sm:w-auto px-6 py-2 bg-purple-600 text-white font-medium 
               rounded-lg shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 
               focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200
               disabled:bg-purple-400 disabled:text-gray-200 disabled:cursor-not-allowed"
      >
        {isLoadingNewFieldsOnly ? 'Processing...' : 'New Fields Only'}
      </button>
    </div>
  );
};

export default AIPromptFieldButton;