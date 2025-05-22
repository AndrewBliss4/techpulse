import React, { useEffect, useState } from 'react'
import axios from 'axios';
import '../styles/globals.css';
import rbcLogo from '../assets/Royal-Bank-of-Canada-Logo.png';
import { Bell, Search, TrendingUp, Zap, Shovel, Globe, BarChart, Lightbulb, Clock, MessageSquareReplyIcon, ChevronDown, ArrowRight, Info, CircleAlert } from 'lucide-react'
import Radar from './Radar.js';
import Rating from './Rating.js';
import AIPromptFieldButton from './AIPromptButton.js';
import recentInsight from './Insights/MostRecentInsight.txt';
import ReactMarkdown from 'react-markdown';

//Loaders
import { tailChase } from 'ldrs';
import { quantum } from 'ldrs'
import { grid } from 'ldrs';
import { helix } from 'ldrs';
import ScrapeFieldsButton from './ScrapeFieldsButton.js';
import ScrapeSubFieldsButton from './ScrapeSubFieldsButton.js';

tailChase.register();
quantum.register();
grid.register();
helix.register();

const Home = () => {

  //useStates for GPT output
  const [searchTerm, setSearchTerm] = useState("");
  const [textResult, setTextResult] = useState("");

  const [trendingTopics, setTrendingTopics] = useState([]);
  const [latestInsights, setLatestInsights] = useState([]);

  const [loading, setLoading] = useState(false);
  const [renderText, setRenderText] = useState(false);
  const [renderTrends, setRenderTrends] = useState(false);
  const [error, setError] = useState(false);

  const [currentLoaderIndex, setCurrentLoaderIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [success, setSuccess] = useState(false); // Make sure this is defined

  const [isScrapeExpanded, setIsScrapeExpanded] = useState(false);

  const [scrapeFieldsSuccess, setScrapeFieldsSuccess] = useState(false);
  const [scrapeSubFieldsSuccess, setScrapeSubFieldsSuccess] = useState(false);

  //loader states

  const loaders = [
    {
      loader: <l-quantum
        size="30"
        stroke="3"
        bg-opacity="0"
        speed="2"
        color="#2466e0"
      ></l-quantum>,
      text: 'Fetching Sources...'
    },
    {
      loader: <l-tail-chase
        size="30"
        stroke="3"
        bg-opacity="0"
        speed="2"
        color="#2466e0"
      ></l-tail-chase>,
      text: 'Collecting Data...'
    },
    {
      loader: <l-grid
        size="30"
        stroke="3"
        bg-opacity="0"
        speed="2"
        color="#2466e0"
      ></l-grid>,
      text: 'Parsing Keywords...'
    },
    {
      loader: <l-helix
        size="30"
        stroke="3"
        bg-opacity="0"
        speed="2"
        color="#2466e0"
      ></l-helix>,
      text: 'Generating Insights...'
    }
  ]


  useEffect(() => {
    // Set up interval to rotate loaders every 3 seconds
    const intervalId = setInterval(() => {
      setCurrentLoaderIndex((prevIndex) =>
        (prevIndex + 1) % loaders.length
      );
    }, 5000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);


  //Make sure the file exists
  useEffect(() => {
    fetch(recentInsight)
      .then((r) => r.text())
      .then(text => {
        if (text.trim() !== '') {
          setTextResult(text);
          setRenderText(true);
        } else {
          console.log('MostRecentInsight.txt is empty');
        };
      });
  }, []);


  const currentLoader = loaders[currentLoaderIndex].loader;
  const currentLoaderText = loaders[currentLoaderIndex].text;

  //function to fetch gpt data from server

  const [finalRating, setFinalRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState(""); // State to hold feedback text
  const [temperature, setTemperature] = useState(0.7); // Default temperature
  const [topP, setTopP] = useState(0.9); // Default top-p

  // Predefined feedback options with their corresponding temperature and top-p adjustments
  const feedbackOptions = {
    negative: [
      { text: "Too Generic", tempRange: 0.2, topPRange: 0.1 },
      { text: "Too Vague", tempRange: -0.2, topPRange: -0.1 },
      { text: "Outdated Info", tempRange: 0.1, topPRange: 0.1 },
      { text: "Not Relevant", tempRange: -0.1, topPRange: -0.1 },
      { text: "Incorrect Info", tempRange: -0.3, topPRange: -0.2 },
    ],
    positive: [
      { text: "Clear & Concise", tempRange: 0.1, topPRange: 0.1 },
      { text: "Highly Relevant", tempRange: 0.1, topPRange: 0.1 },
      { text: "Data-Driven", tempRange: 0, topPRange: 0.1 },
      { text: "Actionable", tempRange: 0.1, topPRange: 0.1 },
      { text: "Balanced View", tempRange: 0.1, topPRange: 0.1 },
    ],
  };

  const handleRatingSelect = (rating) => {
    setFinalRating(Number(rating));
    if (rating === 1) {
      setFeedbackText(""); // Clear feedback text if deselected
    } else if (rating === -1) {
      setFeedbackText(""); // Clear feedback text if deselected
    }
    console.log("Selected Rating:", rating);
  };

  // Function to handle feedback selection
  const handleFeedbackSelect = (option) => {
    setFeedbackText(option.text); // Set the selected feedback text

    // Directly assign the adjusted temperature and top-p values
    const adjustedTemp = ((temperature + option.tempRange) + temperature) / 2;
    const adjustedTopP = ((topP + option.topPRange) + topP) / 2;

    // Set the adjusted temperature and top-p values
    if (adjustedTemp < 0) {
      setTemperature(0);
    }
    else if (adjustedTemp > 2.0) {
      setTemperature(2.0)
    }
    else setTemperature(adjustedTemp);

    if (adjustedTopP < 0) {
      setTopP(0);
    }
    else if (adjustedTopP > 1.0) {
      setTopP(1.0)
    }
    else setTopP(adjustedTopP);
  };

  // ---------- DataBase get and post methods ---------- //
  axios.defaults.headers.post['Content-Type'] = 'application/json';
  const [radarData, setRadarData] = useState([]);

  // Model parameters
useEffect(() => {
  axios.get('http://localhost:4000/api/db/model-parameters')
    .then(response => {
      console.log('Model params:', response.data);
      if (response.data.success && response.data.data.length > 0) {
        setTemperature(response.data.data[0].temperature);
        setTopP(response.data.data[0].top_p);
      }
    })
    .catch(error => console.error('Error fetching model params:', error));
}, []);

// Radar data
useEffect(() => {
  axios.get('http://localhost:4000/api/db/radar-data')
    .then(response => {
      console.log('Radar data:', response.data);
      if (response.data.success) {
        setRadarData(response.data.data);
      }
    })
    .catch(error => console.error('Error fetching radar data:', error));
}, []);

// Fetch radar data function
const fetchRadarData = () => {
  axios.get('http://localhost:4000/api/db/radar-data')
    .then(response => {
      if (response.data.success) {
        setRadarData(response.data.data);
      }
    })
    .catch(error => console.error('Error fetching radar data:', error));
};

// Feedback submission
async function addData() {
  try {
    const idResponse = await axios.get('http://localhost:4000/db/insights/latest-id');
    const latestId = idResponse.data.data.latestId;

    if (latestId) {
      await axios.post('http://localhost:4000/db/feedback', {
        insight_id: latestId,
        feedback_text: feedbackText,
        rating: finalRating
      });

      await axios.put('http://localhost:4000/db/model-parameters', {
        temperature: temperature,
        top_p: topP,
        parameter_id: 1
      });

      alert('Feedback submitted successfully');
    }
  } catch (error) {
    console.error("Error submitting feedback:", error);
    alert('Error submitting feedback');
  }
}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-blue-500">TechPulse</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search insights..."
                  className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button className="p-2 rounded-full hover:bg-gray-100">
                <Bell className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              AI-Powered Technology Insights
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Real-time analytics and insights from articles, industry reports, and competitors
            </p>
          </div>
          {/* Insight Generation Container */}
          <div className="mb-8 p-6 bg-white rounded-xl shadow-lg">
            <div className="space-y-6 sm:space-y-0 sm:flex sm:items-end sm:gap-4">
              <div className="flex-grow space-y-2">
                <div className='flex items-center space-x-2'>
                  <Zap className="h-5 w-5 text-blue-600" />
                  <label
                    htmlFor="search"
                    className="block text-lg font-medium text-gray-700"
                  >
                    Generate Insights
                  </label>
                </div>
                <div className="flex justify-center">
                  <AIPromptFieldButton setTextResult={setTextResult}
                    setTrendingTopics={setTrendingTopics} setLatestInsights={setLatestInsights}
                    setLoading={setLoading} setCurrentLoaderIndex={setCurrentLoaderIndex} setError={setError}
                    setRenderText={setRenderText} setRenderTrends={setRenderTrends} fetchRadarData={fetchRadarData} />
                </div>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && <div className="flex justify-center items-center gap-2 h-[150px]">
            {currentLoader}
            <label
              htmlFor="loading"
              className="block text-lg font-medium text-blue-700"
            >
              {currentLoaderText}
            </label>
          </div>}

          {error && <div className="flex justify-center items-center gap-2 h-[150px]">
            <CircleAlert className="h-8 w-8 text-blue-600" />
            <label
              htmlFor="loading"
              className="block text-lg font-medium text-blue-700"
            >
              Invalid Input! Please try a different prompt.
            </label>
          </div>}

          {/* GPT Output */}
          {renderText && <div className="mb-8 p-6 bg-blue-100 rounded-xl shadow-lg">
            <div>
              <div className='flex items-center space-x-2'>
                <Lightbulb className="h-5 w-5 text-blue-600" />
                <label
                  htmlFor="search"
                  className="block text-lg font-medium text-gray-700"
                >
                  Insights
                </label>
              </div>
              <div className="mt-4 p-4 bg-white/80 rounded-lg shadow-sm border border-blue-200 max-h-[800px] overflow-y-auto prose">
                <ReactMarkdown components={{
                  // Headers
                  h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-blue-600 mb-4" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-xl font-semibold text-gray-800 mb-3" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-lg font-medium text-gray-700 mb-2" {...props} />,
                  // Paragraph
                  p: ({ node, ...props }) => <p className="text-gray-600 leading-relaxed mb-4" {...props} />,
                  // Strong/bold text
                  strong: ({ node, ...props }) => <strong className="font-semibold text-gray-700" {...props} />,
                  // Lists
                  ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="text-gray-600" {...props} />,
                  // Links
                  a: ({ node, ...props }) => <a className="text-blue-500 hover:text-blue-700 underline" {...props} />,
                  // Blockquote
                  blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-600 mb-4" {...props} />,
                  // Code
                  code: ({ node, ...props }) => <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm" {...props} />,
                }}>
                  {textResult}
                </ReactMarkdown>
              </div>
            </div>
          </div>}

          {/* Trending Topics and Latest Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {renderTrends && <div className="lg:col-span-2 h-full">
              <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col">
                <div className="flex items-center space-x-2 mb-6">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <h2 className="text-xl font-bold text-gray-900">Trending Topics</h2>
                </div>
                <div className="space-y-4 flex-grow">
                  {trendingTopics.map((topic, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium">{topic.title}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-600">Sources: {topic.sources}</span>
                        <span className="text-green-600">{topic.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>}

            {renderTrends && <div className="h-full">
              <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Latest Insights</h2>
                <div className="space-y-4 flex-grow">
                  {latestInsights.map((insight, index) => (
                    <div key={index} className="border-b pb-4 last:border-b-0">
                      <h3 className="font-medium text-gray-900 mb-1">{insight.title}</h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded">{insight.category}</span>
                        <span className="ml-2">{insight.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>}
          </div>

          {/* Feedback Section */}
          <div className="mb-8 p-6 bg-white rounded-xl shadow-lg">
            <div className="space-y-6 sm:space-y-0 sm:flex sm:items-end sm:gap-4">
              <div className="flex-grow space-y-2">
                <div className="flex items-center space-x-2">
                  <MessageSquareReplyIcon className="h-5 w-5 text-blue-600" />
                  <label htmlFor="search" className="block text-lg font-medium text-gray-700">
                    Provide Feedback
                  </label>
                  <Rating onRatingSelect={handleRatingSelect} />
                </div>

                {finalRating !== 0 && (
                  <div className="mt-4">
                    <p className="text-gray-700">Please select a feedback prompt:</p>
                    <div className="space-y-2 space-x-4">
                      {finalRating === 1 ? (
                        feedbackOptions.positive.map((option, index) => (
                          <button
                            key={index}
                            className="w-full sm:w-auto px-6 py-2 bg-gray-100 text-black font-medium rounded-lg shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors duration-200"
                            onClick={() => handleFeedbackSelect(option)}
                          >
                            {option.text}
                          </button>
                        ))
                      ) : finalRating === -1 ? (
                        feedbackOptions.negative.map((option, index) => (
                          <button
                            key={index}
                            className="w-full sm:w-auto px-6 py-2 bg-gray-100 text-black font-medium rounded-lg shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors duration-200"
                            onClick={() => handleFeedbackSelect(option)}
                          >
                            {option.text}
                          </button>
                        ))
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
              <button
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:bg-blue-400 disabled:text-gray-200 disabled:cursor-not-allowed"
                onClick={addData}
                disabled={feedbackText === ""} // Disable if feedback text is empty
              >
                Submit Feedback
              </button>
            </div>
          </div>


          {/* Content Section */}
          <div className="max-w-7xl mx-auto px-4 py-12">

            {/* Last Updated */}
            <div className="mb-8 p-6 bg-white rounded-xl shadow-lg inline-block">
              <div className='flex items-center space-x-2'>
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-medium text-gray-700">
                  Last Updated: <span className="text-blue-600">{(() => {
                    const today = new Date();
                    const lastSunday = new Date(today);
                    lastSunday.setDate(today.getDate() - today.getDay());
                    return lastSunday.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    });
                  })()}</span>
                </span>
              </div>
            </div>

            {/* Industry Radar */}
            <Radar radarData={radarData} homePage={true} fetchRadarData={fetchRadarData}></Radar>

            {/* Understanding the Radar */}
            <div className="mb-8 p-6 bg-white rounded-xl shadow-lg">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center space-x-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  <span className="text-lg font-medium text-gray-700">Understanding the Radar</span>
                </div>
                <ChevronDown className={`h-5 w-5 text-blue-600 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </div>

              {isExpanded && (
                <div className="mt-4 text-gray-600 space-y-3 animate-fadeIn">
                  <p>
                    The Industry Radar visualization plots emerging technologies across three key dimensions:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><span className="font-medium">Interest (X-axis):</span> Measures from 0-5 how developed and ready for implementation the technology is in banking.</li>
                    <li><span className="font-medium">Innovation Rate (Y-axis):</span> Indicates from 0-5 the pace of breakthrough developments in the last 6 months.</li>
                    <li><span className="font-medium">Industry Relevance (Bubble Size):</span> Represents from 0-5 how critical the technology is expected to be for banking operations.</li>
                  </ul>
                  <p>
                    Larger bubbles positioned in the upper-right quadrant represent technologies that are both mature and rapidly innovating, suggesting high strategic importance.
                  </p>
                </div>
              )}
            </div>


            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-blue-50 p-6 rounded-xl">
                <Globe className="h-8 w-8 text-blue-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900">Robust Reach</h3>
                <p className="text-gray-600">Coverage across 1000+ data sources</p>
              </div>
              <div className="bg-blue-100 p-6 rounded-xl">
                <img src={rbcLogo} alt="rbc-logo" className='h-10 w-18 -ml-[18px] mb-2'></img>
                <h3 className="text-2xl font-bold text-gray-900">Built for Banking</h3>
                <p className="text-gray-600">Designed for RBC analysts</p>
              </div>
              <div className="bg-blue-200 p-6 rounded-xl">
                <BarChart className="h-8 w-8 text-blue-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900">Weekly Updates</h3>
                <p className="text-gray-600">Insights updated every week</p>
              </div>
            </div>
            <br></br>
            {/* Scraping Tools Section */}
            <div className="mb-8 p-6 bg-white rounded-xl shadow-lg">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsScrapeExpanded(!isScrapeExpanded)}>
                <div className="flex items-center space-x-2">
                  <Shovel className="h-5 w-5 text-blue-600" />
                  <span className="text-lg font-medium text-gray-700">Manual Scraping</span>
                </div>
                <ChevronDown className={`h-5 w-5 text-blue-600 transform transition-transform duration-200 ${isScrapeExpanded ? 'rotate-180' : ''}`} />
              </div>

              {isScrapeExpanded && (
                <div className="mt-4 space-y-6 animate-fadeIn">
                  {/* Scrape Fields Section */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-6 sm:space-y-0 sm:flex sm:items-end sm:gap-4">
                      <div className="flex-grow space-y-2">
                        <div className='flex items-center space-x-2'>
                          <label className="block text-lg font-medium text-gray-700 flex items-center">
                            Scrape Fields
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <ScrapeFieldsButton
                          setError={setError}
                          setSuccess={setScrapeFieldsSuccess}
                        />
                      </div>
                    </div>
                    {scrapeFieldsSuccess && <p className="mt-2 text-green-600">Scraping fields was successful!</p>}
                  </div>

                  {/* Scrape Sub Fields Section */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-6 sm:space-y-0 sm:flex sm:items-end sm:gap-4">
                      <div className="flex-grow space-y-2">
                        <div className='flex items-center space-x-2'>
                          <label className="block text-lg font-medium text-gray-700">
                            Scrape Sub Fields
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <ScrapeSubFieldsButton
                          setError={setError}
                          setSuccess={setScrapeSubFieldsSuccess}
                        />
                      </div>
                    </div>
                    {scrapeSubFieldsSuccess && <p className="mt-2 text-green-600">Scraping subfields was successful!</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;