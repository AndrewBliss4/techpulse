import React, { useEffect, useState } from 'react'
import axios from 'axios';
import '../styles/globals.css';
import rbcLogo from '../assets/Royal-Bank-of-Canada-Logo.png';
import { Bell, Search, TrendingUp, Zap, Globe, BarChart, Lightbulb, CircleAlert } from 'lucide-react'
import parse from 'html-react-parser';
import Radar from './Radar.js';

//Loaders
import { tailChase } from 'ldrs';
import { quantum } from 'ldrs'
import { grid } from 'ldrs';
import { helix } from 'ldrs';

tailChase.register();
quantum.register();
grid.register();
helix.register();

const Home = () => {

  // const trendingTopics = [
  //   { title: "AI Advances", sources: "BCG, Mckinsey", trend: "+24%" },
  //   { title: "Web3 Updates", sources: "Bloomberg", trend: "+15%" },
  //   { title: "Cloud Computing", sources: "JPMorgan, Web of Science", trend: "+18%" }
  // ];

  // const latestInsights = [
  //   { title: "The Future of Quantum Computing", category: "Emerging Tech", readTime: "5 min" },
  //   { title: "AI in Healthcare: 2024 Trends", category: "AI & ML", readTime: "8 min" },
  //   { title: "Cybersecurity Best Practices", category: "Security", readTime: "6 min" }
  // ];

  //useStates for GPT output
  const [searchTerm, setSearchTerm] = useState("");
  const [textResult, setTextResult] = useState("");

  const [trendingTopics, setTrendingTopics] = useState([]);
  const [latestInsights, setLatestInsights] = useState([]);

  const [loading, setLoading] = useState(false);
  const [renderText, setRenderText] = useState(false);
  const [renderTrends, setRenderTrends] = useState(false);
  const [error, setError] = useState(false);

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

  const [currentLoaderIndex, setCurrentLoaderIndex] = useState(0);

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

  const currentLoader = loaders[currentLoaderIndex].loader;
  const currentLoaderText = loaders[currentLoaderIndex].text;

  //function to fetch gpt data from server
  const handleSubmit = async (e) => {

    //display loading sign
    setLoading(true);
    //Reset loader cycle
    setCurrentLoaderIndex(0);
    //Reset error state
    setError(false);
    //reset the old output
    setRenderText(false);
    //reset trends
    setRenderTrends(false);

    e.preventDefault()

    axios.post('http://localhost:4000/gpt', { prompt: searchTerm }).then((resp) => {

      let resultArr = resp.data.split("***");

      setTextResult(resultArr[0]);

      //Handle trends
      let tempTrendingTopics = [];
      for (const entry of resultArr[1].split("/")) {
        tempTrendingTopics.push(JSON.parse(entry));
      };

      setTrendingTopics(tempTrendingTopics);

      //Handle Top Insights
      let tempInsights = [];
      for (const entry of resultArr[2].split("/")) {
        tempInsights.push(JSON.parse(entry));
      };

      setLatestInsights(tempInsights);

      console.log(resp.data);

      //Render the output
      setRenderText(true);
      setRenderTrends(true);

    }).catch((err) => {
      console.log(err);
      //Set error state
      setError(true);

    }).finally(() => {
      //Remove loading sign
      setLoading(false);
    })

  };

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
              AI-Powered Technology Radar
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Real-time analytics and insights from articles, industry reports, and competitors
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-blue-50 p-6 rounded-xl">
              <Globe className="h-8 w-8 text-blue-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900">Robust Reach</h3>
              <p className="text-gray-600">Coverage across 50+ data sources</p>
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
        </div>
      </div>



      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Radar></Radar>
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
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="search"
                  type="text"
                  placeholder="Enter keywords to generate..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg 
                          shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                          text-sm placeholder:text-gray-400"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-medium 
                     rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 
                     focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200
                     disabled:bg-blue-400 disabled:text-gray-200 disabled:cursor-not-allowed"
              onClick={handleSubmit}
              disabled={loading}
            >
              View Insights
            </button>
          </div>
        </div>

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

        {/*GPT Output*/}

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
            <div className="mt-4 p-4 bg-white/80 rounded-lg shadow-sm border border-blue-200">
              {/* <p className="text-gray-700 leading-relaxed"> */}
              {parse(textResult)}
              {/* </p> */}
            </div>
          </div>
        </div>
        }

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trending Topics */}
          {renderTrends && <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center space-x-2 mb-6">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <h2 className="text-xl font-bold text-gray-900">Trending Topics</h2>
              </div>
              <div className="space-y-4">
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

          {/* Latest Insights */}
          {renderTrends && <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Latest Insights</h2>
            <div className="space-y-4">
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
          </div>}
        </div>
      </div>
    </div>
  );
}
export default Home