document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userMessage = document.getElementById('user-message');
    const chatContainer = document.getElementById('chat-container');
    let buffer = '';
    let isProcessing = false;
    let messageElement = null;

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageContent = userMessage.value.trim();
        if (!messageContent) return;
        appendMessage('user', messageContent);
        userMessage.value = '';
        await sendMessage(messageContent);
    });

    function appendMessage(role, content, split = true) {
        const message = document.createElement('div');
        message.className = `message ${role}`;

        if (split) {
            message.innerHTML = content.split('').map(char => `<span>${char === ' ' ? '&nbsp;' : char}</span>`).join('');
        } else {
            message.innerHTML = content;
        }

        chatContainer.appendChild(message);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async function sendMessage(messageContent) {
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-MS-CLIENT-PRINCIPAL-NAME': '163e5568-589b-12d3-5454-426614174063'
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: messageContent }],
                    context: {},
                    session_state: null
                })
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
    }

    async function readStream(reader, decoder) {
        var citations = '';
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                break;
            }
            
            const text = decoder.decode(value, { stream: true });
            const lines = text.split('\n');
            for (let line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);

                    citations = getCitationsFromDataAsHTML(data);
                    if (citations != '') {
                        appendMessage('assistant', `${citations}`, false);
                    }

                    if (data === '[DONE]') {
                        if (buffer) processBuffer();
                    } else {
                        handleData(data);
                    }
                }
            }
        }
    }

    function getCitationsFromDataAsHTML(data) {
        try {
            const json = JSON.parse(data);
            if (json.choices && json.choices[0].delta.context.citations) {
                const citations = json.choices[0].delta.context.citations;
                if (citations.length === 0) return '';
                return `
                    <div class="citations-section">
                    <h4 class="citation-header">Citations</h4>
                    <ul class="citation-list">
                        ${citations.map((c, index) => `
                            <li class="citation-item">
                                <a href="${c.url}" class="citation" data-filename="${c.filepath}">${c.title}</a> [doc${index})
                            </li>
                        `).join('')}
                    </ul>
                    </div>
                `;
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
        return '';
    }
    

    function handleData(data) {
        try {
            const json = JSON.parse(data);
            if (json.choices && json.choices[0].delta.content) {
                buffer += json.choices[0].delta.content;
                buffer = buffer.replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
                if (!isProcessing) processBuffer();
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    }

    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('citation')) {
            e.preventDefault();
            var filename = e.target.dataset.filename;
            const url = `/references/${encodeURIComponent(filename)}`;
            
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'X-MS-CLIENT-PRINCIPAL-NAME': '163e5568-589b-12d3-5454-426614174063'
                    }
                });
    
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
            hideSourceDocument();
        }
    });


    function html2element(html) {
        const template = document.createElement('template');
        template.innerHTML = html;
        return template.content.firstChild;
    }


    function displaySourceDocument(content) {
        const sourceDocumentContainer = document.getElementById('source-document-container');
        sourceDocumentContainer.innerHTML = `<embed src="data:application/pdf;base64, ${content}" type="application/pdf" width="100%" height="700px" />`;
        document.querySelector('.source-document-section').classList.remove('hidden');
    }

    async function processBuffer() {
        isProcessing = true;
        while (buffer.length > 0) {
            const charSequence = getNextCharacterSequence(buffer);
            buffer = buffer.substring(charSequence.length);
            await appendToMessage(charSequence);
        }
        isProcessing = false;
    }


    function getNextCharacterSequence(buffer) {
        const char = buffer[0];
        if (/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(buffer.slice(0, 2))) {
            return buffer.slice(0, 2); 
        }
        return char;
    }


    async function appendToMessage(charSequence) {
        if (charSequence === '<') {
            endTagLocation = buffer.indexOf('>');
            elementHTML = "<" + buffer.substring(0, endTagLocation + 1);
            element = html2element(elementHTML);
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
    }
});
