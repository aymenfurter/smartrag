import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus, faChevronDown, faChevronUp, faSearch, faSpinner, faFile, faPaperPlane, faTimes } from '@fortawesome/free-solid-svg-icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatMessage } from './ChatSection';
import { Network } from 'vis-network/standalone';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 50px;
  padding: 30px;
  background-color: ${props => props.theme.backgroundColor};
`;

const ResultsContainer = styled.div`
  background-color: ${props => props.theme.cardBackground};
  padding: 30px;
  border-radius: 20px;
  border: 1px solid ${props => props.theme.borderColor};
  animation: ${fadeIn} 0.5s ease-out;
`;

const ConclusionContainer = styled.div`
  background-color: ${props => props.theme.conclusionBackground};
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 30px;
  border: 1px solid ${props => props.theme.borderColor};
`;

const ConclusionContent = styled.div`
  color: ${props => props.theme.textColor};
  font-size: 16px;
  line-height: 1.6;

  p {
    margin-bottom: 10px;
  }

  ul, ol {
    margin-left: 20px;
    margin-bottom: 10px;
  }
`;

const ResearchDataSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 50px;
  margin-bottom: 30px;
`;

const GraphContainer = styled.div`
  background-color: ${props => props.theme.cardBackground};
  border-radius: 15px;
  padding: 20px;
  border: 1px solid ${props => props.theme.borderColor};
  height: 400px;
`;

const TopDocumentsContainer = styled.div`
  background-color: ${props => props.theme.cardBackground};
  border-radius: 15px;
  padding: 20px;
  border: 1px solid ${props => props.theme.borderColor};
`;

const SectionTitle = styled.h3`
  color: ${props => props.theme.titleColor};
  font-size: 20px;
  margin-bottom: 15px;
`;

const ConversationContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-height: 600px;
  overflow-y: auto;
  padding: 20px;
  background-color: ${props => props.theme.conversationBackground};
  border-radius: 15px;
  border: 1px solid ${props => props.theme.borderColor};
  margin-top: 30px;
`;

const UpdateContainer = styled.div`
  background-color: ${props => props.theme.updateBackground};
  color: ${props => props.theme.textColor};
  padding: 15px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  border: 1px solid ${props => props.theme.borderColor};
`;

const Message = styled.div`
  margin: 10px 0;
  padding: 15px;
  border-radius: 20px;
  max-width: 80%;
  word-wrap: break-word;
  animation: ${slideIn} 0.3s ease-out;
  background-color: ${props => props.isUser ? props.theme.userMessageBackground : props.theme.assistantMessageBackground};
  color: ${props => props.theme.textColor};
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  border: 1px solid ${props => props.theme.borderColor};
`;

const SearchHighlight = styled.span`
  background-color: ${props => props.theme.highlightBackground};
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: bold;
`;

const Button = styled.button`
  background-color: ${props => props.theme.primaryButtonColor};
  color: ${props => props.theme.primaryButtonText};
  border: none;
  padding: 12px 25px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.theme.primaryButtonHover};
  }

  &:disabled {
    background-color: ${props => props.theme.disabledButtonColor};
    color: ${props => props.theme.disabledButtonText};
    cursor: not-allowed;
  }
`;

const NewResearchButton = styled(Button)`
  margin-top: 30px;
`;

const ResearchForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-color: ${props => props.theme.cardBackground};
  padding: 30px;
  border-radius: 20px;
  border: 1px solid ${props => props.theme.borderColor};
`;

const Input = styled.input`
  padding: 12px;
  border: 1px solid ${props => props.theme.inputBorder};
  border-radius: 10px;
  font-size: 16px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.textColor};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primaryButtonColor};
  }
`;

const Select = styled.select`
  padding: 12px;
  border: 1px solid ${props => props.theme.inputBorder};
  border-radius: 10px;
  font-size: 16px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.textColor};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primaryButtonColor};
  }
`;

const DataSourceContainer = styled.div`
  background-color: ${props => props.theme.cardBackground};
  padding: 20px;
  border-radius: 10px;
  border: 1px solid ${props => props.theme.borderColor};
`;

const DataSourceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: ${props => props.theme.iconColor};
  margin-left: 10px;
  transition: color 0.3s ease;

  &:hover {
    color: ${props => props.theme.iconHoverColor};
  }
`;

const TopDocumentsTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 10px;

  th, td {
    padding: 10px;
    text-align: left;
    border-bottom: 1px solid ${props => props.theme.borderColor};
  }

  th {
    font-weight: bold;
    color: ${props => props.theme.titleColor};
  }

  tr:hover {
    background-color: ${props => props.theme.tableRowHover};
  }
`;

const StyledFontAwesomeIcon = styled(FontAwesomeIcon)`
  margin-right: 8px;
`;

const EventLogContainer = styled.div`
  background-color: ${props => props.theme.cardBackground};
  border-radius: 15px;
  padding: 20px;
  border: 1px solid ${props => props.theme.borderColor};
  margin-top: 30px;
`;

const EventLog = styled.div`
  max-height: 600px;
  overflow-y: auto;
  padding: 10px;
  background-color: ${props => props.theme.eventLogBackground};
  border-radius: 10px;
`;

const EventItem = styled.div`
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 5px;
  background-color: ${props => props.theme.eventItemBackground};
  border-left: 4px solid ${props => props.theme.eventItemBorder};
`;

const SwitchContainer = styled.div`
  background-color: ${props => props.theme.cardBackground};
  padding: 20px;
  border-radius: 10px;
  border: 1px solid ${props => props.theme.borderColor};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Checkbox = styled.input`
  cursor: pointer;
  width: 20px;
  height: 20px;
`;

const TreeContainer = styled.div`
  margin-bottom: 30px;
  height: 400px;
  background-color: ${props => props.theme.cardBackground};
  border-radius: 15px;
  padding: 20px;
  border: 1px solid ${props => props.theme.borderColor};
  .vis-network {
    height: 100%;
  }
`;

const PDFPreviewContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const PDFPreview = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  width: 80%;
  height: 80%;
  display: flex;
  flex-direction: column;
`;

const PDFEmbed = styled.embed`
  width: 100%;
  height: 100%;
  border: none;
`;

const CloseButton = styled(Button)`
  align-self: flex-end;
  margin-bottom: 10px;
`;


const StyledLink = styled.a`
  color: ${props => props.theme.linkColor};
  text-decoration: none;
  position: relative;
  transition: color 0.3s ease;

  &:hover {
    color: ${props => props.theme.linkHoverColor};
  }

  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 2px;
    bottom: -2px;
    left: 0;
    background-color: ${props => props.theme.linkUnderlineColor};
    visibility: hidden;
    transform: scaleX(0);
    transition: all 0.3s ease-in-out;
  }

  &:hover::after {
    visibility: visible;
    transform: scaleX(1);
  }
`;

const PaginationContainer = styled.nav`
  display: flex;
  justify-content: center;
  margin-top: 20px;
`;

const PaginationList = styled.ul`
  display: flex;
  list-style-type: none;
  padding: 0;
`;

const PaginationItem = styled.li`
  margin: 0 5px;
`;

const PaginationLink = styled.a`
  color: ${props => props.theme.buttonTextColor};
  background-color: ${props => props.active ? props.theme.paginationActiveBackground : props.theme.paginationBackground};
  padding: 8px 12px;
  border-radius: 5px;
  text-decoration: none;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.theme.paginationHoverBackground};
  }
`;

const safeFormatMessage = (message) => {
  if (typeof message === 'string') {
    return formatMessage(message);
  }
  return '';
};

function ResearchSection({ indexes, initialQuestion = '', initialIndex = null }) {
  const [question, setQuestion] = useState(initialQuestion);
  const [dataSources, setDataSources] = useState([
    initialIndex
      ? { index: initialIndex[0], name: '', description: '', isExpanded: false, isRestricted: initialIndex[1] }
      : { index: '', name: '', description: '', isExpanded: false, isRestricted: true }
  ]);
  const [isResearching, setIsResearching] = useState(false);
  const [results, setResults] = useState('');
  const [maxRounds, setMaxRounds] = useState(5);
  const [conversation, setConversation] = useState([]);
  const [searchEvents, setSearchEvents] = useState([]);
  const [topDocuments, setTopDocuments] = useState({});
  const [chartData, setChartData] = useState([]);
  const [isMounted, setIsMounted] = useState(true);
  const [researchCompleted, setResearchCompleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfPreview, setPDFPreview] = useState(null);
  const [useGraphrag, setUseGraphrag] = useState(false);
  const itemsPerPage = 10;
  const networkRef = useRef(null);

  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
    }
    if (initialIndex) {
      setDataSources([{ index: initialIndex[0], name: '', description: '', isExpanded: false, isRestricted: initialIndex[1] }]);
    }
  }, [initialQuestion, initialIndex]);

  useEffect(() => {
    if (networkRef.current && searchEvents.length > 0) {
      renderNetworkGraph();
    }
  }, [searchEvents, topDocuments, researchCompleted]);

  const handleAddDataSource = () => {
    setDataSources([...dataSources, { index: '', name: '', description: '', isExpanded: false, isRestricted: true }]);
  };

  const handleRemoveDataSource = (index) => {
    const newDataSources = dataSources.filter((_, i) => i !== index);
    setDataSources(newDataSources);
  };

  const handleDataSourceChange = (index, field, value) => {
    const newDataSources = [...dataSources];
    newDataSources[index][field] = value;
    
    if (field === 'index') {
      const selectedIndex = indexes.find(idx => idx[0] === value);
      if (selectedIndex) {
        newDataSources[index].isRestricted = selectedIndex[1];
      }
    }
    
    setDataSources(newDataSources);
  };

  const toggleDataSourceExpansion = (index) => {
    const newDataSources = [...dataSources];
    newDataSources[index].isExpanded = !newDataSources[index].isExpanded;
    setDataSources(newDataSources);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isMounted) return;
    setIsResearching(true);
    setResearchCompleted(false);
    setResults('');
    setConversation([]);
    setSearchEvents([]);
    setTopDocuments({});
    setChartData([]);

    try {
      const response = await fetch('/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          dataSources,
          maxRounds: useGraphrag ? maxRounds : maxRounds,
          useGraphrag
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
              if (isMounted) {
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
      if (isMounted) {
        setResults('An error occurred during research. Please try again.');
      }
    } finally {
      if (isMounted) {
        setIsResearching(false);
        setResearchCompleted(true);
      }
    }
  };

  const handleUpdate = useCallback((data) => {
    if (!isMounted) return;
    switch (data.type) {
      case 'search':
        setSearchEvents(prev => [...prev, { type: 'search', content: data.content, timestamp: Date.now() }]);
        setChartData(prev => [...prev, { time: Date.now(), searches: prev.length > 0 ? prev[prev.length - 1].searches + 1 : 1, citations: prev.length > 0 ? prev[prev.length - 1].citations : 0 }]);
        break;
      case 'search_complete':
        setSearchEvents(prev => [...prev, { type: 'search_complete', content: data.content, timestamp: Date.now() }]);
        break;
      case 'message':
        setConversation(prev => [...prev, { ...data, timestamp: Date.now() }]); 
        break;
      case 'citation':
        updateTopDocuments(data.content.title, data.content.url, data.content.query);
        setChartData(prev => [...prev, { time: Date.now(), searches: prev.length > 0 ? prev[prev.length - 1].searches : 0, citations: prev.length > 0 ? prev[prev.length - 1].citations + 1 : 1 }]);
        break;
      case 'status':
        setSearchEvents(prev => [...prev, { type: 'status', content: data.content, timestamp: Date.now() }]);
        break;
      case 'final_conclusion':
        setResults(data.content);
        setIsResearching(false);
        setResearchCompleted(true);
        break;
      default:
        console.log('Unknown update type:', data.type);
    }
  }, [isMounted]);

  const updateTopDocuments = (document, url, query) => {
    setTopDocuments(prev => {
      const newTopDocuments = { ...prev };
      if (!newTopDocuments[document]) {
        newTopDocuments[document] = { count: 1, url: url, query: query };
      } else {
        newTopDocuments[document].count += 1;
      }
      return newTopDocuments;
    });
  };

  const handleCitation = (document, url) => {
    if (url.startsWith('graphrag://')) {
      // Handle GraphRAG citations
      const [, index, id] = url.split('/');
      setPDFPreview(`/pdf/${index}/${id}?is_restricted=true`);
      return;
    }

    // Handle regular citations
    let citation = url;
    let parts = citation.split('/');
    let ingestionPart = parts[parts.length - 2];
    let baseString = ingestionPart.replace(/-ingestion$/, '');
    let result = baseString.substring(baseString.lastIndexOf('-') + 1);
    const filename = parts.pop().replace('.md', '.pdf');

    handleCitationClick(filename, result);
  };

  const handleCitationClick = useCallback((citation, dataSource) => {
    let prefix = "/";
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      prefix = "http://localhost:5000/";
    }

    const pdfUrl = `${prefix}pdf/${dataSource}/${encodeURIComponent(citation)}?is_restricted=${dataSource.isRestricted}`;
    setPDFPreview(pdfUrl);
  }, []);

  const renderGraph = () => (
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
          contentStyle={{ backgroundColor: '#f8f9fa', borderRadius: '10px', border: 'none' }}
        />
        <Legend />
        <Line type="monotone" dataKey="searches" stroke="#8884d8" name="Searches" />
        <Line type="monotone" dataKey="citations" stroke="#82ca9d" name="Citations" />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderTopDocuments = () => {
    const sortedDocuments = Object.entries(topDocuments)
      .sort(([, a], [, b]) => b.count - a.count);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sortedDocuments.slice(indexOfFirstItem, indexOfLastItem);

    return (
      <>
        <TopDocumentsTable>
          <thead>
            <tr>
              <th>Document</th>
              <th>Mentions</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map(([document, { count, url }], index) => (
              <tr key={index}>
                <td>{document}</td>
                <td>{count}</td>
                <td>
                  <Button onClick={() => handleCitation(document, url)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </TopDocumentsTable>
        <Pagination
          itemsPerPage={itemsPerPage}
          totalItems={sortedDocuments.length}
          paginate={setCurrentPage}
          currentPage={currentPage}
        />
      </>
    );
  };

  const renderResearchForm = () => (
    <ResearchForm onSubmit={handleSubmit}>
      <Input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="What would you like to research?"
        required
      />
      {dataSources.map((source, index) => (
        <DataSourceContainer key={index}>
          <DataSourceHeader>
            <Select
              value={source.index}
              onChange={(e) => handleDataSourceChange(index, 'index', e.target.value)}
              required
            >
              <option value="">Select a data source</option>
              {indexes.map((idx) => (
                <option key={idx[0]} value={idx[0]}>
                  {idx[0]}
                </option>
              ))}
            </Select>
            <div>
              <IconButton onClick={() => toggleDataSourceExpansion(index)}>
                <FontAwesomeIcon icon={source.isExpanded ? faChevronUp : faChevronDown} />
              </IconButton>
              <IconButton onClick={() => handleRemoveDataSource(index)}>
                <FontAwesomeIcon icon={faMinus} />
              </IconButton>
            </div>
          </DataSourceHeader>
          {source.isExpanded && (
            <>
              <Input
                type="text"
                value={source.name}
                onChange={(e) => handleDataSourceChange(index, 'name', e.target.value)}
                placeholder="Custom name for this data source"
              />
              <Input
                type="text"
                value={source.description}
                onChange={(e) => handleDataSourceChange(index, 'description', e.target.value)}
                placeholder="Brief description of this data source"
              />
            </>
          )}
        </DataSourceContainer>
      ))}
      <Button type="button" onClick={handleAddDataSource}>
        <FontAwesomeIcon icon={faPlus} /> Add Data Source
      </Button>

      <SwitchContainer>
        <Checkbox
          type="checkbox"
          id="graphrag-mode"
          checked={useGraphrag}
          onChange={(e) => setUseGraphrag(e.target.checked)}
        />
        <label htmlFor="graphrag-mode">
          Enable GraphRAG (Enhanced Knowledge Graph Search)
        </label>
      </SwitchContainer>

      <div>
        <label>
          <p>How detailed should the research be?</p>
          <input
            type="range"
            min="5"
            max={useGraphrag ? "10" : "30"}
            value={maxRounds}
            onChange={(e) => setMaxRounds(parseInt(e.target.value))}
          />
        </label>
        <span>Estimated time: {maxRounds * (useGraphrag ? 100 : 20)} seconds</span>
      </div>

      <Button type="submit" disabled={isResearching}>
        {isResearching ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPaperPlane} />} 
        {isResearching ? ' Researching...' : ' Start Research'}
      </Button>
    </ResearchForm>
  );

  const renderResults = () => {
    const allEvents = [
      ...searchEvents.map(event => ({ ...event, eventType: 'searchEvent' })),
      ...conversation.map(message => ({ ...message, eventType: 'message' }))
    ].sort((a, b) => b.timestamp - a.timestamp);

    if (!results && !isResearching) return null;

    const formattedResults = formatMessage(results);
    const resultsWithClickableLinks = formattedResults.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (match, text, url) => {
        const citation = url.split('/').pop();
        return `<a href="#" data-citation="${citation}">${text}</a>`;
      }
    );

    return (
      <ResultsContainer>
        {results && (
          <ConclusionContainer>
            <ConclusionContent 
              dangerouslySetInnerHTML={{ __html: resultsWithClickableLinks }}
              onClick={(e) => {
                if (e.target.tagName === 'A') {
                  e.preventDefault();
                  let citation = e.target.getAttribute('data-citation');
                  let parts = citation.split('/');
                  let ingestionPart = parts[parts.length - 2];
                  let baseString = ingestionPart.replace(/-ingestion$/, '');
                  let result = baseString.substring(baseString.lastIndexOf('-') + 1);
                  const filename = parts.pop().replace('.md', '.pdf');
                  handleCitationClick(filename, result);
                }
              }}
            />
          </ConclusionContainer>
        )}
       
        <ResearchDataSection>
          <TreeContainer ref={networkRef} className="vis-network" />
          <GraphContainer>
            {renderGraph()}
          </GraphContainer>
          <TopDocumentsContainer>
            <SectionTitle>Documents</SectionTitle>
            {renderTopDocuments()}
          </TopDocumentsContainer>
        </ResearchDataSection>
        <EventLogContainer>
          <SectionTitle>Event Log</SectionTitle>
          <EventLog>
            {allEvents.map((event, index) => (
              <EventItem key={index}>
                {event.eventType === 'searchEvent' ? (
                  <div>
                    {event.type === 'search' && event.content.query && (
                      <>
                        <StyledFontAwesomeIcon icon={faSearch} /> Searching in {event.content.index}: <SearchHighlight>"{event.content.query}"</SearchHighlight>
                      </>
                    )}
                    {event.type === 'search_complete' && event.content.query && (
                      <>
                        <StyledFontAwesomeIcon icon={faSearch} /> Searching in {event.content.index}: <SearchHighlight>"{event.content.query}"</SearchHighlight>
                        <br/>
                        <br/><i>{event.content.result}</i>
                      </>
                    )}
                    {event.type === 'status' && (
                      <>
                        <StyledFontAwesomeIcon icon={faSpinner} spin /> {event.content}
                      </>
                    )}
                  </div>
                ) : (
                  <Message isUser={event.role === 'user'}>
                    {event.content && typeof event.content === 'string' && (
                      <div dangerouslySetInnerHTML={{ __html: safeFormatMessage(event.content) }} />
                    )}
                    {event.content && event.content.tool_calls && (
                      <div>
                        <strong>Tool Calls:</strong>
                        {event.content.tool_calls.map((call, i) => (
                          <div key={i}>
                            <em>{call.function.name}</em>: {call.function.arguments}
                          </div>
                        ))}
                      </div>
                    )}
                  </Message>
                )}
                <small>{new Date(event.timestamp).toLocaleString()}</small>
              </EventItem>
            ))}
          </EventLog>
        </EventLogContainer>
        {researchCompleted && (
         <NewResearchButton onClick={() => {
          setResearchCompleted(false);
          setIsResearching(false);
        }}>Start New Research</NewResearchButton>
        )}
      </ResultsContainer>
    );
  };

  const renderNetworkGraph = () => {
    const nodes = [];
    const edges = [];
  
    if (question) {
      nodes.push({ id: 'root', label: question, shape: 'box', color: '#915e1f' });
    }
  
    searchEvents.forEach((event, index) => {
      const { content } = event;
      if (content.query) {
        const queryNodeId = `query-${index}`;
        nodes.push({ id: queryNodeId, label: content.query });
  
        if (content.relatedQuery) {
          const relatedIndex = searchEvents.findIndex(e => e.content.query === content.relatedQuery);
          if (relatedIndex !== -1) {
            edges.push({ from: `query-${relatedIndex}`, to: queryNodeId });
          }
        } else {
          edges.push({ from: 'root', to: queryNodeId });
        }
      }
    });
  
    Object.keys(topDocuments).forEach((doc, docIndex) => {
      const docNodeId = `doc-${docIndex}`;
      if (doc) {
        nodes.push({ id: docNodeId, label: doc, shape: 'box', color: '#4da6ff'});
  
        const queryIndex = searchEvents.findIndex(e => e.content.query === topDocuments[doc].query);
        if (queryIndex !== -1) {
          edges.push({ from: `query-${queryIndex}`, to: docNodeId });
        }
      }
    });
  
    const data = { nodes, edges };
    const options = {
      height: '100%',
      width: '100%',
      physics: {
        enabled: true,
        stabilization: false,
        solver: "repulsion",
        repulsion: {
          nodeDistance: 600,
          damping: 1,
        }
      },
      interaction: {
        dragView: true
      },
      nodes: {
        shape: 'box',
        size: 10,
        color: '#33bcee',
        font: {
          color: 'white',
        },
      },
      edges: {
        smooth: false,
        arrows: {
          to: {
            enabled: true,
            type: 'vee',
          },
        },
      },
    };
  
    const network = new Network(networkRef.current, data, options);

    network.on("click", function(params) {
      if (params.nodes.length > 0) {
        const clickedNode = nodes.find(node => node.id === params.nodes[0]);
        if (clickedNode && clickedNode.id.startsWith('doc-')) {
          const document = clickedNode.label;
          const documentInfo = topDocuments[document];
          if (documentInfo) {
            handleCitation(document, documentInfo.url);
          }
        }
      }
    });
  };

  return (
    <MainContainer>
      {researchCompleted || isResearching ? renderResults() : renderResearchForm()}
      {pdfPreview && (
        <PDFPreviewContainer>
          <PDFPreview>
            <CloseButton onClick={() => setPDFPreview(null)}>
              <FontAwesomeIcon icon={faTimes} /> Close
            </CloseButton>
            <PDFEmbed src={pdfPreview} type="application/pdf" />
          </PDFPreview>
        </PDFPreviewContainer>
      )}
    </MainContainer>
  );
}

const Pagination = ({ itemsPerPage, totalItems, paginate, currentPage }) => {
  const pageNumbers = [];

  for (let i = 1; i <= Math.ceil(totalItems / itemsPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <PaginationContainer>
      <PaginationList>
        {pageNumbers.map(number => (
          <PaginationItem key={number}>
            <PaginationLink 
              onClick={(e) => {
                e.preventDefault();
                paginate(number);
              }} 
              href='#!'
              active={currentPage === number}
            >
              {number}
            </PaginationLink>
          </PaginationItem>
        ))}
      </PaginationList>
    </PaginationContainer>
  );
};

export default ResearchSection;