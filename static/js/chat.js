document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userMessage = document.getElementById('user-message');
    const chatContainer = document.getElementById('chat-container');
    const clearChatHistoryButton = document.getElementById('clear-chat-history');

    let buffer = '', isProcessing = false, messageElement = null;

    // Define all the functions
    const saveChatHistory = () => {
        localStorage.setItem('chatHistory', chatContainer.innerHTML);
    };

    const loadChatHistory = () => {
        const chatHistory = localStorage.getItem('chatHistory');
        if (chatHistory) {
            chatContainer.innerHTML = chatHistory;
        }
    };

    const appendMessage = (role, content, split = true) => {
        const message = document.createElement('div');
        message.className = `message ${role}`;
        message.innerHTML = split ? content.split('').map(char => `<span>${char === ' ' ? '&nbsp;' : char}</span>`).join('') : content;
        chatContainer.appendChild(message);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        saveChatHistory();
    };

    const sendMessage = async (messageContent) => {
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [{ role: 'user', content: messageContent }], context: {}, session_state: null })
            });
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            messageElement = document.createElement('div');
            messageElement.className = 'message assistant';
            chatContainer.appendChild(messageElement);
            readStream(reader, decoder);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const readStream = async (reader, decoder) => {
        let citations = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            text.split('\n').forEach(line => {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    citations = getCitationsFromDataAsHTML(data);
                    if (citations) appendMessage('assistant', citations, false);
                    if (data === '[DONE]') {
                        if (buffer) processBuffer();
                    } else {
                        handleData(data);
                    }
                }
            });
        }
    };

    const getCitationsFromDataAsHTML = (data) => {
        try {
            const json = JSON.parse(data);
            if (json.choices && json.choices[0].delta.context.citations) {
                const citations = json.choices[0].delta.context.citations;
                if (!citations.length) return '';
                return `
                    <div class="citations-section">
                        <h4 class="citation-header">Citations</h4>
                        <ul class="citation-list">
                            ${citations.map((c, index) => `
                                <li class="citation-item">
                                    <a href="${c.url}" class="citation" data-filename="${c.filepath}">${c.title}</a> [doc${index}]
                                </li>`).join('')}
                        </ul>
                    </div>`;
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
        return '';
    };

    const handleData = (data) => {
        try {
            const json = JSON.parse(data);
            if (json.choices && json.choices[0].delta.content) {
                buffer += json.choices[0].delta.content.replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
                if (!isProcessing) processBuffer();
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    };

    const processBuffer = async () => {
        isProcessing = true;
        while (buffer.length > 0) {
            const charSequence = getNextCharacterSequence(buffer);
            buffer = buffer.substring(charSequence.length);
            await appendToMessage(charSequence);
        }
        isProcessing = false;
        saveChatHistory();
    };

    const getNextCharacterSequence = (buffer) => (/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(buffer.slice(0, 2))) ? buffer.slice(0, 2) : buffer[0];

    const appendToMessage = async (charSequence) => {
        if (charSequence === '<') {
            const endTagLocation = buffer.indexOf('>');
            const elementHTML = "<" + buffer.substring(0, endTagLocation + 1);
            const element = html2element(elementHTML);
            messageElement.appendChild(element);
            buffer = buffer.substring(endTagLocation + 1);
            return;
        }
        const span = document.createElement('span');
        span.innerHTML = charSequence === ' ' ? '&nbsp;' : charSequence;
        span.style.opacity = '0';
        span.style.animation = 'fadeInChar 0.3s forwards';
        messageElement.appendChild(span);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        await new Promise(resolve => setTimeout(resolve, 3));
        saveChatHistory();
    };

    const html2element = (html) => {
        const template = document.createElement('template');
        template.innerHTML = html;
        return template.content.firstChild;
    };

    // Event listeners
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageContent = userMessage.value.trim();
        if (!messageContent) return;
        appendMessage('user', messageContent);
        userMessage.value = '';
        await sendMessage(messageContent);
    });

    clearChatHistoryButton.addEventListener('click', () => {
        localStorage.removeItem('chatHistory');
        chatContainer.innerHTML = '';
    });

    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('citation')) {
            e.preventDefault();
            const filename = e.target.dataset.filename;
            const url = `/references/${encodeURIComponent(filename)}`;
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.text();
                    displaySourceDocument(data);
                } else {
                    console.error('Error fetching source document:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching source document:', error);
            }
        }
        if (e.target.id === 'close-source-document') {
            document.querySelector('.source-document-section').classList.add('hidden');
        }
    });

    const displaySourceDocument = (content) => {
        const sourceDocumentContainer = document.getElementById('source-document-container');
        sourceDocumentContainer.innerHTML = `<embed src="data:application/pdf;base64, ${content}" type="application/pdf" width="100%" height="700px" />`;
        document.querySelector('.source-document-section').classList.remove('hidden');
    };

    // Load chat history after defining all functions
    loadChatHistory();
});
