import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSpinner } from '@fortawesome/free-solid-svg-icons';

// Import local components
import NetworkGraph from './NetworkGraph';
import TopDocuments from './TopDocuments';
import EventTimeline from './EventTimeline';

// Import styled components
import {
  ResultsContainer,
  ConclusionContainer,
  ConclusionContent,
  ResearchDataSection,
  GraphContainer,
  TopDocumentsContainer,
  SectionTitle,
  NewResearchButton
} from '../styles/StyledComponents';

const TimeSeriesGraph = ({ chartData }) => (
  <GraphContainer>
    <SectionTitle>Research Progress</SectionTitle>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="time"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
        />
        <YAxis />
        <Tooltip
          labelFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
          contentStyle={{ 
            backgroundColor: '#f8f9fa', 
            borderRadius: '10px', 
            border: 'none',
            padding: '10px'
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="searches" 
          stroke="#8884d8" 
          name="Searches"
          strokeWidth={2}
          dot={{ strokeWidth: 2 }}
        />
        <Line 
          type="monotone" 
          dataKey="citations" 
          stroke="#82ca9d" 
          name="Citations"
          strokeWidth={2}
          dot={{ strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </GraphContainer>
);

const ResearchResults = ({
  results,
  searchEvents,
  conversation,
  topDocuments,
  chartData,
  isResearching,
  researchCompleted,
  onCitationClick,
  onNewResearch,
  question
}) => {
  // Handle citation references in the conclusion text
  const handleCitationReference = useCallback((e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      const citation = e.target.getAttribute('data-citation');
      if (citation) {
        const parts = citation.split('/');
        const ingestionPart = parts[parts.length - 2];
        const baseString = ingestionPart.replace(/-ingestion$/, '');
        const result = baseString.substring(baseString.lastIndexOf('-') + 1);
        const filename = parts.pop().replace('.md', '.pdf');
        onCitationClick(filename, result);
      }
    }
  }, [onCitationClick]);

  const formatResultsWithClickableLinks = (text) => {
    if (!text) return '';
    
    let formattedText = text
      // Convert citations first to prevent interference with other formatting
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (match, text, url) => {
          const citation = url;
          return `<a href="#" data-citation="${citation}">${text}</a>`;
        }
      )
      // Headers - h1 to h6
      .replace(/^######\s+(.*)$/gm, '<h6>$1</h6>')
      .replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>')
      .replace(/^####\s+(.*)$/gm, '<h4>$1</h4>')
      .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
      .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      // Lists
      .replace(/^\s*\-\s+(.*)$/gm, '<li>$1</li>')
      .replace(/^\s*\*\s+(.*)$/gm, '<li>$1</li>')
      .replace(/^\s*\d+\.\s+(.*)$/gm, '<li>$1</li>')
      // Blockquotes
      .replace(/^\>\s(.*)$/gm, '<blockquote>$1</blockquote>')
      // Code blocks
      .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Line breaks
      .replace(/\n\n/g, '<br/><br/>');

    // Wrap adjacent list items in ul tags
    formattedText = formattedText.replace(
      /(<li>.*<\/li>)\n(<li>.*<\/li>)/g,
      '<ul>$1$2</ul>'
    );

    return formattedText;
  };

  // Combine and sort events chronologically
  const combinedEvents = React.useMemo(() => {
    return [...searchEvents.map(event => ({ 
      ...event, 
      eventType: 'searchEvent' 
    })), ...conversation.map(message => ({ 
      ...message, 
      eventType: 'message' 
    }))].sort((a, b) => b.timestamp - a.timestamp);
  }, [searchEvents, conversation]);

  return (
    <ResultsContainer>
      {/* Loading State */}
      {isResearching && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          <p>Researching...</p>
        </div>
      )}

      {/* Research Conclusion */}
      {results && (
        <ConclusionContainer>
          <SectionTitle>Research Findings</SectionTitle>
          <ConclusionContent
            dangerouslySetInnerHTML={{ 
              __html: formatResultsWithClickableLinks(results) 
            }}
            onClick={handleCitationReference}
          />
        </ConclusionContainer>
      )}

      {/* Visualizations and Data */}
      <ResearchDataSection>
        {/* Network Visualization */}
        <NetworkGraph
          searchEvents={searchEvents}
          topDocuments={topDocuments}
          onNodeClick={onCitationClick}
          question={question}
        />

        {/* Time Series Visualization */}
        <TimeSeriesGraph chartData={chartData} />

        {/* Document References */}
        <TopDocuments
          documents={topDocuments}
          onDocumentClick={onCitationClick}
        />

        {/* Research Timeline */}
        <EventTimeline
          events={combinedEvents}
          onCitationClick={onCitationClick}
        />
      </ResearchDataSection>


      {/* New Research Button */}
      {researchCompleted && (
        <NewResearchButton 
          onClick={onNewResearch}
          aria-label="Start new research"
        >
          Start New Research
        </NewResearchButton>
      )}
    </ResultsContainer>
  );
};

TimeSeriesGraph.propTypes = {
  chartData: PropTypes.arrayOf(PropTypes.shape({
    time: PropTypes.number.isRequired,
    searches: PropTypes.number.isRequired,
    citations: PropTypes.number.isRequired
  })).isRequired
};

ResearchResults.propTypes = {
  results: PropTypes.string,
  searchEvents: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string.isRequired,
    content: PropTypes.object.isRequired,
    timestamp: PropTypes.number.isRequired
  })).isRequired,
  conversation: PropTypes.arrayOf(PropTypes.shape({
    role: PropTypes.string.isRequired,
    content: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object
    ]).isRequired,
    timestamp: PropTypes.number.isRequired
  })).isRequired,
  topDocuments: PropTypes.object.isRequired,
  chartData: PropTypes.arrayOf(PropTypes.shape({
    time: PropTypes.number.isRequired,
    searches: PropTypes.number.isRequired,
    citations: PropTypes.number.isRequired
  })).isRequired,
  isResearching: PropTypes.bool.isRequired,
  researchCompleted: PropTypes.bool.isRequired,
  onCitationClick: PropTypes.func.isRequired,
  onNewResearch: PropTypes.func.isRequired,
  question: PropTypes.string
};

export default React.memo(ResearchResults);