import styled, { keyframes } from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

// Layout Components
export const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 50px;
  background-color: ${props => props.theme.backgroundColor};
`;

export const ResultsContainer = styled.div`
  background-color: ${props => props.theme.cardBackground};
  padding: 30px;
  border-radius: 20px;
  border: 1px solid ${props => props.theme.borderColor};
  animation: ${fadeIn} 0.5s ease-out;
`;

export const ConclusionContainer = styled.div`
  background-color: ${props => props.theme.conclusionBackground};
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 30px;
  border: 1px solid ${props => props.theme.borderColor};
`;

export const ResearchDataSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 50px;
  margin-bottom: 30px;
`;

// Form Components
export const ResearchForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-color: ${props => props.theme.cardBackground};
  padding: 30px;
  border-radius: 20px;
  border: 1px solid ${props => props.theme.borderColor};
`;

export const Input = styled.input`
  padding: 12px;
  border: 1px solid ${props => props.theme.inputBorder};
  border-radius: 10px;
  font-size: 16px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.textColor};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primaryButtonColor};
  }
`;

export const Select = styled.select`
  padding: 12px;
  border: 1px solid ${props => props.theme.inputBorder};
  border-radius: 10px;
  font-size: 16px;
  background-color: ${props => props.theme.inputBackground};
  color: ${props => props.theme.textColor};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.primaryButtonColor};
  }
`;

// Button Components
export const Button = styled.button`
  background-color: ${props => props.theme.primaryButtonColor};
  color: ${props => props.theme.primaryButtonText};
  border: none;
  padding: 12px 25px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.theme.primaryButtonHover};
  }

  &:disabled {
    background-color: ${props => props.theme.disabledButtonColor};
    color: ${props => props.theme.disabledButtonText};
    cursor: not-allowed;
  }
`;

export const IconButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: ${props => props.theme.iconColor};
  margin-left: 10px;
  transition: color 0.3s ease;

  &:hover {
    color: ${props => props.theme.iconHoverColor};
  }
`;

export const NewResearchButton = styled(Button)`
  margin-top: 30px;
`;

// Data Source Components
export const DataSourceContainer = styled.div`
  background-color: ${props => props.theme.cardBackground};
  padding: 20px;
  border-radius: 10px;
  border: 1px solid ${props => props.theme.borderColor};
`;

export const DataSourceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

// Graph and Visualization Components
export const GraphContainer = styled.div`
  background-color: ${props => props.theme.cardBackground};
  border-radius: 15px;
  padding: 20px;
  border: 1px solid ${props => props.theme.borderColor};
  height: 400px;
`;

export const TreeContainer = styled.div`
  margin-bottom: 30px;
  height: 400px;
  background-color: ${props => props.theme.cardBackground};
  border-radius: 15px;
  padding: 20px;
  border: 1px solid ${props => props.theme.borderColor};
  
  .vis-network {
    height: 100%;
  }
`;

// Document Components
export const TopDocumentsContainer = styled.div`
  background-color: ${props => props.theme.cardBackground};
  border-radius: 15px;
  padding: 20px;
  border: 1px solid ${props => props.theme.borderColor};
`;

export const TopDocumentsTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 10px;

  th, td {
    padding: 10px;
    text-align: left;
    border-bottom: 1px solid ${props => props.theme.borderColor};
  }

  th {
    font-weight: bold;
    color: ${props => props.theme.titleColor};
  }

  tr:hover {
    background-color: ${props => props.theme.tableRowHover};
  }
`;

// Event Log Components
export const EventLogContainer = styled.div`
  background-color: ${props => props.theme.cardBackground};
  border-radius: 15px;
  padding: 20px;
  border: 1px solid ${props => props.theme.borderColor};
  margin-top: 30px;
`;

export const EventLog = styled.div`
  max-height: 600px;
  overflow-y: auto;
  padding: 10px;
  background-color: ${props => props.theme.eventLogBackground};
  border-radius: 10px;
`;

export const EventItem = styled.div`
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 5px;
  background-color: ${props => props.theme.eventItemBackground};
  border-left: 4px solid ${props => props.theme.eventItemBorder};
`;

// Message Components
export const Message = styled.div`
  margin: 10px 0;
  padding: 15px;
  border-radius: 20px;
  max-width: 80%;
  word-wrap: break-word;
  animation: ${slideIn} 0.3s ease-out;
  background-color: ${props => props.isUser ? props.theme.userMessageBackground : props.theme.assistantMessageBackground};
  color: ${props => props.theme.textColor};
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  border: 1px solid ${props => props.theme.borderColor};
`;

// PDF Preview Components
export const PDFPreviewContainer = styled.div`
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

export const PDFPreview = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  width: 80%;
  height: 80%;
  display: flex;
  flex-direction: column;
`;

export const PDFEmbed = styled.embed`
  width: 100%;
  height: 100%;
  border: none;
`;

// Typography Components
export const SectionTitle = styled.h3`
  color: ${props => props.theme.titleColor};
  font-size: 20px;
  margin-bottom: 15px;
`;

export const ConclusionContent = styled.div`
  color: ${props => props.theme.textColor};
  font-size: 16px;
  line-height: 1.6;

  p {
    margin-bottom: 10px;
  }

  ul, ol {
    margin-left: 20px;
    margin-bottom: 10px;
  }
`;

// Link Components
export const StyledLink = styled.a`
  color: ${props => props.theme.linkColor};
  text-decoration: none;
  position: relative;
  transition: color 0.3s ease;

  &:hover {
    color: ${props => props.theme.linkHoverColor};
  }

  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 2px;
    bottom: -2px;
    left: 0;
    background-color: ${props => props.theme.linkUnderlineColor};
    visibility: hidden;
    transform: scaleX(0);
    transition: all 0.3s ease-in-out;
  }

  &:hover::after {
    visibility: visible;
    transform: scaleX(1);
  }
`;

// Utility Components
export const SearchHighlight = styled.span`
  background-color: ${props => props.theme.highlightBackground};
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: bold;
`;

export const SwitchContainer = styled.div`
  background-color: ${props => props.theme.cardBackground};
  padding: 20px;
  border-radius: 10px;
  border: 1px solid ${props => props.theme.borderColor};
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const Checkbox = styled.input`
  cursor: pointer;
  width: 20px;
  height: 20px;
`;

// Pagination Components
export const PaginationContainer = styled.nav`
  display: flex;
  justify-content: center;
  margin-top: 20px;
`;

export const PaginationList = styled.ul`
  display: flex;
  list-style-type: none;
  padding: 0;
`;

export const PaginationItem = styled.li`
  margin: 0 5px;
`;

export const PaginationLink = styled.a`
  color: ${props => props.theme.buttonTextColor};
  background-color: ${props => props.active ? props.theme.paginationActiveBackground : props.theme.paginationBackground};
  padding: 8px 12px;
  border-radius: 5px;
  text-decoration: none;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${props => props.theme.paginationHoverBackground};
  }
`;

// Icon Components
export const StyledFontAwesomeIcon = styled(FontAwesomeIcon)`
  margin-right: 8px;
`;

// Conversation Components
export const ConversationContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-height: 600px;
  overflow-y: auto;
  padding: 20px;
  background-color: ${props => props.theme.conversationBackground};
  border-radius: 15px;
  border: 1px solid ${props => props.theme.borderColor};
  margin-top: 30px;
`;

export const UpdateContainer = styled.div`
  background-color: ${props => props.theme.updateBackground};
  color: ${props => props.theme.textColor};
  padding: 15px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  border: 1px solid ${props => props.theme.borderColor};
`;

export const CloseButton = styled(Button)`
  align-self: flex-end;
`;


export const ResearchButton = styled.button`
  width: 100%;
  padding: 1rem 2rem;
  background: ${props => props.theme.primaryColor || '#0066cc'};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 2rem;

  &:hover {
    background: ${props => props.theme.primaryColorHover || '#0052a3'};
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

export const TabPanel = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 1rem;
  padding: 0.5rem 0;
  margin: 1rem 0;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 4px;
  }
`;

export const TabButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: ${props => props.active ? props.theme.primaryColor || '#0066cc' : '#f0f0f0'};
  color: ${props => props.active ? 'white' : '#333'};
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: ${props => props.active ? '600' : '400'};
  white-space: nowrap;

  &:hover {
    background: ${props => props.active ? props.theme.primaryColor || '#0066cc' : '#e0e0e0'};
  }
`;

export const MetricBox = styled.div`
  padding: 1.25rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .title {
    font-size: 0.875rem;
    color: #666;
  }

  .value {
    font-size: 1.5rem;
    font-weight: 600;
    color: ${props => props.theme.primaryColor || '#0066cc'};
  }
`;

export const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: #eee;
  border-radius: 2px;
  margin-bottom: 1.5rem;
  overflow: hidden;
`;

export const ProgressFill = styled.div`
  width: ${props => props.progress}%;
  height: 100%;
  background: ${props => props.theme.primaryColor || '#0066cc'};
  border-radius: 2px;
  transition: width 0.3s ease;
`;

export const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;
