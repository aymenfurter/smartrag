import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const FolderSection = styled.div`
  margin-bottom: 20px;
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

function ResearchSection() {
  const [files, setFiles] = useState({ folder1: [], folder2: [] });
  const [status, setStatus] = useState({ folder1: '', folder2: '' });

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/list-files');
      const data = await response.json();
      setFiles({ folder1: data.files.folder1, folder2: data.files.folder2 });
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const handleUpload = async (e, folder) => {
    e.preventDefault();
    const file = e.target.elements.file.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setStatus(prev => ({ ...prev, [folder]: 'Uploading...' }));
      const response = await fetch(`/${folder}-upload`, { method: 'POST', body: formData });
      const data = await response.json();
      setStatus(prev => ({ ...prev, [folder]: data.message }));
      fetchFiles();
    } catch (error) {
      setStatus(prev => ({ ...prev, [folder]: 'Upload failed' }));
      console.error('Error:', error);
    }
  };

  const handleDelete = async (filename, folder) => {
    try {
      await fetch(`/delete-file/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleIndex = async (folder) => {
    try {
      setStatus(prev => ({ ...prev, [folder]: 'Indexing files...' }));
      const response = await fetch(`/${folder}-index-files`, { method: 'POST' });
      const data = await response.json();
      setStatus(prev => ({ ...prev, [folder]: data.message }));
    } catch (error) {
      setStatus(prev => ({ ...prev, [folder]: 'Indexing failed' }));
      console.error('Error:', error);
    }
  };

  return (
    <div>
      {['folder1', 'folder2'].map(folder => (
        <FolderSection key={folder}>
          <h3>{folder.charAt(0).toUpperCase() + folder.slice(1)}</h3>
          <form onSubmit={(e) => handleUpload(e, folder)}>
            <input type="file" name="file" />
            <button type="submit">Upload</button>
          </form>
          <p>{status[folder]}</p>
          <FileList>
            {files[folder].map((file, index) => (
              <FileItem key={index}>
                <span>{file}</span>
                <button onClick={() => handleDelete(file, folder)}>Remove</button>
              </FileItem>
            ))}
          </FileList>
          <button onClick={() => handleIndex(folder)}>Index Files</button>
        </FolderSection>
      ))}
    </div>
  );
}

export default ResearchSection;