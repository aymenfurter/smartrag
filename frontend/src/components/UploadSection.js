import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const UploadContainer = styled.div`
  flex: 1;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  overflow-y: auto;
`;

const FileList = styled.ul`
  list-style: none;
  padding: 0;
`;

const FileItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f1f1f1;
  margin-bottom: 5px;
  border-radius: 4px;
`;

const Button = styled.button`
  background-color: #0078D7;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
`;

function UploadSection() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/list-files');
      const data = await response.json();
      setFiles(data.files.default);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = e.target.elements.file.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setStatus('Uploading...');
      const response = await fetch('/upload', { method: 'POST', body: formData });
      const data = await response.json();
      setStatus(data.message);
      fetchFiles();
    } catch (error) {
      setStatus('Upload failed');
      console.error('Error:', error);
    }
  };

  const handleDelete = async (filename) => {
    try {
      await fetch(`/delete-file/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleIndex = async () => {
    try {
      setStatus('Indexing files...');
      const response = await fetch('/index-files', { method: 'POST' });
      const data = await response.json();
      setStatus(data.message);
    } catch (error) {
      setStatus('Indexing failed');
      console.error('Error:', error);
    }
  };

  return (
    <UploadContainer>
      <h2>Upload File</h2>
      <form onSubmit={handleUpload}>
        <input type="file" name="file" />
        <Button type="submit">Upload</Button>
      </form>
      <p>{status}</p>
      <h3>Uploaded Files</h3>
      <FileList>
        {files.map((file, index) => (
          <FileItem key={index}>
            <span>{file}</span>
            <Button onClick={() => handleDelete(file)}>Remove</Button>
          </FileItem>
        ))}
      </FileList>
      <Button onClick={handleIndex}>Index Files</Button>
    </UploadContainer>
  );
}

export default UploadSection;