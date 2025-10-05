# about

Provides an interface for querying satellite data endpoints and visualizing real-time data from LEO satellites (Sentinel-1, Sentinel-2, Landsat 8/9). The interface translates natural language queries into API calls, processes the satellite data through an ML model, and presents the results in accessible, visual formats.

## tech stack

- React 19.1.1 + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Three.js + React Three Fiber + Drei + Post-processing
- Recharts

## prerequisites

- Node.js 18+ and npm 9+
- Modern browser with WebGL support

## steps to get started

```
git clone https://github.com/jamz903/javy.git
cd frontend

npm install

# for dev
npm run dev

# for prod
npm run build
npm un preview
```

## features

- landing page for new chats
- chat history
- API documentation
- about us
- more to come :)

## current supported data sources

- Sentinel-1, Sentinel-2 (ESA)
- Landsat 8/9 (NASA/USGS)
