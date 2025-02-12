import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Label, ResponsiveContainer } from 'recharts';

const Radar = ({ radarSearch }) => {

  const queryInsight = (dataPoint, index) => {

    radarSearch(dataPoint.name);

    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);

  }

  //Filler data
  const data = [
    {
      name: 'Generative AI',
      x: 0.64, //Interest: 0 to 1
      y: 0.08, //Innovation: 0 to 1
      z: 36 // Investment in billions
    },
    {
      name: 'Quantum Technologies',
      x: 0.02,
      y: 0.04,
      z: 1
    },
    {
      name: 'Bioengineering',
      x: 0.14,
      y: 0.52,
      z: 62
    },
    {
      name: 'Cloud Computing',
      x: 0.05,
      y: 0.2,
      z: 54
    },
    {
      name: 'Applied AI',
      x: 0.5,
      y: 0.98,
      z: 86
    },
    {
      name: 'Cybersecurity',
      x: 0.41,
      y: 0.18,
      z: 34
    },
    {
      name: 'AR/VR Technology',
      x: 0.12,
      y: 0.24,
      z: 6
    },
    {
      name: 'Renewable Energy Tech',
      x: 0.73,
      y: 0.36,
      z: 183
    }
  ];

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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