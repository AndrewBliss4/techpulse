import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Label, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowDown, Link, RadarIcon, TrendingUp } from 'lucide-react';
import SubfieldChart from './SubfieldChart';
import { tailChase } from 'ldrs';

// Main Radar component that displays technology radar and timeline charts
const Radar = ({ radarData, radarSearch, homePage, technology, fetchRadarData }) => {
  // State variables
  const [data, setData] = useState([]); // Stores filtered radar data
  const [historicalData, setHistoricalData] = useState([]); // Stores historical data for timeline
  const [selectedField, setSelectedField] = useState('radar'); // Tracks which tab is selected ('radar' or 'timeline')
  const [clickedDataPoint, setClickedDataPoint] = useState(null); // Stores clicked data point details
  const [selectedTechnology, setSelectedTechnology] = useState(null); // Currently selected technology
  const [articleSources, setArticleSources] = useState({}); // Stores article sources for technologies
  const [useColorMode, setUseColorMode] = useState(false); // Toggles color mode for visualization
  const [subfieldData, setSubfieldData] = useState([]); // Stores subfield data
  const [selectedFieldId, setSelectedFieldId] = useState(null); // ID of selected field
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const [selectedSubfieldDetails, setSelectedSubfieldDetails] = useState(null); // Details of selected subfield
  const [selectedSubfield, setSelectedSubfield] = useState(null); // Selected subfield
  const [showAllTechnologies, setShowAllTechnologies] = useState(false); // Controls display of all technologies

  // Register loading animation component
  tailChase.register();

  // Generates subfields for a given field using AI
  const handleGenerateSubfields = async (fieldName) => {
    setIsLoading(true);
    try {
      const field = data.find(d => d.field_name === fieldName);
      if (!field) {
        throw new Error("Field not found");
      }

      // Call API to generate subfields
      const response = await axios.post('http://localhost:4000/api/ai/generate-subfield', {
        fieldName: field.field_name,
        fieldId: field.field_id
      });

      if (response.status === 200) {
        // Refresh data after generation
        await fetchRadarData();

        // Fetch updated subfield data
        const subfieldResponse = await axios.get(`http://localhost:4000/api/db/fields/${field.field_id}/subfields`);
        setSubfieldData(subfieldResponse.data.data);

        // Update UI
        setSelectedFieldId(field.field_id);
      } else {
        throw new Error(response.data.error || "Failed to generate subfields");
      }
    } catch (error) {
      console.error("Error generating subfields:", error);
      alert(error.message || "Error generating subfields");
    } finally {
      setIsLoading(false);
    }
  };

  // Handles clicking on a field to show its subfields
  const handleFieldClick = async (fieldId) => {
    setSelectedFieldId(fieldId);
    setIsLoading(true);
    try {
      // Fetch subfields for the selected field
      const response = await axios.get(`http://localhost:4000/api/db/fields/${fieldId}/subfields`);
      setSubfieldData(response.data.data);
    } catch (error) {
      console.error('Error fetching subfields:', error);
      alert(error.response?.data?.error || "Failed to fetch subfields");
    } finally {
      setIsLoading(false);
    }
  };

  // Generates distinct colors for visualization
  const generateDistinctColors = (numColors) => {
    const colors = [];
    if (!useColorMode) {
      return Array(numColors).fill('#2466e0'); // Default blue if color mode is off
    }

    // Generate HSL colors with distinct hues
    const hueStep = 360 / numColors;
    const saturation = 70;
    const lightness = 50;

    for (let i = 0; i < numColors; i++) {
      const hue = (i * hueStep * 5) % 360;
      colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }

    return colors;
  };

  // Generate colors based on data length
  const colors = generateDistinctColors(radarData.length);

  // Filter and set data when dependencies change
  useEffect(() => {
    const filteredData = filterMostRecentData(radarData);
    setData(filteredData);
  }, [technology, homePage, radarData]);

  // Filters data to show only the most recent entries for each field
  const filterMostRecentData = (data) => {
    const mostRecentData = {};

    data.forEach(item => {
      if (item.field_id !== 0) { // Skip fields with ID 0
        const fieldId = item.field_id;
        const currentDate = new Date(item.metric_date);

        // Keep only the most recent entry for each field
        if (!mostRecentData[fieldId] || new Date(mostRecentData[fieldId].metric_date) < currentDate) {
          mostRecentData[fieldId] = {
            ...item,
            description: item.field_description,
            metric_3_scaled: Math.pow(item.metric_3, 5), // Scale relevance metric for visualization
          };
        }
      }
    });

    return Object.values(mostRecentData);
  };

  // Handles clicking on a data point to filter the view
  const handleFilterClick = async (point) => {
    setSelectedSubfieldDetails(null);
    setSelectedSubfield(null);

    const isCurrentlySelected = selectedTechnology === point.field_name;
    if (isCurrentlySelected) {
      // Deselect if already selected
      setSelectedTechnology(null);
      setSelectedFieldId(null);
      setData(data.map(d => ({
        ...d,
        fillOpacity: 0.7,
      })));
      setHistoricalData(radarData
        .filter(d => d.subfield_id === null)
        .map(d => ({
          ...d,
          metric_date: Date.parse(d.metric_date),
        })));
    } else {
      // Select the clicked point
      setSelectedTechnology(point.field_name);
      setSelectedFieldId(point.field_id);
      setData(data.map(d => ({
        ...d,
        fillOpacity: d.field_id === point.field_id ? 0.7 : 0.1,
      })));
      try {
        // Fetch historical data for the selected field
        const response = await axios.get(`http://localhost:4000/api/db/metrics/field/${point.field_id}/all`);
        const historical = response.data.data.map(d => ({
          ...d,
          metric_date: Date.parse(d.metric_date),
        }));
        setHistoricalData(historical);
      } catch (error) {
        console.error("Error fetching historical metrics:", error);
        setHistoricalData([]); // fallback to empty
      }
    }
    setClickedDataPoint(null);
  };

  // Formats date for display
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Handles clicking on a historical data point
  const handleHistoricalDataPointClick = (point) => {
    setClickedDataPoint(point);
  };

  // Fetches article sources on component mount
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await axios.get("http://localhost:4000/api/scraper/arxiv-papers");
        const articles = response.data;

        // Organize articles by field
        const sourcesMap = {};
        articles.forEach(article => {
          if (!sourcesMap[article.field]) {
            sourcesMap[article.field] = [];
          }
          sourcesMap[article.field].push({
            title: article.title || "No Title Available",
            link: article.link || "#"
          });
        });

        setArticleSources(sourcesMap);
      } catch (error) {
        console.error("Error fetching articles:", error);
      }
    };

    fetchArticles();
  }, []);

  return (
    <div className="mb-8 p-6 bg-white rounded-xl shadow-lg">
      <div className="space-y-6 sm:space-y-0 sm:flex sm:items-end sm:gap-4">
        <div style={{ width: '100%', height: '700px', display: 'flex', flexDirection: 'column' }}>
          {/* Tab navigation */}
          <div style={{ height: '40px' }}>
            <div className="flex border-b">
              <button
                className={`py-2 px-4 font-medium ${!selectedField || selectedField === 'radar' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => {
                  setSelectedField('radar');
                }}
              >
                <div className="flex items-center">
                  <RadarIcon className="h-4 w-4 mr-2" />
                  Radar
                </div>
              </button>
              {/* Conditionally render the Timeline tab */}
              {selectedTechnology && (
                <button
                  className={`py-2 px-4 font-medium ${selectedField === 'timeline' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => {
                    setSelectedField('timeline');
                  }}
                >
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Timeline
                  </div>
                </button>
              )}
            </div>
          </div>
          
          {/* Main chart area */}
          <div style={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
            {/* Radar Chart Tab */}
            {(selectedField === 'radar' || !selectedField) && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="metric_1" name="Interest"
                        domain={[0, 5.5]} ticks={[0, 1, 2, 3, 4, 5]} label={{
                          value: 'Interest, score (0 = lower; 5 = higher)',
                          position: 'bottom', offset: 0, fontWeight: 'bold'
                        }} />
                      <YAxis type="number" dataKey="metric_2" name="Innovation"
                        domain={[0, 5.5]} ticks={[0, 1, 2, 3, 4, 5]}>
                        <Label value="Innovation, score (0 = lower; 5 = higher)" position="insideLeft" angle={-90} style={{ textAnchor: 'middle', fontWeight: 'bold' }} />
                      </YAxis>
                      <ZAxis type="number" dataKey="metric_3_scaled" range={[100, 5000]} name="Investment Cubed" />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            // Find all points at these coordinates
                            const activePoints = data.filter(p =>
                              Math.abs(p.metric_1 - payload[0].payload.metric_1) < 0.01 &&
                              Math.abs(p.metric_2 - payload[0].payload.metric_2) < 0.01
                            );

                            // Check if any of these points is the selected one
                            const selectedPoint = activePoints.find(p => p.fillOpacity === 0.7);

                            // If there's a selected point at this location, show its tooltip
                            if (selectedPoint) {
                              return (
                                <div style={{
                                  backgroundColor: 'white',
                                  padding: '10px',
                                  border: '1px solid #ccc',
                                  borderRadius: '5px'
                                }}>
                                  <p><strong>{selectedPoint.field_name}</strong></p>
                                  <p>Interest: {(selectedPoint.metric_1).toFixed(2)}</p>
                                  <p>Innovation: {(selectedPoint.metric_2).toFixed(2)}</p>
                                  <p>Relevance: {(selectedPoint.metric_3).toFixed(2)} </p>
                                </div>
                              );
                            }

                            // Otherwise, show the tooltip for the point being hovered
                            const point = payload[0].payload;
                            if (!point.fillOpacity || point.fillOpacity === 0.7) {
                              return (
                                <div style={{
                                  backgroundColor: 'white',
                                  padding: '10px',
                                  border: '1px solid #ccc',
                                  borderRadius: '5px'
                                }}>
                                  <p><strong>{point.field_name}</strong></p>
                                  <p>Interest: {(point.metric_1).toFixed(2)}</p>
                                  <p>Innovation: {(point.metric_2).toFixed(2)}</p>
                                  <p>Relevance: {(point.metric_3).toFixed(2)} </p>
                                  <p>Description: {point.description || "No description available"}</p>
                                </div>
                              );
                            }
                          }
                          return null;
                        }}
                      />
                      {/* Render scatter points for each data point */}
                      {data.map((point, index) => (
                        <Scatter
                          key={point.field_id}
                          name={point.field_name}
                          data={[point]}
                          fill={colors[index % colors.length]}
                          fillOpacity={0.7}
                          onClick={() => handleFilterClick(point)}
                          cursor="pointer"
                          shape="circle"
                        />
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Timeline Chart Tab */}
            {selectedField === 'timeline' && selectedTechnology && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, height: '600px', marginBottom: '20px' }}>
                  <h3 className="font-semibold text-gray-800 mb-3 pt-4 text-center">
                    Historical Metrics for {selectedTechnology}
                  </h3>
                  <ResponsiveContainer width="100%" height="92%">
                    <LineChart
                      data={historicalData}
                      onClick={(e) => {
                        if (e.activePayload) {
                          handleHistoricalDataPointClick(e.activePayload[0].payload);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="metric_date"
                        type="number"
                        domain={[dataMin => dataMin, 'auto']}
                        tickFormatter={formatDate}
                      />
                      <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const point = payload[0].payload;
                            return (
                              <div style={{
                                backgroundColor: 'white',
                                padding: '10px',
                                border: '1px solid #ccc',
                                borderRadius: '5px'
                              }}>
                                <p><strong>{point.field_name} - {formatDate(point.metric_date)}</strong></p>
                                <p>
                                  <strong style={{ color: '#005daa' }}>Interest:</strong> <span style={{ color: 'black' }}>{(point.metric_1).toFixed(2) + "/5.00"}</span>
                                </p>
                                <p>
                                  <strong style={{ color: '#000000' }}>Innovation:</strong> <span style={{ color: 'black' }}>{(point.metric_2).toFixed(2) + "/5.00"}</span>
                                </p>
                                <p>
                                  <strong style={{ color: '#ffd200' }}>Relevance:</strong> <span style={{ color: 'black' }}>{(point.metric_3).toFixed(2) + "/5.00"}</span>
                                </p>
                                <p>Description: {point.description || "No description available"}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {/* Render lines for each metric */}
                      {Object.entries(
                        historicalData.reduce((acc, item) => {
                          if (!acc[item.field_id]) {
                            acc[item.field_id] = [];
                          }
                          acc[item.field_id].push(item);
                          return acc;
                        }, {})
                      ).map(([fieldId, points]) => (
                        <React.Fragment key={fieldId}>
                          <Line
                            data={points}
                            type="monotone"
                            dataKey="metric_1"
                            name="Interest"
                            stroke="#005daa"
                            connectNulls
                          />
                          <Line
                            data={points}
                            type="monotone"
                            dataKey="metric_2"
                            name="Innovation"
                            stroke="#000000"
                            connectNulls
                          />
                          <Line
                            data={points}
                            type="monotone"
                            dataKey="metric_3"
                            name="Relevance"
                            stroke="#ffd200"
                            connectNulls
                          />
                        </React.Fragment>
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and controls section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        marginBottom: '15px',
      }}>
        {/* Color mode toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '10px',
          alignItems: 'center',
          width: '100%',
        }}>
          <span style={{ marginRight: '10px', fontSize: '14px' }}>
            {useColorMode ? 'Color Legend' : 'Color Legend'}
          </span>
          <div
            onClick={() => setUseColorMode(!useColorMode)}
            style={{
              position: 'relative',
              width: '50px',
              height: '24px',
              backgroundColor: useColorMode ? '#2466e0' : '#ccc',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'background-color 0.3s',
            }}
          >
            <div style={{
              position: 'absolute',
              left: useColorMode ? '26px' : '2px',
              top: '2px',
              width: '20px',
              height: '20px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: 'left 0.3s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }} />
          </div>
        </div>

        {/* Technology filter buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            overflowY: data.length > 15 ? 'hidden' : 'auto',
            borderTop: '1px solid #e1e4e8',
            width: '100%',
            padding: '10px 0',
            maxHeight: data.length > 15 && !showAllTechnologies ? '150px' : 'none',
            position: 'relative',
          }}>
            {data.length > 15 && !showAllTechnologies && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '50px',
                background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))',
                pointerEvents: 'none',
              }} />
            )}
            {data.map((point, index) => {
              const backgroundColor = colors[index % colors.length];
              const isSelected = selectedTechnology === point.field_name;

              return (
                <button
                  key={point.field_id}
                  onClick={() => handleFilterClick(point)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: isSelected ? 'white' : backgroundColor,
                    color: isSelected ? 'black' : 'white',
                    border: `1px solid ${isSelected ? '#ccc' : backgroundColor}`,
                    borderRadius: '5px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {point.field_name}
                </button>
              );
            })}
          </div>
          {/* Show more/less button for long lists */}
          {data.length > 15 && (
            <button
              onClick={() => setShowAllTechnologies(!showAllTechnologies)}
              style={{
                alignSelf: 'center',
                marginTop: '10px',
                padding: '8px',
                backgroundColor: '#2466e0',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                width: '32px',
                height: '32px',
                hover: {
                  backgroundColor: '#1a4cb8',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }
              }}
              aria-label={showAllTechnologies ? "Show less technologies" : "Show all technologies"}
            >
              <ArrowDown
                size={16}
                style={{
                  transform: showAllTechnologies ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease'
                }}
              />
            </button>
          )}
        </div>
      </div>

      {/* Details panel showing rationale and sources */}
      <div style={{
        padding: '15px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e1e4e8',
        borderRadius: '6px',
        marginTop: '15px',
        overflowY: 'auto',
        minHeight: '100px'
      }}>
        <div style={{
          margin: 0,
          color: '#666',
        }}>
          {clickedDataPoint
            ? <>
              <strong>Date of Scoring:</strong> {formatDate(clickedDataPoint.metric_date)}<br />
              <strong>Rationale:</strong> {clickedDataPoint.rationale || "No rationale available."}<br />
              <strong>Field Description: </strong>{clickedDataPoint.description || "No description available"}<br />
              <strong>Sources:</strong> {clickedDataPoint.source ?
                <a href={clickedDataPoint.source} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {clickedDataPoint.source}
                </a > :
                "No sources available."}
            </>
            : (selectedTechnology
              ? <>
                <strong>Rationale:</strong> {data.find(d => d.field_name === selectedTechnology)?.rationale || "No rationale available."}<br />
                <strong>Field Description:</strong> {data.find(d => d.field_name === selectedTechnology)?.description || "No description available."}<br />
                <strong>Sources:</strong>
                {articleSources[selectedTechnology] && articleSources[selectedTechnology].length > 0 ? (
                  articleSources[selectedTechnology].map((article, index) => (
                    <div key={index} style={{ marginBottom: "5px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center" }}>
                        <Link color="#1E90FF" strokeWidth={2} />
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "blue", textDecoration: "underline", marginLeft: "5px", display: "inline" }}
                        >
                          {article.title}
                        </a>
                      </span>
                    </div>
                  ))
                ) : (
                  " No sources available. "
                )}
                <br></br>
                {/* Generate subfields button */}
                <button
                  onClick={() => handleGenerateSubfields(selectedTechnology)}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#2466e0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {isLoading ? "Generating..." : "Generate Subfields"}
                  {isLoading && <l-tail-chase
                    size="20"
                    stroke="3"
                    bg-opacity="0"
                    speed="2"
                    color="white"
                  ></l-tail-chase>}
                </button>
              </>
              : "Click a technology to show its description and rationale."
            )
          }
        </div>
      </div>
      
      {/* Subfield chart component */}
      {selectedFieldId && (
        <SubfieldChart
          radarData={radarData}
          selectedFieldId={selectedFieldId}
          fieldName={data.find((field) => field.field_id === selectedFieldId)?.field_name || "Selected Field"}
          useColorMode={useColorMode}
          selectedSubfieldDetails={selectedSubfieldDetails}
          setSelectedSubfieldDetails={setSelectedSubfieldDetails}
          selectedSubfield={selectedSubfield}
          setSelectedSubfield={setSelectedSubfield}
        />
      )}
    </div>
  );
};

export default Radar;