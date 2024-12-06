import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Radar = () => {

//Filler data
  const data = [
    { 
      name: 'Artificial Intelligence', 
      x: 0.9, 
      y: 0.95, 
      z: 36.8 // Investment in billions
    },
    { 
      name: 'Quantum Computing', 
      x: 0.6, 
      y: 0.8, 
      z: 22.5 
    },
    { 
      name: 'Blockchain', 
      x: 0.5, 
      y: 0.6, 
      z: 16.3 
    },
    { 
      name: 'Augmented Reality', 
      x: 0.7, 
      y: 0.7, 
      z: 12.9 
    },
    { 
      name: 'Edge Computing', 
      x: 0.65, 
      y: 0.75, 
      z: 15.7 
    },
    { 
      name: 'Biotechnology', 
      x: 0.55, 
      y: 0.85, 
      z: 28.4 
    },
    { 
      name: '5G Technology', 
      x: 0.75, 
      y: 0.65, 
      z: 19.6 
    },
    { 
      name: 'Renewable Energy Tech', 
      x: 0.8, 
      y: 0.7, 
      z: 23.1 
    }
  ];

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid />
          <XAxis type="number" dataKey="x" name="Interest" domain={[0, 1]} />
          <YAxis type="number" dataKey="y" name="Innovation" domain={[0, 1]} />
          <ZAxis type="number" dataKey="z" range={[100, 500]} name="Investment" />
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
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Radar;