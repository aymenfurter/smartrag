import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faDownload, 
  faExpand, 
  faCompress,
  faSpinner,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

import {
  PDFPreviewContainer,
  PDFPreview as StyledPDFPreview,
  PDFEmbed,
  CloseButton,
  Button
} from '../styles/StyledComponents';

import styled from 'styled-components';

const PreviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: ${props => props.theme.cardBackground};
  border-bottom: 1px solid ${props => props.theme.borderColor};
  border-radius: 10px 10px 0 0;
`;

const PreviewTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.titleColor};
  font-size: 18px;
  flex-grow: 1;
  margin-right: 20px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`;

const PDFContainer = styled.div`
  position: relative;
  flex-grow: 1;
  background-color: ${props => props.theme.cardBackground};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  gap: 10px;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  color: ${props => props.theme.errorColor};
  gap: 10px;
`;

const PDFPreview = ({ 
  pdfUrl, 
  onClose, 
  title = 'Document Preview',
  allowDownload = true,
  initialPage = 1
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Handle PDF loading
  const handlePDFLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  // Handle PDF error
  const handlePDFError = useCallback((error) => {
    setIsLoading(false);
    setError('Failed to load PDF. Please try again later.');
    console.error('PDF loading error:', error);
  }, []);

  // Handle download
  const handleDownload = useCallback(() => {
    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = title.replace(/\s+/g, '_').toLowerCase() + '.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download PDF. Please try again later.');
    }
  }, [pdfUrl, title]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClose]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Any cleanup needed
    };
  }, []);

  const renderContent = () => {
    if (error) {
      return (
        <ErrorContainer>
          <FontAwesomeIcon 
            icon={faExclamationTriangle} 
            size="2x" 
          />
          <p>{error}</p>
          <Button onClick={() => {
            setError(null);
            setIsLoading(true);
          }}>
            Retry
          </Button>
        </ErrorContainer>
      );
    }

    return (
      <PDFContainer>
        <PDFEmbed
          src={pdfUrl}
          type="application/pdf"
          onLoad={handlePDFLoad}
          onError={handlePDFError}
        />
        {isLoading && (
          <LoadingOverlay>
            <FontAwesomeIcon 
              icon={faSpinner} 
              spin 
              size="2x" 
            />
            <p>Loading PDF...</p>
          </LoadingOverlay>
        )}
      </PDFContainer>
    );
  };

  return (
    <PDFPreviewContainer>
      <StyledPDFPreview>
        <PreviewHeader>
          <PreviewTitle>{title}</PreviewTitle>
          <ButtonGroup>
            {allowDownload && (
              <Button
                onClick={handleDownload}
                disabled={isLoading || !!error}
                aria-label="Download PDF"
                title="Download PDF"
              >
                <FontAwesomeIcon icon={faDownload} />
              </Button>
            )}
            <Button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
            </Button>
            <CloseButton
              onClick={onClose}
              aria-label="Close preview"
              title="Close preview"
            >
              <FontAwesomeIcon icon={faTimes} />
            </CloseButton>
          </ButtonGroup>
        </PreviewHeader>
        {renderContent()}
      </StyledPDFPreview>
    </PDFPreviewContainer>
  );
};

PDFPreview.propTypes = {
  pdfUrl: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  allowDownload: PropTypes.bool,
  initialPage: PropTypes.number
};

export default React.memo(PDFPreview);