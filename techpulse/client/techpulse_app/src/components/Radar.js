import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Label, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useEffect, useState } from 'react';
import { RadarIcon, TrendingUp } from 'lucide-react';

// Chart data pipeline
import {
  homeData, appliedAiData, arVrTechnologyData, renewableEnergyTechData, quantumComputingData, bioengineeringData,
  cloudComputingData, cybersecurityData, generativeAiData
} from './SampleData';

const Radar = ({ radarData, radarSearch, homePage, technology }) => {
  const [data, setData] = useState([]);
  const [historicalData, setHistoricalData] = useState([]); // State for historical data
  const [selectedField, setSelectedField] = useState('radar'); // Track the selected field
  const [clickedDataPoint, setClickedDataPoint] = useState(null); // State for clicked data point
  const [selectedTechnology, setSelectedTechnology] = useState(null); // State for selected technology

  // Function to generate distinct colors using HSL
  const generateDistinctColors = (numColors) => {
    const colors = [];
    const hueStep = 360 / numColors; // Divide the hue spectrum into equal parts
    const saturation = 70; // 70% saturation
    const lightness = 50; // 50% lightness

    for (let i = 0; i < numColors; i++) {
      const hue = i * hueStep;
      colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }

    return colors;
  };

  // Generate colors for the data points
  const colors = generateDistinctColors(radarData.length);

  useEffect(() => {
    let rawData = radarData;

    if (!homePage && technology !== '') {
      switch (technology) {
        case 'Applied AI':
          rawData = appliedAiData;
          break;
        case 'AR/VR Technology':
          rawData = arVrTechnologyData;
          break;
        case 'Renewable Energy Tech':
          rawData = renewableEnergyTechData;
          break;
        case 'Quantum Technologies':
          rawData = quantumComputingData;
          break;
        case 'Bioengineering':
          rawData = bioengineeringData;
          break;
        case 'Cloud Computing':
          rawData = cloudComputingData;
          break;
        case 'Cybersecurity':
          rawData = cybersecurityData;
          break;
        case 'Generative AI':
          rawData = generativeAiData;
          break;
        default:
          rawData = radarData;
      }
    }

    // Filter data to include only the most recent entries for each field
    const filteredData = filterMostRecentData(rawData);
    setData(filteredData);
  }, [technology, homePage, radarData]);

  const filterMostRecentData = (data) => {
    const mostRecentData = {};

    data.forEach(item => {
      const fieldId = item.field_id;
      const currentDate = new Date(item.metric_date);

      if (!mostRecentData[fieldId] || new Date(mostRecentData[fieldId].metric_date) < currentDate) {
        mostRecentData[fieldId] = item;
      }
    });

    return Object.values(mostRecentData);
  };

  const queryInsight = (dataPoint, index) => {
    if (homePage) {
      window.open(`/technology?name=${encodeURIComponent(dataPoint.field_name)}
      &interest=${(dataPoint.metric_1 / 100).toFixed(2)}&innovation=${(dataPoint.metric_2 / 100).toFixed(2)}
      &investments=${dataPoint.metric_3}`, '_blank');
    } else {
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
      radarSearch(dataPoint.name);
    }
  };

  const handleFilterClick = (point) => {
    // Check if this point is currently selected
    const isCurrentlySelected = selectedTechnology === point.field_name;

    if (isCurrentlySelected) {
      // If clicking the already selected technology, deselect it
      setSelectedTechnology(null);
      // Show all technologies again
      const allHistoricalData = radarData.map(d => ({
        ...d,
        metric_date: Date.parse(d.metric_date),
      }));
      setData(data.map(d => ({
        ...d,
        fillOpacity: 0.7, // Set all to normal opacity when deselecting
      })));
      setHistoricalData(allHistoricalData);
    } else {
      // If selecting a different technology (or first selection)
      setSelectedTechnology(point.field_name);
      setData(data.map(d => ({
        ...d,
        fillOpacity: d.field_id === point.field_id ? 0.7 : 0.1,
      })));
      // Filter historical data for the selected technology
      const fieldHistoricalData = radarData
        .filter(d => d.field_id === point.field_id)
        .map(d => ({
          ...d,
          metric_date: Date.parse(d.metric_date),
        }));
      setHistoricalData(fieldHistoricalData);
    }
    setClickedDataPoint(null);
  };

  // Format timestamp to readable date (YYYY-MM-DD)
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const handleHistoricalDataPointClick = (point) => {
    setClickedDataPoint(point);
  };

  return (
    <div className="mb-8 p-6 bg-white rounded-xl shadow-lg">
      <div className="space-y-6 sm:space-y-0 sm:flex sm:items-end sm:gap-4">
        <div style={{ width: '100%', height: '800px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: '40px' }}>
            <div className="flex border-b">
              <button
                className={`py-2 px-4 font-medium ${!selectedField || selectedField === 'radar' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => {
                  // Keep the selected technology's opacity when switching to radar
                  const selectedPoint = data.find(d => d.fillOpacity === 0.7);
                  setSelectedField('radar');
                }}
              >
                <div className="flex items-center">
                  <RadarIcon className="h-4 w-4 mr-2" />
                  Radar
                </div>
              </button>
              <button
                className={`py-2 px-4 font-medium ${selectedField === 'timeline' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => {
                  // Get currently selected technology
                  const selectedPoint = data.find(d => d.fillOpacity === 0.7);
                  
                  if (selectedPoint) {
                    // If a technology is selected, show its timeline
                    const fieldHistoricalData = radarData
                      .filter(d => d.field_id === selectedPoint.field_id)
                      .map(d => ({
                        ...d,
                        metric_date: Date.parse(d.metric_date),
                      }));
                    setHistoricalData(fieldHistoricalData);
                    setSelectedField('timeline');
                  } else {
                    // If no technology is selected, show all
                    const allHistoricalData = radarData.map(d => ({
                      ...d,
                      metric_date: Date.parse(d.metric_date),
                    }));
                    setHistoricalData(allHistoricalData);
                    setSelectedField('timeline');
                  }
                }}
              >
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Timeline
                </div>
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
            {/* Left Container - Radar Tab */}
            {(selectedField === 'radar' || !selectedField) && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Radar Chart */}
                <div style={{ flex: 1 }}>
                  <ResponsiveContainer width="100%" height="95%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                      <CartesianGrid />
                      <XAxis type="number" dataKey="metric_1" name="Interest"
                        domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} label={{
                          value: 'Interest, score (0 = lower; 5 = higher)',
                          position: 'bottom', offset: 0, fontWeight: 'bold'
                        }} />
                      <YAxis type="number" dataKey="metric_2" name="Innovation"
                        domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]}>
                        <Label value="Innovation, score (0 = lower; 5 = higher)" position="insideLeft" angle={-90} style={{ textAnchor: 'middle', fontWeight: 'bold' }} />
                      </YAxis>
                      <ZAxis type="number" dataKey="metric_3" range={[100, 5000]} name="Investment" />
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
                                </div>
                              );
                            }
                          }
                          return null;
                        }}
                      />
                      {/* Map each data point to a Scatter component with a distinct color */}
                      {data.map((point, index) => (
                        <Scatter
                          key={point.field_id}
                          name={point.field_name}
                          data={[point]}
                          fill={colors[index % colors.length]} // Assign distinct color
                          fillOpacity={0.7}
                          onClick={() => queryInsight(point, index)}
                          cursor="pointer"
                          shape="circle"
                          size={point.metric_3 * 100} // Scaling by metric_3, adjust the factor as needed
                        />
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Right Container - Timeline Tab */}
            {selectedField === 'timeline' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Timeline Graph */}
                <div style={{ flex: 1, height: '600px', marginBottom: '20px' }}>
                  <h3 className="font-semibold text-gray-800 mb-3 pt-4 text-center">
                    Historical Metrics for {selectedTechnology ? selectedTechnology : 'All Technologies'}
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
                                <p>Interest: {(point.metric_1).toFixed(2) + "/5.00"}</p>
                                <p>Innovation: {(point.metric_2).toFixed(2) + "/5.00"}</p>
                                <p>Relevance: {(point.metric_3).toFixed(2) + "/5.00"}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {/* Group data by field_id and create separate lines for each technology */}
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

      {/* Filter buttons - moved outside of tabs */}
      <div style={{
        padding: '10px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignContent: 'flex-start',
        overflowY: 'auto',
        borderTop: '1px solid #e1e4e8',
        width: '100%',
        marginBottom: '15px'
      }}>
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

      {/* Rationale section - moved outside of tabs */}
      <div style={{
        padding: '15px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e1e4e8',
        borderRadius: '6px',
        marginTop: '15px',
        overflowY: 'auto',
        minHeight: '100px'
      }}>
        <p style={{
          margin: 0,
          color: '#666',
        }}>
          {clickedDataPoint
            ? <>
              <strong>Date of Scoring:</strong> {formatDate(clickedDataPoint.metric_date)}<br />
              <strong>Rationale:</strong> {clickedDataPoint.rationale || "No rationale available."}<br />
              <strong>Sources:</strong> {clickedDataPoint.source || "No sources available."}
            </>
            : (data.find(d => d.fillOpacity === 0.7)
              ? data.find(d => d.fillOpacity === 0.7).rationale
              : "Click a technology to show its rationale")
          }
        </p>
      </div>
    </div>
  );
};

export default Radar;