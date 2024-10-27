import React, { useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Network } from 'vis-network/standalone';
import { TreeContainer } from '../styles/StyledComponents';

const formatDocumentLabel = (doc) => {
  // Split by ___Page to separate filename and page number
  const parts = doc.split('___Page');
  if (parts.length !== 2) return doc;

  let [filename, pageNum] = parts;
  pageNum = pageNum.replace('.md', ''); // Remove .md extension

  // If filename is longer than 20 characters, truncate it
  if (filename.length > 20) {
    const ext = filename.slice(filename.lastIndexOf('.'));
    const name = filename.slice(0, filename.lastIndexOf('.'));
    filename = name.slice(0, 8) + '...' + name.slice(-8) + ext;
  }

  return `${filename} (Page ${pageNum})`;
};

const NetworkGraph = ({ 
  searchEvents, 
  topDocuments,
  onNodeClick,
  question
}) => {
  const networkRef = useRef(null);
  const networkInstanceRef = useRef(null);

  const { nodes, edges } = useMemo(() => {
    const graphData = {
      nodes: [],
      edges: []
    };

    // Track query relationships and assign proper levels
    const queryLevels = new Map();
    const queryToDocuments = new Map();

    // Add root node (level 0)
    if (question) {
      graphData.nodes.push({
        id: 'root',
        label: question,
        shape: 'box',
        color: {
          background: '#915e1f',
          border: '#744b18'
        },
        font: { 
          color: 'white',
          size: 16,
          face: 'arial'
        },
        level: 0
    });
    }

    // First pass: Build relationships between queries and documents
    searchEvents.forEach((event, index) => {
      if (event.type === 'search' && event.content.query) {
        const queryId = `query-${index}`;
        if (event.content.relatedQuery) {
          const relatedQueryIndex = searchEvents.findIndex(
            e => e.type === 'search' && e.content.query === event.content.relatedQuery
          );
          // Find the level of the parent query
          const parentLevel = queryLevels.get(`query-${relatedQueryIndex}`);
          // Set this query's level to parent's level + 2 (to account for documents in between)
          queryLevels.set(queryId, (parentLevel || 0) + 2);
        } else {
          // Root-level queries start at level 1
          queryLevels.set(queryId, 1);
        }
      }
    });

    // Add query nodes
    searchEvents.forEach((event, index) => {
      if (event.type === 'search' && event.content.query) {
        const queryNodeId = `query-${index}`;
        const level = queryLevels.get(queryNodeId);

        graphData.nodes.push({
          id: queryNodeId,
          label: event.content.query,
          color: {
            background: '#33bcee',
            border: '#2699c4'
          },
          font: { 
            color: 'white',
            size: 14 
          },
          level: level,
          group: 'queries'
        });

        if (event.content.relatedQuery) {
          const relatedIndex = searchEvents.findIndex(
            e => e.type === 'search' && e.content.query === event.content.relatedQuery
          );
          if (relatedIndex !== -1) {
            graphData.edges.push({
              from: `query-${relatedIndex}`,
              to: queryNodeId,
              arrows: 'to',
              color: { color: '#2699c4', opacity: 0.8 }
            });
          }
        } else {
          graphData.edges.push({
            from: 'root',
            to: queryNodeId,
            arrows: 'to',
            color: { color: '#915e1f', opacity: 0.8 }
          });
        }
      }
    });

    // Add document nodes with formatted labels
    Object.entries(topDocuments).forEach(([doc, info], docIndex) => {
      if (doc) {
        const docNodeId = `doc-${docIndex}`;
        const queryIndex = searchEvents.findIndex(
          e => e.type === 'search' && e.content.query === info.query
        );
        if (queryIndex !== -1) {
          const queryNodeId = `query-${queryIndex}`;
          const queryLevel = queryLevels.get(queryNodeId);
          const documentLevel = queryLevel + 1;

          graphData.nodes.push({
            id: docNodeId,
            label: formatDocumentLabel(doc),
            title: doc, // Store original document name for hover and click handling
            shape: 'box',
            color: {
              background: '#4da6ff',
              border: '#3d85cc'
            },
            font: { 
              color: 'white',
              size: 12
            },
            level: documentLevel,
            group: 'documents'
          });

          graphData.edges.push({
            from: queryNodeId,
            to: docNodeId,
            arrows: 'to',
            color: { color: '#4da6ff', opacity: 0.8 }
          });
        }
      }
    });

    return graphData;
  }, [searchEvents, topDocuments, question]);

  useEffect(() => {
    if (!networkRef.current || !nodes.length) return;

    const options = {
      nodes: {
        shape: 'box',
        margin: 10,
        widthConstraint: {
          minimum: 100,
          maximum: 250
        },
        heightConstraint: {
          minimum: 30
        },
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.2)',
          size: 10,
          x: 5,
          y: 5
        }
      },
      edges: {
        smooth: {
          enabled: true,
          type: 'cubicBezier',
          roundness: 0.5
        },
        color: {
          inherit: false
        }
      },
      physics: {
        enabled: true,
        hierarchicalRepulsion: {
          centralGravity: 0.1,
          springLength: 150,
          springConstant: 0.02,
          nodeDistance: 200,
          damping: 0.09
        },
        solver: 'hierarchicalRepulsion'
      },
      layout: {
        hierarchical: {
          enabled: true,
          direction: 'UD',
          sortMethod: 'directed',
          shakeTowards: 'leaves',
          nodeSpacing: 200,
          treeSpacing: 200,
          levelSeparation: 150,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true
        }
      },
      groups: {
        queries: {
          shape: 'box',
          font: { size: 14, color: 'white' },
          color: {
            background: '#33bcee',
            border: '#2699c4'
          }
        },
        documents: {
          shape: 'box',
          font: { size: 12, color: 'white' },
          color: {
            background: '#4da6ff',
            border: '#3d85cc'
          }
        }
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
        hover: true,
        tooltipDelay: 300,
        multiselect: false,
        keyboard: {
          enabled: true,
          bindToWindow: false
        },
        tooltipDelay: 300
      }
    };

    // Clean up previous instance
    if (networkInstanceRef.current) {
      networkInstanceRef.current.destroy();
    }

    // Create new network
    networkInstanceRef.current = new Network(
      networkRef.current,
      { nodes, edges },
      options
    );

    // Add click event handler
    networkInstanceRef.current.on('click', function(params) {
      if (params.nodes.length > 0) {
        const clickedNode = nodes.find(node => node.id === params.nodes[0]);
        if (clickedNode && clickedNode.id.startsWith('doc-')) {
          const documentInfo = topDocuments[clickedNode.title]; // Use the full name stored in title
          if (documentInfo) {
            onNodeClick(clickedNode.title, documentInfo.url);
          }
        }
      }
    });

    // Initial stabilization and view fitting
    networkInstanceRef.current.once('stabilizationIterationsDone', function() {
      networkInstanceRef.current.fit({
        animation: {
          duration: 1000,
          easingFunction: 'easeInOutQuad'
        }
      });
      
      // Disable physics after initial layout
      setTimeout(() => {
        networkInstanceRef.current.setOptions({ physics: { enabled: false } });
      }, 1000);
    });

    // Cleanup on unmount
    return () => {
      if (networkInstanceRef.current) {
        networkInstanceRef.current.destroy();
        networkInstanceRef.current = null;
      }
    };
  }, [nodes, edges, topDocuments, onNodeClick]);

  return (
    <TreeContainer 
      ref={networkRef} 
      className="vis-network" 
      data-testid="network-graph"
    />
  );
};

NetworkGraph.propTypes = {
  searchEvents: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string,
      content: PropTypes.shape({
        query: PropTypes.string,
        relatedQuery: PropTypes.string,
        index: PropTypes.string
      })
    })
  ).isRequired,
  topDocuments: PropTypes.objectOf(
    PropTypes.shape({
      count: PropTypes.number,
      url: PropTypes.string,
      query: PropTypes.string
    })
  ).isRequired,
  onNodeClick: PropTypes.func.isRequired,
  question: PropTypes.string
};

export default React.memo(NetworkGraph);