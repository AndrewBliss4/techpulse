import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SubfieldChart = ({ subfieldData }) => {
    const [selectedSubfield, setSelectedSubfield] = useState(null); // Track the selected subfield

    // Generate distinct colors for subfields
    const generateDistinctColors = (numColors) => {
        const colors = [];
        const hueStep = 360 / numColors;
        const saturation = 70;
        const lightness = 50;

        for (let i = 0; i < numColors; i++) {
            const hue = (i * hueStep * 5) % 360;
            colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
        }

        return colors;
    };

    const colors = generateDistinctColors(subfieldData.length);
    const filterMostRecentMetrics = (metrics) => {
        const mostRecentMetrics = {};
      
        metrics.forEach(metric => {
          const subfieldId = metric.subfield_id;
          const currentDate = new Date(metric.metric_date);
      
          // If the subfield hasn't been added yet, or the current metric is more recent
          if (!mostRecentMetrics[subfieldId] || new Date(mostRecentMetrics[subfieldId].metric_date) < currentDate) {
            mostRecentMetrics[subfieldId] = metric;
          }
        });
      
        // Convert the object back to an array
        return Object.values(mostRecentMetrics);
      };
    // Handle subfield filter button click
    const handleSubfieldClick = (subfieldId) => {
        if (selectedSubfield === subfieldId) {
            setSelectedSubfield(null); // Deselect if already selected
        } else {
            setSelectedSubfield(subfieldId); // Select the subfield
        }
    };

    return (
        <div style={{ marginTop: '20px' }}>
            <h3>Subfields for Selected Field</h3>

            {/* Subfield Filter Buttons */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '20px',
            }}>
                {subfieldData.map((point, index) => {
                    const isSelected = selectedSubfield === point.subfield_id;
                    return (
                        <button
                            key={point.subfield_id}
                            onClick={() => handleSubfieldClick(point.subfield_id)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: isSelected ? 'white' : colors[index % colors.length],
                                color: isSelected ? 'black' : 'white',
                                border: `1px solid ${isSelected ? '#ccc' : colors[index % colors.length]}`,
                                borderRadius: '5px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            }}
                        >
                            {point.subfield_name} {/* Display subfield name */}
                        </button>
                    );
                })}

            </div>

            {/* Subfield Scatter Chart */}
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
                    <ZAxis type="number" dataKey="metric_3" range={[100, 5000]} name="Investment" />
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
                                        <p><strong>{point.subfield_name}</strong></p> {/* Subfield name in bold */}
                                        <p>Interest: {(point.metric_1).toFixed(2)}</p>
                                        <p>Innovation: {(point.metric_2).toFixed(2)}</p>
                                        <p>Relevance: {(point.metric_3).toFixed(2)}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    {subfieldData
                        .filter(point => !selectedSubfield || point.subfield_id === selectedSubfield) // Filter based on selected subfield
                        .map((point, index) => (
                            <Scatter
                                key={point.subfield_id}
                                data={[point]}
                                fill={colors[index % colors.length]}
                                cursor="pointer"
                                shape="circle"
                                size={point.metric_3 * 100}
                            />
                        ))}
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SubfieldChart;