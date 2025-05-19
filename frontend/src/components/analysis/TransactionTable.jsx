import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

const TransactionTable = ({ statements, showStatementId = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [searchTerm, setSearchTerm] = useState('');

  // Create flattened array of all transactions
  const allTransactions = useMemo(() => {
    const transactions = [];
    statements.forEach((statement, stmtIndex) => {
      if (!statement.transactions) return;
      
      statement.transactions.forEach((transaction) => {
        transactions.push({
          ...transaction,
          statementId: stmtIndex + 1,
          isValid: statement.validation?.is_valid || false
        });
      });
    });
    return transactions;
  }, [statements]);

  // Filter transactions based on search term
  const filteredTransactions = useMemo(() => {
    if (!searchTerm.trim()) return allTransactions;
    
    const term = searchTerm.toLowerCase();
    return allTransactions.filter(txn => 
      (txn.description && txn.description.toLowerCase().includes(term)) ||
      (txn.date && txn.date.toString().toLowerCase().includes(term)) ||
      (txn.amount && txn.amount.toString().includes(term)) ||
      (txn.direction && txn.direction.toLowerCase().includes(term))
    );
  }, [allTransactions, searchTerm]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    let sorted = [...filteredTransactions];
    
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return sorted;
  }, [filteredTransactions, sortConfig]);

  // Paginate transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTransactions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  if (statements.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No transaction data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <h3 className="text-lg font-semibold">Transactions</h3>
          
          <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search transactions..."
                className="border rounded-md px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-60"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <select
              className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              {showStatementId && (
                <th
                  className="py-2 px-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('statementId')}
                >
                  <div className="flex items-center">
                    Statement
                    {sortConfig.key === 'statementId' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={sortConfig.direction === 'ascending'
                            ? "M5 15l7-7 7 7"
                            : "M19 9l-7 7-7-7"
                          }
                        />
                      </svg>
                    )}
                  </div>
                </th>
              )}
              <th
                className="py-2 px-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center">
                  Date
                  {sortConfig.key === 'date' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={sortConfig.direction === 'ascending'
                          ? "M5 15l7-7 7 7"
                          : "M19 9l-7 7-7-7"
                        }
                      />
                    </svg>
                  )}
                </div>
              </th>
              <th
                className="py-2 px-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('description')}
              >
                <div className="flex items-center">
                  Description
                  {sortConfig.key === 'description' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={sortConfig.direction === 'ascending'
                          ? "M5 15l7-7 7 7"
                          : "M19 9l-7 7-7-7"
                        }
                      />
                    </svg>
                  )}
                </div>
              </th>
              <th
                className="py-2 px-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center">
                  Amount
                  {sortConfig.key === 'amount' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={sortConfig.direction === 'ascending'
                          ? "M5 15l7-7 7 7"
                          : "M19 9l-7 7-7-7"
                        }
                      />
                    </svg>
                  )}
                </div>
              </th>
              <th
                className="py-2 px-3 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('direction')}
              >
                <div className="flex items-center">
                  Type
                  {sortConfig.key === 'direction' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={sortConfig.direction === 'ascending'
                          ? "M5 15l7-7 7 7"
                          : "M19 9l-7 7-7-7"
                        }
                      />
                    </svg>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((transaction, idx) => (
                <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}>
                  {showStatementId && (
                    <td className="py-2 px-3 text-sm border-b border-gray-200">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        #{transaction.statementId}
                      </span>
                    </td>
                  )}
                  <td className="py-2 px-3 text-sm border-b border-gray-200">
                    {transaction.date}
                  </td>
                  <td className="py-2 px-3 text-sm border-b border-gray-200">
                    {transaction.description}
                  </td>
                  <td className="py-2 px-3 text-sm border-b border-gray-200 font-medium">
                    ${transaction.amount.toFixed(2)}
                  </td>
                  <td className={`py-2 px-3 text-sm border-b border-gray-200 font-medium ${
                    transaction.direction.toLowerCase() === 'credit' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {transaction.direction}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={showStatementId ? 5 : 4} className="py-4 text-center text-gray-500 border-b border-gray-200">
                  No transactions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, sortedTransactions.length)}
                </span>{' '}
                of <span className="font-medium">{sortedTransactions.length}</span> transactions
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                    currentPage === 1
                      ? 'text-gray-300'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNumber = i + 1;
                  return (
                    <button
                      key={i}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNumber
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                
                {totalPages > 5 && (
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    ...
                  </span>
                )}
                
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                    currentPage === totalPages
                      ? 'text-gray-300'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

TransactionTable.propTypes = {
  statements: PropTypes.array.isRequired,
  showStatementId: PropTypes.bool
};

export default TransactionTable;
