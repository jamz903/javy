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
    const baseMessages = [
      {
        id: 1,
        role: 'assistant',
        content: 'Hello! I\'m your satellite data assistant. I can help you analyze crop health, search for satellite imagery, and answer questions about agricultural monitoring. What would you like to know?',
        timestamp: new Date(Date.now() - 1000 * 60 * 5)
      }
    ];

    // Add initial message and response if they exist
    if (initialMessage) {
      baseMessages.push({
        id: 2,
        role: 'user',
        content: initialMessage,
        timestamp: new Date(Date.now() - 1000 * 60 * 1)
      });

      if (initialResponse) {
        baseMessages.push({
          id: 3,
          role: 'assistant',
          content: initialResponse,
          timestamp: new Date(),
          type: initialResponse.metadata?.results_analysis ? 'analysis' : 'text'
        });
      } else if (error) {
        baseMessages.push({
          id: 3,
          role: 'assistant',
          content: `I encountered an error processing your request: ${error}. Please try again.`,
          timestamp: new Date()
        });
      }
    }

    return baseMessages;
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

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
      // Build conversation history - only include actual conversation messages, not the initial greeting
      const conversationHistory = messages
        .filter(msg => msg.id > 1) // Skip the initial assistant greeting
        .map(msg => {
          let content = msg.content;
          // Extract just the text content for conversation history
          if (typeof content === 'object' && content.response) {
            content = content.response;
          }
          return {
            role: msg.role,
            content: content
          };
        });

      console.log('Sending request with history:', conversationHistory);

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
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Received response:', data);

      const aiMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: data,
        timestamp: new Date(),
        type: data.metadata?.results_analysis ? 'analysis' : 'text'
      };

      console.log('Adding AI message:', aiMessage);
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: `I encountered an error processing your request: ${error.message}. Please try again or check if the API server is running.`,
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

  // VISUALIZATION COMPONENTS - Abstracted for reusability

  // Distribution Range Visualization Component
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
            {/* Min marker */}
            <div className="absolute w-1 h-6 bg-orange-500 -top-2" style={{ left: '0%' }} />

            {/* Mean ± Std Dev range */}
            <div
              className={`absolute h-4 ${color}-400 -top-1 rounded`}
              style={{
                left: `${stdDevLeft}%`,
                width: `${stdDevWidth}%`
              }}
            />

            {/* Mean marker */}
            <div
              className={`absolute w-1 h-8 ${color}-600 -top-3`}
              style={{ left: `${meanPosition}%` }}
            />

            {/* Max marker */}
            <div className="absolute w-1 h-6 bg-green-500 -top-2" style={{ right: '0%' }} />

            {/* Threshold lines */}
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

          {/* Labels */}
          <div className="absolute bottom-2 left-4 right-4 flex justify-between text-xs">
            <span className="text-orange-600 font-medium">{stats.min.toFixed(3)}{unit}</span>
            <span className={`text-${color}-600 font-semibold`}>{stats.mean.toFixed(3)}{unit}</span>
            <span className="text-green-600 font-medium">{stats.max.toFixed(3)}{unit}</span>
          </div>
        </div>

        {/* Legend */}
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
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500" />
            <span>Min</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500" />
            <span>Max</span>
          </div>
        </div>
      </div>
    );
  };

  // Summary Stats Cards Component
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

  // API-SPECIFIC VISUALIZATION RENDERERS

  const renderAgriculturalHealthMonitoring = (apiResults, messageId) => {
    return (
      <>
        {/* Detection Summary */}
        <SummaryStatsCards stats={[
          { value: apiResults.pixels_detected, label: 'Stressed Pixels' },
          { value: apiResults.area_detected_km2.toFixed(3), label: 'Area Detected (km²)' },
          { value: `${(apiResults.confidence_fraction * 100).toFixed(1)}%`, label: 'Confidence' }
        ]} />

        {/* NDWI Statistics */}
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
          <p className="text-xs text-slate-600 mt-2">
            The blue bar shows the typical range (mean ± std dev). Red lines mark stress detection thresholds. No values exceeded the thresholds.
          </p>
        </div>

        {/* VV Radar Statistics */}
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
          <p className="text-xs text-slate-600 mt-2">
            The purple bar shows the typical range (mean ± std dev). The mean is close to the threshold but within normal variation.
          </p>
        </div>

        {/* Analysis Resolution Info */}
        <div className="bg-white rounded-lg p-3 border border-green-200 text-xs text-slate-600">
          <span className="font-semibold">Analysis Resolution:</span> {apiResults.resolution.width} × {apiResults.resolution.height} pixels
          <span className="mx-2">•</span>
          <span className="font-semibold">Pixel Size:</span> {(apiResults.pixel_area_km2 * 1000000).toFixed(2)} m²
        </div>
      </>
    );
  };

  const renderDeforestationMonitoring = (apiResults, messageId) => {
    // For deforestation detection using NDVI and NBR indices
    return (
      <>
        {/* Detection Summary */}
        <SummaryStatsCards stats={[
          { value: apiResults.pixels_detected || 0, label: 'Deforestation Pixels' },
          { value: (apiResults.area_detected_km2 || 0).toFixed(3), label: 'Area Detected (km²)' },
          { value: `${((apiResults.confidence_fraction || 0) * 100).toFixed(1)}%`, label: 'Confidence' }
        ]} />

        {/* NDVI Change Statistics */}
        {apiResults.delta_ndvi_stats && (
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">
              NDVI (Vegetation Health) Change Distribution
            </h4>
            <DistributionRange
              stats={apiResults.delta_ndvi_stats}
              threshold={apiResults.ndvi_threshold || 0.1}
              label="NDVI Change"
              color="bg-green"
              bidirectionalThreshold={false}
            />
            <p className="text-xs text-slate-600 mt-2">
              NDVI measures vegetation health. Negative changes indicate vegetation loss. The red line shows the deforestation detection threshold.
            </p>
          </div>
        )}

        {/* NBR Change Statistics */}
        {apiResults.delta_nbr_stats && (
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">
              NBR (Burn Index) Change Distribution
            </h4>
            <DistributionRange
              stats={apiResults.delta_nbr_stats}
              threshold={apiResults.nbr_threshold || 0.1}
              label="NBR Change"
              color="bg-red"
              bidirectionalThreshold={false}
            />
            <p className="text-xs text-slate-600 mt-2">
              NBR is sensitive to burned areas and vegetation changes. Negative changes may indicate deforestation or fire damage.
            </p>
          </div>
        )}

        {/* Analysis Details */}
        {apiResults.resolution && (
          <div className="bg-white rounded-lg p-3 border border-green-200 text-xs text-slate-600">
            <span className="font-semibold">Analysis Resolution:</span> {apiResults.resolution.width} × {apiResults.resolution.height} pixels
            {apiResults.pixel_area_km2 && (
              <>
                <span className="mx-2">•</span>
                <span className="font-semibold">Pixel Size:</span> {(apiResults.pixel_area_km2 * 1000000).toFixed(2)} m²
              </>
            )}
          </div>
        )}
      </>
    );
  };

  const renderUrbanHeatIsland = (apiResults, messageId) => {
    // For urban heat island analysis using Land Surface Temperature
    return (
      <>
        {/* Temperature Summary */}
        {apiResults.lst_stats && (
          <SummaryStatsCards stats={[
            { value: `${apiResults.lst_stats.mean.toFixed(1)}°C`, label: 'Mean Temperature' },
            { value: `${apiResults.lst_stats.max.toFixed(1)}°C`, label: 'Max Temperature' },
            { value: `${apiResults.lst_stats.min.toFixed(1)}°C`, label: 'Min Temperature' }
          ]} />
        )}

        {/* LST Distribution */}
        {apiResults.lst_stats && (
          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">
              Land Surface Temperature (LST) Distribution
            </h4>
            <DistributionRange
              stats={apiResults.lst_stats}
              threshold={apiResults.heat_threshold || 35}
              label="Temperature"
              color="bg-orange"
              unit="°C"
              bidirectionalThreshold={false}
            />
            <p className="text-xs text-slate-600 mt-2">
              The orange bar shows typical temperature range. The red line marks the heat island threshold. Higher temperatures indicate urban heat islands.
            </p>
          </div>
        )}

        {/* Heat Island Intensity */}
        {apiResults.heat_island_intensity !== undefined && (
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">
              Urban Heat Island Intensity
            </h4>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-bold text-orange-600">
                  {apiResults.heat_island_intensity.toFixed(1)}°C
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  Temperature difference between urban and surrounding areas
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Details */}
        {apiResults.resolution && (
          <div className="bg-white rounded-lg p-3 border border-orange-200 text-xs text-slate-600">
            <span className="font-semibold">Analysis Resolution:</span> {apiResults.resolution.width} × {apiResults.resolution.height} pixels
            {apiResults.scene_date && (
              <>
                <span className="mx-2">•</span>
                <span className="font-semibold">Scene Date:</span> {apiResults.scene_date}
              </>
            )}
          </div>
        )}
      </>
    );
  };

  // MAIN VISUALIZATION ROUTER
  const renderVisualization = (apiUsed, apiResults, messageId) => {
    if (apiUsed.includes('Agricultural Health Monitoring') || apiUsed.includes('/irrigation/detect')) {
      return renderAgriculturalHealthMonitoring(apiResults, messageId);
    } else if (apiUsed.includes('Imagery Search')) {
      return renderImagerySearch(apiResults, messageId);
    } else if (apiUsed.includes('Change Detection')) {
      return renderChangeDetection(apiResults, messageId);
    }
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <p className="text-sm text-slate-600">No visualization available for this API type.</p>
      </div>
    );
  };

  const formatText = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Check for headers with **text**
      if (line.includes('**')) {
        const parts = line.split('**');
        return (
          <div key={idx} className="mb-2">
            {parts.map((part, i) => {
              if (i % 2 === 1) {
                return <strong key={i} className="font-semibold text-slate-900">{part}</strong>;
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
        );
      }

      // Check for separators (---)
      if (line.trim() === '---') {
        return <hr key={idx} className="my-4 border-slate-300" />;
      }

      // Check for italic text with *text*
      if (line.includes('*') && !line.includes('**')) {
        const parts = line.split('*');
        return (
          <div key={idx} className="mb-2">
            {parts.map((part, i) => {
              if (i % 2 === 1) {
                return <em key={i} className="italic text-slate-600">{part}</em>;
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
        );
      }

      // Regular line
      return line ? <div key={idx} className="mb-2">{line}</div> : <div key={idx} className="mb-2">&nbsp;</div>;
    });
  };

  // MAIN MESSAGE RENDERER
  const renderAnalysisMessage = (message) => {
    const data = message.content;

    // Handle simple text responses
    if (typeof data === 'string') {
      return <div className="text-md text-slate-700 leading-relaxed">{formatText(data)}</div>;
    }

    const analysis = data.metadata?.results_analysis;
    const apiResults = data.api_results;
    const apiUsed = analysis?.technical_context?.api_used;
    const responseText = data.response || '';

    // If no analysis and no response text, show understanding from metadata
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
        {/* Summary */}
        {responseText && (
          <div className="text-md text-slate-700 leading-relaxed">
            {responseText}
          </div>
        )}

        {/* Data Visualizations */}
        {apiResults && apiUsed && (
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
                  {renderVisualization(apiUsed, apiResults, message.id)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Key Takeaways */}
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
                    <span className="mt-0.5 text-lg">{takeaway.startsWith('✓') ? '✓' : takeaway.startsWith('ℹ️') ? 'ℹ️' : '•'}</span>
                    <span>{takeaway.replace(/^[✓ℹ️]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
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
                  {analysis.recommendations.monitoring_plan && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 mb-2">Monitoring Plan:</h4>
                      <p className="text-sm text-slate-700">{analysis.recommendations.monitoring_plan}</p>
                    </div>
                  )}
                  {analysis.recommendations.follow_up_suggestions && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 mb-2">Follow-up:</h4>
                      <p className="text-sm text-slate-700">{analysis.recommendations.follow_up_suggestions}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Technical Details */}
        {analysis.technical_context && (
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-4">
              <button
                onClick={() => toggleSection(message.id, 'technical')}
                className="w-full flex items-center justify-between text-left hover:opacity-80"
              >
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Info className="w-5 h-5 text-slate-600" />
                  Technical Details
                </h3>
                {expandedSections[`${message.id}-technical`] ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {expandedSections[`${message.id}-technical`] && (
                <div className="mt-4 space-y-2 text-sm">
                  {Object.entries(analysis.technical_context).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-semibold text-slate-600 min-w-[140px]">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                      </span>
                      <span className="text-slate-700">{value}</span>
                    </div>
                  ))}
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
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Satellite className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Satellite Analysis Chat</h1>
          </div>
          <p className="text-slate-600">Ask questions about satellite data and crop health monitoring</p>
        </div>
      </div>

      {/* Messages Container */}
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
                  <div className="text-md text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {message.content}
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

      {/* Input Area */}
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
              className="h-[56px] w-[56px] shrink-0 transition-all duration-200 hover:scale-105"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
