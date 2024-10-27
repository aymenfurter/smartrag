import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import ResearchForm from './ResearchForm';
import ResearchResults from './ResearchResults';
import PDFPreview from './PDFPreview';
import { MainContainer } from '../styles/StyledComponents';

const ResearchSection = ({ 
  indexes, 
  initialQuestion = '', 
  initialIndex = null 
}) => {
  const [state, setState] = useState({
    question: initialQuestion,
    dataSources: initialIndex ? [
      { 
        index: initialIndex[0], 
        name: '', 
        description: '', 
        isExpanded: false, 
        isRestricted: initialIndex[1] 
      }
    ] : [],
    isResearching: false,
    results: '',
    maxRounds: 5,
    conversation: [],
    searchEvents: [],
    topDocuments: {},
    chartData: [],
    researchCompleted: false,
    currentPage: 1,
    pdfPreview: null,
    useGraphrag: true,
    isMounted: true
  });

  useEffect(() => {
    return () => {
      setState(prev => ({ ...prev, isMounted: false }));
    };
  }, []);

  useEffect(() => {
    if (initialQuestion || initialIndex) {
      setState(prev => ({
        ...prev,
        question: initialQuestion,
        dataSources: initialIndex ? [{
          index: initialIndex[0],
          name: '',
          description: '',
          isExpanded: false,
          isRestricted: initialIndex[1]
        }] : []
      }));
    }
  }, [initialQuestion, initialIndex]);

  const handleQuestionChange = useCallback((newQuestion) => {
    setState(prev => ({ ...prev, question: newQuestion }));
  }, []);

  const handleDataSourceChange = useCallback((newSources) => {
    setState(prev => ({
      ...prev,
      dataSources: newSources
    }));
  }, []);

  const handleUpdate = useCallback((data) => {
    setState(prev => {
      if (!prev.isMounted) return prev;

      switch (data.type) {
        case 'search':
          return {
            ...prev,
            searchEvents: [...prev.searchEvents, { 
              type: 'search', 
              content: data.content, 
              timestamp: Date.now() 
            }],
            chartData: [...prev.chartData, {
              time: Date.now(),
              searches: prev.chartData.length > 0 ? 
                prev.chartData[prev.chartData.length - 1].searches + 1 : 1,
              citations: prev.chartData.length > 0 ? 
                prev.chartData[prev.chartData.length - 1].citations : 0
            }]
          };

        case 'search_complete':
          return {
            ...prev,
            searchEvents: [...prev.searchEvents, { 
              type: 'search_complete', 
              content: data.content, 
              timestamp: Date.now() 
            }]
          };

        case 'message':
          return {
            ...prev,
            conversation: [...prev.conversation, { ...data, timestamp: Date.now() }]
          };

        case 'citation':
          const newTopDocuments = { ...prev.topDocuments };
          const document = data.content.title;
          if (!newTopDocuments[document]) {
            newTopDocuments[document] = { 
              count: 1, 
              url: data.content.url, 
              query: data.content.query 
            };
          } else {
            newTopDocuments[document].count += 1;
          }
          return {
            ...prev,
            topDocuments: newTopDocuments,
            chartData: [...prev.chartData, {
              time: Date.now(),
              searches: prev.chartData.length > 0 ? 
                prev.chartData[prev.chartData.length - 1].searches : 0,
              citations: prev.chartData.length > 0 ? 
                prev.chartData[prev.chartData.length - 1].citations + 1 : 1
            }]
          };

        case 'status':
          return {
            ...prev,
            searchEvents: [...prev.searchEvents, { 
              type: 'status', 
              content: data.content, 
              timestamp: Date.now() 
            }]
          };

        case 'final_conclusion':
          return {
            ...prev,
            results: data.content,
            isResearching: false,
            researchCompleted: true
          };

        default:
          console.warn('Unknown update type:', data.type);
          return prev;
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!state.isMounted) return;

    setState(prev => ({
      ...prev,
      isResearching: true,
      researchCompleted: false,
      results: '',
      conversation: [],
      searchEvents: [],
      topDocuments: {},
      chartData: []
    }));

    try {
      const response = await fetch('/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: state.question,
          dataSources: state.dataSources,
          maxRounds: state.maxRounds,
          useGraphrag: state.useGraphrag
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (state.isMounted) {
                handleUpdate(data);
              }
            } catch (error) {
              console.error('Error parsing JSON:', error, 'Raw data:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during research:', error);
      if (state.isMounted) {
        setState(prev => ({
          ...prev,
          results: 'An error occurred during research. Please try again.',
          isResearching: false
        }));
      }
    }
  };

  const handleCitation = useCallback((document, url) => {
    if (!url) return;

    if (url.startsWith('http')) {
        let citation = url;
        let parts = citation.split('/');
        let ingestionPart = parts[parts.length - 2];
        let baseString = ingestionPart.replace(/-ingestion$/, '');
        let result = baseString.substring(baseString.lastIndexOf('-') + 1);
        const filename = parts.pop().replace('.md', '.pdf');
        handleCitationClick(filename, result);
    } else {    
        handleCitationClick(document, url);
    }
  }, []);

  const handleCitationClick = useCallback((citation, dataSource) => {
    const prefix = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' 
                    ? "http://localhost:5000/" 
                    : "/";

    const pdfUrl = `${prefix}pdf/${dataSource}/${encodeURIComponent(citation)}?is_restricted=${dataSource.isRestricted}`;
    setState(prev => ({ ...prev, pdfPreview: pdfUrl }));
  }, []);

  return (
    <MainContainer>
      {state.researchCompleted || state.isResearching ? (
        <ResearchResults
          results={state.results}
          searchEvents={state.searchEvents}
          conversation={state.conversation}
          topDocuments={state.topDocuments}
          chartData={state.chartData}
          isResearching={state.isResearching}
          researchCompleted={state.researchCompleted}
          onCitationClick={handleCitation}
          onNewResearch={() => setState(prev => ({
            ...prev,
            researchCompleted: false,
            isResearching: false
          }))}
        />
      ) : (
        <ResearchForm
          question={state.question}
          dataSources={state.dataSources}
          maxRounds={state.maxRounds}
          useGraphrag={state.useGraphrag}
          isResearching={state.isResearching}
          indexes={indexes}
          onQuestionChange={handleQuestionChange}
          onDataSourceChange={handleDataSourceChange}
          onGraphragToggle={(checked) => setState(prev => ({ 
            ...prev, 
            useGraphrag: checked 
          }))}
          onMaxRoundsChange={(value) => setState(prev => ({ 
            ...prev, 
            maxRounds: value 
          }))}
          onSubmit={handleSubmit}
        />
      )}
      
      {state.pdfPreview && (
        <PDFPreview
          pdfUrl={state.pdfPreview}
          onClose={() => setState(prev => ({ ...prev, pdfPreview: null }))}
        />
      )}
    </MainContainer>
  );
};

ResearchSection.propTypes = {
  indexes: PropTypes.arrayOf(PropTypes.array).isRequired,
  initialQuestion: PropTypes.string,
  initialIndex: PropTypes.arrayOf(PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool
  ]))
};

export default ResearchSection;