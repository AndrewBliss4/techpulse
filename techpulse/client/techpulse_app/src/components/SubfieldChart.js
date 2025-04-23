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

// Register the loaders
tailChase.register();
quantum.register();
grid.register();
helix.register();

const SubfieldChart = ({
  radarData,
  selectedFieldId,
  fieldName,
  useColorMode,
  selectedSubfieldDetails,
  setSelectedSubfieldDetails,
  selectedSubfield,
  setSelectedSubfield
}) => {
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedTab, setSelectedTab] = useState('scatter');
  const [clickedTimelinePoint, setClickedTimelinePoint] = useState(null);
  const [insight, setInsight] = useState(null);
  const [articleSFSources, setArticleSFSources] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentLoaderIndex, setCurrentLoaderIndex] = useState(0);

  // Loaders configuration
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

  // Dynamically import the most recent insight file
  useEffect(() => {
    const fetchMostRecentInsight = async () => {
      try {
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

  // Fetch subfield articles
  useEffect(() => {
    const fetchSFArticles = async () => {
      try {
        const response = await axios.get("http://localhost:4000/api/scraper/arxiv-papers-sf");
        const articles = response.data;

        const sourcesMap = {};
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

  // Filter radarData to only include subfields for the selected field
  const subfieldData = radarData.filter(
    (point) => point.field_id === selectedFieldId && point.subfield_id !== null
  );

  // Handle loader rotation
  useEffect(() => {
    if (loading) {
      const intervalId = setInterval(() => {
        setCurrentLoaderIndex((prevIndex) => (prevIndex + 1) % loaders.length);
      }, 5000);

      return () => clearInterval(intervalId);
    }
  }, [loading]);

  // Find the most recent metric for each subfield
  const latestMetricsBySubfield = subfieldData.reduce((acc, point) => {
    if (
      !acc[point.subfield_id] ||
      new Date(point.metric_date) > new Date(acc[point.subfield_id].metric_date)
    ) {
      acc[point.subfield_id] = {
        ...point,
        metric_3_scaled: Math.pow(point.metric_3, 5),
      };
    }
    return acc;
  }, {});

  const filteredData = Object.values(latestMetricsBySubfield);

  // Generate distinct colors for the data points
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
  const handleSubfieldClick = (subfieldId) => {
    const isCurrentlySelected = selectedSubfield === subfieldId;
    const selected = isCurrentlySelected ? null : filteredData.find(point => point.subfield_id === subfieldId);

    setSelectedSubfield(isCurrentlySelected ? null : subfieldId);
    setSelectedSubfieldDetails(selected);
    setClickedTimelinePoint(null);

    if (isCurrentlySelected) {
      setSelectedTab('scatter');
    }

    const subfieldHistoricalData = isCurrentlySelected
      ? []
      : radarData
          .filter((point) => point.subfield_id === subfieldId)
          .map((point) => ({
            ...point,
            metric_date: new Date(point.metric_date).getTime(),
            metric_3_scaled: Math.pow(point.metric_3, 5),
          }));
    setHistoricalData(subfieldHistoricalData);
  };

  // Format date for display
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Generate insight for the selected field
  const handleGenerateInsight = async () => {
    setLoading(true);
    setCurrentLoaderIndex(0);

    try {
      // Step 1: Fetch subfields for the selected field
      const subfieldsResponse = await axios.get(`http://localhost:4000/api/db/fields/${selectedFieldId}/subfields`);
      const subfields = subfieldsResponse.data.data;

      if (!subfields || subfields.length === 0) {
        throw new Error('No subfields found for the selected field.');
      }

      // Step 2: Update metrics for each subfield
      let successfulUpdates = 0;
      let failedUpdates = 0;

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

      // Step 3: Generate new subfield
      const newSubfieldResponse = await axios.post('http://localhost:4000/api/ai/generate-subfield', {
        fieldId: selectedFieldId,
        fieldName: fieldName
      });
      console.log('New subfield generated:', newSubfieldResponse.data);

      // Step 4: Generate insights
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

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Header */}
      <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
        <ChartScatter className="w-6 h-6 text-blue-600 mr-2" />
        Subfields for <span className="text-blue-600 ml-1">{fieldName}</span>
      </h2>

      {/* Insight Generation Button */}
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

      {/* Display Insight */}
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

      {/* Subfield Filter Buttons */}
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
            "Select a subfield or click on a timeline data point to view details."
          )}
        </p>
      </div>
    </div>
  );
};

export default SubfieldChart;