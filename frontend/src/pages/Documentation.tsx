import { useState, useEffect } from 'react';
import { Search, Copy, Check, ChevronDown, AlertCircle, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Parse OpenAPI spec and organize into data sources
const parseOpenAPISpec = (spec) => {
  if (!spec || !spec.paths) return [];

  const sources = {};
  let endpointId = 1;

  Object.entries(spec.paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, details]) => {
      const tag = details.tags?.[0] || 'general';

      if (!sources[tag]) {
        sources[tag] = {
          id: tag,
          name: tag.charAt(0).toUpperCase() + tag.slice(1),
          description: `${tag.charAt(0).toUpperCase() + tag.slice(1)} endpoints`,
          icon: tag === 'satellite' ? '🛰️' : tag === 'irrigation' ? '💧' : '🌍',
          endpoints: []
        };
      }

      // Extract parameters
      const params = [];
      if (details.parameters) {
        params.push(...details.parameters.map(p => p.name));
      }

      // Extract request body properties
      const requestBodySchema = details.requestBody?.content?.['application/json']?.schema;
      if (requestBodySchema) {
        if (requestBodySchema.$ref) {
          const schemaName = requestBodySchema.$ref.split('/').pop();
          const schema = spec.components?.schemas?.[schemaName];
          if (schema?.properties) {
            params.push(...Object.keys(schema.properties));
          }
        }
      }

      // Build example curl command
      let example = `curl -X ${method.toUpperCase()} "http://localhost:8000${path}`;

      // Add query parameters to example
      const queryParams = details.parameters?.filter(p => p.in === 'query') || [];
      if (queryParams.length > 0) {
        const exampleParams = queryParams.map(p => {
          let value = 'value';
          if (p.schema?.format === 'date') value = '2024-01-01';
          else if (p.schema?.type === 'integer') value = p.schema?.default || '512';
          else if (p.schema?.type === 'number') value = p.schema?.default || '0.05';
          else if (p.schema?.type === 'boolean') value = 'false';
          else value = p.schema?.default || 'value';
          return `${p.name}=${value}`;
        }).join('&');
        example += `?${exampleParams}`;
      }

      example += '"';

      // Add request body to example
      if (requestBodySchema) {
        example += ` \\\n  -H "Content-Type: application/json"`;
        if (requestBodySchema.$ref?.includes('BoundingBox')) {
          example += ` \\\n  -d '{"min_lon": -122.5, "min_lat": 37.7, "max_lon": -122.3, "max_lat": 37.9}'`;
        } else if (requestBodySchema.$ref?.includes('ChatRequest')) {
          example += ` \\\n  -d '{"message": "your query here"}'`;
        } else if (requestBodySchema.$ref?.includes('UserQuery')) {
          example += ` \\\n  -d '{"query": "your query here"}'`;
        }
      }

      sources[tag].endpoints.push({
        id: endpointId++,
        method: method.toUpperCase(),
        endpoint: path,
        description: details.description || details.summary || 'No description available',
        params: [...new Set(params)],
        example
      });
    });
  });

  return Object.values(sources);
};

export default function Documentation() {
  const [dataSources, setDataSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [openSources, setOpenSources] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [testRequest, setTestRequest] = useState('');
  const [testResponse, setTestResponse] = useState('');

  useEffect(() => {
    const fetchAPISpec = async () => {
      try {
        const response = await fetch('http://localhost:8000/openapi.json');
        if (!response.ok) throw new Error('Failed to fetch API specification');

        const spec = await response.json();
        const sources = parseOpenAPISpec(spec);

        setDataSources(sources);

        // Set first endpoint as selected and open first source
        if (sources.length > 0 && sources[0].endpoints.length > 0) {
          setSelectedEndpoint(sources[0].endpoints[0]);
          setOpenSources({ [sources[0].id]: true });
        }

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAPISpec();
  }, []);

  const toggleSource = (sourceId) => {
    setOpenSources(prev => ({ ...prev, [sourceId]: !prev[sourceId] }));
  };

  const filteredSources = dataSources.map(source => ({
    ...source,
    endpoints: source.endpoints.filter(api =>
      api.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      api.method.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(source => source.endpoints.length > 0);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: 'bg-blue-500',
      POST: 'bg-green-500',
      PUT: 'bg-yellow-500',
      DELETE: 'bg-red-500',
      PATCH: 'bg-purple-500'
    };
    return colors[method] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">API Documentation</h1>
          </div>
          <p className="text-slate-600">Satellite imagery analysis and environmental monitoring APIs</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-600">Loading API documentation...</div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load API specification: {error}. Make sure the API server is running at http://localhost:8000
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && dataSources.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No API endpoints found in the specification.
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && dataSources.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">API Endpoints</CardTitle>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search endpoints..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[600px] overflow-y-auto">
                    {filteredSources.map((source) => (
                      <Collapsible
                        key={source.id}
                        open={openSources[source.id]}
                        onOpenChange={() => toggleSource(source.id)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-4 border-b hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3 text-left">
                              <span className="text-2xl">{source.icon}</span>
                              <div>
                                <h3 className="font-semibold text-slate-900">{source.name}</h3>
                                <p className="text-xs text-slate-600">{source.description}</p>
                              </div>
                            </div>
                            <ChevronDown
                              className={`w-5 h-5 text-slate-400 transition-transform ${openSources[source.id] ? 'transform rotate-180' : ''
                                }`}
                            />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          {source.endpoints.map((api) => (
                            <div
                              key={api.id}
                              onClick={() => setSelectedEndpoint(api)}
                              className={`p-4 pl-16 border-b cursor-pointer transition-colors hover:bg-slate-50 ${selectedEndpoint?.id === api.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`${getMethodColor(api.method)} text-white text-xs`}>
                                  {api.method}
                                </Badge>
                                <code className="text-xs font-mono text-slate-700">{api.endpoint}</code>
                              </div>
                              <p className="text-xs text-slate-600 mt-1">{api.description}</p>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {selectedEndpoint && (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Badge className={`${getMethodColor(selectedEndpoint.method)} text-white`}>
                          {selectedEndpoint.method}
                        </Badge>
                        <CardTitle className="font-mono text-xl">{selectedEndpoint.endpoint}</CardTitle>
                      </div>
                      <CardDescription className="mt-2">{selectedEndpoint.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-2">Parameters</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedEndpoint.params.map((param, idx) => (
                            <Badge key={idx} variant="outline" className="font-mono">
                              {param}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-slate-700">Example Request</h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(selectedEndpoint.example, selectedEndpoint.id)}
                          >
                            {copiedId === selectedEndpoint.id ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                          <code>{selectedEndpoint.example}</code>
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Test API</CardTitle>
                      <CardDescription>Send a request and view the response</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Request Body (JSON)
                        </label>
                        <Textarea
                          placeholder='{"key": "value"}'
                          value={testRequest}
                          onChange={(e) => setTestRequest(e.target.value)}
                          className="font-mono text-sm min-h-[120px]"
                        />
                      </div>

                      <Button className="w-full" onClick={() => setTestResponse('{\n  "status": "success",\n  "message": "This is a demo response",\n  "data": {}\n}')}>
                        Send Request
                      </Button>

                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          Response
                        </label>
                        <Textarea
                          placeholder="Response will appear here..."
                          value={testResponse}
                          readOnly
                          className="font-mono text-sm min-h-[120px] bg-slate-50"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
