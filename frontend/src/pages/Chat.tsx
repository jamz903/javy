import React, { useState, useRef, useEffect } from 'react';
import { Send, Satellite, User, Bot, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Info, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

export default function Chat() {
  const sampleApiResponse = {
    "response": "The analysis of your farm in Bygdøyveien, Oslo, comparing the last month to the month prior, shows no significant areas of crop stress or changes in water content based on the thresholds used. While there's no immediate cause for concern detected, some slight variations in vegetation indices and radar backscatter were observed. These results should be taken as a baseline, and continued monitoring is recommended to identify any developing issues.\n\nWe used satellite data to check for changes in your crops' health by comparing the past month (September 4, 2025 to October 4, 2025) to the month before (August 4, 2025 to September 4, 2025). We looked at two key indicators: NDWI (Normalized Difference Water Index) which tells us about water content in the plants and surrounding area, and VV (vertical-transmit, vertical-receive) which is a measure of radar backscatter that can indicate changes in the vegetation structure.",
    "api_results": {
      "pixels_detected": 0,
      "area_detected_km2": 0,
      "pixel_area_km2": 2.1028254136749684e-7,
      "delta_ndwi_stats": {
        "mean": -0.05216680094599724,
        "std": 0.017849156633019447,
        "max": 0.010025233030319214,
        "min": -0.1047334372997284
      },
      "delta_vv_db_stats": {
        "mean": 0.8186769485473633,
        "std": 5.136748790740967,
        "max": 16.309886932373047,
        "min": -19.964181900024414
      },
      "ndwi_threshold": 0.05,
      "vv_db_threshold": 1,
      "confidence_fraction": 0,
      "resolution": {
        "width": 512,
        "height": 512
      }
    },
    "metadata": {
      "results_analysis": {
        "key_takeaways": [
          "✓ No significant crop stress or changes in water content were detected on your farm in the past month based on the thresholds used.",
          "ℹ️ A slight decrease in average NDWI suggests a minor reduction in water content, but it's within a normal range and requires further monitoring.",
          "ℹ️ A slight increase in VV radar backscatter could indicate growth or changes in vegetation structure, but it could also be influenced by other factors."
        ],
        "recommendations": {
          "immediate_actions": [
            "Continue to visually inspect your crops for any signs of stress or disease.",
            "Monitor weather conditions and adjust irrigation as needed."
          ],
          "monitoring_plan": "Run this analysis again in one month to track any changes in crop health over time. Pay attention to any significant deviations in NDWI or VV values.",
          "follow_up_suggestions": "Consider using higher-resolution imagery or drone-based monitoring for a more detailed assessment of crop health if you suspect any localized issues."
        },
        "technical_context": {
          "api_used": "Agricultural Health Monitoring (/irrigation/detect)",
          "area_analyzed": "Approximately 0.002 km2 (based on bbox), with a resolution of 512x512 pixels.",
          "time_periods": "Reference period: 2025-08-04 to 2025-09-04; Recent period: 2025-09-04 to 2025-10-04",
          "key_thresholds": "NDWI threshold: 0.05; VV threshold: 1.0",
          "confidence_metrics": "Confidence fraction: 0.0"
        }
      }
    }
  };

  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! I\'m your satellite data assistant. I can help you analyze crop health, search for satellite imagery, and answer questions about agricultural monitoring. What would you like to know?',
      timestamp: new Date(Date.now() - 1000 * 60 * 5)
    },
    {
      id: 2,
      role: 'user',
      content: 'Can you analyze the health of my crops at Bygdøyveien, Oslo for the past month?',
      timestamp: new Date(Date.now() - 1000 * 60 * 4)
    },
    {
      id: 3,
      role: 'assistant',
      content: sampleApiResponse,
      timestamp: new Date(Date.now() - 1000 * 60 * 3),
      type: 'analysis'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    '3-recommendations': true,
    '3-technical': false,
    '3-visualizations': true
  });
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

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setIsTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setTimeout(() => {
      const aiMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: 'I\'m processing your request. This is a demo response showing how the AI would reply to your query about satellite data.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
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

  const renderImagerySearch = (apiResults, messageId) => {
    // Placeholder for imagery search visualization
    return (
      <div className="bg-white rounded-lg p-4 border border-blue-200">
        <h4 className="text-sm font-semibold text-slate-800 mb-3">
          Imagery Search Results
        </h4>
        <p className="text-sm text-slate-600">
          Visualization for imagery search results would go here (e.g., thumbnails, map view, timeline).
        </p>
      </div>
    );
  };

  const renderChangeDetection = (apiResults, messageId) => {
    // Placeholder for change detection visualization
    return (
      <div className="bg-white rounded-lg p-4 border border-amber-200">
        <h4 className="text-sm font-semibold text-slate-800 mb-3">
          Change Detection Results
        </h4>
        <p className="text-sm text-slate-600">
          Visualization for change detection would go here (e.g., before/after comparison, change heatmap).
        </p>
      </div>
    );
  };

  // MAIN VISUALIZATION ROUTER
  const renderVisualization = (apiUsed, apiResults, messageId) => {
    if (apiUsed.includes('Agricultural Health Monitoring')) {
      return renderAgriculturalHealthMonitoring(apiResults, messageId);
    } else if (apiUsed.includes('Imagery Search')) {
      return renderImagerySearch(apiResults, messageId);
    } else if (apiUsed.includes('Change Detection')) {
      return renderChangeDetection(apiResults, messageId);
    }
    // Default fallback
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <p className="text-sm text-slate-600">No visualization available for this API type.</p>
      </div>
    );
  };

  // MAIN MESSAGE RENDERER
  const renderAnalysisMessage = (message) => {
    const data = message.content;
    const analysis = data.metadata?.results_analysis;
    const apiResults = data.api_results;
    const apiUsed = analysis?.technical_context?.api_used;

    if (!analysis) {
      return <div className="text-md text-slate-700 leading-relaxed whitespace-pre-wrap">{data.response}</div>;
    }

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="text-md text-slate-700 leading-relaxed">
          {data.response.split('\n\n')[0]}
        </div>

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
                ) : (
                  <div className="text-md text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
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
              disabled={!input.trim()}
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
