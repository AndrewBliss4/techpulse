import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import chroma from 'chroma-js'
//Components
import Home from './components/Home.js';
import Technology from './components/Technology.js';
import AIPromptFieldButton from './components/AIPromptButton';
import ScrapeFieldsButton from './components/ScrapeFieldsButton';
const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/technology" element={<Technology />} />
        <Route path="/scrape-fields" element={<ScrapeFieldsButton/>} />
        <Route path="/ai-prompt-field" element={<AIPromptFieldButton />} />
      
      </Routes>
    </Router>
  );
};

export default App;