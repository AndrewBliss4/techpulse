import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Label, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';

//Chart data pipeline
import {
  homeData, appliedAiData, arVrTechnologyData, renewableEnergyTechData, quantumComputingData, bioengineeringData,
  cloudComputingData, cybersecurityData, generativeAiData
} from './SampleData';

const Radar = ({ radarData, radarSearch, homePage, technology }) => {

  const [data, setData] = useState(radarData);

  useEffect(() => {
    if (!homePage && technology !== '') {
      if (technology === 'Applied AI') {
        setData(appliedAiData);
      } else if (technology === 'AR/VR Technology') {
        setData(arVrTechnologyData);
      } else if (technology === 'Renewable Energy Tech') {
        setData(renewableEnergyTechData);
      } else if (technology === 'Quantum Technologies') {
        setData(quantumComputingData);
      } else if (technology === 'Bioengineering') {
        setData(bioengineeringData);
      } else if (technology === 'Cloud Computing') {
        setData(cloudComputingData);
      } else if (technology === 'Cybersecurity') {
        setData(cybersecurityData);
      } else if (technology === 'Generative AI') {
        setData(generativeAiData);
      }
    } else {
      setData(radarData);
      console.log(data)
    }
  }, [technology, homePage, radarData]);

  const queryInsight = (dataPoint, index) => {
    if (homePage) {

      window.open(`/technology?name=${encodeURIComponent(dataPoint.description)}
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

  }

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 40, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid />

          <XAxis type="number" dataKey="metric_1" name="Interest"
            domain={[0, 100]} label={{
              value: 'Interest, score (0 = lower; 1 = higher)',
              position: 'bottom', offset: 0, fontWeight: 'bold'
            }} />

          <YAxis type="number" dataKey="metric_2" name="Innovation"
            domain={[0, 100]}>
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
                    <p><strong>{data.description}</strong></p>
                    <p>Interest: {(data.metric_1 / 10).toFixed(2)}</p>
                    <p>Innovation: {(data.metric_2 / 10).toFixed(2)}</p>
                    <p>Investment: ${data.metric_3} Billion</p>
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
            cursor='pointer'
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Radar;