import PropTypes from 'prop-types';
import { generateBatchSummary } from '../../utils/dataUtils';

const StatCard = ({ title, value, subtitle, icon, color }) => (
  <div className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${color}`}>
    <div className="flex items-start">
      <div className="flex-grow">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {icon && (
        <div className={`p-2 rounded-full ${color.replace('border-l-4', 'bg-').replace('-500', '-100')} text-${color.split('-')[1]}-600`}>
          {icon}
        </div>
      )}
    </div>
  </div>
);

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.element,
  color: PropTypes.string.isRequired
};

const BatchSummary = ({ statements }) => {
  if (!statements || statements.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available for summary</p>
      </div>
    );
  }

  const summary = generateBatchSummary(statements);
  
  // Find statement with highest variance
  let highestVarianceStatement = null;
  let maxVariance = 0;
  
  statements.forEach((statement, index) => {
    if (statement.validation && statement.validation.expected_ending_balance && statement.validation.calculated_ending_balance) {
      const expected = statement.validation.expected_ending_balance;
      const calculated = statement.validation.calculated_ending_balance;
      const variance = Math.abs((calculated - expected) / expected) * 100;
      
      if (variance > maxVariance) {
        maxVariance = variance;
        highestVarianceStatement = { ...statement, index };
      }
    }
  });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Batch Analysis Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Statements"
          value={summary.totalStatements}
          color="border-blue-500"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
          }
        />
        
        <StatCard
          title="Valid Statements"
          value={summary.validStatements}
          subtitle={`${summary.validityRate}% validity rate`}
          color="border-green-500"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          }
        />
        
        <StatCard
          title="Invalid Statements"
          value={summary.invalidStatements}
          color="border-red-500"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          }
        />
        
        <StatCard
          title="Total Transactions"
          value={summary.totalTransactions.toLocaleString()}
          color="border-purple-500"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
          }
        />
        
        <StatCard
          title="Total Credits"
          value={`$${summary.totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          color="border-emerald-500"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
          }
        />
        
        <StatCard
          title="Total Debits"
          value={`$${summary.totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          color="border-amber-500"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
          }
        />
      </div>

      {highestVarianceStatement && (
        <div className="mt-6 bg-orange-50 border border-orange-200 rounded-md p-4">
          <h3 className="text-lg font-semibold text-orange-800 mb-2">Highest Variance Detected</h3>
          <p className="text-orange-700 mb-1">
            Statement #{highestVarianceStatement.index + 1} shows a variance of {maxVariance.toFixed(2)}%
          </p>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-sm text-gray-600">Expected Balance:</p>
              <p className="font-medium">${highestVarianceStatement.validation.expected_ending_balance.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Calculated Balance:</p>
              <p className="font-medium">${highestVarianceStatement.validation.calculated_ending_balance.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-600">Difference:</p>
            <p className="font-medium">${Math.abs(highestVarianceStatement.validation.difference).toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

BatchSummary.propTypes = {
  statements: PropTypes.array.isRequired,
};

export default BatchSummary;
