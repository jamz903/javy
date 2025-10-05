import { useState, useRef, useEffect } from 'react';
import { Send, Satellite, User, Bot, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Info, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useLocation } from 'react-router';

export default function Chat() {
  const location = useLocation();
  const { initialMessage, initialResponse, error } = location.state || {};

  const [messages, setMessages] = useState(() => {
    // Try to load messages from localStorage first
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        // Convert timestamp strings back to Date objects
        return parsed.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch (e) {
        console.error('Error loading saved messages:', e);
      }
    }

    const baseMessages = [
      {
        id: 1,
        role: 'assistant',
        content: 'Hello! I\'m your satellite data assistant. I can help you analyze crop health, search for satellite imagery, and answer questions about agricultural monitoring. What would you like to know?',
        timestamp: new Date(Date.now() - 1000 * 60 * 5)
      }
    ];

    // Add initial message if it exists
    if (initialMessage) {
      baseMessages.push({
        id: 2,
        role: 'user',
        content: initialMessage,
        timestamp: new Date(Date.now() - 1000 * 60 * 1)
      });
    }

    return baseMessages;
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(!!initialMessage && !initialResponse && !error);
  const [expandedSections, setExpandedSections] = useState({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Handle initial response when it arrives
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
        // Check if this response is already added
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

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
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

      console.log(data)

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

  // Format text with markdown-like syntax
  const formatText = (text) => {
    if (!text) return null;

    const processLine = (line) => {
      const elements = [];
      let remaining = line;
      let key = 0;

      while (remaining.length > 0) {
        // Check for inline code with backticks
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
          { value: `${(apiResults.confidence_fraction * 100).toFixed(1)}%`, label: 'Confidence' }
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

        {/* Area Impact Visualization */}
        <div className="bg-white rounded-lg p-6 border border-green-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-4">
            Forest Area Impact
          </h4>
          <div className="space-y-6">
            {/* Large circular gauge */}
            <div className="flex items-center justify-center">
              <div className="relative w-64 h-64">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  {/* Background circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="20"
                  />
                  {/* Healthy forest (green) */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="20"
                    strokeDasharray={`${healthyPercent * 5.03} ${500 - healthyPercent * 5.03}`}
                    strokeLinecap="round"
                  />
                  {/* Deforested area (red) */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="20"
                    strokeDasharray={`${parseFloat(deforestationPercent) * 5.03} ${500 - parseFloat(deforestationPercent) * 5.03}`}
                    strokeDashoffset={`-${healthyPercent * 5.03}`}
                    strokeLinecap="round"
                  />
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

        {/* NDVI Comparison with visual bars */}
        <div className="bg-white rounded-lg p-6 border border-green-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-4">
            Vegetation Health (NDVI) Comparison
          </h4>
          <div className="space-y-6">
            {/* Visual comparison bars */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Before (Reference)</span>
                  <span className="text-lg font-bold text-green-700">
                    {apiResults.ndvi_mean_ref.toFixed(4)}
                  </span>
                </div>
                <div className="relative h-12 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 via-green-500 to-green-600 flex items-center justify-end px-4"
                    style={{ width: `${(apiResults.ndvi_mean_ref / 1) * 100}%` }}
                  >
                    <span className="text-sm font-bold text-white drop-shadow-lg">Healthy Vegetation</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">After (Recent)</span>
                  <span className="text-lg font-bold text-orange-700">
                    {apiResults.ndvi_mean_recent.toFixed(4)}
                  </span>
                </div>
                <div className="relative h-12 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 flex items-center justify-end px-4"
                    style={{ width: `${(apiResults.ndvi_mean_recent / 1) * 100}%` }}
                  >
                    <span className="text-sm font-bold text-white drop-shadow-lg">Degraded</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Change indicator */}
            <div className="relative bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4 border-2 border-red-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-red-800 uppercase">Vegetation Decline</div>
                    <div className="text-3xl font-bold text-red-700">{ndviChange}%</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-600">Absolute Change</div>
                  <div className="text-xl font-bold text-red-700">
                    {(apiResults.ndvi_mean_recent - apiResults.ndvi_mean_ref).toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Quality with visual representation */}
        <div className="bg-white rounded-lg p-6 border border-green-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-4">
            Data Quality & Coverage
          </h4>
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
                <div className="text-2xl font-bold text-blue-700">
                  {(apiResults.data_quality.ref_valid_pixels / 1000).toFixed(0)}K
                </div>
                <div className="text-xs text-slate-600 mt-1">Reference</div>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200 text-center">
                <div className="text-2xl font-bold text-indigo-700">
                  {(apiResults.data_quality.recent_valid_pixels / 1000).toFixed(0)}K
                </div>
                <div className="text-xs text-slate-600 mt-1">Recent</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 text-center">
                <div className="text-2xl font-bold text-purple-700">
                  {(apiResults.data_quality.cloud_free_overlap / 1000).toFixed(0)}K
                </div>
                <div className="text-xs text-slate-600 mt-1">Usable</div>
              </div>
            </div>

            {/* Visual stacked representation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Cloud-Free Coverage</span>
                <span className="font-bold text-emerald-600">
                  {((apiResults.data_quality.cloud_free_overlap / apiResults.data_quality.ref_valid_pixels) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="relative h-8 bg-slate-200 rounded-lg overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-600 flex items-center justify-center"
                  style={{ width: `${(apiResults.data_quality.cloud_free_overlap / apiResults.data_quality.ref_valid_pixels) * 100}%` }}
                >
                  <span className="text-xs font-bold text-white">Valid Data</span>
                </div>
                <div
                  className="absolute right-0 top-0 h-full bg-gradient-to-r from-slate-300 to-slate-400 flex items-center justify-center"
                  style={{ width: `${100 - (apiResults.data_quality.cloud_free_overlap / apiResults.data_quality.ref_valid_pixels) * 100}%` }}
                >
                  <span className="text-xs font-semibold text-slate-700">Clouds/Gaps</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thresholds visualization */}
        <div className="bg-white rounded-lg p-6 border border-green-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-4">
            Detection Parameters
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border-2 border-amber-300">
                <div className="text-xs font-semibold text-amber-800 uppercase mb-1">dNDVI Threshold</div>
                <div className="text-4xl font-bold text-amber-700">{apiResults.thresholds.dNDVI}</div>
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="relative bg-gradient-to-br from-rose-50 to-rose-100 rounded-lg p-4 border-2 border-rose-300">
                <div className="text-xs font-semibold text-rose-800 uppercase mb-1">dNBR Threshold</div>
                <div className="text-4xl font-bold text-rose-700">{apiResults.thresholds.dNBR}</div>
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-600 mb-1">Mean dNBR (Burn Ratio)</div>
                  <div className="text-2xl font-bold text-slate-800">
                    {apiResults.dnbr_mean.toFixed(6)}
                  </div>
                </div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  const renderUrbanHeat = (apiResults) => {
    return (
      <>
      </>
    );
  }

  const renderVisualization = (apiUsed, apiResults) => {
    console.log(apiResults)
    if (apiUsed?.includes('/irrigation/detect')) {
      return renderIrrigation(apiResults);
    } else if (apiUsed?.includes('/satellite/deforestation')) {
      return renderDeforestation(apiResults);
    } else if (apiUsed?.includes('/satellite/urban_heat'))
      return renderUrbanHeat(apiResults)
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

    if (!analysis && !responseText && data.metadata?.understanding) {
      return (
        <div className="text-md text-slate-700 leading-relaxed">
          {formatText(data.metadata.understanding)}
        </div>
      );
    }

    if (!analysis) {
      return <div className="text-md text-slate-700 leading-relaxed">{formatText(responseText)}</div>;
    }

    return (
      <div className="space-y-4">
        {responseText && (
          <div className="text-md text-slate-700 leading-relaxed">
            {formatText(responseText)}
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

        {analysis.key_takeaways && (
          <Card className="border-l-4 border-l-blue-500 bg-blue-50">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                Key Findings
              </h3>
              <ul className="space-y-2">
                {analysis.key_takeaways.map((takeaway, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {analysis.recommendations && (
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
