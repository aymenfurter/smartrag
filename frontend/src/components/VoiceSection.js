
import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const universeAnimation = keyframes`
  0% { transform: translate(0, 0); }
  50% { transform: translate(-10px, -10px); }
  100% { transform: translate(0, 0); }
`;

const VoiceChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  padding: 40px;
  background-color: ${props => props.theme.backgroundColor || '#f0f2f5'};
  font-family: 'Roboto', 'Arial', sans-serif;
  transition: all 0.3s ease;
`;

const AIRing = styled.div`
  width: 300px;
  height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
  transition: all 0.5s ease-out;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  animation: ${fadeIn} 1s ease-out, ${pulseAnimation} 2s infinite;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    right: -50%;
    bottom: -50%;
    background: ${props => props.ringBackground || 'radial-gradient(circle, #4da6ff 0%, #0066cc 100%)'};
    opacity: 0.7;
    animation: ${universeAnimation} 20s infinite;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px);
    background-size: 15px 15px;
    animation: ${universeAnimation} 40s infinite;
  }

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 600px) {
    width: 250px;
    height: 250px;
  }
`;

const WaveContainer = styled.div`
  position: absolute;
  width: 80%;
  height: 80%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
`;

const WaveBar = styled.div`
  position: absolute;
  width: 4px;
  background-color: rgba(255, 255, 255, 0.8);
  margin: 0 2px;
  border-radius: 2px;
  transition: height 0.1s ease;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
`;

const StatusText = styled.div`
  font-size: 1.8rem;
  font-weight: 600;
  margin-top: 2.5rem;
  color: ${props => props.theme.titleColor || '#333'};
  text-transform: uppercase;
  letter-spacing: 3px;
  text-align: center;
  animation: ${slideIn} 0.5s ease-out;
  transition: all 0.3s ease;

  &::after {
    content: '';
    display: block;
    width: 50px;
    height: 3px;
    background-color: ${props => props.theme.primaryButtonColor || '#0066cc'};
    margin: 10px auto 0;
    transition: width 0.3s ease;
  }

  &:hover::after {
    width: 100px;
  }
`;

const Message = styled.div`
  padding: 15px 20px;
  border-radius: 20px;
  max-width: 80%;
  word-wrap: break-word;
  animation: ${slideIn} 0.3s ease-out;
  font-size: 1rem;
  line-height: 1.5;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  background-color: ${props => 
    props.isUser 
      ? props.theme.userMessageBackground || '#e1f5fe' 
      : props.theme.assistantMessageBackground || '#f0f4f8'
  };
  color: ${props => props.theme.textColor || '#333'};
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  border-bottom-right-radius: ${props => props.isUser ? '5px' : '20px'};
  border-bottom-left-radius: ${props => props.isUser ? '20px' : '5px'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
  }
`;

const GlowEffect = keyframes`
  0% { box-shadow: 0 0 5px rgba(77, 166, 255, 0.5); }
  50% { box-shadow: 0 0 20px rgba(77, 166, 255, 0.8); }
  100% { box-shadow: 0 0 5px rgba(77, 166, 255, 0.5); }
`;

const AIRingInner = styled.div`
  width: 90%;
  height: 90%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
  display: flex;
  justify-content: center;
  align-items: center;
  animation: ${GlowEffect} 2s infinite;
`;

const AIIcon = styled.div`
  font-size: 3rem;
  color: white;
  text-shadow: 0 0 10px rgba(255,255,255,0.5);
`;

const WaveAnimation = keyframes`
  0% { transform: scaleY(1); }
  50% { transform: scaleY(0.5); }
  100% { transform: scaleY(1); }
`;

const ActiveWaveBar = styled(WaveBar)`
  animation: ${WaveAnimation} 0.5s infinite;
  animation-delay: ${props => props.delay}s;
`;
class VoiceSectionJS {
  constructor(indexName, isRestricted, elements, updateConversationHistory, onAudioLevelChange, setRingBackground) {
    this.indexName = indexName;
    this.isRestricted = isRestricted;
    this.isRecording = false;
    this.isAssistantSpeaking = false;
    this.currentAudio = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.conversationHistory = [];
    this.silenceThreshold = -50; // dB
    this.silenceDuration = 3000; // 3 seconds
    this.maxRecordingDuration = 30000; // 30 seconds
    this.recordingTimeout = null;
    this.setRingBackground = setRingBackground;

    this.elements = elements;
    this.updateConversationHistory = updateConversationHistory;
    this.onAudioLevelChange = onAudioLevelChange;

    this.bindEvents();
    this.startConversation();
  }

  bindEvents() {
    this.elements.aiRing.addEventListener('click', () => this.handleRingClick());
  }

  handleRingClick() {
    if (this.isAssistantSpeaking) {
      this.stopAssistant();
    } else if (!this.isRecording) {
      this.startRecording();
    } else {
      this.stopRecording();
    }
  }

  updateStatus(status) {

    if (status !== 'Silent') {
      this.elements.statusText.textContent = status;
    }
    
    let backgroundColor;
    switch (status) {
      case 'Listening':
      case 'Silent':
        backgroundColor = 'radial-gradient(circle, #4da6ff 0%, #0066cc 100%)';
        break;
      case 'Speaking':
        backgroundColor = 'radial-gradient(circle, #33C3F0 0%, #2980B9 100%)';
        break;
      default:
        backgroundColor = 'radial-gradient(circle, #a0a0a0 0%, #404040 100%)';
    }
    this.setRingBackground(backgroundColor);
  }

  async startConversation() {
    this.updateStatus('Thinking');
    try {
      const response = await fetch('/intro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          index_name: this.indexName,
          is_restricted: this.isRestricted,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      this.conversationHistory.push({ role: 'assistant', content: data.response });
      this.updateConversationHistory(this.conversationHistory);
      this.updateStatus('Speaking');
      await this.playAudioResponse(data.audio);
      this.updateStatus('Listening');
      this.startRecording();
    } catch (error) {
      console.error('Error starting conversation:', error);
      this.updateStatus(`Error: ${error.message}`);
    }
  }

  analyzeAudio(audioContext, sourceNode) {
    const analyser = audioContext.createAnalyser();
    sourceNode.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
  
    const updateAudioLevel = () => {
      if (!this.isRecording && !this.isAssistantSpeaking) {
        this.updateAudioLevel(0);
        return;
      }
  
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const normalizedLevel = average / 255;
      
      this.updateAudioLevel(normalizedLevel);
  
      if (this.isRecording || this.isAssistantSpeaking) {
        requestAnimationFrame(updateAudioLevel);
      }
    };
  
    updateAudioLevel();
  }
  updateAudioLevel(level) {
    if (this.onAudioLevelChange) {
      this.onAudioLevelChange(level);
    }
  }

  async startRecording() {
    if (this.isRecording) return;
  
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const sourceNode = this.audioContext.createMediaStreamSource(stream);
      
      this.isRecording = true;  // Set this before analyzing audio
      this.analyzeAudio(this.audioContext, sourceNode);

      this.analyser = this.audioContext.createAnalyser();
      this.microphone = sourceNode;
      this.microphone.connect(this.analyser);
      
      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.addEventListener("dataavailable", event => {
        this.audioChunks.push(event.data);
      });

      this.mediaRecorder.addEventListener("stop", async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        await this.sendAudioToServer(audioBlob);
      });

      this.mediaRecorder.start(100);
      this.isRecording = true;
      this.updateStatus('Listening');

      this.detectSilence(dataArray, bufferLength, this.silenceThreshold);
      this.animateWaveform(dataArray, bufferLength);

      // Set a maximum recording duration
      this.recordingTimeout = setTimeout(() => {
        if (this.isRecording) {
          this.stopRecording();
        }
      }, this.maxRecordingDuration);

    } catch (error) {
      console.error('Error starting recording:', error);
      this.updateStatus(`Error: Unable to access the microphone`);
    }
  }

 
  detectSilence(dataArray, bufferLength, threshold) {
    let silenceStart = performance.now();
    let silenceDetected = false;
  
    const checkAudioLevel = () => {
      if (!this.isRecording) return;
  
      this.analyser.getByteFrequencyData(dataArray);
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
          if (currentSilenceDuration > this.silenceDuration) {
            this.stopRecording();
            return;
          }
        }
        if (performance.now() - silenceStart > 500) {
          this.updateStatus('Silent');
        }
      } else {
        silenceDetected = false;
        this.updateStatus('Listening');
      }
  
      requestAnimationFrame(checkAudioLevel);
    };
  
    checkAudioLevel();
  }

  animateWaveform(dataArray, bufferLength) {
    const animate = () => {
      if (!this.isRecording) return;

      this.analyser.getByteFrequencyData(dataArray);
      const bars = this.elements.waveBars;
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      for (let i = 0; i < bars.length; i++) {
        bars[i].style.height = `${Math.max(5, (average / 255) * 100)*2}px`;
      }

      requestAnimationFrame(animate);
    };

    animate();
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.updateStatus('Thinking');
      
      if (this.audioContext) {
        this.audioContext.close();
      }

      clearTimeout(this.recordingTimeout);
    }
  }

  async sendAudioToServer(audioBlob) {
    this.updateStatus('Thinking');
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('index_name', this.indexName);
    formData.append('is_restricted', this.isRestricted.toString());
    formData.append('conversation_history', JSON.stringify(this.conversationHistory));

    try {
      const response = await fetch('/voice_chat', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.user_text.trim()) {
        this.conversationHistory.push({ role: 'user', content: data.user_text });
        this.conversationHistory.push({ role: 'assistant', content: data.response });
        this.updateConversationHistory(this.conversationHistory);
        this.updateStatus('Speaking');
        await this.playAudioResponse(data.audio);
        this.updateStatus('Listening');
        this.startRecording();
      } else {
        this.startRecording();
      }
    } catch (error) {
      console.error('Error in sendAudioToServer:', error);
      this.updateStatus(`Error: ${error.message}`);
      setTimeout(() => this.startRecording(), 3000);
    }
  }

  async playAudioResponse(audioBase64) {
    return new Promise((resolve) => {
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      this.currentAudio = audio;
      this.isAssistantSpeaking = true;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const sourceNode = audioContext.createMediaElementSource(audio);
      sourceNode.connect(audioContext.destination);
      
      this.analyzeAudio(audioContext, sourceNode);
      
      audio.addEventListener('ended', () => {
        this.isAssistantSpeaking = false;
        this.updateStatus('Listening');
        resolve();
      });
      
      audio.play();
    });
  }

  stopAssistant() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    this.isAssistantSpeaking = false;
    this.updateStatus('Listening');
    this.startRecording();
  }
}



function VoiceSection({ indexName, isRestricted }) {
  const voiceSectionRef = useRef(null);
  const elementsRef = useRef({});
  const [conversationHistory, setConversationHistory] = useState([]);
  const [status, setStatus] = useState('Ready');
  const [audioLevel, setAudioLevel] = useState(0);
  const [ringBackground, setRingBackground] = useState('radial-gradient(circle, #a0a0a0 0%, #404040 100%)');

  useEffect(() => {
    if (voiceSectionRef.current) return;

    const aiRing = document.querySelector('.ai-ring');
    const statusText = document.querySelector('.status-text');
    const waveBars = Array.from(document.querySelectorAll('.wave-bar'));

    const elements = {
      aiRing,
      statusText,
      waveBars
    };

    elementsRef.current = elements;
    voiceSectionRef.current = new VoiceSectionJS(
      indexName, 
      isRestricted, 
      elements, 
      (history) => {
        setConversationHistory(history);
      },
      (level) => {
        setAudioLevel(level);
      },
      (newBackground) => {
        setRingBackground(newBackground);
        setStatus(elements.statusText.textContent);
      }
    );
  }, [indexName, isRestricted]);

  const isListening = status === 'Listening';
  const isSpeaking = status === 'Speaking';

  return (
    <VoiceChatContainer>
      <AIRing 
        className="ai-ring" 
        isListening={isListening}
        isSpeaking={isSpeaking}
        ringBackground={ringBackground}
      >
        <WaveContainer>
          {[...Array(20)].map((_, index) => (
            <WaveBar 
              key={index} 
              className="wave-bar" 
              style={{
                height: `${5 + audioLevel * 50}px`,
                transform: `rotate(${index * 18}deg) translateY(-100px)`
              }}
            />
          ))}
        </WaveContainer>
        <AIRingInner>
        </AIRingInner>
      </AIRing>
      <StatusText className="status-text">
        {isListening ? 'Listening' : status}
      </StatusText>
    </VoiceChatContainer>
  );
}

export default VoiceSection;
