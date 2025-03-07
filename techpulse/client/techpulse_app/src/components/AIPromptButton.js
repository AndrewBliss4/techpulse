import React, { useState } from 'react';

const AIPromptFieldButton = () => {
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleButtonClick = async () => {
    setIsLoading(true);
    setGeneratedText(""); // Clear old responses before a new request

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

      // Step 3: Trigger insight generation
      const insightResponse = await fetch('http://localhost:4000/generate-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!insightResponse.ok) {
        throw new Error(`Insight generation failed: ${insightResponse.statusText}`);
      }

      const insightData = await insightResponse.json();
      console.log("Insight generated successfully:", insightData.insight);
      setGeneratedText(insightData.insight);

    } catch (error) {
      console.error('Error:', error);
      setGeneratedText(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleButtonClick} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Generate Text with Field Prompt'}
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