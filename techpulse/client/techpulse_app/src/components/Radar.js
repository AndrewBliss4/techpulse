import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Label, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useEffect, useState } from 'react';

// Chart data pipeline
import {
  homeData, appliedAiData, arVrTechnologyData, renewableEnergyTechData, quantumComputingData, bioengineeringData,
  cloudComputingData, cybersecurityData, generativeAiData
} from './SampleData';

const Radar = ({ radarData, radarSearch, homePage, technology }) => {
  const [data, setData] = useState([]);
  const [historicalData, setHistoricalData] = useState([]); // State for historical data
  const [selectedField, setSelectedField] = useState(null); // Track the selected field
  const [clickedDataPoint, setClickedDataPoint] = useState(null); // State for clicked data point

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
    const isSelected = data.find(d => d.field_id === point.field_id && d.fillOpacity === 0.7);

    if (isSelected) {
      // If clicking selected point, reset all points
      setData(filterMostRecentData(radarData));
      setHistoricalData([]); // Clear historical data
      setSelectedField(null); // Clear selected field
      setClickedDataPoint(null); // Clear clicked data point
    } else {
      // Show only the clicked point
      setData(data.map(d => ({
        ...d,
        fillOpacity: d.field_id === point.field_id ? 0.7 : 0.1,
      })));

      // Fetch historical data for the selected field
      const fieldHistoricalData = radarData
        .filter(d => d.field_id === point.field_id)
        .map(d => ({
          ...d,
          metric_date: Date.parse(d.metric_date), // Convert date to timestamp
        }));
      setHistoricalData(fieldHistoricalData);
      setSelectedField(point.field_name); // Set the selected field name
      setClickedDataPoint(null); // Clear clicked data point
    }
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
    <div style={{ width: '100%', height: '900px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="95%">
          <ScatterChart margin={{ top: 40, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid />

            <XAxis type="number" dataKey="metric_1" name="Interest"
              domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} label={{
                value: 'Interest, score (0 = lower; 1 = higher)',
                position: 'bottom', offset: 0, fontWeight: 'bold'
              }} />

            <YAxis type="number" dataKey="metric_2" name="Innovation"
              domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]}>
              <Label value="Innovation, score (0 = lower; 1 = higher)" position="insideLeft" angle={-90} style={{ textAnchor: 'middle', fontWeight: 'bold' }} />
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
            <Scatter
              name="Tech Trends"
              data={data}
              fill="#2466e0"
              fillOpacity={0.7}
              onClick={queryInsight}
              cursor="pointer"
              shape="circle"
              size={data.map(d => d.metric_3 * 100)} // Scaling by metric_3, adjust the factor as needed
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div style={{ 
        padding: '10px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignContent: 'flex-start',
        overflowY: 'auto',
        borderTop: '1px solid #e1e4e8',
        width: '100%',
        height: '60px'
      }}>
        {data.map((point) => (
          <button
            key={point.field_id}
            onClick={() => handleFilterClick(point)}
            style={{
              padding: '8px 16px',
              backgroundColor: data.find(d => d.field_id === point.field_id && d.fillOpacity === 0.7) ? '#2466e0' : 'white',
              color: data.find(d => d.field_id === point.field_id && d.fillOpacity === 0.7) ? 'white' : '#333',
              border: '1px solid #ccc',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {point.field_name}
          </button>
        ))}
      </div>
      <br></br>
      <div style={{
        padding: '15px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e1e4e8',
        borderRadius: '6px',
        width: '100%',
        height: '120px',
        overflowY: 'auto'
      }}>
        <p style={{ 
          margin: 0,
          color: '#666',
        }}>
          {data.find(d => d.fillOpacity === 0.7) 
            ? data.find(d => d.fillOpacity === 0.7).rationale
            : "Click a technology to show its rationale"}
        </p>
      </div>

      {/* Timeline Graph */}
      {selectedField && (
        <div style={{ marginTop: '20px', width: '100%', height: '300px' }}>
          <h4 style={{ textAlign: 'center' }}>Historical Metrics for {selectedField}</h4>
          <ResponsiveContainer width="100%" height="100%">
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
                domain={[dataMin => dataMin, 'auto']} // Start at the earliest timestamp, auto-scale upper bound
                tickFormatter={formatDate} // Format timestamps to readable dates
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
                        <p><strong>{formatDate(point.metric_date)}</strong></p>
                        <p>Interest: {(point.metric_1).toFixed(2)}</p>
                        <p>Innovation: {(point.metric_2).toFixed(2)}</p>
                        <p>Investment: {(point.metric_3).toFixed(2)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="metric_1" name="Interest" stroke="#005daa" />
              <Line type="monotone" dataKey="metric_2" name="Innovation" stroke="#000000" />
              <Line type="monotone" dataKey="metric_3" name="Investment" stroke="#ffd200" />
            </LineChart>
          </ResponsiveContainer>
          {/* Display rationale and sources for clicked data point */}
          {clickedDataPoint && (
            <div style={{
              padding: '15px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e1e4e8',
              borderRadius: '6px',
              marginTop: '20px',
              width: '100%',
              overflowY: 'auto'
            }}>
              <p style={{ margin: 0, color: '#666' }}>
                <strong>Rationale:</strong> {clickedDataPoint.rationale || "No rationale available."}
              </p>
              <p style={{ margin: 0, color: '#666' }}>
                <strong>Sources:</strong> {clickedDataPoint.source || "No sources available."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Radar;