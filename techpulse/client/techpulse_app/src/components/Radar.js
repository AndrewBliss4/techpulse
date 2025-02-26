import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Label, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';

//Chart data pipeline
import {
  homeData, appliedAiData, arVrTechnologyData, renewableEnergyTechData, quantumComputingData, bioengineeringData,
  cloudComputingData, cybersecurityData, generativeAiData
} from './SampleData';

const Radar = ({ radarSearch, homePage, technology }) => {

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
      setData(homeData);
    }
  }, [technology, homePage]);

  const [radarData, setData] = useState(homeData);

  const queryInsight = (dataPoint, index) => {
    if (homePage) {
      window.open(`/technology?name=${encodeURIComponent(dataPoint.name)}&interest=${dataPoint.interest}&innovation=${dataPoint.innovation}&investments=${dataPoint.investments}`, '_blank');
    } else {
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
    radarSearch(dataPoint.name);

  }

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 40, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid />

          <XAxis type="number" dataKey="x" name="Interest"
            domain={[0, 1]} label={{
              value: 'Interest, score (0 = lower; 1 = higher)',
              position: 'bottom', offset: 0, fontWeight: 'bold'
            }} />

          <YAxis type="number" dataKey="y" name="Innovation"
            domain={[0, 1]}>
            <Label value="Innovation, score (0 = lower; 1 = higher)" position="insideLeft" angle={-90} style={{ textAnchor: 'middle', fontWeight: 'bold' }} />
          </YAxis>

          <ZAxis type="number" dataKey="z" range={[100, 5000]} name="Investment" />
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
                    <p><strong>{data.name}</strong></p>
                    <p>Interest: {data.x.toFixed(2)}</p>
                    <p>Innovation: {data.y.toFixed(2)}</p>
                    <p>Investment: ${data.z} Billion</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter
            name="Tech Trends"
            data={radarData}
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