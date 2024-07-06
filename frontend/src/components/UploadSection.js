import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const UploadArea = styled.div`
  grid-column: 1;
`;

const FileArea = styled.div`
  grid-column: 2;
  
  @media (max-width: 768px) {
    grid-column: 1;
  }
`;

const UploadContainer = styled.div`
  padding: 30px;
  background-color: ${props => props.theme.cardBackground};
  border-radius: 15px;
  margin-bottom: 30px;
  animation: ${fadeIn} 0.5s ease-out, ${slideIn} 0.5s ease-out;
  transition: all 0.3s ease;

`;

const FileList = styled.ul`
  list-style: none;
  padding: 0;
`;

const FileItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: ${props => props.theme.itemBackground};
  color: ${props => props.theme.textColor};
  margin-bottom: 15px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  animation: ${slideIn} 0.3s ease-out;
  transition: all 0.3s ease;

  &:hover {
    transform: translateX(5px);
    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.1);
  }
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
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: ${props => props.theme.primaryButtonHover};
    transform: translateY(-2px);
    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    background-color: ${props => props.theme.disabledButtonColor};
    color: ${props => props.theme.disabledButtonText};
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const LoadingSpinner = styled.div`
  border: 4px solid ${props => props.theme.spinnerColor};
  border-top: 4px solid ${props => props.theme.spinnerTopColor};
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: ${rotate} 1s linear infinite;
  margin: 20px auto;
`;

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
`;

const FileInputLabel = styled.label`
  display: inline-block;
  padding: 15px 25px;
  background-color: ${props => props.theme.secondaryButtonColor};
  color: ${props => props.theme.primaryButtonText};
  border: 2px dashed ${props => props.theme.borderColor};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 20px;
  font-weight: bold;

  &:hover {
    background-color: ${props => props.theme.secondaryButtonHover};
    border-color: ${props => props.theme.primaryButtonColor};
    animation: ${pulse} 0.5s ease-in-out;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const CheckboxContainer = styled.label`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  cursor: pointer;
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  cursor: pointer;
`;

const StyledCheckbox = styled.div`
  width: 24px;
  height: 24px;
  background-color: ${props => props.checked ? props.theme.primaryButtonColor : props.theme.checkboxBackground};
  border: 2px solid ${props => props.theme.checkboxBorder};
  border-radius: 6px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;

  ${HiddenCheckbox}:focus + & {
    box-shadow: 0 0 0 3px ${props => props.theme.focusBoxShadow};
  }

  &::after {
    content: '✓';
    color: ${props => props.theme.checkboxCheckedColor};
    display: ${props => props.checked ? 'block' : 'none'};
    font-size: 16px;
  }
`;

const CheckboxLabel = styled.span`
  font-size: 16px;
  color: ${props => props.theme.textColor};
`;

const StatusMessage = styled.p`
  margin-top: 20px;
  font-weight: bold;
  color: ${props => props.error ? '#d32f2f' : '#4caf50'};
  text-align: center;
  animation: ${fadeIn} 0.3s ease-out;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 20px;
`;

const Title = styled.h3`
  color: ${props => props.theme.titleColor};
  text-align: center;
  margin-bottom: 25px;
  font-size: 24px;
`;

const ProgressContainer = styled.div`
  width: 100%;
  background-color: ${props => props.theme.progressBackground};
  border-radius: 10px;
  overflow: hidden;
  margin-top: 20px;
`;

const ProgressBar = styled.div`
  width: ${props => props.progress}%;
  height: 10px;
  background-color: ${props => props.theme.progressFill};
  transition: width 0.3s ease;
`;

const ProgressText = styled.p`
  text-align: center;
  margin-top: 10px;
  font-weight: bold;
  color: ${props => props.theme.textColor};
`;

const ProcessingFileItem = styled.div`
  background-color: ${props => props.theme.itemBackground};
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
`;

const IndexedPages = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;


function UploadSection({ indexName, isRestricted, onFilesChange }) {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');
  const [isIndexing, setIsIndexing] = useState(false);
  const [isMultimodal, setIsMultimodal] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);
  const indexingInterval = useRef(null);

  useEffect(() => {
    if (indexName) {
      fetchFiles();
      const interval = setInterval(fetchFiles, 15000);
      return () => clearInterval(interval);
    }
  }, [indexName, isRestricted]);

  useEffect(() => {
    setFiles([]);
    setStatus('');
    setIsIndexing(false);
    setSelectedFileName('');
    setUploadProgress(0);
    setIsUploading(false);
    setIndexingProgress(0);
    if (indexingInterval.current) {
      clearInterval(indexingInterval.current);
    }
  }, [indexName, isRestricted]);

  const fetchFiles = async () => {
    if (!indexName) return;
    try {
      const response = await fetch(`/indexes/${indexName}/files?is_restricted=${isRestricted}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setFiles((prevFiles) => {
        const updatedFiles = data.files.map((file) => {
          const existingFile = prevFiles.find((f) => f.filename === file.filename);
          return {
            ...file,
            previousTotalPages: existingFile ? existingFile.total_pages : 0,
            isAnimating: existingFile ? file.total_pages > existingFile.total_pages : false,
          };
        });
        return updatedFiles;
      });
      onFilesChange();
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = e.target.elements.file.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('multimodal', isMultimodal);

    try {
      setStatus('Uploading...');
      setUploadProgress(0);
      setIsUploading(true);
      const response = await fetch(`/indexes/${indexName}/upload?is_restricted=${isRestricted}`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setStatus(data.message);
      setSelectedFileName('');
      setUploadProgress(100);
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);
      fetchFiles();
    } catch (error) {
      setStatus('Upload failed: ' + error.message);
      console.error('Error:', error);
      setIsUploading(false);
    }
  };

  const startIndexing = async () => {
    if (!indexName) return;

    try {
      setIsIndexing(true);
      setStatus('Starting indexing...');
      setIndexingProgress(0);
      const response = await fetch(`/indexes/${indexName}/index?is_restricted=${isRestricted}`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setStatus(data.message);
      
      // Start polling for indexing status
      indexingInterval.current = setInterval(checkIndexingStatus, 5000);
    } catch (error) {
      setStatus('Indexing failed: ' + error.message);
      console.error('Error:', error);
      setIsIndexing(false);
    }
  };

  const checkIndexingStatus = async () => {
    try {
      const response = await fetch(`/indexes/${indexName}/index/status?is_restricted=${isRestricted}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.status === 'completed') {
        setStatus('Indexing completed successfully');
        setIsIndexing(false);
        setIndexingProgress(100);
        clearInterval(indexingInterval.current);
        fetchFiles();
      } else if (data.status === 'failed') {
        setStatus('Indexing failed: ' + data.message);
        setIsIndexing(false);
        clearInterval(indexingInterval.current);
      } else if (data.status === 'in_progress') {
        setStatus('Indexing in progress...');
        setIndexingProgress(data.progress || 0);
      }
    } catch (error) {
      setStatus('Error checking indexing status: ' + error.message);
      console.error('Error:', error);
      setIsIndexing(false);
      clearInterval(indexingInterval.current);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFileName(file ? file.name : '');
  };

  return (
    <Layout>
      <UploadArea>
        <UploadContainer>
          <FormContainer onSubmit={handleUpload}>
            <FileInputLabel>
              {selectedFileName || 'Choose a file'}
              <HiddenFileInput type="file" name="file" onChange={handleFileChange} />
            </FileInputLabel>
            <CheckboxContainer>
              <HiddenCheckbox
                id="multimodal"
                checked={isMultimodal}
                onChange={(e) => setIsMultimodal(e.target.checked)}
              />
              <StyledCheckbox checked={isMultimodal} />
              <CheckboxLabel htmlFor="multimodal">
                Enable multimodal refinement & table postprocessing
              </CheckboxLabel>
            </CheckboxContainer>
            <ButtonContainer>
              <Button type="submit" disabled={isUploading || isIndexing}>
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
              <Button type="button" onClick={startIndexing} disabled={isUploading || isIndexing}>
                {isIndexing ? 'Indexing...' : 'Start Indexing'}
              </Button>
            </ButtonContainer>
          </FormContainer>
          {(uploadProgress > 0 || isUploading) && (
            <ProgressContainer>
              <ProgressBar progress={uploadProgress} />
              <ProgressText>{`Uploading: ${uploadProgress}%`}</ProgressText>
            </ProgressContainer>
          )}
          {isIndexing && (
            <ProgressContainer>
              <ProgressBar progress={indexingProgress} />
              <ProgressText>{`Indexing: ${indexingProgress}%`}</ProgressText>
            </ProgressContainer>
          )}
          <StatusMessage error={status.includes('failed')}>{status}</StatusMessage>
          {isIndexing && <LoadingSpinner />}
        </UploadContainer>
      </UploadArea>
      <FileArea>
        <UploadContainer>
        <FileList>
          {files.map((file) => (
            <FileItem key={file.filename}>
              <span>{file.filename}</span>
              <IndexedPages>
                {file.isAnimating && <SmallSpinner />}
                <p>
                  {file.total_pages} {file.total_pages === 1 ? 'page' : 'pages'}
                </p>
              </IndexedPages>
            </FileItem>
          ))}
        </FileList>
        </UploadContainer>
      </FileArea>
    </Layout>
  );
}

export default UploadSection;

const SmallSpinner = () => (
  <div className="spinner"></div>
);

const spinnerStyles = `
  .spinner {
    border: 2px solid rgba(255, 255, 255, 0.2); 
    border-left-color: #333; 
    border-radius: 50%;
    width: 16px;
    height: 16px;
    animation: spin 120s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(36000deg); }
  }
`;

// Add the styles to the document head
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = spinnerStyles;
document.head.appendChild(styleSheet);