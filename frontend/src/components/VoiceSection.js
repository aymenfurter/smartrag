import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, useTheme } from 'styled-components';

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
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const dissolveIn = keyframes`
  0% { opacity: 0; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
`;

const VoiceChatContainer = styled.div`
  font-family: 'Roboto', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: ${props => props.theme.backgroundColor};
  color: ${props => props.theme.textColor};
`;

const AICircle = styled.div`
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background-color: ${props => props.theme.aiCircleBackground};
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.5rem;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  &.thinking .circle-animation {
    opacity: 1;
  }

  &.listening {
    background-color: ${props => props.theme.aiCircleListeningBackground};
    border: 3px solid ${props => props.theme.aiCircleBorder};
  }

  @media (max-width: 600px) {
    width: 140px;
    height: 140px;
  }
`;

const CircleAnimation = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid ${props => props.theme.aiCircleBackground};
  border-top-color: ${props => props.theme.aiCircleBorder};
  animation: ${rotate} 1s linear infinite;
  opacity: 0;
  transition: opacity 0.3s ease;
`;

const StatusText = styled.div`
  font-size: 1rem;
  font-weight: 400;
  margin-bottom: 1.5rem;
  color: ${props => props.theme.statusTextColor};
`;

const Button = styled.button`
  background-color: ${props => props.theme.buttonBackground};
  color: ${props => props.theme.buttonText};
  border: none;
  padding: 12px;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.1s;
  margin: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);

  &:hover {
    background-color: ${props => props.theme.buttonHover};
  }

  &:active {
    transform: scale(0.95);
  }

  &.recording {
    background-color: ${props => props.theme.recordingButtonBackground};
  }

  &.start-btn {
    animation: ${dissolveIn} 1s ease-in-out;
  }
`;

const Icon = styled.svg`
  width: 20px;
  height: 20px;
  transition: transform 0.3s;
  fill: ${props => props.theme.iconColor};

  ${Button}:hover & {
    transform: scale(1.1);
  }
`;

const ChatContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: ${props => props.theme.chatBackground};
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 320px;
  max-height: 450px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  overflow: hidden;

  &.hidden {
    transform: translateY(100%);
    opacity: 0;
  }

  @media (max-width: 600px) {
    width: 90%;
    left: 5%;
    right: 5%;
  }
`;

const ChatMessages = styled.div`
  display: none;
  height: 350px;
  overflow-y: auto;
  padding: 1rem;
  border: 1px solid ${props => props.theme.chatBorder};
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const Message = styled.div`
  margin-bottom: 0.8rem;
  padding: 0.8rem;
  border-radius: 8px;
  max-width: 85%;
  animation: ${fadeIn} 0.3s;

  &.user {
    background-color: ${props => props.theme.userMessageBackground};
    align-self: flex-end;
    margin-left: auto;
  }

  &.assistant {
    background-color: ${props => props.theme.assistantMessageBackground};
    align-self: flex-start;
  }

  &.system {
    background-color: ${props => props.theme.systemMessageBackground};
    text-align: center;
    font-style: italic;
    max-width: 100%;
    color: ${props => props.theme.systemMessageColor};
  }
`;

const StopButton = styled.button`
  width: 100%;
  padding: 0.8rem;
  background-color: ${props => props.theme.stopButtonBackground};
  color: ${props => props.theme.stopButtonText};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${props => props.theme.stopButtonHover};
  }
`;


function VoiceSection({ indexName, isRestricted }) {
    const theme = useTheme();
    const [messages, setMessages] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('Ready');
    const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
    const [isChatVisible, setIsChatVisible] = useState(true);
    const [isStarted, setIsStarted] = useState(false);
    const messagesContainerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const microphoneRef = useRef(null);
    const currentAudioRef = useRef(null);
    const wordCountRef = useRef(0);
    const audioCtxRef = useRef(null);
  
    const silenceThreshold = -50; // dB
    const shortPhraseThreshold = 3;
    const shortPhraseSilenceDuration = 1000; // 1 second
    const longPhraseSilenceDuration = 500; // 0.5 seconds
  
    useEffect(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, [messages]);
  
    useEffect(() => {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      return () => {
        if (audioCtxRef.current) {
          audioCtxRef.current.close();
        }
      };
    }, []);
  
    const playTone = (frequency, duration) => {
      console.log(`Playing tone: ${frequency}Hz for ${duration}s`);
      const oscillator = audioCtxRef.current.createOscillator();
      const gainNode = audioCtxRef.current.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioCtxRef.current.currentTime);
      
      gainNode.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtxRef.current.destination);
      
      oscillator.start();
      oscillator.stop(audioCtxRef.current.currentTime + duration);
    };
  
    const updateStatus = (newStatus) => {
      console.log(`Updating status to: ${newStatus}`);
      setStatus(newStatus);
      switch (newStatus) {
        case 'Listening':
          playTone(880, 0.1); // Play A5 for 100ms
          break;
        case 'Thinking':
          playTone(440, 0.1); // Play A4 for 100ms
          break;
        default:
          break;
      }
    };
  
    const startInteraction = () => {
      console.log('Starting interaction');
      setIsStarted(true);
      getIntroMessage();
    };
  
    const getIntroMessage = async () => {
      console.log('Getting intro message');
      updateStatus('Thinking');
      try {
        const response = await fetch('/intro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        addMessageToChat('assistant', data.response);
        updateStatus('Speaking');
        await playAudioResponse(data.audio);
        updateStatus('Listening');
        startRecording();
      } catch (error) {
        console.error('Error in getIntroMessage:', error);
        addMessageToChat('assistant', `Sorry, there was an error: ${error.message}`);
        updateStatus('Listening');
      }
    };
  
    const addMessageToChat = (sender, message) => {
      setMessages(prev => [...prev, { role: sender, content: message }]);
    };
  
    const playAudioResponse = (audioBase64) => {
      console.log('Playing audio response');
      return new Promise((resolve) => {
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        currentAudioRef.current = audio;
        setIsAssistantSpeaking(true);
        
        audio.addEventListener('ended', () => {
          setIsAssistantSpeaking(false);
          resolve();
        });
        
        audio.play();
      });
    };
  
    const startRecording = async () => {
      console.log('Starting recording');
      if (isRecording) {
        console.log('Already recording, skipping');
        return;
      }
  
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
        microphoneRef.current.connect(analyserRef.current);
        
        analyserRef.current.fftSize = 2048;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
  
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        wordCountRef.current = 0;
  
        mediaRecorderRef.current.addEventListener("dataavailable", event => {
          audioChunksRef.current.push(event.data);
        });
  
        mediaRecorderRef.current.addEventListener("stop", async () => {
          console.log('MediaRecorder stopped');
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          await sendAudioToServer(audioBlob);
        });
  
        mediaRecorderRef.current.start(100);
        setIsRecording(true);
        updateStatus('Listening');
  
        detectSilence(dataArray, bufferLength, silenceThreshold);
      } catch (error) {
        console.error('Error starting recording:', error);
        alert('Unable to access the microphone. Please make sure it\'s connected and you\'ve granted permission.');
      }
    };
  
    const detectSilence = (dataArray, bufferLength, threshold) => {
      console.log('Detecting silence');
      let silenceStart = performance.now();
      let silenceDetected = false;
      let lastSpeechTime = performance.now();
      let hasSpokeAtLeastOneWord = false;
  
      function checkAudioLevel() {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for(let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        let average = sum / bufferLength;
        let dB = 20 * Math.log10(average / 255);
  
        if (dB < threshold) {
          if (!silenceDetected) {
            silenceDetected = true;
            silenceStart = performance.now();
          } else {
            let currentSilenceDuration = performance.now() - silenceStart;
            let requiredSilenceDuration;
  
            if (wordCountRef.current > shortPhraseThreshold) {
              requiredSilenceDuration = longPhraseSilenceDuration;
            } else if (hasSpokeAtLeastOneWord) {
              requiredSilenceDuration = shortPhraseSilenceDuration;
            } else {
              requiredSilenceDuration = Infinity;
            }
  
            if (currentSilenceDuration > requiredSilenceDuration) {
              console.log('Silence detected, stopping recording');
              stopRecording();
              return;
            }
          }
        } else {
          silenceDetected = false;
          lastSpeechTime = performance.now();
          hasSpokeAtLeastOneWord = true;
        }
  
        if (isRecording) {
          requestAnimationFrame(checkAudioLevel);
        }
      }
  
      checkAudioLevel();
    };
  
    const stopRecording = () => {
      console.log('Stopping recording');
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        updateStatus('Thinking');
        
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      }
    };
  
    const sendAudioToServer = async (audioBlob) => {
      console.log('Sending audio to server');
      updateStatus('Thinking');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('index_name', indexName);
      formData.append('is_restricted', isRestricted.toString());
      formData.append('conversation_history', JSON.stringify(messages));
  
      try {
        const response = await fetch('/voice_chat', {
          method: 'POST',
          body: formData
        });
  
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
        const data = await response.json();
        if (data.error) throw new Error(data.error);
  
        if (data.user_text.trim()) {
          addMessageToChat('user', data.user_text);
          wordCountRef.current = data.user_text.trim().split(/\s+/).length;
          addMessageToChat('assistant', data.response);
          updateStatus('Speaking');
          await playAudioResponse(data.audio);
          updateStatus('Listening');
          startRecording();
        } else {
          console.log('No text detected, starting recording again');
          startRecording();
        }
      } catch (error) {
        console.error('Error in sendAudioToServer:', error);
        addMessageToChat('system', `Sorry, there was an error processing your speech: ${error.message}`);
        startRecording();
      }
    };
  
    const toggleRecording = () => {
      console.log('Toggling recording');
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };
  
    const stopAssistant = () => {
      console.log('Stopping assistant');
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
      setIsAssistantSpeaking(false);
      updateStatus('Listening');
    };
  
    const toggleChatVisibility = () => {
      setIsChatVisible(!isChatVisible);
    };
  
    return (
      <VoiceChatContainer>
        <AICircle className={status.toLowerCase()}>
          <CircleAnimation className="circle-animation" />
        </AICircle>
        <StatusText>{status}</StatusText>
        {!isStarted ? (
          <Button className="start-btn" onClick={startInteraction}>
            <Icon viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </Icon>
          </Button>
        ) : (
          <>
            <Button onClick={toggleRecording} className={isRecording ? 'recording' : ''}>
              <Icon viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </Icon>
            </Button> 
          </>
        )}
        <ChatContainer className={isChatVisible ? '' : 'hidden'}>
          <ChatMessages ref={messagesContainerRef}>
            {messages.map((message, index) => (
              <Message key={index} className={message.role}>
                {message.content}
              </Message>
            ))}
          </ChatMessages>
          {isAssistantSpeaking && (
            <StopButton onClick={stopAssistant}>Stop Assistant</StopButton>
          )}
        </ChatContainer>
      </VoiceChatContainer>
    );
  }
  
  export default VoiceSection;
