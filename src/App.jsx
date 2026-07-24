import { useState } from 'react';
import StairwayMap from './components/StairwayMap';
import FeedbackModal from './components/FeedbackModal';

export default function App() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackStairway, setFeedbackStairway] = useState(null);

  const openGeneralFeedback = () => {
    setFeedbackStairway(null);
    setFeedbackOpen(true);
  };

  const openStairwayFeedback = (stairway) => {
    setFeedbackStairway(stairway);
    setFeedbackOpen(true);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>SF Stairway Explorer</h1>
        <button className="header-feedback-button" onClick={openGeneralFeedback}>
          Feedback
        </button>
      </header>

      <StairwayMap onReportIssue={openStairwayFeedback} />

      {feedbackOpen && (
        <FeedbackModal
          stairway={feedbackStairway}
          onClose={() => setFeedbackOpen(false)}
        />
      )}
    </div>
  );
}
