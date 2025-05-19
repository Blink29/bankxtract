import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import PropTypes from 'prop-types';
import { groupStatementsByVariance, calculateVariance } from '../../utils/dataUtils';

// Register Chart.js components
Chart.register(...registerables);

const VarianceChart = ({ statements }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [chartType, setChartType] = useState(statements.length > 1 ? 'distribution' : 'singleStatement');

  useEffect(() => {
    if (!statements || statements.length === 0) return;
    
    // Set chart type based on number of statements
    setChartType(statements.length > 1 ? 'distribution' : 'singleStatement');

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create the appropriate chart based on the number of statements
    if (statements.length > 1) {
      createDistributionChart();
    } else {
      createSingleStatementChart();
    }
    
    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [statements]);
  
  // Create a chart showing variance distribution across multiple statements
  const createDistributionChart = () => {
    // Process data for the chart
    const varianceGroups = groupStatementsByVariance(statements);
    const labels = Object.keys(varianceGroups);
    const data = Object.values(varianceGroups);

    // Create chart
    const ctx = chartRef.current.getContext('2d');
    
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Number of Statements',
            data,
            backgroundColor: [
              '#4ade80', // No Variance - Green
              '#a3e635', // Low - Light green
              '#fbbf24', // Medium - Yellow
              '#f87171', // High - Red
              '#9ca3af'  // Invalid - Gray
            ],
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Statements by Variance Range',
            font: {
              size: 16
            }
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                const percentage = (value / statements.length * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Statements'
            },
            ticks: {
              precision: 0
            }
          },
          x: {
            title: {
              display: true,
              text: 'Variance Range'
            }
          }
        }
      }
    });
  };
  
  // Create a chart for single statement showing expected vs calculated balance
  const createSingleStatementChart = () => {
    const statement = statements[0];
    
    // If there's no validation data, we can't create this chart
    if (!statement || !statement.validation) {
      return;
    }
    
    const expectedBalance = statement.validation.expected_ending_balance || 0;
    const calculatedBalance = statement.validation.calculated_ending_balance || 0;
    const variance = calculateVariance(expectedBalance, calculatedBalance);
    
    // Determine color based on variance
    let varianceColor = '#4ade80'; // No variance - Green
    if (variance > 5) {
      varianceColor = '#f87171'; // High variance - Red
    } else if (variance > 1) {
      varianceColor = '#fbbf24'; // Medium variance - Yellow
    } else if (variance > 0) {
      varianceColor = '#a3e635'; // Low variance - Light green
    }
    
    const ctx = chartRef.current.getContext('2d');
    
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Expected Balance', 'Calculated Balance'],
        datasets: [
          {
            label: 'Balance Amount',
            data: [expectedBalance, calculatedBalance],
            backgroundColor: ['#3b82f6', varianceColor],
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Balance Comparison (Variance: ${variance.toFixed(2)}%)`,
            font: {
              size: 16
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.raw.toFixed(2);
                return `${label}: $${value}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Amount ($)'
            }
          }
        }
      }
    });
  };

  if (!statements || statements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available for visualization</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="h-64">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};

VarianceChart.propTypes = {
  statements: PropTypes.array.isRequired
};

export default VarianceChart;
