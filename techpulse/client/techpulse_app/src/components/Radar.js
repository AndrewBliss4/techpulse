import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Label, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';

// Chart data pipeline
import {
  homeData, appliedAiData, arVrTechnologyData, renewableEnergyTechData, quantumComputingData, bioengineeringData,
  cloudComputingData, cybersecurityData, generativeAiData
} from './SampleData';

const Radar = ({ radarData, radarSearch, homePage, technology }) => {
  const [data, setData] = useState([]);

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

    // Log the filtered points' names and metrics
    filteredData.forEach(point => {
      console.log(
        `Field Name: ${point.field_name}, ` +
        `Metric 1 (Interest): ${point.metric_1}, ` +
        `Metric 2 (Innovation): ${point.metric_2}, ` +
        `Metric 3 (Investment): ${point.metric_3}`
      );
    });
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

  return (
    <div style={{ width: '100%', height: '900px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="95%">
          <ScatterChart margin={{ top: 40, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid />

            <XAxis type="number" dataKey="metric_1" name="Interest"
              domain={[0, 5]} label={{
                value: 'Interest, score (0 = lower; 1 = higher)',
                position: 'bottom', offset: 0, fontWeight: 'bold'
              }} />

            <YAxis type="number" dataKey="metric_2" name="Innovation"
              domain={[0, 5]}>
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
            onClick={() => {
              // Check if this point is currently selected
              const isSelected = data.find(d => d.field_id === point.field_id && d.fillOpacity === 0.7);
              
              if (isSelected) {
                // If clicking selected point, reset all points
                setData(radarData);
              } else {
                // Show only the clicked point
                setData(radarData.map(d => ({
                  ...d,
                  fillOpacity: d.field_id === point.field_id ? 0.7 : 0.1,
                })));
              }
            }}
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
    </div>
  );
};

export default Radar;