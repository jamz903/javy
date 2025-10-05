# LEONA

## What is LEONA? 
LEONA democratizes access to LEO satellite data by bridging the gap between complex space infrastructure and everyday users. Our platform uses an ML-powered natural language interface that translates plain-language queries into API calls to a custom backend API we developed that retrieves data from LEO satellites (Sentinel-1, Sentinel-2, Landsat 8/9), performs automated analysis, and feeds into our ML model—trained on real satellite data and engineered to return structured, actionable outputs rather than typical conversational responses. This translation layer converts plain-language queries into API calls and transforms complex data into ready-to-use formats, removing technical barriers for non-experts. Built as an extensible, open-source platform, our API enables developers to expand functionality while maintaining accessibility. Operating on a freemium model—free for individuals, enterprise subscriptions for businesses—we target agriculture and sustainability compliance as beachhead markets. LEONA scales the commercial value of existing LEO infrastructure by democratizing data access, demonstrating how purpose-built technology and accessible business models can drive responsible Earth observation applications and contribute to the long-term economic viability of the LEO ecosystem.
Introducing our NASA Space Hackathon 2025 Submission.

This is our prototype, a full-stack web application with a React frontend and FastAPI backend.

## Declaration

In this hackathon, we utilised [Google Earth Engine](https://earthengine.google.com/) and [Sentinel Hub](https://www.sentinel-hub.com/) to pull satellite data, which is part of the [Copernicus Data Space Ecosystem](https://dataspace.copernicus.eu/). While we tried to use the [Nasa Open Data Portal](https://data.nasa.gov/dataset/), it was unavailable to us during this period of the hackathon.

We also used a 3D model of a [Space Station by Gerardo Justel](https://www.fab.com/listings/9042d765-4f32-4ef3-892a-aca6c14f8f60) for our frontend that falls under the [Creative Commons License](https://creativecommons.org/licenses/by/4.0/).

To formulate our business proposal, we utilised the [Space Commercialization NASA resources](https://www.nasa.gov/headquarters/library/find/bibliographies/space-commercialization/). More information can be found in our powerpoint slide deck also found in this repository .

We utilised AI during the process. When used, it is attributed in the form of a comment either at the top of the file or above the function.

## Setting Up
### Prerequisites

Before you begin, ensure you have the following installed:
- [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm#installing-and-updating)
- [uv (Python package manager)](https://docs.astral.sh/uv/getting-started/installation/)
- Git


### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install and use Node.js 24:
   ```bash
   nvm install 24
   nvm use 24
   ```

3. Install dependencies:
   ```bash
   npm i
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. You should see the frontend running on `localhost` (typically `http://localhost:5173`)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create your environment file:
   ```bash
   cp .sample.env .env
   ```

3. Open `.env` and add your API keys:
   - All required services offer free tiers
   - See the `.sample.env` file for required keys

4. **Google Earth Engine Authentication:**
   
   You need to create a Google Cloud project and enable the Earth Engine API.
   For a seamless experience, we suggest that you set it up manually:
   - Go to [Google Earth Engine](https://code.earthengine.google.com/)
   - Sign up and register your project
   - Follow the authentication prompts

5. Install the uv package manager if you haven't already:
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```
   
   Or on Windows:
   ```powershell
   powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
   ```

6. Start the backend server:
   ```bash
   uv run fastapi run
   ```

7. You should see the backend running on `localhost` (typically `http://localhost:8000`)

## Usage

Once both servers are running, you can access the application through your browser at the frontend URL.

## Troubleshooting

### Frontend Issues
- Make sure you're using Node.js 24: `node --version`
- Clear node_modules and reinstall: `rm -rf node_modules && npm i`

### Backend Issues
- Verify all API keys are correctly set in `.env`
- Ensure Google Earth Engine is properly authenticated
- Check that uv is installed: `uv --version`

## Platform Notes

This setup works on:
- **Linux**: Follow commands as written
- **Windows**: Untested

## Demo of Product
View our Full Product Walkthrough [here](https://youtu.be/N1v4GvBZzVQ)
