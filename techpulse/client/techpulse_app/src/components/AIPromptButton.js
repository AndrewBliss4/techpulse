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
      const response = await fetch('http://localhost:4000/gpt-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Field generation failed: ${response.statusText}`);
      }

      const data = await response.text();
      console.log("AI Response:", data);
      setGeneratedText(data);

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
          <h3>Generated Text:</h3>
          <p>{generatedText}</p>
        </div>
      )}
    </div>
  );
};

export default AIPromptFieldButton;
