import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import chroma from 'chroma-js';

// Components
import Home from './components/Home.js';
import Technology from './components/Technology.js';
import AIPromptFieldButton from './components/AIPromptButton';
import AISubfieldGenerator from './components/AISubfieldGenerator'; // Import the new component

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/technology" element={<Technology />} />
        <Route path="/ai-prompt-field" element={<AIPromptFieldButton />} />
        {/* Add a new route for the AISubfieldGenerator component */}
        <Route path="/generate-subfields" element={<AISubfieldGenerator />} />
      </Routes>
    </Router>
  );
};

export default App;