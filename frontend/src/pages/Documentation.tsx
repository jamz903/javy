import React, { useState } from 'react';
import { Search, Code, Copy, Check, ChevronDown, Satellite } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const dataSources = [
  {
    id: 'sentinel',
    name: 'Sentinel-2',
    description: 'ESA Copernicus optical imagery',
    icon: '🛰️',
    endpoints: [
      {
        id: 1,
        method: 'GET',
        endpoint: '/api/sentinel2/scenes',
        description: 'Search for Sentinel-2 scenes by location and date',
        params: ['bbox', 'start_date', 'end_date', 'cloud_cover'],
        example: `curl -X GET "https://api.example.com/api/sentinel2/scenes?bbox=-122.5,37.7,-122.3,37.9&start_date=2024-01-01&end_date=2024-12-31" \\
  -H "Authorization: Bearer YOUR_TOKEN"`
      },
      {
        id: 2,
        method: 'GET',
        endpoint: '/api/sentinel2/download/{scene_id}',
        description: 'Download a specific Sentinel-2 scene',
        params: ['scene_id', 'bands'],
        example: `curl -X GET "https://api.example.com/api/sentinel2/download/S2A_MSIL2A_20240101T123456" \\
  -H "Authorization: Bearer YOUR_TOKEN"`
      }
    ]
  },
  {
    id: 'landsat',
    name: 'Landsat 8/9',
    description: 'USGS/NASA multispectral imagery',
    icon: '🌍',
    endpoints: [
      {
        id: 3,
        method: 'GET',
        endpoint: '/api/landsat/search',
        description: 'Search Landsat imagery catalog',
        params: ['path', 'row', 'date_range', 'tier'],
        example: `curl -X GET "https://api.example.com/api/landsat/search?path=44&row=34&date_range=2024-01-01,2024-12-31" \\
  -H "Authorization: Bearer YOUR_TOKEN"`
      },
      {
        id: 4,
        method: 'POST',
        endpoint: '/api/landsat/process',
        description: 'Process Landsat data with custom parameters',
        params: ['scene_id', 'processing_level', 'output_format'],
        example: `curl -X POST "https://api.example.com/api/landsat/process" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{"scene_id": "LC08_L2SP_044034_20240101", "processing_level": "surface_reflectance"}'`
      },
      {
        id: 5,
        method: 'GET',
        endpoint: '/api/landsat/metadata/{scene_id}',
        description: 'Get metadata for a Landsat scene',
        params: ['scene_id'],
        example: `curl -X GET "https://api.example.com/api/landsat/metadata/LC08_L2SP_044034_20240101" \\
  -H "Authorization: Bearer YOUR_TOKEN"`
      }
    ]
  },
  {
    id: 'modis',
    name: 'MODIS',
    description: 'NASA Terra/Aqua moderate resolution data',
    icon: '🌐',
    endpoints: [
      {
        id: 6,
        method: 'GET',
        endpoint: '/api/modis/products',
        description: 'List available MODIS products',
        params: ['satellite', 'product_type'],
        example: `curl -X GET "https://api.example.com/api/modis/products?satellite=terra&product_type=vegetation" \\
  -H "Authorization: Bearer YOUR_TOKEN"`
      },
      {
        id: 7,
        method: 'GET',
        endpoint: '/api/modis/download',
        description: 'Download MODIS data tiles',
        params: ['product', 'h', 'v', 'date'],
        example: `curl -X GET "https://api.example.com/api/modis/download?product=MOD13Q1&h=10&v=05&date=2024-01-01" \\
  -H "Authorization: Bearer YOUR_TOKEN"`
      }
    ]
  },
  {
    id: 'sar',
    name: 'SAR (Sentinel-1)',
    description: 'Synthetic Aperture Radar imagery',
    icon: '📡',
    endpoints: [
      {
        id: 8,
        method: 'GET',
        endpoint: '/api/sar/scenes',
        description: 'Query SAR scenes by area of interest',
        params: ['bbox', 'polarization', 'orbit_direction'],
        example: `curl -X GET "https://api.example.com/api/sar/scenes?bbox=-122.5,37.7,-122.3,37.9&polarization=VV" \\
  -H "Authorization: Bearer YOUR_TOKEN"`
      },
      {
        id: 9,
        method: 'POST',
        endpoint: '/api/sar/interferometry',
        description: 'Create interferogram from SAR pair',
        params: ['master_scene', 'slave_scene', 'method'],
        example: `curl -X POST "https://api.example.com/api/sar/interferometry" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{"master_scene": "S1A_IW_SLC__1SDV_20240101", "slave_scene": "S1A_IW_SLC__1SDV_20240113"}'`
      }
    ]
  },
  {
    id: 'planet',
    name: 'Planet Labs',
    description: 'High-resolution daily imagery',
    icon: '🪐',
    endpoints: [
      {
        id: 10,
        method: 'GET',
        endpoint: '/api/planet/search',
        description: 'Search Planet imagery by filters',
        params: ['geometry', 'date', 'item_type', 'cloud_cover'],
        example: `curl -X GET "https://api.example.com/api/planet/search?item_type=PSScene&cloud_cover=0.1" \\
  -H "Authorization: Bearer YOUR_TOKEN"`
      },
      {
        id: 11,
        method: 'POST',
        endpoint: '/api/planet/order',
        description: 'Place an order for Planet imagery',
        params: ['item_ids', 'product_bundle', 'delivery'],
        example: `curl -X POST "https://api.example.com/api/planet/order" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{"item_ids": ["20240101_123456_0e16"], "product_bundle": "analytic_sr_udm2"}'`
      }
    ]
  }
];

export default function Documentation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState(dataSources[0].endpoints[0]);
  const [openSources, setOpenSources] = useState({ [dataSources[0].id]: true });
  const [copiedId, setCopiedId] = useState(null);
  const [testRequest, setTestRequest] = useState('');
  const [testResponse, setTestResponse] = useState('');

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
    <div className="min-h-screen bg-slatse-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Satellite className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Current APIs</h1>
          </div>
          <p className="text-slate-600">Access multiple satellite data sources through unified APIs</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Sources</CardTitle>
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
                            className={`p-4 pl-16 border-b cursor-pointer transition-colors hover:bg-slate-50 ${selectedEndpoint.id === api.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
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
          </div>
        </div>
      </div>
    </div>
  );
}
