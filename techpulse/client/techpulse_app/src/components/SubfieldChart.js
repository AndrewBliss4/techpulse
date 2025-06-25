import React, { useState, useEffect } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import parse from 'html-react-parser';
import axios from 'axios';
import { ChartScatter } from 'lucide-react';
import { tailChase, quantum, grid, helix } from 'ldrs';

// Register the loaders (spinners) from the ldrs library
tailChase.register();
quantum.register();
grid.register();
helix.register();

// Main component for displaying subfield data visualization
const SubfieldChart = ({
  selectedFieldId,          // ID of the currently selected field
  fieldName,                // Name of the current field
  useColorMode,             // Flag to determine if color mode should be used
  selectedSubfieldDetails,  // Details of the selected subfield
  setSelectedSubfieldDetails, // Setter for subfield details
  selectedSubfield,         // ID of the selected subfield
  setSelectedSubfield       // Setter for selected subfield
}) => {
  // State variables
  const [radarData, setRadarData] = useState([]); // Data for scatter plot
  const [historicalData, setHistoricalData] = useState([]); // Timeline data
  const [selectedTab, setSelectedTab] = useState('scatter'); // Current active tab
  const [clickedTimelinePoint, setClickedTimelinePoint] = useState(null); // Clicked point on timeline
  const [insight, setInsight] = useState(null); // Generated insight text
  const [articleSFSources, setArticleSFSources] = useState({}); // Article sources by subfield
  const [loading, setLoading] = useState(false); // Loading state
  const [currentLoaderIndex, setCurrentLoaderIndex] = useState(0); // Current loading animation index

  // Loading animations configuration
  const loaders = [
    {
      loader: <l-quantum size="30" stroke="3" bg-opacity="0" speed="2" color="#2466e0"></l-quantum>,
      text: 'Fetching Sources...'
    },
    {
      loader: <l-tail-chase size="30" stroke="3" bg-opacity="0" speed="2" color="#2466e0"></l-tail-chase>,
      text: 'Collecting Data...'
    },
    {
      loader: <l-grid size="30" stroke="3" bg-opacity="0" speed="2" color="#2466e0"></l-grid>,
      text: 'Parsing Keywords...'
    },
    {
      loader: <l-helix size="30" stroke="3" bg-opacity="0" speed="2" color="#2466e0"></l-helix>,
      text: 'Generating Insights...'
    }
  ];

  // Fetch radar data when selectedFieldId changes
  useEffect(() => {
    const fetchRadarData = async () => {
      try {
        const response = await axios.get(`http://localhost:4000/api/db/radar-data?fieldId=${selectedFieldId}`);
        setRadarData(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch radar data:', error);
      }
    };

    if (selectedFieldId) {
      fetchRadarData();
    }
  }, [selectedFieldId]);

  // Fetch most recent insight when fieldName changes
  useEffect(() => {
    const fetchMostRecentInsight = async () => {
      try {
        // Dynamically import the insight text file
        const module = await import(`./Insights/MostRecent${fieldName}Insight.txt`);
        const response = await fetch(module.default);
        const text = await response.text();
        setInsight(text);
      } catch (error) {
        console.error('Error fetching insight:', error);
        setInsight('Failed to load insight. Please try again.');
      }
    };

    fetchMostRecentInsight();
  }, [fieldName]);

  // Fetch article sources for subfields on component mount
  useEffect(() => {
    const fetchSFArticles = async () => {
      try {
        const response = await axios.get("http://localhost:4000/api/scraper/arxiv-papers-sf");
        const articles = response.data;
        const sourcesMap = {};

        // Organize articles by subfield
        articles.forEach(article => {
          if (!sourcesMap[article.subfield_name]) {
            sourcesMap[article.subfield_name] = [];
          }
          sourcesMap[article.subfield_name].push({
            title: article.title || "No Title Available",
            link: article.link || "#"
          });
        });

        setArticleSFSources(sourcesMap);
      } catch (error) {
        console.error("Error fetching articles:", error);
      }
    };

    fetchSFArticles();
  }, []);

  // Rotate loading animations when in loading state
  useEffect(() => {
    if (loading) {
      const intervalId = setInterval(() => {
        setCurrentLoaderIndex((prevIndex) => (prevIndex + 1) % loaders.length);
      }, 5000);

      return () => clearInterval(intervalId);
    }
  }, [loading]);

  // Process radar data to get latest metrics for each subfield
  const latestMetricsBySubfield = radarData.reduce((acc, point) => {
    if (
      !acc[point.subfield_id] ||
      new Date(point.metric_date) > new Date(acc[point.subfield_id].metric_date)
    ) {
      acc[point.subfield_id] = {
        ...point,
        metric_3_scaled: Math.pow(point.metric_3, 5), // Scale relevance metric for visualization
      };
    }
    return acc;
  }, {});

  const filteredData = Object.values(latestMetricsBySubfield);

  // Generate distinct colors for subfields
  const generateDistinctColors = (numColors) => {
    if (!useColorMode) return Array(numColors).fill('#2466e0');

    const colors = [];
    const hueStep = 360 / numColors;
    const saturation = 70;
    const lightness = 50;

    for (let i = 0; i < numColors; i++) {
      const hue = (i * hueStep * 5) % 360;
      colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }

    return colors;
  };

  const colors = generateDistinctColors(filteredData.length);

  // Handle subfield selection
  const handleSubfieldClick = async (subfieldId) => {
    const isCurrentlySelected = selectedSubfield === subfieldId;
    const selected = isCurrentlySelected ? null : filteredData.find(point => point.subfield_id === subfieldId);

    setSelectedSubfield(isCurrentlySelected ? null : subfieldId);
    setSelectedSubfieldDetails(selected);
    setClickedTimelinePoint(null);

    if (isCurrentlySelected) {
      setSelectedTab('scatter');
    }

    if (isCurrentlySelected) {
      setHistoricalData([]);
    } else {
      try {
        // Fetch historical data for selected subfield
        const response = await axios.get(`http://localhost:4000/api/db/metrics/subfield/${subfieldId}/all`);
        const historical = response.data.data.map((point) => ({
          ...point,
          metric_date: new Date(point.metric_date).getTime(),
          metric_3_scaled: Math.pow(point.metric_3, 5),
        }));
        setHistoricalData(historical);
      } catch (error) {
        console.error("Error fetching subfield historical metrics:", error);
        setHistoricalData([]);
      }
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Generate new insight and update metrics
  const handleGenerateInsight = async () => {
    setLoading(true);
    setCurrentLoaderIndex(0);

    try {
      // Get all subfields for the current field
      const subfieldsResponse = await axios.get(`http://localhost:4000/api/db/fields/${selectedFieldId}/subfields`);
      const subfields = subfieldsResponse.data.data;

      if (!subfields || subfields.length === 0) {
        throw new Error('No subfields found for the selected field.');
      }

      let successfulUpdates = 0;
      let failedUpdates = 0;

      // Update metrics for each subfield
      if (insight !== "Failed to load insight. Please try again.") {
        for (const subfield of subfields) {
          try {
            await axios.post('http://localhost:4000/api/ai/update-subfield-metrics', {
              subfield_id: subfield.subfield_id,
              field_id: selectedFieldId,
            });
            successfulUpdates++;
          } catch (error) {
            console.error(`Error updating metrics for subfield: ${subfield.subfield_name}`, error);
            failedUpdates++;
          }
        }
      }

      console.log(`Subfields updated: ${successfulUpdates} success, ${failedUpdates} failures`);

      // Generate a new subfield
      const newSubfieldResponse = await axios.post('http://localhost:4000/api/ai/generate-subfield', {
        fieldId: selectedFieldId,
        fieldName: fieldName
      });
      console.log('New subfield generated:', newSubfieldResponse.data);

      // Generate new insight
      const insightResponse = await axios.post('http://localhost:4000/api/ai/generate-sub-insight', {
        fieldId: selectedFieldId
      });
      setInsight(insightResponse.data.insight);

    } catch (error) {
      console.error('Error generating insight:', error);
      setInsight(error.response?.data?.error || 'Failed to generate insight. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show message if no data is available
  if (!filteredData.length) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e1e4e8',
        borderRadius: '6px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
          No subfield data is currently available for the selected field.
        </p>
      </div>
    );
  }

  // Main component render
  return (
    <div style={{ marginTop: '20px' }}>
      {/* Header */}
      <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
        <ChartScatter className="w-6 h-6 text-blue-600 mr-2" />
        Subfields for <span className="text-blue-600 ml-1">{fieldName}</span>
      </h2>

      {/* Generate Insight Button */}
      <button
        onClick={handleGenerateInsight}
        style={{
          padding: '8px 16px',
          backgroundColor: loading ? '#f0f0f0' : '#2466e0',
          color: loading ? '#666' : 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
        disabled={loading}
      >
        {loading ? (
          <>
            {loaders[currentLoaderIndex].loader}
            <span>{loaders[currentLoaderIndex].text}</span>
          </>
        ) : (
          'Generate Insight'
        )}
      </button>

      {/* Insight Display */}
      {insight && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e1e4e8',
          borderRadius: '6px',
          marginBottom: '20px',
        }}>
          <div style={{ margin: 0, color: '#666' }}>
            <strong>Insight:</strong> {parse(insight)}
          </div>
        </div>
      )}

      {/* Subfield Selection Buttons */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        {filteredData.map((point, index) => {
          const isSelected = !selectedSubfield || point.subfield_id === selectedSubfield;
          return (
            <button
              key={point.subfield_id}
              style={{
                padding: '8px 16px',
                backgroundColor: isSelected ? colors[index % colors.length] : '#f0f0f0',
                color: isSelected ? 'white' : '#666',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                opacity: isSelected ? 1 : 0.6,
              }}
              onClick={() => handleSubfieldClick(point.subfield_id)}
            >
              {point.subfield_name}
            </button>
          );
        })}
      </div>

      {/* Tab System */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #e1e4e8' }}>
        <button
          onClick={() => setSelectedTab('scatter')}
          style={{
            padding: '8px 16px',
            backgroundColor: selectedTab === 'scatter' ? '#2466e0' : 'transparent',
            color: selectedTab === 'scatter' ? 'white' : '#666',
            border: 'none',
            borderBottom: selectedTab === 'scatter' ? '2px solid #2466e0' : 'none',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          Scatter Chart
        </button>
        {selectedSubfield && (
          <button
            onClick={() => setSelectedTab('timeline')}
            style={{
              padding: '8px 16px',
              backgroundColor: selectedTab === 'timeline' ? '#2466e0' : 'transparent',
              color: selectedTab === 'timeline' ? 'white' : '#666',
              border: 'none',
              borderBottom: selectedTab === 'timeline' ? '2px solid #2466e0' : 'none',
              cursor: 'pointer',
            }}
          >
            Timeline
          </button>
        )}
      </div>

      {/* Scatter Chart */}
      {selectedTab === 'scatter' && (
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid />
            <XAxis
              type="number"
              dataKey="metric_1"
              name="Interest"
              domain={[0, 5]}
              label={{ value: 'Interest, score (0 = lower; 5 = higher)', position: 'bottom' }}
            />
            <YAxis
              type="number"
              dataKey="metric_2"
              name="Innovation"
              domain={[0, 5]}
              label={{ value: 'Innovation, score (0 = lower; 5 = higher)', position: 'insideLeft', angle: -90 }}
            />
            <ZAxis type="number" dataKey="metric_3_scaled" range={[100, 5000]} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const point = payload[0].payload;
                  return (
                    <div style={{
                      backgroundColor: 'white',
                      padding: '10px',
                      border: '1px solid #ccc',
                      borderRadius: '5px',
                    }}>
                      <p><strong>{point.subfield_name}</strong></p>
                      <p>Interest: {point.metric_1.toFixed(2)}</p>
                      <p>Innovation: {point.metric_2.toFixed(2)}</p>
                      <p>Relevance: {point.metric_3.toFixed(2)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {filteredData.map((point, index) => (
              <Scatter
                key={point.subfield_id}
                data={[point]}
                fill={colors[index % colors.length]}
                fillOpacity={0.7}
                cursor="pointer"
                shape="circle"
                size={point.metric_3_scaled * 100}
                opacity={!selectedSubfield || point.subfield_id === selectedSubfield ? 1 : 0.2}
                onClick={() => handleSubfieldClick(point.subfield_id)}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      )}

      {/* Timeline Chart */}
      {selectedTab === 'timeline' && selectedSubfield && historicalData.length > 0 && (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={historicalData}
            margin={{ top: 20, right: 20, bottom: 40, left: 20 }}
            onClick={(e) => {
              if (e.activePayload && e.activePayload.length > 0) {
                setClickedTimelinePoint(e.activePayload[0].payload);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="metric_date"
              type="number"
              tickFormatter={formatDate}
              label={{ value: 'Date', position: 'bottom' }}
            />
            <YAxis
              domain={[0, 5]}
              label={{ value: 'Score (0 = lower; 5 = higher)', position: 'insideLeft', angle: -90 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const point = payload[0].payload;
                  return (
                    <div style={{
                      backgroundColor: 'white',
                      padding: '10px',
                      border: '1px solid #ccc',
                      borderRadius: '5px',
                    }}>
                      <p><strong>{point.subfield_name} - {formatDate(point.metric_date)}</strong></p>
                      <p>Interest: {point.metric_1.toFixed(2)}</p>
                      <p>Innovation: {point.metric_2.toFixed(2)}</p>
                      <p>Relevance: {point.metric_3.toFixed(2)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="metric_1"
              name="Interest"
              stroke="#8884d8"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="metric_2"
              name="Innovation"
              stroke="#82ca9d"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="metric_3"
              name="Relevance"
              stroke="#ffc658"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Details Section */}
      <div style={{
        padding: '15px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e1e4e8',
        borderRadius: '6px',
        marginTop: '15px',
      }}>
        <p style={{ margin: 0, color: '#666' }}>
          {clickedTimelinePoint ? (
            // Show details for clicked timeline point
            <>
              <strong>Date:</strong> {formatDate(clickedTimelinePoint.metric_date)}<br />
              <strong>Rationale:</strong> {clickedTimelinePoint.rationale || "No rationale available."}<br />
              <strong>Description:</strong> {clickedTimelinePoint.subfield_description || "No description available."}<br />
              <strong>Sources:</strong> {clickedTimelinePoint.source ? (
                <a href={clickedTimelinePoint.source} target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>
                  {clickedTimelinePoint.source}
                </a>
              ) : "No sources available."}
            </>
          ) : selectedSubfieldDetails ? (
            // Show details for selected subfield
            <>
              <strong>Rationale:</strong> {selectedSubfieldDetails.rationale || "No rationale available."}<br />
              <strong>Description:</strong> {selectedSubfieldDetails.subfield_description || "No description available."}<br />
              <strong>Sources:</strong> {articleSFSources[selectedSubfieldDetails.subfield_name]?.length > 0 ? (
                articleSFSources[selectedSubfieldDetails.subfield_name].map((article, index) => (
                  <div key={index} style={{ marginBottom: "5px" }}>
                    🔗 <a href={article.link} target="_blank" rel="noopener noreferrer" style={{ color: "blue" }}>
                      {article.title}
                    </a>
                  </div>
                ))
              ) : (
                "No sources available."
              )}
            </>
          ) : (
            // Default message when nothing is selected
            "Select a subfield or click on a timeline data point to view details."
          )}
        </p>
      </div>
    </div>
  );
};

export default SubfieldChart;