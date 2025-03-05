import React, { useState } from 'react';

const AIPromptFieldButton = () => {
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleButtonClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:4000/gpt-field', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: '' }), // You can pass additional user input here if needed
      });
      const data = await response.text();
      setGeneratedText(data);
    } catch (error) {
      console.error('Error fetching AI response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleButtonClick} disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Generate Text with Field Prompt'}
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