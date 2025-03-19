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
}) => {
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      return data.fieldIds; // Assuming the response is { fieldIds: [1, 2, 3, ...] }
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
      return true; // Indicate success
    } catch (error) {
      console.error('Error running scraper:', error);
      throw error; // Propagate the error
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
    setGeneratedText(""); // Clear old responses before a new request
    setLoading(true);
    setCurrentLoaderIndex(0);
    setError(false);
    setRenderText(false);
    setRenderTrends(false);

    try {
      console.log("Triggering scraper...");

      // Step 0: Run the scraper
      const scraperSuccess = await runScraper();
      if (!scraperSuccess) {
        throw new Error("Scraper failed to run.");
      }

      console.log("Scraper executed successfully. Proceeding to metric reevaluation...");

      // Step 1: Fetch all field IDs
      const fieldIds = await fetchAllFieldIds();
      if (fieldIds.length === 0) {
        throw new Error("No fields found to update.");
      }

      let successfulUpdates = 0;
      let failedUpdates = 0;

      // Step 2: Loop through each field and update metrics
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

          console.log(`Metrics reevaluated successfully for field ID: ${fieldId}`);
          successfulUpdates++;
        } catch (error) {
          console.error(`Error updating metrics for field ID: ${fieldId}`, error);
          failedUpdates++;
        }
      }

      console.log(`Metrics updated successfully. Successfully updated: ${successfulUpdates}, Failed: ${failedUpdates}`);

      // Step 3: Proceed with generating new fields
      console.log("Proceeding to new field generation...");
      const fieldResponse = await fetch('http://localhost:4000/gpt-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!fieldResponse.ok) {
        throw new Error(`Field generation failed: ${fieldResponse.statusText}`);
      }

      console.log("Fields generated successfully. Proceeding to insight generation...");

      // Step 4: Trigger insight generation with field_id = 0
      const insightResponse = await fetch('http://localhost:4000/generate-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        //body: JSON.stringify({ fieldId: 0 }), // Pass field_id = 0
      });

      if (!insightResponse.ok) {
        throw new Error(`Insight generation failed: ${insightResponse.statusText}`);
      }

      const insightData = await insightResponse.json();
      console.log("Insight generated successfully:", insightData.insight);

      let insightResult = insightData.insight;
      setTextResult(insightResult);

      // Step 5: Generate trends with field_id = 0
      // const trendsResponse = await fetch('http://localhost:4000/generate-insight-trends', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
        //body: JSON.stringify({ fieldId: 0 }), // Pass field_id = 0
      //});

      // if (!trendsResponse.ok) {
      //   throw new Error(`Trends generation failed: ${trendsResponse.statusText}`);
      // }

      // const trendsData = await trendsResponse.json();
      // console.log("Trends generated successfully:", trendsData.trends);

      // let trendsResult = trendsData.trends;

      // Handle trends
      // let tempTrendingTopics = [];
      // for (const entry of trendsResult.split("/")) {
      //   tempTrendingTopics.push(JSON.parse(entry));
      // }

      // setTrendingTopics(tempTrendingTopics);

      // Step 6: Generate top insights with field_id = 0
      // const topResponse = await fetch('http://localhost:4000/generate-insight-top', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
        //body: JSON.stringify({ fieldId: 0 }), // Pass field_id = 0
      // });

      // if (!topResponse.ok) {
      //   throw new Error(`Top insights generation failed: ${topResponse.statusText}`);
      // }

      // const topData = await topResponse.json();
      // console.log("Top insights generated successfully:", topData.top);

      // let topResult = topData.top;

      // Handle Top Insights
      // let tempInsights = [];
      // for (const entry of topResult.split("/")) {
      //   tempInsights.push(JSON.parse(entry));
      // }

      // setLatestInsights(tempInsights);

      // Final success message
      setGeneratedText(`Fields updated successfully. Successfully updated: ${successfulUpdates}, Failed: ${failedUpdates}`);
    } catch (error) {
      console.error('Error:', error);
      setGeneratedText(`Error: ${error.message}`);
    } finally {
      setRenderText(true);
      // setRenderTrends(true);
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
      {/*generatedText && (
        <div>
          <h3>Generated Insight:</h3>
          <p>{generatedText}</p>
        </div>
      )*/}
    </div>
  );
};

export default AIPromptFieldButton;