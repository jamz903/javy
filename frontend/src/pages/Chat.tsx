// AI was used to help write this function to validate logic and suggest improvements
import { useState, useRef, useEffect } from 'react';
import { Send, Satellite, User, Bot, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Info, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from 'react-router';

export default function Chat() {
  const location = useLocation();
  const { initialMessage, initialResponse, error, newChat, loadedChat, chatId } = location.state || {};

  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(chatId || null);
  const [messages, setMessages] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(!!initialMessage && !initialResponse && !error);
  const [expandedSections, setExpandedSections] = useState({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isInitialized) return;

    if (loadedChat && loadedChat.fullMessages) {
      const restoredMessages = loadedChat.fullMessages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      setMessages(restoredMessages);
      setIsInitialized(true);
      return;
    }

    const baseMessages = [
      {
        id: 1,
        role: 'assistant',
        content: 'Hello! I\'m your satellite data assistant. I can help you analyze crop health, search for satellite imagery, and answer questions about agricultural monitoring. What would you like to know?',
        timestamp: new Date(Date.now() - 1000 * 60 * 5)
      }
    ];

    if (initialMessage) {
      baseMessages.push({
        id: 2,
        role: 'user',
        content: initialMessage,
        timestamp: new Date(Date.now() - 1000 * 60 * 1)
      });
    }

    setMessages(baseMessages);
    setIsInitialized(true);
  }, [loadedChat, initialMessage, isInitialized]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/chat-history');
        if (response.ok) {
          const data = await response.json();
          if (data.chats) {
            setChatHistory(data.chats);
          }
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    const saveHistory = async () => {
      if (chatHistory.length > 0) {
        try {
          await fetch('http://localhost:8000/api/chat-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chats: chatHistory })
          });
        } catch (error) {
          console.error('Error saving chat history:', error);
        }
      }
    };
    saveHistory();
  }, [chatHistory]);

  useEffect(() => {
    if (!isInitialized || messages.length <= 2) return;

    if (loadedChat && loadedChat.fullMessages && messages.length === loadedChat.fullMessages.length) {
      return;
    }

    const chatIdToUse = currentChatId || `chat_${Date.now()}`;
    if (!currentChatId) {
      setCurrentChatId(chatIdToUse);
    }

    const firstUserMsg = messages.find(m => m.role === 'user' && m.id > 1);
    const title = firstUserMsg
      ? firstUserMsg.content.substring(0, 60) + (firstUserMsg.content.length > 60 ? '...' : '')
      : 'Untitled Chat';

    setChatHistory(prev => {
      const existing = prev.findIndex(c => c.id === chatIdToUse);
      const chatData = {
        id: chatIdToUse,
        title,
        preview: firstUserMsg?.content || '',
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        messages: messages.length - 1,
        starred: existing >= 0 ? prev[existing].starred : false,
        tags: extractTags(messages),
        fullMessages: messages
      };

      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = chatData;
        return updated;
      }
      return [...prev, chatData];
    });
  }, [messages, currentChatId, isInitialized, loadedChat]);

  const extractTags = (msgs) => {
    const tags = new Set();
    const tagKeywords = ['Sentinel', 'MODIS', 'Landsat', 'SAR', 'NDVI', 'NDWI', 'Deforestation', 'Irrigation'];

    msgs.forEach(msg => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      tagKeywords.forEach(keyword => {
        if (content.toLowerCase().includes(keyword.toLowerCase())) {
          tags.add(keyword);
        }
      });
    });

    return Array.from(tags).slice(0, 3);
  };

  const exportChatHistory = () => {
    const dataStr = JSON.stringify(chatHistory, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat_history_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (initialMessage && (initialResponse || error)) {
      const responseMessage = {
        id: messages.length + 1,
        role: 'assistant',
        content: error
          ? `I encountered an error processing your request: ${error}. Please try again.`
          : initialResponse,
        timestamp: new Date(),
        type: initialResponse?.metadata?.results_analysis ? 'analysis' : 'text'
      };

      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.role === 'assistant' && lastMsg.id > 2) {
          return prev;
        }
        return [...prev, responseMessage];
      });
      setIsTyping(false);
    }
  }, [initialMessage, initialResponse, error]);

  const toggleSection = (messageId, section) => {
    setExpandedSections(prev => ({
      ...prev,
      [`${messageId}-${section}`]: !prev[`${messageId}-${section}`]
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = {
      id: messages.length + 1,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const conversationHistory = messages
        .filter(msg => msg.id > 1)
        .map(msg => {
          let content = msg.content;
          if (typeof content === 'object' && content.response) {
            content = content.response;
          }
          return {
            role: msg.role,
            content: content
          };
        });

      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          conversation_history: conversationHistory,
          execute_api: true
        })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      const aiMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: data,
        timestamp: new Date(),
        type: data.metadata?.results_analysis ? 'analysis' : 'text'
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: `I encountered an error processing your request: ${error.message}. Please try again.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatText = (text) => {
    if (!text) return null;

    const processLine = (line) => {
      const elements = [];
      let remaining = line;
      let key = 0;

      while (remaining.length > 0) {
        const codeMatch = remaining.match(/`([^`]+)`/);
        if (codeMatch) {
          const beforeCode = remaining.substring(0, codeMatch.index);
          if (beforeCode) {
            elements.push(<span key={key++}>{beforeCode}</span>);
          }
          elements.push(
            <code key={key++} className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded text-sm font-mono">
              {codeMatch[1]}
            </code>
          );
          remaining = remaining.substring(codeMatch.index + codeMatch[0].length);
          continue;
        }

        const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
        if (boldMatch) {
          const beforeBold = remaining.substring(0, boldMatch.index);
          if (beforeBold) {
            elements.push(<span key={key++}>{beforeBold}</span>);
          }
          elements.push(<strong key={key++} className="font-bold text-slate-900">{boldMatch[1]}</strong>);
          remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
          continue;
        }

        const italicMatch = remaining.match(/\*(.+?)\*/);
        if (italicMatch) {
          const beforeItalic = remaining.substring(0, italicMatch.index);
          if (beforeItalic) {
            elements.push(<span key={key++}>{beforeItalic}</span>);
          }
          elements.push(<em key={key++} className="italic text-slate-700">{italicMatch[1]}</em>);
          remaining = remaining.substring(italicMatch.index + italicMatch[0].length);
          continue;
        }

        elements.push(<span key={key++}>{remaining}</span>);
        break;
      }

      return elements;
    };

    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.trim() === '---') {
        return <hr key={idx} className="my-4 border-slate-300" />;
      }

      if (line.trim()) {
        return <div key={idx} className="mb-2">{processLine(line)}</div>;
      }

      return <div key={idx} className="mb-2">&nbsp;</div>;
    });
  };

  const DistributionRange = ({ stats, threshold, label, color, unit = '', bidirectionalThreshold = false }) => {
    const range = stats.max - stats.min;
    const meanPosition = ((stats.mean - stats.min) / range) * 100;
    const stdDevLeft = Math.max(0, ((stats.mean - stats.std - stats.min) / range) * 100);
    const stdDevWidth = Math.min(100 - stdDevLeft, ((stats.std * 2) / range) * 100);

    const negThresholdPosition = ((-threshold - stats.min) / range) * 100;
    const posThresholdPosition = ((threshold - stats.min) / range) * 100;
    const singleThresholdPosition = ((threshold - stats.min) / range) * 100;

    const isThresholdInRange = (pos) => pos >= 0 && pos <= 100;

    return (
      <div className="space-y-4">
        <div className="relative h-24 bg-slate-100 rounded-lg p-4 overflow-hidden">
          <div className="absolute top-4 left-4 right-4 h-2 bg-slate-200 rounded">
            <div className="absolute w-1 h-6 bg-orange-500 -top-2" style={{ left: '0%' }} />
            <div
              className={`absolute h-4 ${color}-400 -top-1 rounded`}
              style={{
                left: `${stdDevLeft}%`,
                width: `${stdDevWidth}%`
              }}
            />
            <div
              className={`absolute w-1 h-8 ${color}-600 -top-3`}
              style={{ left: `${meanPosition}%` }}
            />
            <div className="absolute w-1 h-6 bg-green-500 -top-2" style={{ right: '0%' }} />
            {bidirectionalThreshold ? (
              <>
                {isThresholdInRange(negThresholdPosition) && (
                  <div
                    className="absolute w-0.5 h-10 bg-red-500 -top-4"
                    style={{ left: `${negThresholdPosition}%` }}
                  />
                )}
                {isThresholdInRange(posThresholdPosition) && (
                  <div
                    className="absolute w-0.5 h-10 bg-red-500 -top-4"
                    style={{ left: `${posThresholdPosition}%` }}
                  />
                )}
              </>
            ) : (
              isThresholdInRange(singleThresholdPosition) && (
                <div
                  className="absolute w-0.5 h-10 bg-red-500 -top-4"
                  style={{ left: `${singleThresholdPosition}%` }}
                />
              )
            )}
          </div>
          <div className="absolute bottom-2 left-4 right-4 flex justify-between text-xs">
            <span className="text-orange-600 font-medium">{stats.min.toFixed(3)}{unit}</span>
            <span className={`text-${color}-600 font-semibold`}>{stats.mean.toFixed(3)}{unit}</span>
            <span className="text-green-600 font-medium">{stats.max.toFixed(3)}{unit}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 ${color}-600`} />
            <span>Mean ({stats.mean.toFixed(4)}{unit})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 ${color}-400`} />
            <span>±1 Std Dev ({stats.std.toFixed(4)}{unit})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-red-500" />
            <span>Threshold ({bidirectionalThreshold ? '±' : ''}{threshold}{unit})</span>
          </div>
        </div>
      </div>
    );
  };

  const SummaryStatsCards = ({ stats }) => (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-white rounded-lg p-4 text-center border border-green-200">
          <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
          <div className="text-xs text-slate-600 mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  );

  const renderIrrigation = (apiResults) => {
    return (
      <>
        <SummaryStatsCards stats={[
          { value: apiResults.pixels_detected, label: 'Stressed Pixels' },
          { value: apiResults.area_detected_km2.toFixed(3), label: 'Area Detected (km²)' },
          { value: `${(apiResults.confidence_fraction * 100).toFixed(1)}%`, label: 'Confidence Fraction' }
        ]} />
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-3">
            NDWI (Water Content) Change Distribution
          </h4>
          <DistributionRange
            stats={apiResults.delta_ndwi_stats}
            threshold={apiResults.ndwi_threshold}
            label="NDWI"
            color="bg-blue"
            bidirectionalThreshold={true}
          />
        </div>
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-3">
            VV Radar Backscatter Change Distribution (dB)
          </h4>
          <DistributionRange
            stats={apiResults.delta_vv_db_stats}
            threshold={apiResults.vv_db_threshold}
            label="VV Backscatter"
            color="bg-purple"
            unit=" dB"
            bidirectionalThreshold={false}
          />
        </div>
      </>
    );
  };

  const renderDeforestation = (apiResults) => {
    const deforestationPercent = (apiResults.deforested_area_km2 / apiResults.valid_area_km2 * 100).toFixed(2);
    const ndviChange = ((apiResults.ndvi_mean_recent - apiResults.ndvi_mean_ref) / apiResults.ndvi_mean_ref * 100).toFixed(1);
    const healthyPercent = 100 - parseFloat(deforestationPercent);

    return (
      <>
        <SummaryStatsCards stats={[
          { value: apiResults.deforested_pixels.toLocaleString(), label: 'Deforested Pixels' },
          { value: apiResults.deforested_area_km2.toFixed(3), label: 'Deforested Area (km²)' },
          { value: `${deforestationPercent}%`, label: 'Area Affected' }
        ]} />

        <div className="bg-white rounded-lg p-6 border border-green-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-4">Forest Area Impact</h4>
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="relative w-64 h-64">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#e2e8f0" strokeWidth="20" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#10b981" strokeWidth="20"
                    strokeDasharray={`${healthyPercent * 5.03} ${500 - healthyPercent * 5.03}`} strokeLinecap="round" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#ef4444" strokeWidth="20"
                    strokeDasharray={`${parseFloat(deforestationPercent) * 5.03} ${500 - parseFloat(deforestationPercent) * 5.03}`}
                    strokeDashoffset={`-${healthyPercent * 5.03}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-red-600">{deforestationPercent}%</div>
                  <div className="text-sm text-slate-600 mt-1">Deforested</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-500">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-semibold text-slate-700">Healthy Forest</span>
                </div>
                <div className="text-2xl font-bold text-green-700">{healthyPercent.toFixed(2)}%</div>
                <div className="text-xs text-slate-600 mt-1">
                  {(apiResults.valid_area_km2 - apiResults.deforested_area_km2).toFixed(2)} km²
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border-2 border-red-500">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="text-xs font-semibold text-slate-700">Deforested</span>
                </div>
                <div className="text-2xl font-bold text-red-700">{deforestationPercent}%</div>
                <div className="text-xs text-slate-600 mt-1">
                  {apiResults.deforested_area_km2.toFixed(2)} km²
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderUrbanHeat = (apiResults) => {
    const tempAnalysis = apiResults.temperature_analysis;
    const vegAnalysis = apiResults.vegetation_analysis;
    const dataQuality = apiResults.data_quality;
    const processingInfo = apiResults.processing_info;

    const heatPercent = (tempAnalysis.urban_heat_fraction * 100).toFixed(1);
    const coolPercent = (100 - parseFloat(heatPercent)).toFixed(1);

    const tempRange = tempAnalysis.max_temperature_c - tempAnalysis.min_temperature_c;
    const meanPosition = ((tempAnalysis.mean_temperature_c - tempAnalysis.min_temperature_c) / tempRange) * 100;
    const thresholdPosition = ((tempAnalysis.heat_threshold_c - tempAnalysis.min_temperature_c) / tempRange) * 100;

    return (
      <>
        <SummaryStatsCards stats={[
          { value: `${tempAnalysis.mean_temperature_c.toFixed(1)}°C`, label: 'Mean Temperature' },
          { value: `${heatPercent}%`, label: 'Urban Heat Islands' },
          { value: vegAnalysis.vegetation_health.toUpperCase(), label: 'Vegetation Health' }
        ]} />

        {/* Urban Heat Island Circular Gauge */}
        <div className="bg-white rounded-lg p-6 border border-green-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-4">Urban Heat Island Distribution</h4>
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="relative w-64 h-64">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#e2e8f0" strokeWidth="20" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="url(#coolGradient)" strokeWidth="20" strokeDasharray={`${parseFloat(coolPercent) * 5.03} ${500 - parseFloat(coolPercent) * 5.03}`} strokeLinecap="round" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="url(#heatGradient)" strokeWidth="20" strokeDasharray={`${parseFloat(heatPercent) * 5.03} ${500 - parseFloat(heatPercent) * 5.03}`} strokeDashoffset={`-${parseFloat(coolPercent) * 5.03}`} strokeLinecap="round" />
                  <defs>
                    <linearGradient id="coolGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <linearGradient id="heatGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-orange-600">{heatPercent}%</div>
                  <div className="text-sm text-slate-600 mt-1">Heat Islands</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-cyan-50 to-green-50 rounded-lg p-4 border-2 border-cyan-400">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-green-400 rounded-full"></div>
                  <span className="text-xs font-semibold text-slate-700">Cooler Areas</span>
                </div>
                <div className="text-2xl font-bold text-cyan-700">{coolPercent}%</div>
                <div className="text-xs text-slate-600 mt-1">Below heat threshold</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border-2 border-orange-500">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
                  <span className="text-xs font-semibold text-slate-700">Heat Islands</span>
                </div>
                <div className="text-2xl font-bold text-orange-700">{heatPercent}%</div>
                <div className="text-xs text-slate-600 mt-1">Above {tempAnalysis.heat_threshold_c.toFixed(2)}°C</div>
              </div>
            </div>
          </div>
        </div>

        {/* Temperature Distribution Thermometer */}
        <div className="bg-white rounded-lg p-6 border border-green-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-4">Temperature Distribution Analysis</h4>
          <div className="space-y-6">
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Temperature Range</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">±{tempAnalysis.temperature_std_c.toFixed(2)}°C std</span>
                </div>
              </div>

              <div className="relative h-32 bg-gradient-to-r from-blue-200 via-yellow-200 to-red-300 rounded-lg p-4 overflow-hidden">
                {/* Min temperature marker */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600">
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
                  </div>
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap">
                    <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                      {tempAnalysis.min_temperature_c.toFixed(2)}°C
                    </div>
                  </div>
                </div>

                {/* Mean temperature marker */}
                <div className="absolute top-0 bottom-0 w-1 bg-orange-600" style={{ left: `${meanPosition}%` }}>
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 bg-orange-600 rounded-full border-2 border-white shadow-lg"></div>
                  </div>
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap">
                    <div className="bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                      Mean: {tempAnalysis.mean_temperature_c.toFixed(2)}°C
                    </div>
                  </div>
                </div>

                {/* Threshold marker */}
                <div className="absolute top-0 bottom-0 w-1 bg-red-600" style={{ left: `${thresholdPosition}%` }}>
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 bg-red-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                  </div>
                  <div className="absolute left-2 top-8 whitespace-nowrap">
                    <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                      Threshold: {tempAnalysis.heat_threshold_c.toFixed(2)}°C
                    </div>
                  </div>
                </div>

                {/* Max temperature marker */}
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-700">
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 bg-red-700 rounded-full border-2 border-white shadow-lg"></div>
                  </div>
                  <div className="absolute right-2 bottom-4 whitespace-nowrap">
                    <div className="bg-red-700 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                      {tempAnalysis.max_temperature_c.toFixed(2)}°C
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Temperature statistics cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
                <div className="text-xl font-bold text-blue-700">{tempAnalysis.min_temperature_c.toFixed(1)}°C</div>
                <div className="text-xs text-slate-600 mt-1">Min</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 text-center">
                <div className="text-xl font-bold text-orange-700">{tempAnalysis.mean_temperature_c.toFixed(1)}°C</div>
                <div className="text-xs text-slate-600 mt-1">Mean</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
                <div className="text-xl font-bold text-red-700">{tempAnalysis.max_temperature_c.toFixed(1)}°C</div>
                <div className="text-xs text-slate-600 mt-1">Max</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 text-center">
                <div className="text-xl font-bold text-purple-700">{tempRange.toFixed(2)}°C</div>
                <div className="text-xs text-slate-600 mt-1">Range</div>
              </div>
            </div>
          </div>
        </div>

        {/* Vegetation Health Indicator */}
        <div className="bg-white rounded-lg p-6 border border-green-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-4">Vegetation & Green Cover Analysis</h4>
          <div className="space-y-4">
            <div className={`relative overflow-hidden rounded-lg p-6 border-2 ${vegAnalysis.vegetation_health === 'low'
              ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-400'
              : vegAnalysis.vegetation_health === 'medium'
                ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-400'
                : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-600 uppercase mb-1">Vegetation Health Status</div>
                  <div className={`text-4xl font-bold ${vegAnalysis.vegetation_health === 'low'
                    ? 'text-red-700'
                    : vegAnalysis.vegetation_health === 'medium'
                      ? 'text-yellow-700'
                      : 'text-green-700'
                    }`}>
                    {vegAnalysis.vegetation_health.toUpperCase()}
                  </div>
                </div>
                <div className="w-20 h-20 rounded-full bg-white bg-opacity-50 flex items-center justify-center">
                  <svg className={`w-12 h-12 ${vegAnalysis.vegetation_health === 'low'
                    ? 'text-red-600'
                    : vegAnalysis.vegetation_health === 'medium'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                    }`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white border-opacity-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Mean NDVI</span>
                  <span className="text-2xl font-bold text-slate-800">{vegAnalysis.mean_ndvi.toFixed(3)}</span>
                </div>
                <div className="w-full bg-white bg-opacity-50 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${vegAnalysis.vegetation_health === 'low'
                      ? 'bg-gradient-to-r from-red-500 to-red-600'
                      : vegAnalysis.vegetation_health === 'medium'
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                        : 'bg-gradient-to-r from-green-500 to-green-600'
                      }`}
                    style={{ width: `${(vegAnalysis.mean_ndvi / 1) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>0.0 (No vegetation)</span>
                  <span>1.0 (Healthy vegetation)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Quality & Processing Info */}
        <div className="bg-white rounded-lg p-6 border border-green-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-4">Data Quality & Source Information</h4>
          <div className="space-y-4">
            {/* Coverage visualization */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">Data Coverage</span>
                <span className="text-2xl font-bold text-blue-700">{dataQuality.coverage_percentage}%</span>
              </div>
              <div className="w-full bg-white rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 flex items-center justify-center"
                  style={{ width: `${dataQuality.coverage_percentage}%` }}
                >
                  <span className="text-xs font-bold text-white">Complete Coverage</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="text-center">
                  <div className="text-xs text-slate-600">Valid Pixels</div>
                  <div className="text-lg font-bold text-slate-800">{dataQuality.valid_pixels}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-600">Cloud Cover</div>
                  <div className="text-lg font-bold text-slate-800">{dataQuality.cloud_cover}%</div>
                </div>
              </div>
            </div>

            {/* Source information */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <div className="font-semibold text-slate-700">Data Source</div>
                    <div className="text-slate-600">{processingInfo.data_source}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <div className="font-semibold text-slate-700">Image Date</div>
                    <div className="text-slate-600">{dataQuality.image_date}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <div className="font-semibold text-slate-700">Spatial Resolution</div>
                    <div className="text-slate-600">{processingInfo.spatial_resolution}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderVisualization = (apiUsed, apiResults) => {
    if (apiUsed?.includes('/irrigation/detect')) {
      return renderIrrigation(apiResults);
    } else if (apiUsed?.includes('/satellite/deforestation')) {
      return renderDeforestation(apiResults);
    } else if (apiUsed?.includes('/satellite/urban_heat')) {
      return renderUrbanHeat(apiResults);
    }
  };

  const renderAnalysisMessage = (message) => {
    const data = message.content;

    if (typeof data === 'string') {
      return <div className="text-md text-slate-700 leading-relaxed">{formatText(data)}</div>;
    }

    const analysis = data.metadata?.results_analysis;
    const apiResults = data.api_results;
    const apiUsed = analysis?.technical_context?.api_used;
    const responseText = data.response || '';
    const hasAlternativeApplications = data.metadata?.alternative_applications;

    if (!analysis && !hasAlternativeApplications) {
      return <div className="text-md text-slate-700 leading-relaxed">{formatText(responseText)}</div>;
    }

    return (
      <div className="space-y-4">
        {responseText && (
          <div className="text-md text-slate-700 leading-relaxed">
            {formatText(responseText)}
          </div>
        )}
        {data?.recommended_apis && data.recommended_apis.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.recommended_apis.map((api, idx) => (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200 w-fit">
                <code className="text-xs font-mono text-slate-700">{api.api_endpoint}</code>
              </div>
            ))}
          </div>
        )}

        {apiResults !== null && apiUsed && (
          <Card className="border-l-4 border-l-green-500 bg-green-50">
            <CardContent className="pt-4">
              <button
                onClick={() => toggleSection(message.id, 'visualizations')}
                className="w-full flex items-center justify-between text-left hover:opacity-80 mb-4"
              >
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Data Visualizations
                </h3>
                {expandedSections[`${message.id}-visualizations`] ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {expandedSections[`${message.id}-visualizations`] && (
                <div className="space-y-6">
                  {renderVisualization(apiUsed, apiResults)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(analysis?.key_takeaways) && (
          <Card className="border-l-4 border-l-blue-500 bg-blue-50">
            <CardContent className="pt-4">
              <button
                onClick={() => toggleSection(message.id, 'key-findings')}
                className="w-full flex items-center justify-between text-left hover:opacity-80"
              >
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  Key Findings
                </h3>
                {expandedSections[`${message.id}-key-findings`] ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {expandedSections[`${message.id}-key-findings`] && (
                <div className="mt-4 space-y-4">
                  {analysis.key_takeaways && (
                    <ul className="space-y-2">
                      {analysis.key_takeaways.map((takeaway, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="mt-0.5">•</span>
                          <span>{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {analysis?.recommendations && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <button
                onClick={() => toggleSection(message.id, 'recommendations')}
                className="w-full flex items-center justify-between text-left hover:opacity-80"
              >
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Recommendations
                </h3>
                {expandedSections[`${message.id}-recommendations`] ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {expandedSections[`${message.id}-recommendations`] && (
                <div className="mt-4 space-y-3">
                  {analysis.recommendations.immediate_actions && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 mb-2">Immediate Actions:</h4>
                      <ul className="space-y-1">
                        {analysis.recommendations.immediate_actions.map((action, idx) => (
                          <li key={idx} className="text-sm text-slate-700 ml-4">• {action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(analysis?.limitations || hasAlternativeApplications || data.metadata?.alternative_applications.length != 0) && (
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4">
              <button
                onClick={() => toggleSection(message.id, 'context-alternatives')}
                className="w-full flex items-center justify-between text-left hover:opacity-80"
              >
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Info className="w-5 h-5 text-purple-600" />
                  Context & Alternatives
                </h3>
                {expandedSections[`${message.id}-context-alternatives`] ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {expandedSections[`${message.id}-context-alternatives`] && (
                <div className="mt-4 space-y-4">
                  {analysis?.limitations && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 mb-2">Limitations</h4>
                      <div className="text-sm text-slate-700 leading-relaxed">
                        {formatText(analysis?.limitations)}
                      </div>
                    </div>
                  )}
                  {hasAlternativeApplications && data.metadata?.alternative_applications.length != 0 && (
                    <div className={analysis?.limitations ? "pt-4 border-t border-purple-200" : ""}>
                      <h4 className="text-sm font-semibold text-slate-800 mb-2">Alternative Applications</h4>
                      <div className="text-sm text-slate-700 leading-relaxed space-y-4">
                        {Array.isArray(data.metadata.alternative_applications) ? (
                          data.metadata.alternative_applications.map((app, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-4 border border-purple-200">
                              {typeof app === 'object' && app.title ? (
                                <>
                                  <h5 className="font-semibold text-slate-900 mb-2">{app.title}</h5>
                                  {app.description && (
                                    <p className="text-sm text-slate-700 mb-2">{app.description}</p>
                                  )}
                                  {app.research_basis && (
                                    <p className="text-xs text-slate-600 italic mt-2">
                                      <strong>Research:</strong> {app.research_basis}
                                    </p>
                                  )}
                                  {app.implementation_note && (
                                    <p className="text-xs text-slate-600 mt-2">
                                      <strong>Note:</strong> {app.implementation_note}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p>{typeof app === 'string' ? app : JSON.stringify(app)}</p>
                              )}
                            </div>
                          ))
                        ) : (
                          formatText(data.metadata.alternative_applications)
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Satellite className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Chat</h1>
          </div>
          <p className="text-slate-600">Ask questions about satellite data </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-4">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className={message.role === 'assistant' ? 'bg-blue-100' : 'bg-slate-200'}>
                  {message.role === 'assistant' ? (
                    <Bot className="w-4 h-4 text-blue-600" />
                  ) : (
                    <User className="w-4 h-4 text-slate-600" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-medium text-slate-900">
                    {message.role === 'assistant' ? 'Assistant' : 'You'}
                  </span>
                  <span className="text-md text-slate-500">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                {message.type === 'analysis' ? (
                  renderAnalysisMessage(message)
                ) : typeof message.content === 'string' ? (
                  <div className="text-md text-slate-700 leading-relaxed">
                    {formatText(message.content)}
                  </div>
                ) : (
                  renderAnalysisMessage(message)
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-4">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-blue-100">
                  <Bot className="w-4 h-4 text-blue-600" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="text-sm font-medium text-slate-900">Assistant</div>
                <div className="flex gap-1 py-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t bg-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex gap-3 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Ask about satellite data..."
              className="min-h-[56px] max-h-[200px] resize-none overflow-y-auto"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              size="icon"
              className="h-[56px] w-[56px] shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
