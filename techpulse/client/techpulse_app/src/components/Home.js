import React from 'react'
import '../styles/globals.css';
import { Bell, Search, TrendingUp, Zap, Globe, Users, BarChart } from 'lucide-react';

const Home = () => {
    const trendingTopics = [
        { title: "AI Advances", sources: "BCG, Mckinsey", trend: "+24%" },
        { title: "Web3 Updates", sources: "Bloomberg", trend: "+15%" },
        { title: "Cloud Computing", sources: "JPMorgan, Web of Science", trend: "+18%" }
      ];
    
      const latestInsights = [
        { title: "The Future of Quantum Computing", category: "Emerging Tech", readTime: "5 min" },
        { title: "AI in Healthcare: 2024 Trends", category: "AI & ML", readTime: "8 min" },
        { title: "Cybersecurity Best Practices", category: "Security", readTime: "6 min" }
      ];
    
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
                <div className="bg-green-50 p-6 rounded-xl">
                  <Users className="h-8 w-8 text-green-600 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900">Built for Banking</h3>
                  <p className="text-gray-600">Designed for RBC analysts</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-xl">
                  <BarChart className="h-8 w-8 text-purple-600 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900">Daily Updates</h3>
                  <p className="text-gray-600">Insights updated daily</p>
                </div>
              </div>
            </div>
          </div>
    
          {/* Content Section */}
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Trending Topics */}
              <div className="lg:col-span-2">
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
              </div>
    
              {/* Latest Insights */}
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Latest Insights</h2>
                <div className="space-y-4">
                  {latestInsights.map((insight, index) => (
                    <div key={index} className="border-b pb-4 last:border-b-0">
                      <h3 className="font-medium text-gray-900 mb-1">{insight.title}</h3>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded">{insight.category}</span>
                        <span className="ml-2">{insight.readTime} read</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
}
export default Home