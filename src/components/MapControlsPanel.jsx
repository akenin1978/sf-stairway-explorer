import { useState } from 'react';
import Legend from './Legend';
import FiltersPanel from './FiltersPanel';

export default function MapControlsPanel(props) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('legend'); // 'legend' | 'filters'

  return (
    <div className="controls-panel">
      <div className="controls-header">
        <button
          className={`controls-tab ${activeTab === 'legend' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('legend');
            setIsOpen(true);
          }}
        >
          Legend
        </button>
        <button
          className={`controls-tab ${activeTab === 'filters' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('filters');
            setIsOpen(true);
          }}
        >
          Filters
        </button>
        <button
          className="controls-collapse"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          {isOpen ? '▾' : '▸'}
        </button>
      </div>

      {isOpen && (
        <div className="controls-body">
          {activeTab === 'legend' ? <Legend /> : <FiltersPanel {...props} />}
        </div>
      )}
    </div>
  );
}
