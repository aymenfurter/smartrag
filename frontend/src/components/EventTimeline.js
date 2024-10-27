import React, { useState, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSearch,
  faComment,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faQuestionCircle,
  faChevronUp,
  faChevronDown,
  faHeartbeat,
  faBook,
  faBolt,
  faFilter
} from '@fortawesome/free-solid-svg-icons';

const getEventIcon = (eventType, type) => {
  if (type === 'heartbeat') return faHeartbeat;
  if (type === 'research_start') return faSearch;
  if (type === 'final_citation') return faBook;
  if (type === 'tool_use') return faBolt;
  
  switch (eventType) {
    case 'searchEvent': return faSearch;
    case 'message': return faComment;
    case 'error': return faExclamationTriangle;
    case 'success': return faCheckCircle;
    case 'status': return faSpinner;
    default: return faQuestionCircle;
  }
};

const getEventColor = (type) => {
  switch (type) {
    case 'search': return '#4A90E2';
    case 'search_complete': return '#50C878';
    case 'message': return '#9B9B9B';
    case 'citation': return '#8E44AD';
    case 'final_citation': return '#E74C3C';
    case 'status': return '#F39C12';
    case 'research_start': return '#3498DB';
    case 'chat_complete': return '#2ECC71';
    case 'final_conclusion': return '#E67E22';
    case 'error': return '#E74C3C';
    case 'heartbeat': return '#95A5A6';
    case 'tool_use': return '#FFD700';
    default: return '#BDC3C7';
  }
};

const transformEvents = (events) => {
  return events.map(event => {
    if (event.type === 'message' && event.content.tool_calls) {
      return {
        ...event,
        type: 'tool_use',
        content: {
          tool_calls: event.content.tool_calls,
          role: event.content.role
        }
      };
    }
    return event;
  });
};

const ContentPreview = ({ content, type, maxLength = 100 }) => {
  const getPreviewText = () => {
    if (type === 'tool_use' && content.tool_calls) {
      const toolCall = content.tool_calls[0];
      return `Using tool: ${toolCall.function.name}`;
    }

    if (typeof content === 'string') {
      return content;
    }

    switch (type) {
      case 'search':
        return `Searching: ${content.query || ''}`;
      case 'search_complete':
        return `Found results for: ${content.query || ''}`;
      case 'citation':
      case 'final_citation':
        return content.title || content.url || 'Citation';
      case 'research_start':
        return content.question || 'Research started';
      case 'message':
        if (content.tool_calls) {
          return `Tool call: ${content.tool_calls[0].function.name}`;
        }
        if (content.content) {
          return typeof content.content === 'string' 
            ? content.content 
            : JSON.stringify(content.content);
        }
        return JSON.stringify(content);
      default:
        return JSON.stringify(content);
    }
  };

  const previewText = getPreviewText();
  return previewText.length > maxLength 
    ? previewText.substring(0, maxLength) + '...'
    : previewText;
};

const FilterBar = ({ filters, onFilterChange, availableIndices }) => {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <FontAwesomeIcon icon={faSearch} className="filter-icon" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          placeholder="Filter events..."
          className="search-input"
        />
      </div>
      
      <div className="filter-group">
        <FontAwesomeIcon icon={faFilter} className="filter-icon" />
        <select
          value={filters.eventType}
          onChange={(e) => onFilterChange({ ...filters, eventType: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Event Types</option>
          <option value="tool_use">Tool Use</option>
          <option value="search">Search</option>
          <option value="search_complete">Search Result</option>
          <option value="message">Message</option>
          <option value="citation">Citation</option>
          <option value="final_citation">Final Citation</option>
        </select>
      </div>

      <div className="filter-group">
        <FontAwesomeIcon icon={faBook} className="filter-icon" />
        <select
          value={filters.index}
          onChange={(e) => onFilterChange({ ...filters, index: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Indices</option>
          {availableIndices.map(index => (
            <option key={index} value={index}>{index}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

const EventDetail = ({ event }) => {
  const renderToolCall = (toolCall) => {
    let args;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      args = toolCall.function.arguments;
    }

    return (
      <div className="tool-call" key={toolCall.id}>
        <div className="tool-call-header">
          <strong>Tool ID:</strong> {toolCall.id}
        </div>
        <div className="tool-call-content">
          <div className="tool-call-name">
            <strong>Function:</strong> {toolCall.function.name}
          </div>
          <div className="tool-call-args">
            <strong>Arguments:</strong>
            <pre className="args-json">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (event.type === 'tool_use') {
      return (
        <div className="detail-content tool-use-content">
          <div className="tool-call-role">
            <strong>Role:</strong> {event.content.role || 'assistant'}
          </div>
          {event.content.tool_calls.map(toolCall => renderToolCall(toolCall))}
        </div>
      );
    }

    switch (event.type) {
      case 'search':
        return (
          <div className="detail-content">
            <div className="detail-row">
              <strong>Index:</strong> {event.content.index}
            </div>
            <div className="detail-row">
              <strong>Query:</strong> {event.content.query}
            </div>
            {event.content.relatedQuery && (
              <div className="detail-row">
                <strong>Related Query:</strong> {event.content.relatedQuery}
              </div>
            )}
          </div>
        );

      case 'search_complete':
        return (
          <div className="detail-content">
            <div className="detail-row">
              <strong>Query:</strong> {event.content.query}
            </div>
            <div className="detail-row">
              <strong>Index:</strong> {event.content.index}
            </div>
            <div className="detail-row">
              <strong>Result:</strong> 
              <div className="detail-result">{event.content.result}</div>
            </div>
            {event.content.full_response && (
              <div className="detail-row">
                <strong>Full Response:</strong>
                <pre className="detail-json">
                  {JSON.stringify(event.content.full_response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );

      case 'citation':
      case 'final_citation':
        return (
          <div className="detail-content">
            <div className="detail-row">
              <strong>Title:</strong> {event.content.title}
            </div>
            <div className="detail-row">
              <strong>URL:</strong> {event.content.url}
            </div>
            {event.content.query && (
              <div className="detail-row">
                <strong>Query:</strong> {event.content.query}
              </div>
            )}
            {event.content.content && (
              <div className="detail-row">
                <strong>Content:</strong>
                <div className="detail-text">{event.content.content}</div>
              </div>
            )}
            {event.content.rank && (
              <div className="detail-row">
                <strong>Rank:</strong> {event.content.rank}
              </div>
            )}
          </div>
        );

      case 'message':
        return (
          <div className="detail-content message-content">
            <div className="detail-row">
              {typeof event.content === 'string' 
                ? event.content 
                : JSON.stringify(event.content, null, 2)}
            </div>
          </div>
        );

      default:
        if (typeof event.content === 'string') {
          return (
            <div className="detail-content">
              <div className="detail-text">{event.content}</div>
            </div>
          );
        }
        return (
          <div className="detail-content">
            <pre className="detail-json">
              {JSON.stringify(event.content, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="event-detail">
      {renderContent()}
      <style jsx>{`
        .tool-use-content {
          padding: 12px;
          background-color: ${props => props.theme.cardBackground};
          border-radius: 8px;
        }

        .tool-call-role {
          margin-bottom: 12px;
          padding: 8px;
          background-color: ${props => props.theme.borderColor}10;
          border-radius: 4px;
          font-size: 13px;
        }

        .tool-call {
          background-color: ${props => props.theme.preBackground};
          border: 1px solid ${props => props.theme.borderColor};
          border-radius: 8px;
          margin-bottom: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .tool-call:last-child {
          margin-bottom: 0;
        }

        .tool-call-header {
          padding: 12px;
          background-color: ${props => props.theme.borderColor}20;
          border-bottom: 1px solid ${props => props.theme.borderColor};
          font-family: 'SF Mono', 'Roboto Mono', monospace;
          font-size: 12px;
        }

        .tool-call-content {
          padding: 12px;
        }

        .tool-call-name {
          margin-bottom: 12px;
          color: ${props => props.theme.titleColor};
          font-size: 14px;
        }

        .tool-call-args {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .args-json {
          font-family: 'SF Mono', 'Roboto Mono', monospace;
          font-size: 13px;
          line-height: 1.5;
          padding: 12px;
          background-color: ${props => props.theme.codeBackground};
          border-radius: 6px;
          margin: 0;
          white-space: pre-wrap;
          color: ${props => props.theme.codeText};
          border: 1px solid ${props => props.theme.borderColor}40;
        }

        .tool-call strong {
          color: ${props => props.theme.titleColor};
          font-weight: 600;
        }

        .detail-row {
          margin-bottom: 12px;
        }

        .detail-row strong {
          color: ${props => props.theme.titleColor};
          display: block;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .detail-text {
          margin-top: 8px;
          white-space: pre-wrap;
          padding: 12px;
          background-color: ${props => props.theme.preBackground};
          border-radius: 8px;
          font-family: 'SF Mono', 'Roboto Mono', monospace;
          font-size: 13px;
          line-height: 1.6;
          color: ${props => props.theme.preText};
          border: 1px solid ${props => props.theme.borderColor};
        }

        .detail-json {
          margin: 8px 0;
          padding: 12px;
          background-color: ${props => props.theme.codeBackground};
          border-radius: 8px;
          font-family: 'SF Mono', 'Roboto Mono', monospace;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
          color: ${props => props.theme.codeText};
          border: 1px solid ${props => props.theme.borderColor};
        }

        .detail-result {
          margin-top: 8px;
          padding: 12px;
          background-color: ${props => props.theme.backgroundColor};
          border: 1px solid ${props => props.theme.borderColor};
          border-radius: 8px;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
};

const EventTimeline = ({ events, onCitationClick }) => {
  const timelineRef = useRef(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [scale, setScale] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    eventType: 'all',
    index: 'all'
  });

  const transformedEvents = useMemo(() => transformEvents(events), [events]);

  const availableIndices = useMemo(() => {
    const indices = new Set();
    transformedEvents.forEach(event => {
      if (event.content?.index) {
        indices.add(event.content.index);
      }
    });
    return Array.from(indices).sort();
  }, [transformedEvents]);

  const { start, end, duration } = useMemo(() => {
    if (!transformedEvents.length) return { start: Date.now(), end: Date.now(), duration: 0 };
    const timestamps = transformedEvents.map(e => e.timestamp);
    const start = Math.min(...timestamps);
    const end = Math.max(...timestamps);
    return { start, end, duration: end - start };
  }, [transformedEvents]);

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY;
      setScale(prevScale => {
        const newScale = delta > 0 
          ? Math.max(prevScale * 0.9, 0.1) 
          : Math.min(prevScale * 1.1, 5);
        return newScale;
      });
    }
  };

  useEffect(() => {
    const timeline = timelineRef.current;
    if (timeline) {
      timeline.addEventListener('wheel', handleWheel, { passive: false });
      return () => timeline.removeEventListener('wheel', handleWheel);
    }
  }, []);

  const handleEventClick = (event) => {
    if (event.type === 'citation' || event.type === 'final_citation') {
      onCitationClick?.(event.content.title, event.content.url);
    }
  };

  const filteredEvents = transformedEvents.filter(event => {
    const matchesSearch = !filters.search || 
      JSON.stringify(event).toLowerCase().includes(filters.search.toLowerCase());
    const matchesType = filters.eventType === 'all' || event.type === filters.eventType;
    const matchesIndex = filters.index === 'all' || event.content?.index === filters.index;
    return matchesSearch && matchesType && matchesIndex;
  });

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const formatDuration = (timestamp) => {
    return `${((timestamp - start) / 1000).toFixed(3)}s`;
  };

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <FilterBar 
          filters={filters}
          onFilterChange={setFilters}
          availableIndices={availableIndices}
        />
      </div>

      <div className="timeline-visualization" ref={timelineRef}>
        <div className="timeline-scale" style={{ transform: `scaleX(${scale})` }}>
          {filteredEvents.map((event, index) => (
            <div 
              key={`marker-${index}`}
              className="timeline-marker"
              style={{
                left: `${((event.timestamp - start) / duration) * 100}%`,
                backgroundColor: getEventColor(event.type)
              }}
            />
          ))}
        </div>
        <div className="timeline-ruler">
          {[0, 25, 50, 75, 100].map(percent => (
            <div key={percent} className="ruler-mark" style={{ left: `${percent}%` }}>
              <div className="ruler-time">
                {formatTime(start + (duration * (percent / 100)))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="events-list">
        {filteredEvents.map((event, index) => (
          <div 
            key={`event-${index}`}
            className={`event-card ${selectedEvent === index ? 'selected' : ''}`}
            onClick={() => {
              setSelectedEvent(selectedEvent === index ? null : index);
              handleEventClick(event);
            }}
          >
            <div className="event-card-header">
              <div className="event-card-left">
                <FontAwesomeIcon 
                  icon={getEventIcon(event.eventType, event.type)} 
                  style={{ color: getEventColor(event.type) }}
                  className={`event-icon ${event.type === 'tool_use' ? 'flash-icon' : ''}`}
                />
                <span className="event-type-badge" style={{ 
                  backgroundColor: getEventColor(event.type) + '20',
                  color: getEventColor(event.type)
                }}>
                  {event.type}
                </span>
                {event.content?.index && (
                  <span className="index-badge">
                    {event.content.index}
                  </span>
                )}
              </div>
              <div className="event-card-right">
                <span className="event-time">
                  {formatTime(event.timestamp)} ({formatDuration(event.timestamp)})
                </span>
                <FontAwesomeIcon 
                  icon={selectedEvent === index ? faChevronUp : faChevronDown} 
                  className="expand-icon"
                />
              </div>
            </div>
            
            <div className="event-preview">
              <ContentPreview content={event.content} type={event.type} />
            </div>
            
            {selectedEvent === index && <EventDetail event={event} />}
          </div>
        ))}
      </div>

      <style jsx>{`
        .timeline-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: ${props => props.theme.cardBackground};
          border: 1px solid ${props => props.theme.borderColor};
          border-radius: 8px;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }

        .timeline-header {
          padding: 16px;
          border-bottom: 1px solid ${props => props.theme.borderColor};
          background-color: ${props => props.theme.backgroundColor};
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .filter-bar {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 200px;
        }

        .filter-icon {
          color: ${props => props.theme.messageText};
          opacity: 0.6;
          width: 16px;
        }

        .search-input, .filter-select {
          flex: 1;
          padding: 10px 16px;
          border: 1px solid ${props => props.theme.inputBorder};
          border-radius: 6px;
          background-color: ${props => props.theme.inputBackground};
          color: ${props => props.theme.inputText};
          font-size: 14px;
          transition: all 0.2s ease;
          min-width: 0;
        }

        .search-input:focus, .filter-select:focus {
          border-color: ${props => props.theme.primaryButtonColor};
          box-shadow: 0 0 0 2px ${props => props.theme.primaryButtonColor}20;
          outline: none;
        }

                .timeline-visualization {
          position: relative;
          height: 80px;
          background-color: ${props => props.theme.backgroundColor};
          border-bottom: 1px solid ${props => props.theme.borderColor};
          overflow: hidden;
          padding: 8px 0;
        }

        .timeline-scale {
          position: absolute;
          top: 8px;
          left: 40px;
          right: 40px;
          height: 40px;
          transform-origin: left;
          padding: 16px 0;
        }

        .timeline-marker {
          position: absolute;
          width: 3px;
          height: 100%;
          transform: translateX(-50%);
          transition: all 0.2s ease;
          opacity: 0.8;
        }

        .timeline-marker:hover {
          height: 120%;
          opacity: 1;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
        }

        .timeline-ruler {
          position: absolute;
          bottom: 0;
          left: 40px;
          right: 40px;
          height: 24px;
          border-top: 1px solid ${props => props.theme.borderColor};
        }

        .ruler-mark {
          position: absolute;
          top: 0;
          width: 1px;
          height: 8px;
          background-color: ${props => props.theme.borderColor};
          transform: translateX(-50%);
        }

        .ruler-time {
          position: absolute;
          left: 50%;
          top: 10px;
          transform: translateX(-50%);
          font-size: 11px;
          color: ${props => props.theme.messageText};
          white-space: nowrap;
          font-family: 'SF Mono', 'Roboto Mono', monospace;
          opacity: 0.8;
        }

        .events-list {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background-color: ${props => props.theme.backgroundColor};
        }

        .event-card {
          background-color: ${props => props.theme.cardBackground};
          border: 1px solid ${props => props.theme.borderColor};
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .event-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        .event-card.selected {
          border-color: ${props => props.theme.primaryButtonColor};
          box-shadow: 0 0 0 2px ${props => props.theme.primaryButtonColor}20;
        }

        .event-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .event-card-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .event-card-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .event-type-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.3px;
          text-transform: lowercase;
        }

        .index-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          background-color: ${props => props.theme.borderColor}40;
          color: ${props => props.theme.messageText};
          font-family: 'SF Mono', 'Roboto Mono', monospace;
        }

        .event-time {
          color: ${props => props.theme.messageText};
          font-size: 13px;
          font-family: 'SF Mono', 'Roboto Mono', monospace;
        }

        .event-icon {
          font-size: 18px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .flash-icon {
          animation: flash 2s infinite;
          filter: drop-shadow(0 0 2px ${props => getEventColor('tool_use')});
        }

        .event-preview {
          color: ${props => props.theme.messageText};
          font-size: 14px;
          line-height: 1.5;
          margin: 8px 0;
          padding: 0 4px;
          opacity: 0.8;
        }

        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 768px) {
          .filter-bar {
            flex-direction: column;
            gap: 12px;
          }

          .filter-group {
            width: 100%;
          }

          .event-card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .event-card-right {
            width: 100%;
            justify-content: space-between;
          }

          .event-card-left {
            width: 100%;
            flex-wrap: wrap;
          }

          .event-type-badge, .index-badge {
            font-size: 12px;
            padding: 4px 8px;
          }
        }
      `}</style>
    </div>
  );
};

EventTimeline.propTypes = {
  events: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string.isRequired,
    content: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        query: PropTypes.string,
        index: PropTypes.string,
        result: PropTypes.string,
        title: PropTypes.string,
        url: PropTypes.string,
        content: PropTypes.string,
        rank: PropTypes.number,
        role: PropTypes.string,
        tool_calls: PropTypes.array,
        function_call: PropTypes.object
      })
    ]).isRequired,
    timestamp: PropTypes.number.isRequired,
    eventType: PropTypes.string
  })).isRequired,
  onCitationClick: PropTypes.func.isRequired
};

export default React.memo(EventTimeline);