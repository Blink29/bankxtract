/**
 * Utility functions for data processing and validation
 */

/**
 * Calculate variance between expected and calculated ending balances
 * 
 * @param {number} expectedBalance - The expected ending balance
 * @param {number} calculatedBalance - The calculated ending balance
 * @returns {number} - The variance as a percentage
 */
export const calculateVariance = (expectedBalance, calculatedBalance) => {
  if (expectedBalance === 0) return calculatedBalance === 0 ? 0 : 100;
  return Math.abs((calculatedBalance - expectedBalance) / expectedBalance * 100);
};

/**
 * Group statements by variance range for visualization
 * 
 * @param {Array} statements - The array of bank statements
 * @returns {Object} - Grouped data for visualization
 */
export const groupStatementsByVariance = (statements) => {
  const ranges = {
    'No Variance (0%)': 0,
    'Low (<1%)': 0,
    'Medium (1-5%)': 0,
    'High (>5%)': 0,
    'Invalid': 0
  };
  
  statements.forEach(statement => {
    if (!statement.validation || !statement.validation.is_valid) {
      ranges['Invalid']++;
      return;
    }
    
    const variance = calculateVariance(
      statement.validation.expected_ending_balance,
      statement.validation.calculated_ending_balance
    );
    
    if (variance === 0) {
      ranges['No Variance (0%)']++;
    } else if (variance < 1) {
      ranges['Low (<1%)']++;
    } else if (variance <= 5) {
      ranges['Medium (1-5%)']++;
    } else {
      ranges['High (>5%)']++;
    }
  });
  
  return ranges;
};

/**
 * Format a date string in a consistent format
 * 
 * @param {string} dateStr - The date string to format
 * @returns {string} - Formatted date string (YYYY-MM-DD)
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  
  try {
    // Try to parse the date
    const date = new Date(dateStr);
    
    // Check if valid date
    if (isNaN(date.getTime())) return dateStr;
    
    // Format as YYYY-MM-DD
    return date.toISOString().split('T')[0];
  } catch (error) {
    return dateStr;
  }
};

/**
 * Generate a summary of the batch analysis
 * 
 * @param {Array} statements - The array of bank statements
 * @returns {Object} - Summary statistics
 */
export const generateBatchSummary = (statements) => {
  const totalStatements = statements.length;
  const validStatements = statements.filter(s => s.validation && s.validation.is_valid).length;
  const invalidStatements = totalStatements - validStatements;
  
  const totalTransactions = statements.reduce((sum, stmt) => 
    sum + (stmt.transactions ? stmt.transactions.length : 0), 0);
  
  const totalCredits = statements.reduce((sum, stmt) => {
    if (!stmt.transactions) return sum;
    return sum + stmt.transactions
      .filter(t => t.direction && t.direction.toLowerCase() === 'credit')
      .reduce((txnSum, txn) => txnSum + txn.amount, 0);
  }, 0);
  
  const totalDebits = statements.reduce((sum, stmt) => {
    if (!stmt.transactions) return sum;
    return sum + stmt.transactions
      .filter(t => t.direction && t.direction.toLowerCase() === 'debit')
      .reduce((txnSum, txn) => txnSum + txn.amount, 0);
  }, 0);
  
  return {
    totalStatements,
    validStatements,
    invalidStatements,
    totalTransactions,
    totalCredits,
    totalDebits,
    validityRate: totalStatements > 0 ? (validStatements / totalStatements * 100).toFixed(1) : 0
  };
};

/**
 * Prepare data for export to CSV or Excel
 * 
 * @param {Array} statements - The array of bank statements
 * @returns {Array} - Flattened array ready for export
 */
export const prepareDataForExport = (statements) => {
  const result = [];
  
  statements.forEach((statement, stmtIndex) => {
    if (!statement.transactions) return;
    
    statement.transactions.forEach(transaction => {
      result.push({
        statementId: stmtIndex + 1,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        direction: transaction.direction,
        startingBalance: statement.starting_balance,
        endingBalance: statement.ending_balance,
        isValid: statement.validation?.is_valid ? 'Yes' : 'No'
      });
    });
  });
  
  return result;
};
