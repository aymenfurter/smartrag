document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const fileList = document.getElementById('file-list');
    const showUploadButton = document.getElementById('show-upload');
    const uploadSection = document.getElementById('upload-section');
    const indexFilesButton = document.getElementById('index-files');
    const indexStatus = document.getElementById('index-status');

    loadUploadedFiles();

    showUploadButton.addEventListener('click', () => {
        uploadSection.classList.toggle('hidden');
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        uploadStatus.textContent = 'Uploading...';
        await uploadFile(formData);
    });

    indexFilesButton.addEventListener('click', async () => {
        indexStatus.textContent = 'Indexing files...';
        await indexFiles();
    });

    async function uploadFile(formData) {
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            uploadStatus.textContent = data.message || 'File upload failed';
            if (data.container_name) {
                loadUploadedFiles();
            }
        } catch (error) {
            console.error('Error:', error);
            uploadStatus.textContent = 'File upload failed';
        }
    }

    async function indexFiles() {
        try {
            const response = await fetch('/index-files', {
                method: 'POST',
            });
            const data = await response.json();
            indexStatus.textContent = data.message || 'Indexing failed';
        } catch (error) {
            console.error('Error:', error);
            indexStatus.textContent = 'Indexing failed';
        }
    }

    async function loadUploadedFiles() {
        try {
            const response = await fetch('/list-files', {
                method: 'GET',
                headers: { 'X-MS-CLIENT-PRINCIPAL-NAME': '163e5568-589b-12d3-5454-426614174063' },
            });
            const data = await response.json();
            fileList.innerHTML = '';
            data.files.forEach(file => {
                const li = document.createElement('li');
                const span = document.createElement('span');
                span.textContent = file;
                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.addEventListener('click', async () => {
                    await deleteFile(file);
                    loadUploadedFiles();
                });
                li.appendChild(span);
                li.appendChild(removeButton);
                fileList.appendChild(li);
            });
        } catch (error) {
            console.error('Error loading files:', error);
        }
    }

    async function deleteFile(filename) {
        try {
            const response = await fetch(`/delete-file/${encodeURIComponent(filename)}`, {
                method: 'DELETE',
                headers: { 'X-MS-CLIENT-PRINCIPAL-NAME': '163e5568-589b-12d3-5454-426614174063' },
            });
            const data = await response.json();
            if (data.message) {
                displayMessage(indexStatus, data.message, 'success');
            } else {
                displayMessage(indexStatus, 'Failed to delete file', 'error');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            displayMessage(indexStatus, 'Error deleting file', 'error');
        }
    }

    function displayMessage(element, message, type) {
        element.textContent = message;
        element.className = type;
        setTimeout(() => {
            element.textContent = '';
            element.className = '';
        }, 3000);
    }
});