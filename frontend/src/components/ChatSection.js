import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

const ChatContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  background: #eaeaea;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
`;

const MessageForm = styled.form`
  display: flex;

  input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  button {
    background-color: #0078D7;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 10px;
  }
`;

const flyInAnimation = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Message = styled.div`
  margin: 10px 0;
  padding: 10px;
  border-radius: 4px;
  max-width: 70%;
  word-wrap: break-word;

  &.user {
    background-color: #0078D7;
    color: white;
    align-self: flex-end;
    margin-left: auto;
  }

  &.assistant {
    background-color: #f1f1f1;
    align-self: flex-start;
  }
`;

const AnimatedSpan = styled.span`
  display: inline-block;
  opacity: ${props => props.visible ? 1 : 0};
  animation: ${props => props.visible ? flyInAnimation : 'none'} 0.1s ease-out forwards;
`;

const CitationsSection = styled.div`
  margin-top: 10px;
  font-size: 0.9em;
  opacity: 0;
  animation: ${flyInAnimation} 0.3s forwards;
  animation-delay: 0.2s;
`;

const PDFPreviewContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const PDFPreview = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 80%;
  height: 80%;
  display: flex;
  flex-direction: column;
`;

const PDFEmbed = styled.embed`
  width: 100%;
  height: 100%;
  border: none;
`;

const CloseButton = styled.button`
  align-self: flex-end;
  background-color: #0078D7;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 10px;
`;

const LoadingSpinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #0078D7;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: auto;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const splitTextAndEmoji = (text) => {
  return Array.from(text.matchAll(/\p{Extended_Pictographic}|\S|\s/gu)).map(m => m[0]);
};

function ChatSection() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfPreview, setPDFPreview] = useState(null);
  const [isLoadingPDF, setIsLoadingPDF] = useState(false);
  const messagesContainerRef = useRef(null);
  const animationQueueRef = useRef([]);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    const storedMessages = localStorage.getItem('chatHistory');
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages).map(msg => ({
        ...msg,
        animatedContent: msg.content,
        isAnimating: false
      })));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const animateText = () => {
    if (animationQueueRef.current.length > 0) {
      const { messageIndex, char } = animationQueueRef.current.shift();
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];
        const message = newMessages[messageIndex];
        message.animatedContent += char;
        return newMessages;
      });
      requestAnimationFrame(animateText);
    } else {
      isAnimatingRef.current = false;
    }
  };

  const queueTextAnimation = (messageIndex, text) => {
    const chars = text.split('');
    chars.forEach(char => {
      animationQueueRef.current.push({ messageIndex, char });
    });
    if (!isAnimatingRef.current) {
      isAnimatingRef.current = true;
      requestAnimationFrame(animateText);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    setMessages(prev => [...prev, { role: 'user', content: input, animatedContent: input, isAnimating: false }]);
    setInput('');
    setIsProcessing(true);

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: input }] })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '', animatedContent: '', isAnimating: true }]);

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
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  lastMessage.content += parsed.choices[0].delta.content;
                  queueTextAnimation(newMessages.length - 1, parsed.choices[0].delta.content);
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
        { role: 'assistant', content: 'An error occurred while processing your request.', animatedContent: 'An error occurred while processing your request.', isAnimating: false }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCitationClick = async (citation) => {
    setIsLoadingPDF(true);
    try {
      const response = await fetch(`http://localhost:5000/references/${encodeURIComponent(citation.filepath)}`);
      if (response.ok) {
        const pdfContent = await response.text();
        setPDFPreview(pdfContent);
      } else {
        console.error('Error fetching PDF:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching PDF:', error);
    } finally {
      setIsLoadingPDF(false);
    }
  };

  const renderMessage = (message, index) => {
    return (
      <Message key={index} className={message.role}>
        {splitTextAndEmoji(message.animatedContent).map((char, charIndex) => (
          <AnimatedSpan key={charIndex} visible={true}>
            {char === ' ' ? '\u00A0' : char}
          </AnimatedSpan>
        ))}
        {message.citations && message.citations.length > 0 && (
          <CitationsSection>
            <h4>Citations</h4>
            <ul>
              {message.citations.map((citation, citationIndex) => (
                <li key={citationIndex}>
                  <a href="#" onClick={() => handleCitationClick(citation)}>{citation.title}</a> [doc{citationIndex}]
                </li>
              ))}
            </ul>
          </CitationsSection>
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
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isProcessing}
        />
        <button type="submit" disabled={isProcessing}>Send</button>
      </MessageForm>
      {(pdfPreview || isLoadingPDF) && (
        <PDFPreviewContainer>
          <PDFPreview>
            <CloseButton onClick={() => {setPDFPreview(null); setIsLoadingPDF(false);}}>Close</CloseButton>
            {isLoadingPDF ? (
              <LoadingSpinner />
            ) : (
              <PDFEmbed src={`data:application/pdf;base64,${pdfPreview}`} type="application/pdf" />
            )}
          </PDFPreview>
        </PDFPreviewContainer>
      )}
    </ChatContainer>
  );
}

export default ChatSection;