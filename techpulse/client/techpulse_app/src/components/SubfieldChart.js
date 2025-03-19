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
import parse from 'html-react-parser'; // Import the html-react-parser library
import axios from 'axios';
import { ChartScatter } from 'lucide-react';
import { tailChase, quantum, grid, helix } from 'ldrs';

// Register the loaders
tailChase.register();
quantum.register();
grid.register();
helix.register();
const SubfieldChart = ({ radarData, selectedFieldId, fieldName, useColorMode }) => {
  const [selectedSubfield, setSelectedSubfield] = useState(null);
  const [selectedSubfieldDetails, setSelectedSubfieldDetails] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedTab, setSelectedTab] = useState('scatter');
  const [clickedTimelinePoint, setClickedTimelinePoint] = useState(null);
  const [insight, setInsight] = useState(null);

  const [articleSFSources, setArticleSFSources] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentLoaderIndex, setCurrentLoaderIndex] = useState(0);

  // Dynamically import the most recent insight file based on fieldName
  useEffect(() => {
    const fetchMostRecentInsight = async () => {
      try {
        // Dynamically import the file
        const module = await import(`./Insights/MostRecent${fieldName}Insight.txt`);
        const response = await fetch(module.default);
        const text = await response.text();
        setInsight(text);
      } catch (error) {
        console.error('Error fetching the most recent insight:', error);
        setInsight('Failed to load insight. Please try again.');
      }
    };

    fetchMostRecentInsight();
  }, [fieldName]);

  // Fetch the most recent insight on component mount
  // useEffect(() => {
  //   const fetchMostRecentInsight = async () => {
  //     try {
  //       const response = await fetch(`/Insights/MostRecent${fieldName}Insight.txt`);
  //       if (!response.ok) {
  //         throw new Error('Failed to fetch the most recent insight.');
  //       }
  //       const text = await response.text();
  //       if (text.trim() !== '') {
  //         setInsight(text);
  //       } else {
  //         console.log('MostRecentInsight.txt is empty');
  //       }
  //     } catch (error) {
  //       console.error('Error fetching the most recent insight:', error);
  //     }
  //   };

  //   fetchMostRecentInsight();
  // }, [fieldName]);

  // Filter radarData to only include subfields for the selected field
  const subfieldData = radarData.filter(
    (point) => point.field_id === selectedFieldId && point.subfield_id !== null
  );
  useEffect(() => {
    if (loading) {
      const intervalId = setInterval(() => {
        setCurrentLoaderIndex((prevIndex) => (prevIndex + 1) % loaders.length);
      }, 5000);

      return () => clearInterval(intervalId);
    }
  }, [loading]);
  useEffect(() => {
    const fetchSFArticles = async () => {
      try {
        const response = await axios.get("/arxiv_papers_sf.json");
        if (response.status !== 200) {
          throw new Error("Failed to fetch articles");
        }
        const articles = response.data;
        console.log('Articles Fetched:', articles);

        // Transform articles into an object for quick lookup by field name
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
        console.log("Source Map:", sourcesMap);
      } catch (error) {
        console.error("Error fetching articles:", error);
      }
    };

    fetchSFArticles();
  }, []);


  // Find the most recent metric for each subfield and calculate metric_3_scaled
  const latestMetricsBySubfield = subfieldData.reduce((acc, point) => {
    if (
      !acc[point.subfield_id] ||
      new Date(point.metric_date) > new Date(acc[point.subfield_id].metric_date)
    ) {
      acc[point.subfield_id] = {
        ...point,
        metric_3_scaled: Math.pow(point.metric_3, 5), // Calculate metric_3_scaled
      };
    }
    return acc;
  }, {});

  const filteredData = Object.values(latestMetricsBySubfield); // Convert to array

  // Function to generate distinct colors using HSL
  const generateDistinctColors = (numColors) => {
    const colors = [];
    const hueStep = 360 / numColors; // Use 360 degrees for full hue spectrum
    const saturation = 70; // 70% saturation
    const lightness = 50; // 50% lightness

    // If color mode is off, return array of blue colors
    if (!useColorMode) {
      for (let i = 0; i < numColors; i++) {
        colors.push('#2466e0'); // Use the same blue color for all points
      }
      return colors;
    }

    // Generate distinct colors when color mode is on
    for (let i = 0; i < numColors; i++) {
      // Multiply by a larger step to spread colors more evenly around the color wheel
      const hue = (i * hueStep * 5) % 360; // Use modulo 360 to keep within valid hue range
      colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }

    return colors;
  };

  // Generate colors for the data points
  const colors = generateDistinctColors(filteredData.length);

  // Handle subfield filter button click
  const handleSubfieldClick = (subfieldId) => {
    const isCurrentlySelected = selectedSubfield === subfieldId;
    const selected = isCurrentlySelected ? null : filteredData.find(point => point.subfield_id === subfieldId);

    setSelectedSubfield(isCurrentlySelected ? null : subfieldId);
    setSelectedSubfieldDetails(selected);
    setClickedTimelinePoint(null); // Reset clicked timeline point

    // Reset selectedTab to 'scatter' when unselecting a subfield
    if (isCurrentlySelected) {
      setSelectedTab('scatter');
    }

    // Filter historical data for the selected subfield
    const subfieldHistoricalData = isCurrentlySelected
      ? []
      : radarData
        .filter((point) => point.subfield_id === subfieldId)
        .map((point) => ({
          ...point,
          metric_date: new Date(point.metric_date).getTime(), // Convert date to timestamp
          metric_3_scaled: Math.pow(point.metric_3, 5), // Calculate metric_3_scaled for historical data
        }));
    setHistoricalData(subfieldHistoricalData);
  };

  // Format timestamp to readable date (YYYY-MM-DD)
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Function to generate insight
  const handleGenerateInsight = async () => {
    setLoading(true);
    setCurrentLoaderIndex(0);
    try {
      // Step 1: Fetch all subfields for the selected field
      const subfieldsResponse = await fetch(`http://localhost:4000/api/subfields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId: selectedFieldId }), // Pass the selected field ID
      });

      if (!subfieldsResponse.ok) {
        throw new Error('Failed to fetch subfields.');
      }

      const subfieldsData = await subfieldsResponse.json();
      const subfields = subfieldsData.subfields; // Array of subfields

      if (subfields.length === 0) {
        throw new Error('No subfields found for the selected field.');
      }

      // Step 2: Update metrics for each subfield individually
      let successfulUpdates = 0;
      let failedUpdates = 0;

      if(insight !== "Failed to load insight. Please try again."){
        for (const subfield of subfields) {
          try {
            const updateMetricsResponse = await fetch('http://localhost:4000/gpt-update-subfield-metrics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subfield_id: subfield.subfield_id, // Pass subfield_id
                field_id: selectedFieldId, // Pass field_id from the parent component
              }),
            });

            if (!updateMetricsResponse.ok) {
              throw new Error(`Failed to update metrics for subfield: ${subfield.subfield_name}`);
            }

            const updateMetricsData = await updateMetricsResponse.json();
            console.log(`Metrics updated successfully for subfield: ${subfield.subfield_name}`, updateMetricsData);
            successfulUpdates++;
          } catch (error) {
            console.error(`Error updating metrics for subfield: ${subfield.subfield_name}`, error);
            failedUpdates++;
          }
        }
      }

      console.log(`Subfields updated successfully. Successfully updated: ${successfulUpdates}, Failed: ${failedUpdates}`);

      // Step 3: Generate a new subfield (if applicable)
      const newSubfieldResponse = await fetch('http://localhost:4000/gpt-subfield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldId: selectedFieldId,
          fieldName: fieldName // Pass the fieldName here
        }),
      });

      if (!newSubfieldResponse.ok) {
        throw new Error('Failed to generate a new subfield.');
      }

      const newSubfieldData = await newSubfieldResponse.json();
      console.log('New subfield generated successfully:', newSubfieldData);

      // Step 4: Generate insights for the selected field
      const insightResponse = await fetch('http://localhost:4000/generate-sub-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId: selectedFieldId }), // Pass the selected field ID
      });

      if (!insightResponse.ok) {
        throw new Error('Failed to generate insights.');
      }

      const insightData = await insightResponse.json();
      console.log('Insight generated successfully:', insightData.insight);

      // Set the generated insight in the state
      setInsight(insightData.insight);

    } catch (error) {
      console.error('Error:', error);
      setInsight('Failed to generate insight. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If no subfield data, show a message
  if (!filteredData.length) {
    return <div>
      <div style={{
        padding: '20px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e1e4e8',
        borderRadius: '6px',
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: '16px',
          color: '#666',
          margin: 0
        }}>
          No subfield data is currently available for the selected field.
        </p>
      </div>
      </div>;
  }

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

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Dynamic Heading with Field Name */}
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
        justifyContent: 'center', // Center buttons horizontally
        marginBottom: '20px'
      }}>
        {filteredData.map((point, index) => {
          const isSelected = !selectedSubfield || point.subfield_id === selectedSubfield;
          return (
            <Scatter
              key={point.subfield_id}
              data={[point]}
              fill={colors[index % colors.length]}
              fillOpacity={0.7} // Default opacity
              cursor="pointer"
              shape="circle"
              size={point.metric_3_scaled * 100} // Use metric_3_scaled for size
              opacity={isSelected ? 1 : 0.2} // Make non-selected points transparent
              onClick={() => handleSubfieldClick(point.subfield_id)} // Add onClick handler
            />
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
        {/* Conditionally render the Timeline tab */}
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

      {/* Scatter Chart Tab */}
      {selectedTab === 'scatter' && (
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid />
            <XAxis
              type="number"
              dataKey="metric_1"
              name="Interest"
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              label={{ value: 'Interest, score (0 = lower; 5 = higher)', position: 'bottom', offset: 0, fontWeight: 'bold' }}
            />
            <YAxis
              type="number"
              dataKey="metric_2"
              name="Innovation"
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              label={{ value: 'Innovation, score (0 = lower; 5 = higher)', position: 'insideLeft', angle: -90, style: { textAnchor: 'middle', fontWeight: 'bold' } }}
            />
            <ZAxis type="number" dataKey="metric_3_scaled" range={[100, 5000]} name="Investment Scaled" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
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
                      <p>Interest: {(point.metric_1).toFixed(2)}</p>
                      <p>Innovation: {(point.metric_2).toFixed(2)}</p>
                      <p>Relevance: {(point.metric_3).toFixed(2)}</p>
                      <p>Relevance Scaled: {(point.metric_3_scaled).toFixed(2)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {filteredData.map((point, index) => {
              const isSelected = !selectedSubfield || point.subfield_id === selectedSubfield;
              return (
                <Scatter
                  key={point.subfield_id}
                  data={[point]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.7} // Default opacity
                  cursor="pointer"
                  shape="circle"
                  size={point.metric_3_scaled * 100} // Use metric_3_scaled for size
                  opacity={isSelected ? 1 : 0.2} // Make non-selected points transparent
                  onClick={() => handleSubfieldClick(point.subfield_id)} // Add onClick handler
                />
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      )}

      {/* Timeline Tab */}
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
              domain={['auto', 'auto']}
              tickFormatter={formatDate}
              label={{ value: 'Date', position: 'bottom', offset: 0, fontWeight: 'bold' }}
            />
            <YAxis
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              label={{ value: 'Score (0 = lower; 5 = higher)', position: 'insideLeft', angle: -90, style: { textAnchor: 'middle', fontWeight: 'bold' } }}
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
                      <p>Interest: {(point.metric_1).toFixed(2)}</p>
                      <p>Innovation: {(point.metric_2).toFixed(2)}</p>
                      <p>Relevance: {(point.metric_3).toFixed(2)}</p>
                      <p>Relevance Scaled: {(point.metric_3_scaled).toFixed(2)}</p>
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

      {/* Rationale, Description, and Sources Section */}
      <div style={{
        padding: '15px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e1e4e8',
        borderRadius: '6px',
        marginTop: '15px',
        overflowY: 'auto',
        minHeight: '100px'
      }}>
        <p style={{ margin: 0, color: '#666' }}>
          {clickedTimelinePoint ? (
            <>
              <strong>Date of Scoring:</strong> {formatDate(clickedTimelinePoint.metric_date)}<br />
              <strong>Rationale:</strong> {clickedTimelinePoint.rationale || "No rationale available."}<br />
              <strong>Subfield Description:</strong> {clickedTimelinePoint.subfield_description || "No description available."}<br />
              <strong>Sources:</strong> {clickedTimelinePoint.source ? (
                <a href={clickedTimelinePoint.source} target="_blank" rel="noopener noreferrer" style={{ color: 'blue', textDecoration: 'underline' }}>
                  {clickedTimelinePoint.source}
                </a>
              ) : "No sources available."}
            </>
          ) : selectedSubfieldDetails ? (
            <>
              <strong>Rationale:</strong> {selectedSubfieldDetails.rationale || "No rationale available."}<br />
              <strong>Subfield Description:</strong> {selectedSubfieldDetails.subfield_description || "No description available."}<br />
              <strong>Sources:</strong> {articleSFSources[selectedSubfieldDetails.subfield_name] && articleSFSources[selectedSubfieldDetails.subfield_name].length > 0 ? (
                articleSFSources[selectedSubfieldDetails.subfield_name].map((article, index) => (
                  <div key={index} style={{ marginBottom: "5px" }}>
                    🔗 <a href={article.link} target="_blank" rel="noopener noreferrer" style={{ color: "blue", textDecoration: "underline" }}>
                      {article.title}
                    </a>
                  </div>
                ))
              ) : (
                "No sources available."
              )}
            </>
          ) : (
            "Select a subfield or click on a timeline data point to view its rationale, description, and sources."
          )}
        </p>
      </div>
    </div>
  );
};

export default SubfieldChart;