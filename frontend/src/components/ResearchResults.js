import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import TopDocuments from './TopDocuments';
import EventTimeline from './EventTimeline';
import NetworkGraph from './NetworkGraph';

import {
  MainContainer,
  ResultsContainer,
  ConclusionContainer,
  GraphContainer,
  ConclusionContent,
  ResearchButton,
  TabPanel,
  TabButton,
  SectionTitle,
  MetricBox,
  ProgressBar,
  ProgressFill,
  ContentGrid,
} from '../styles/StyledComponents';

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
  const [activeTab, setActiveTab] = useState('overview');

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

  const metrics = React.useMemo(() => ({
    searches: searchEvents.length,
    documents: Object.keys(topDocuments).length,
    progress: Math.min(
      Math.round((searchEvents.length / Math.max(question?.length || 1, 10)) * 100),
      100
    ),
    combinedEvents: searchEvents.concat(conversation),
  }), [searchEvents, topDocuments, question]);


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
    <MainContainer>
      <ResultsContainer>
        {/* Progress Bar */}
        <ProgressBar>
          { researchCompleted ? <ProgressFill progress={100} /> :
          <ProgressFill progress={metrics.progress} />
          }
        </ProgressBar>

        {/* Research Status */}
        {isResearching && (
          <div style={{ 
            background: '#f0f9ff', 
            padding: '12px 20px', 
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #e0f2fe',
            color: '#0369a1'
          }}>
            Analyzing research data... ({metrics.searches} searches completed)
          </div>
        )}

        {/* Navigation Tabs */}
        <TabPanel>
          <TabButton
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </TabButton>
          <TabButton
            active={activeTab === 'results'}
            onClick={() => setActiveTab('results')}
            disabled={!researchCompleted}
            style={{ opacity: researchCompleted ? 1 : 0.5 }}
          >
            Results
          </TabButton>
          <TabButton
            active={activeTab === 'documents'}
            onClick={() => setActiveTab('documents')}
          >
            Documents ({metrics.documents})
          </TabButton>
          <TabButton
            active={activeTab === 'timeline'}
            onClick={() => setActiveTab('timeline')}
          >
            Timeline
          </TabButton>
          <TabButton
            active={activeTab === 'network'}
            onClick={() => setActiveTab('network')}
          >
            Network
          </TabButton>
        </TabPanel>

        {/* Tab Content */}
        <div>
          {activeTab === 'network' && (
            <>
              <NetworkGraph
                searchEvents={searchEvents}
                topDocuments={topDocuments}
                onNodeClick={onCitationClick}
                question={question}
              />
            </>
          )}
          {activeTab === 'overview' && (
            <>
              <ContentGrid>
                <MetricBox>
                  <div className="title">Total Searches</div>
                  <div className="value">{metrics.searches}</div>
                </MetricBox>
                <MetricBox>
                  <div className="title">Documents Analyzed</div>
                  <div className="value">{metrics.documents}</div>
                </MetricBox>
              </ContentGrid>
              <br/> 
              <GraphContainer>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={time => new Date(time).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={time => new Date(time).toLocaleTimeString()}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="searches"
                      stroke="#0066cc"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="citations"
                      stroke="#00cc88"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </GraphContainer>
            </>
          )}

          {activeTab === 'results' && researchCompleted && (
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

          {activeTab === 'documents' && (
            <TopDocuments
              documents={topDocuments}
              onDocumentClick={onCitationClick}
            />
          )}

          {activeTab === 'timeline' && (
            <EventTimeline
            events={combinedEvents}/>
          )}
        </div>
        {/* New Research Button */}
        {researchCompleted && (
          <ResearchButton onClick={onNewResearch}>
            Start New Research
          </ResearchButton>
        )}
      </ResultsContainer>
    </MainContainer>
  );
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