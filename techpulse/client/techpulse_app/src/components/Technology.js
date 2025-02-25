import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, Search, TrendingUp, Zap, Globe, BarChart, Lightbulb, CircleAlert, RadarIcon } from 'lucide-react'
import Radar from './Radar.js';

const Technology = () => {

    const [searchParams] = useSearchParams();


    const radarSearch = (radarTerm) => {
        console.log(radarTerm);
      };

    // Extract and decode parameters
    const name = decodeURIComponent(searchParams.get('name') || '');
    const interest = parseFloat(searchParams.get('interest') || '0'); // Convert to number
    const innovation = parseFloat(searchParams.get('innovation') || '0');
    const investments = parseInt(searchParams.get('investments') || '0', 10);

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
            <div className="bg-white rounded-lg shadow-md p-6">
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
            </div>
        </div>
    );
};

export default Technology;
