// components/AISubfieldGenerator.js
import React, { useState } from 'react';
import axios from 'axios';
import { Zap } from 'lucide-react';

const AISubfieldGenerator = () => {
  const [subfieldLoading, setSubfieldLoading] = useState(false); // State for loading
  const [error, setError] = useState(false); // State for errors

  // Function to handle subfield generation
  const handleGenerateSubfields = async () => {
    setSubfieldLoading(true);
    setError(false);

    try {
      // Call the backend endpoint to generate subfields
      const response = await axios.post('http://localhost:4000/gpt-subfield');
      console.log("Subfields generated:", response.data);
      alert("Subfields generated successfully!");
    } catch (err) {
      console.error("Error generating subfields:", err);
      setError(true);
      alert("Failed to generate subfields. Please try again.");
    } finally {
      setSubfieldLoading(false);
    }
  };

  return (
    <div className="mb-8 p-6 bg-white rounded-xl shadow-lg">
      <div className="space-y-6 sm:space-y-0 sm:flex sm:items-end sm:gap-4">
        <div className="flex-grow space-y-2">
          <div className='flex items-center space-x-2'>
            <Zap className="h-5 w-5 text-blue-600" />
            <label className="block text-lg font-medium text-gray-700">
              Generate Subfields for Quantum Computing
            </label>
          </div>
        </div>
        <button
          className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-medium 
                     rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 
                     focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200
                     disabled:bg-blue-400 disabled:text-gray-200 disabled:cursor-not-allowed"
          onClick={handleGenerateSubfields}
          disabled={subfieldLoading}
        >
          {subfieldLoading ? "Generating Subfields..." : "Generate Subfields"}
        </button>
      </div>
      {error && (
        <div className="mt-4 text-red-600">
          An error occurred while generating subfields. Please try again.
        </div>
      )}
    </div>
  );
};

export default AISubfieldGenerator;