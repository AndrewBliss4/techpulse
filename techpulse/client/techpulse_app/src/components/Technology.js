import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TrendingUp, Zap, Lightbulb, CircleAlert, RadarIcon } from 'lucide-react'
import Radar from './Radar.js';
import axios from 'axios';
import parse from 'html-react-parser';

//Loaders
import { tailChase } from 'ldrs';
import { quantum } from 'ldrs'
import { grid } from 'ldrs';
import { helix } from 'ldrs';

tailChase.register();
quantum.register();
grid.register();
helix.register();

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

const Technology = () => {

    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [textResult, setTextResult] = useState("");

    const [currentLoaderIndex, setCurrentLoaderIndex] = useState(0);

    const radarSearch = (radarTerm) => {
        setSearchTerm(radarTerm);
        handleRadarSubmit(radarTerm);
    };

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

    const handleRadarSubmit = async (radarTerm) => {

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

        axios.post('http://localhost:4000/gpt', { prompt: radarTerm }).then((resp) => {

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



    // Extract and decode parameters
    const name = decodeURIComponent(searchParams.get('name') || '');
    const interest = parseFloat(searchParams.get('interest') || '0'); // Convert to number
    const innovation = parseFloat(searchParams.get('innovation') || '0');
    const investments = parseInt(searchParams.get('investments') || '0', 10);
    
    // Usestates
    const [trendingTopics, setTrendingTopics] = useState([]);
    const [latestInsights, setLatestInsights] = useState([]);

    const [loading, setLoading] = useState(false);
    const [renderText, setRenderText] = useState(false);
    const [renderTrends, setRenderTrends] = useState(false);
    const [error, setError] = useState(false);

    const currentLoader = loaders[currentLoaderIndex].loader;
    const currentLoaderText = loaders[currentLoaderIndex].text;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <div className="flex items-center space-x-2">
                    <Zap className="h-6 w-6 text-blue-600" />
                    <span className="text-xl font-bold text-blue-500">TechPulse</span>
                </div>
            </div>
            <div className="text-center mb-6">
                <h2 className="text-2xl text-blue-600 mb-2">Emerging Technology</h2>
                <h3 className="text-3xl font-bold text-gray-800">{name}</h3>
                <div className="flex justify-center space-x-8 mt-4">
                    <div className="text-center">
                        <p className="text-sm text-gray-600">Interest Score</p>
                        <p className="text-xl font-semibold text-blue-600">{interest}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-600">Innovation Score</p>
                        <p className="text-xl font-semibold text-green-600">{innovation}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-600">Investments</p>
                        <p className="text-xl font-semibold text-purple-600">${investments}B</p>
                    </div>
                </div>
            </div>
            <div className="bg-gray-50 rounded-lg shadow-md p-6">

                <div className="mb-8 p-6 bg-white rounded-xl shadow-lg">
                    <div className='flex items-center space-x-2'>
                        <RadarIcon className="h-5 w-5 text-blue-600" />
                        <label
                            htmlFor="search"
                            className="block text-lg font-medium text-gray-700"
                        >
                            Specialized Technology Radar
                        </label>
                    </div>
                    <div className="space-y-6 sm:space-y-0 sm:flex sm:items-end sm:gap-4">
                        <Radar radarSearch={radarSearch} homePage={false} technology={name}></Radar>
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
};

export default Technology;
