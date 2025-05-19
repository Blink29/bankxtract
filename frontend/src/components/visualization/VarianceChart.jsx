import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import PropTypes from 'prop-types';
import { groupStatementsByVariance, calculateVariance } from '../../utils/dataUtils';

// Register Chart.js components
Chart.register(...registerables);

const VarianceChart = ({ statements }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [chartTitle, setChartTitle] = useState('Statement Variance Analysis');

  useEffect(() => {
    if (!statements || statements.length === 0) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create the appropriate chart based on the number of statements
    if (statements.length > 1) {
      createDistributionChart();
      setChartTitle('Statements by Variance Range');
    } else {
      createSingleStatementChart();
      setChartTitle('Single Statement Variance Analysis');
    }

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [statements]);

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

  const createSingleStatementChart = () => {
    const statement = statements[0];
    
    // Check if we can calculate variance
    if (!statement.validation || 
        statement.validation.expected_ending_balance === undefined || 
        statement.validation.calculated_ending_balance === undefined) {
      return;
    }

    const expected = statement.validation.expected_ending_balance;
    const calculated = statement.validation.calculated_ending_balance;
    const difference = statement.validation.difference || 0;
    const variance = calculateVariance(expected, calculated);
    const isValid = statement.validation.is_valid;
    
    // Create chart data
    const ctx = chartRef.current.getContext('2d');
    
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Expected Balance', 'Calculated Balance', 'Difference'],
        datasets: [
          {
            label: 'Amount',
            data: [expected, calculated, Math.abs(difference)],
            backgroundColor: [
              '#3b82f6', // Expected - Blue 
              isValid ? '#10b981' : '#ef4444', // Calculated - Green if valid, Red if invalid
              '#f59e0b'  // Difference - Amber
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
            text: `Balance Verification (${isValid ? 'Valid' : 'Invalid'})`,
            font: {
              size: 16
            }
          },
          subtitle: {
            display: true,
            text: `Variance: ${variance.toFixed(2)}%`,
            font: {
              size: 14
            },
            color: variance > 5 ? '#ef4444' : variance > 1 ? '#f59e0b' : '#10b981'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y.toFixed(2);
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
      <h3 className="text-lg font-semibold mb-3">{chartTitle}</h3>
      {statements.length === 1 && statements[0].validation && (
        <div className="mb-4 px-4 py-2 rounded-md text-sm bg-gray-50 border border-gray-200">
          <p>
            <span className="font-medium">Statement Validation: </span>
            <span className={statements[0].validation.is_valid ? 'text-green-600' : 'text-red-600'}>
              {statements[0].validation.is_valid ? 'Valid' : 'Invalid'}
            </span>
          </p>
          <p>
            <span className="font-medium">Variance: </span>
            {calculateVariance(
              statements[0].validation.expected_ending_balance,
              statements[0].validation.calculated_ending_balance
            ).toFixed(2)}%
          </p>
        </div>
      )}
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
