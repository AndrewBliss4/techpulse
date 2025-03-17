import React, { useState } from 'react';

const AIPromptFieldButton = ({ setTextResult, setTrendingTopics, setLatestInsights, setLoading, setCurrentLoaderIndex, setError, setRenderText, setRenderTrends }) => {
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleButtonClick = async () => {
    const isConfirmed = window.confirm("⚠️ Warning: Are you sure you want to make 10 Gajillion API calls? Each request costs tokens and I am poor! 💸");
    if (!isConfirmed) {
      return;
    }
    setIsLoading(true);
    setGeneratedText(""); // Clear old responses before a new request

    // Display loading sign
    setLoading(true);
    // Reset loader cycle
    setCurrentLoaderIndex(0);
    // Reset error state
    setError(false);
    // Reset the old output
    setRenderText(false);
    // Reset trends
    setRenderTrends(false);

    try {
      console.log("Triggering metric reevaluation...");

      // Step 1: Trigger metric reevaluation
      const reevaluateResponse = await fetch('http://localhost:4000/gpt-update-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!reevaluateResponse.ok) {
        throw new Error(`Reevaluation failed: ${reevaluateResponse.statusText}`);
      }

      console.log("Metrics reevaluated successfully. Proceeding to new field generation...");

      // Step 2: Proceed with generating new fields
      const fieldResponse = await fetch('http://localhost:4000/gpt-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!fieldResponse.ok) {
        throw new Error(`Field generation failed: ${fieldResponse.statusText}`);
      }

      console.log("Fields generated successfully. Proceeding to insight generation...");

      // Step 3: Trigger insight generation with field_id = 0
      const insightResponse = await fetch('http://localhost:4000/generate-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId: 0 }), // Pass field_id = 0
      });

      if (!insightResponse.ok) {
        throw new Error(`Insight generation failed: ${insightResponse.statusText}`);
      }

      const insightData = await insightResponse.json();
      console.log("Insight generated successfully:", insightData.insight);

      let insightResult = insightData.insight;

      setTextResult(insightResult);

      // Step 4: Generate trends with field_id = 0
      const trendsResponse = await fetch('http://localhost:4000/generate-insight-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId: 0 }), // Pass field_id = 0
      });

      if (!trendsResponse.ok) {
        throw new Error(`Trends generation failed: ${trendsResponse.statusText}`);
      }

      const trendsData = await trendsResponse.json();
      console.log("Trends generated successfully:", trendsData.trends);

      let trendsResult = trendsData.trends;

      // Handle trends
      let tempTrendingTopics = [];
      for (const entry of trendsResult.split("/")) {
        tempTrendingTopics.push(JSON.parse(entry));
      }

      setTrendingTopics(tempTrendingTopics);

      // Step 5: Generate top insights with field_id = 0
      const topResponse = await fetch('http://localhost:4000/generate-insight-top', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId: 0 }), // Pass field_id = 0
      });

      if (!topResponse.ok) {
        throw new Error(`Top insights generation failed: ${topResponse.statusText}`);
      }

      const topData = await topResponse.json();
      console.log("Top insights generated successfully:", topData.top);

      let topResult = topData.top;

      // Handle Top Insights
      let tempInsights = [];
      for (const entry of topResult.split("/")) {
        tempInsights.push(JSON.parse(entry));
      }

      setLatestInsights(tempInsights);

    } catch (error) {
      console.error('Error:', error);
      setGeneratedText(`Error: ${error.message}`);
    } finally {
      setRenderText(true);
      setRenderTrends(true);
      setIsLoading(false);
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="submit"
        className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-medium 
               rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 
               focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200
               disabled:bg-blue-400 disabled:text-gray-200 disabled:cursor-not-allowed"
        onClick={handleButtonClick}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'View Insights'}
      </button>
      {generatedText && (
        <div>
          <h3>Generated Insight:</h3>
          <p>{generatedText}</p>
        </div>
      )}
    </div>
  );
};

export default AIPromptFieldButton;