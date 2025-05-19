import { useState } from 'react';
import PropTypes from 'prop-types';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

const AppLayout = ({ 
  uploadComponent,
  summaryComponent,
  visualizationComponent,
  transactionsComponent,
  exportComponent
}) => {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-bold text-blue-600">Bank Statement Analyzer</h1>
            <p className="text-gray-600 mt-2 md:mt-0">
              Extract and analyze transaction data from bank statements
            </p>
          </div>
        </header>

        {uploadComponent}
        
        <Tabs
          selectedIndex={tabIndex}
          onSelect={index => setTabIndex(index)}
          className="mt-8"
        >
          <TabList className="flex border-b border-gray-200 mb-6">
            <Tab className="px-4 py-2 font-medium text-sm text-gray-600 cursor-pointer border-b-2 border-transparent hover:text-blue-600 hover:border-blue-300 -mb-px mr-4 focus:outline-none aria-selected:text-blue-600 aria-selected:border-blue-600">
              Summary
            </Tab>
            <Tab className="px-4 py-2 font-medium text-sm text-gray-600 cursor-pointer border-b-2 border-transparent hover:text-blue-600 hover:border-blue-300 -mb-px mr-4 focus:outline-none aria-selected:text-blue-600 aria-selected:border-blue-600">
              Visualization
            </Tab>
            <Tab className="px-4 py-2 font-medium text-sm text-gray-600 cursor-pointer border-b-2 border-transparent hover:text-blue-600 hover:border-blue-300 -mb-px mr-4 focus:outline-none aria-selected:text-blue-600 aria-selected:border-blue-600">
              Transactions
            </Tab>
            <Tab className="px-4 py-2 font-medium text-sm text-gray-600 cursor-pointer border-b-2 border-transparent hover:text-blue-600 hover:border-blue-300 -mb-px focus:outline-none aria-selected:text-blue-600 aria-selected:border-blue-600">
              Export
            </Tab>
          </TabList>

          <TabPanel>
            {summaryComponent}
          </TabPanel>
          
          <TabPanel>
            {visualizationComponent}
          </TabPanel>
          
          <TabPanel>
            {transactionsComponent}
          </TabPanel>
          
          <TabPanel>
            {exportComponent}
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
};

AppLayout.propTypes = {
  uploadComponent: PropTypes.node.isRequired,
  summaryComponent: PropTypes.node,
  visualizationComponent: PropTypes.node,
  transactionsComponent: PropTypes.node,
  exportComponent: PropTypes.node
};

export default AppLayout;
