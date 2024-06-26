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

const ChatContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: ${props => props.theme.backgroundColor};
  border-radius: 10px;
  overflow: hidden;
  animation: ${fadeIn} 0.5s ease-out;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${props => props.theme.scrollbarTrack};
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.scrollbarThumb};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.scrollbarThumbHover};
  }
`;

const MessageForm = styled.form`
  display: flex;
  align-items: center;
  padding: 15px;
  background-color: ${props => props.theme.formBackground};
  border-top: 1px solid ${props => props.theme.borderColor};
`;

const InputContainer = styled.div`
  flex: 1;
  display: flex;
  margin-right: 10px;

  input {
    flex: 1;
    padding: 12px;
    border: 1px solid ${props => props.theme.inputBorder};
    border-radius: 20px;
    font-size: 16px;
    background-color: ${props => props.theme.inputBackground};
    color: ${props => props.theme.textColor};
    transition: all 0.3s ease;

    &:focus {
      outline: none;
      border-color: ${props => props.theme.focusBorderColor};
      box-shadow: 0 0 0 2px ${props => props.theme.focusBoxShadow};
    }
  }
`;

const ButtonContainer = styled.div`
  display: flex;
`;

const Button = styled.button`
  background-color: ${props => props.primary ? props.theme.primaryButtonColor : props.theme.secondaryButtonColor};
  color: ${props => props.primary ? props.theme.primaryButtonText : props.theme.secondaryButtonText};
  border: none;
  padding: 12px 20px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;
  margin-left: 10px;

  &:hover {
    background-color: ${props => props.primary ? props.theme.primaryButtonHover : props.theme.secondaryButtonHover};
    transform: translateY(-2px);
  }

  &:disabled {
    background-color: ${props => props.theme.disabledButtonColor};
    cursor: not-allowed;
    transform: none;
  }

  &:active {
    animation: ${pulse} 0.3s ease-in-out;
  }
`;

const Message = styled.div`
  margin: 10px 0;
  padding: 15px;
  border-radius: 20px;
  max-width: 80%;
  word-wrap: break-word;
  animation: ${slideIn} 0.3s ease-out;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &.user {
    background-color: ${props => props.theme.userMessageBackground};
    color: ${props => props.theme.userMessageText};
    align-self: flex-end;
    margin-left: auto;
  }

  &.assistant {
    background-color: ${props => props.theme.assistantMessageBackground};
    color: ${props => props.theme.assistantMessageText};
    align-self: flex-start;
    border: 1px solid ${props => props.theme.borderColor};
  }

  p {
    margin: 0 0 10px 0;
  }

  ul, ol {
    margin: 0 0 10px 0;
    padding-left: 20px;
  }

  code {
    background-color: ${props => props.theme.codeBackground};
    color: ${props => props.theme.codeText};
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Courier New', Courier, monospace;
  }

  pre {
    background-color: ${props => props.theme.preBackground};
    color: ${props => props.theme.preText};
    padding: 10px;
    border-radius: 5px;
    overflow-x: auto;
    font-family: 'Courier New', Courier, monospace;
  }

  a {
    color: ${props => props.theme.linkColor};
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const AnimatedContent = styled.div`
  animation: ${fadeIn} 0.5s ease-out;
`;

const CitationsSection = styled.div`
  margin-top: 10px;
  font-size: 0.9em;
  border-top: 1px solid ${props => props.theme.borderColor};
  padding-top: 10px;
  color: ${props => props.theme.citationText};

  a {
    color: ${props => props.theme.linkColor};
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const PDFPreviewContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => props.theme.modalOverlay};
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: ${fadeIn} 0.3s ease-out;
`;

const PDFPreview = styled.div`
  background-color: ${props => props.theme.modalBackground};
  padding: 20px;
  border-radius: 10px;
  width: 80%;
  height: 80%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  animation: ${slideIn} 0.3s ease-out;
`;

const PDFEmbed = styled.embed`
  width: 100%;
  height: 100%;
  border: none;
`;

const CloseButton = styled.button`
  align-self: flex-end;
  background-color: ${props => props.theme.closeButtonBackground};
  color: ${props => props.theme.closeButtonText};
  border: none;
  padding: 8px 15px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.theme.closeButtonHover};
    transform: translateY(-2px);
  }
`;

const IconContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
`;

const Icon = styled.span`
  cursor: pointer;
  margin-left: 10px;
  opacity: ${props => props.visible ? 1 : 0};
  transition: all 0.3s ease;
  font-size: 20px;

  &:hover {
    transform: scale(1.2);
  }
`;

function ChatSection({ indexName, isRestricted, onStartResearch }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfPreview, setPDFPreview] = useState(null);
  const [originalQuestion, setOriginalQuestion] = useState('');
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    await sendMessage(input);
  };

  const sendMessage = async (content) => {
    setMessages(prev => [...prev, { role: 'user', content }]);
    setInput('');
    setIsProcessing(true);
    setOriginalQuestion(content);

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content }], index_name: indexName, is_restricted: isRestricted })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '', citations: [] }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0].delta.content) {
                setMessages(prev => {
                  if (window.lastMessage === parsed.choices[0].delta.content) return prev;
                  window.lastMessage = parsed.choices[0].delta.content;
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  lastMessage.content += parsed.choices[0].delta.content;
                  return newMessages;
                });
              }
              if (parsed.choices && parsed.choices[0].delta.context && parsed.choices[0].delta.context.citations) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  lastMessage.citations = parsed.choices[0].delta.context.citations;
                  return newMessages;
                });
              }
            } catch (error) {
              console.error('Error parsing JSON:', error, 'Raw data:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: 'An error occurred while processing your request.', citations: [] }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartResearch = () => {
    if (input.trim()) {
      onStartResearch(input, indexName, isRestricted);
    }
  };

  const handleCitationClick = (citation) => {
    let prefix = "/";
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      prefix = "http://localhost:5000/";
    }

    const pdfUrl = `${prefix}pdf/${indexName}/${encodeURIComponent(citation.filepath)}?is_restricted=${isRestricted}`;
    setPDFPreview(pdfUrl);
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
  };

  const handleRefine = async (message) => {
    if (!message.citations || message.citations.length === 0) return;
    setIsProcessing(true);
    try {
      const response = await fetch('/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.content,
          citations: message.citations,
          index_name: indexName,
          is_restricted: isRestricted,
          original_question: originalQuestion
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '', citations: [] }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0].delta.content) {
                setMessages(prev => {
                  if (window.lastMessage === parsed.choices[0].delta.content) return prev;
                  window.lastMessage = parsed.choices[0].delta.content;
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  lastMessage.content += parsed.choices[0].delta.content;
                  return newMessages;
                });
              }
              if (parsed.choices && parsed.choices[0].delta.context && parsed.choices[0].delta.context.citations) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  lastMessage.citations = parsed.choices[0].delta.context.citations;
                  return newMessages;
                });
              }
            } catch (error) {
              console.error('Error parsing JSON:', error, 'Raw data:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error refining message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderMessage = (message, index) => {
    const renderedContent = message.role === 'assistant'
      ? <div dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} />
      : message.content;

    const isAssistantMessage = message.role === 'assistant';
    const isLastMessage = index === messages.length - 1;

    return (
      <Message key={index} className={message.role}>
        <AnimatedContent>{renderedContent}</AnimatedContent>
        {message.citations && message.citations.length > 0 && (
          <CitationsSection>
            <h4>Citations</h4>
            <ul>
              {message.citations.map((citation, citationIndex) => (
                <li key={citationIndex}>
                  <a href="#" onClick={(e) => { e.preventDefault(); handleCitationClick(citation); }}>
                    {citation.title}
                  </a> [doc{citationIndex+1}]
                </li>
              ))}
            </ul>
          </CitationsSection>
        )}
        {isAssistantMessage && (
          <IconContainer>
            <Icon 
              onClick={() => handleCopy(message.content)} 
              title="Copy"
              visible={isLastMessage}
            >
              📋
            </Icon>
            <Icon 
              onClick={() => handleRefine(message)} 
              title="Refine"
              visible={isLastMessage}
            >
              🔍
            </Icon>
          </IconContainer>
        )}
      </Message>
    );
  };

  return (
    <ChatContainer>
      <MessagesContainer ref={messagesContainerRef}>
        {messages.map(renderMessage)}
      </MessagesContainer>
      <MessageForm onSubmit={handleSubmit}>
        <InputContainer>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isProcessing}
          />
        </InputContainer>
        <ButtonContainer>
          <Button type="submit" disabled={isProcessing} primary>Send</Button>
          <Button type="button" onClick={handleStartResearch} disabled={isProcessing || !input.trim()}>
            🕵️ Start Research
          </Button>
        </ButtonContainer>
      </MessageForm>
      {pdfPreview && (
        <PDFPreviewContainer>
          <PDFPreview>
            <CloseButton onClick={() => setPDFPreview(null)}>Close</CloseButton>
            <PDFEmbed src={pdfPreview} type="application/pdf" />
          </PDFPreview>
        </PDFPreviewContainer>
      )}
    </ChatContainer>
  );
}

const formatMessage = (content) => {
  let formatted = sanitizeHTML(content);
  
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  formatted = formatted.replace(/^(#{1,6})\s(.+)/gm, (match, hashes, title) => {
    const level = hashes.length;
    return `<h${level}>${title}</h${level}>`;
  });
  formatted = formatted.replace(/\n/g, '<br>');
  formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  return formatted;
};

const sanitizeHTML = (str) => {
  return str.replace(/[&<>"']/g, (match) => {
    const escape = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escape[match];
  });
};

export { formatMessage };

export default ChatSection;