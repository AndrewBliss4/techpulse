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
    <div style={{ width: '100%', height: '600px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 40, right: 20, bottom: 20, left: 20 }}>
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
                const data = payload[0].payload;
                return (
                  <div style={{
                    backgroundColor: 'white',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '5px'
                  }}>
                    <p><strong>{data.field_name}</strong></p>
                    <p>Interest: {(data.metric_1).toFixed(2)}</p>
                    <p>Innovation: {(data.metric_2).toFixed(2)}</p>
                    <p>Relevance: {(data.metric_3).toFixed(2)} </p>
                    <p>Rationale: {(data.rationale)}</p>
                  </div>
                );
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
  );
};

export default Radar;