from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import google.generativeai as genai
import os
import json
from typing import List, Dict, Optional
import asyncio
from dotenv import load_dotenv
import httpx
from scraper import router as satellite_router, BoundingBox
from irrigation import router as irrigation_router
from datetime import date, datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Initialize FastAPI
load_dotenv()
app = FastAPI(title="LEONA API", version="1.0.0")
app.include_router(satellite_router)
app.include_router(irrigation_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Gemini API keys with fallback
GEMINI_KEYS = [
    os.getenv("GEMINI_API_KEY"),
    os.getenv("GEMINI_API_KEY_ALT"),
    os.getenv("GEMINI_API_KEY_BACKUP"),
]

# Track current key index
_current_gemini_idx = 0


def get_gemini_model(model_name: str = "gemini-2.0-flash-exp", **kwargs):
    """
    Get a Gemini model with automatic fallback on quota errors.
    Returns a wrapper that will try fallback keys on quota errors.
    """
    return _GeminiModelWithFallback(model_name, **kwargs)


class _GeminiModelWithFallback:
    """Wrapper that tries fallback API keys when quota is exceeded."""

    def __init__(self, model_name: str, **model_kwargs):
        self.model_name = model_name
        self.model_kwargs = model_kwargs
        self._current_key_idx = _current_gemini_idx
        self._configure_current_key()

    def _configure_current_key(self):
        """Configure Gemini with the current key."""
        key = GEMINI_KEYS[self._current_key_idx]
        if not key:
            raise RuntimeError(
                f"Gemini API key at index {self._current_key_idx} is not set"
            )
        genai.configure(api_key=key)
        self._model = genai.GenerativeModel(
            model_name=self.model_name, **self.model_kwargs
        )

    def _is_quota_error(self, e: Exception) -> bool:
        """Check if exception is a quota/rate limit error."""
        error_str = str(e).lower()
        return any(
            term in error_str
            for term in [
                "quota",
                "resource exhausted",
                "rate limit",
                "429",
                "insufficient tokens",
            ]
        )

    def start_chat(self, **kwargs):
        """Start a chat session with automatic fallback support."""
        return _ChatSessionWithFallback(self, **kwargs)

    def generate_content(self, *args, **kwargs):
        """Generate content with automatic fallback on quota errors."""
        global _current_gemini_idx

        attempts = []
        start_idx = self._current_key_idx

        for i in range(len(GEMINI_KEYS)):
            idx = (start_idx + i) % len(GEMINI_KEYS)

            if not GEMINI_KEYS[idx]:
                continue

            try:
                if idx != self._current_key_idx:
                    self._current_key_idx = idx
                    self._configure_current_key()

                result = self._model.generate_content(*args, **kwargs)

                # Success! Update global index
                _current_gemini_idx = idx
                if i > 0:
                    logger.info(
                        f"Gemini generation succeeded with key {idx} after {i} attempts"
                    )

                return result

            except Exception as e:
                if self._is_quota_error(e):
                    logger.warning(f"Gemini key {idx} quota exceeded, trying next...")
                    attempts.append(f"Key {idx}: quota exceeded")
                    continue
                else:
                    # Non-quota error, raise immediately
                    raise

        raise RuntimeError(
            f"All Gemini API keys failed or exceeded quota. Attempts: {', '.join(attempts)}"
        )

    def __getattr__(self, name):
        """Delegate other methods to the underlying model."""
        return getattr(self._model, name)


class _ChatSessionWithFallback:
    """Wrapper for chat sessions with automatic fallback support."""

    def __init__(self, model_wrapper: _GeminiModelWithFallback, **kwargs):
        self.model_wrapper = model_wrapper
        self.kwargs = kwargs
        self._session = model_wrapper._model.start_chat(**kwargs)

    def send_message(self, *args, **kwargs):
        """Send message with automatic fallback on quota errors."""
        global _current_gemini_idx

        attempts = []
        start_idx = self.model_wrapper._current_key_idx

        for i in range(len(GEMINI_KEYS)):
            idx = (start_idx + i) % len(GEMINI_KEYS)

            if not GEMINI_KEYS[idx]:
                continue

            try:
                if idx != self.model_wrapper._current_key_idx:
                    self.model_wrapper._current_key_idx = idx
                    self.model_wrapper._configure_current_key()
                    # Restart chat session with new key
                    self._session = self.model_wrapper._model.start_chat(**self.kwargs)

                result = self._session.send_message(*args, **kwargs)

                # Success! Update global index
                _current_gemini_idx = idx
                if i > 0:
                    logger.info(
                        f"Gemini chat succeeded with key {idx} after {i} attempts"
                    )

                return result

            except Exception as e:
                if self.model_wrapper._is_quota_error(e):
                    logger.warning(f"Gemini key {idx} quota exceeded, trying next...")
                    attempts.append(f"Key {idx}: quota exceeded")
                    continue
                else:
                    raise

        raise RuntimeError(
            f"All Gemini API keys failed or exceeded quota. Attempts: {', '.join(attempts)}"
        )


def _validate_gemini_credentials():
    """Validate that at least one API key exists."""
    if not any(k for k in GEMINI_KEYS if k):
        logger.warning("No Gemini API keys configured")


_validate_gemini_credentials()


# Geocoding helper function
async def geocode_location(location_string: str) -> Optional[BoundingBox]:
    """
    Convert address/location string to bounding box coordinates
    Uses Nominatim (OpenStreetMap) for geocoding
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": location_string, "format": "json", "limit": 1},
                headers={"User-Agent": "LEONA-API/1.0"},
            )

            if response.status_code == 200 and response.json():
                result = response.json()[0]
                # Get bounding box from result
                bbox = result.get("boundingbox")
                if bbox:
                    return BoundingBox(
                        min_lat=float(bbox[0]),
                        max_lat=float(bbox[1]),
                        min_lon=float(bbox[2]),
                        max_lon=float(bbox[3]),
                    )
    except Exception as e:
        print(f"Geocoding error: {e}")

    return None


# Date parsing helper
def parse_relative_date(
    time_phrase: str, reference_date: date = None
) -> tuple[date, date, date, date]:
    """
    Parse natural language time phrases into reference and recent period dates
    Returns: (ref_start, ref_end, recent_start, recent_end)
    """
    if reference_date is None:
        reference_date = date.today()

    time_phrase = time_phrase.lower()

    # Past month
    if "past month" in time_phrase or "last month" in time_phrase:
        recent_end = reference_date
        recent_start = recent_end - timedelta(days=30)
        ref_end = recent_start
        ref_start = ref_end - timedelta(days=30)

    # Past 6 months
    elif "past 6 months" in time_phrase or "last 6 months" in time_phrase:
        recent_end = reference_date
        recent_start = recent_end - timedelta(days=180)
        ref_end = recent_start
        ref_start = ref_end - timedelta(days=180)

    # This year vs last year
    elif "this year" in time_phrase:
        recent_end = reference_date
        recent_start = date(reference_date.year, 1, 1)
        ref_end = date(reference_date.year - 1, recent_end.month, recent_end.day)
        ref_start = date(reference_date.year - 1, 1, 1)

    # Default: last 30 days vs previous 30 days
    else:
        recent_end = reference_date
        recent_start = recent_end - timedelta(days=30)
        ref_end = recent_start
        ref_start = ref_end - timedelta(days=30)

    return ref_start, ref_end, recent_start, recent_end


async def call_satellite_api(api_endpoint: str, parameters: Dict) -> Optional[Dict]:
    """
    Call the satellite analysis endpoints via HTTP requests
    """
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Prepare the payload
            payload = {}

            if api_endpoint == "/satellite/deforestation":
                bbox_data = parameters.get("bbox", {})
                payload = {
                    "min_lon": bbox_data.get("min_lon"),
                    "min_lat": bbox_data.get("min_lat"),
                    "max_lon": bbox_data.get("max_lon"),
                    "max_lat": bbox_data.get("max_lat"),
                }
                query_params = {
                    "region_name": parameters.get("region_name"),
                    "ref_start": parameters.get("ref_start"),
                    "ref_end": parameters.get("ref_end"),
                    "recent_start": parameters.get("recent_start"),
                    "recent_end": parameters.get("recent_end"),
                }

            elif api_endpoint == "/satellite/urban_heat":
                bbox_data = parameters.get("bbox", {})
                payload = {
                    "min_lon": bbox_data.get("min_lon"),
                    "min_lat": bbox_data.get("min_lat"),
                    "max_lon": bbox_data.get("max_lon"),
                    "max_lat": bbox_data.get("max_lat"),
                }
                scene_date = parameters.get("scene_date")
                if not scene_date:
                    scene_date = parameters.get("recent_end")
                if hasattr(scene_date, "strftime"):
                    # It's a date object - convert to string
                    scene_date = scene_date.strftime("%Y-%m-%d")
                elif scene_date and not isinstance(scene_date, str):
                    # Convert to string if it's not already
                    scene_date = str(scene_date)
                query_params = {
                    "region_name": parameters.get("region_name"),
                    "scene_date": scene_date,
                }

            elif api_endpoint == "/irrigation/detect":
                bbox_data = parameters.get("bbox", {})

                # Validate bbox data
                if not all(
                    k in bbox_data for k in ["min_lon", "min_lat", "max_lon", "max_lat"]
                ):
                    return {
                        "error": "Invalid bounding box data",
                        "details": f"Missing required bbox fields. Got: {list(bbox_data.keys())}",
                    }

                payload = {
                    "min_lon": float(bbox_data.get("min_lon")),
                    "min_lat": float(bbox_data.get("min_lat")),
                    "max_lon": float(bbox_data.get("max_lon")),
                    "max_lat": float(bbox_data.get("max_lat")),
                }

                # Query parameters - the dates (as strings in YYYY-MM-DD format)
                query_params = {
                    "ref_start": str(parameters.get("ref_start")),
                    "ref_end": str(parameters.get("ref_end")),
                    "recent_start": str(parameters.get("recent_start")),
                    "recent_end": str(parameters.get("recent_end")),
                }

            # Make the POST request to the endpoint
            response = await client.post(
                f"http://localhost:8000{api_endpoint}",
                json=payload,
                params=query_params,
            )

            # Log the response for debugging
            print(f"DEBUG - Response status: {response.status_code}")
            if response.status_code != 200:
                print(f"DEBUG - Response body: {response.text}")

            if response.status_code == 200:
                return response.json()
            else:
                return {
                    "error": f"API returned status {response.status_code}",
                    "details": response.text,
                }

    except Exception as e:
        import traceback

        return {
            "error": "Failed to call satellite API",
            "details": str(e),
            "traceback": traceback.format_exc(),
        }


# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# API endpoint mapping
API_MAP = {
    "deforestation": {
        "endpoint": "/satellite/deforestation",
        "name": "Deforestation Detection",
    },
    "urban_heat": {
        "endpoint": "/satellite/urban_heat",
        "name": "Urban Heat Island Mapping",
    },
    "irrigation": {
        "endpoint": "/irrigation/detect",
        "name": "Agricultural Health Monitoring",
    },
}

# System prompt with API specifications
SYSTEM_PROMPT = """
You are LEONA, an AI assistant specialized in satellite data analysis and earth observation. Your role is to help users understand how satellite data can solve their business problems AND to explain analysis results in clear, actionable terms.

## Available Satellite Data Analysis APIs:

### 1. Deforestation Detection
- **API**: `/satellite/deforestation`
- **Purpose**: Detect forest cover loss and illegal logging
- **Required Input**: 
  - bbox: Bounding box coordinates (min_lat, min_lon, max_lat, max_lon)
  - region_name: Name/description of the region
  - ref_start: Reference period start date (YYYY-MM-DD)
  - ref_end: Reference period end date (YYYY-MM-DD)
  - recent_start: Recent period start date (YYYY-MM-DD)
  - recent_end: Recent period end date (YYYY-MM-DD)
- **Output**: Forest loss areas (hectares), change maps, confidence scores
- **Use Cases**: Supply chain compliance, ESG reporting, conservation monitoring
- **Data Sources**: Sentinel-2, Landsat 8/9
- **Example**: "Monitor palm oil plantations in Indonesia for deforestation"

### 2. Urban Heat Island Mapping
- **API**: `/satellite/urban_heat`
- **Purpose**: Identify and map urban heat patterns
- **Required Input**:
  - bbox: Bounding box coordinates (min_lat, min_lon, max_lat, max_lon)
  - region_name: City or area name
  - scene_date: Date for analysis (YYYY-MM-DD)
- **Output**: Temperature differential maps, hotspot locations, severity rankings
- **Use Cases**: Climate adaptation planning, urban development, public health
- **Data Sources**: Landsat 8/9 thermal bands, Sentinel-3
- **Example**: "Map heat islands in Phoenix for climate resilience planning"

### 3. Agricultural Health Monitoring
- **API**: `/irrigation/detect`
- **Purpose**: Assess crop stress and vegetation health, detect irrigation patterns
- **Required Input**:
  - bbox: Bounding box coordinates (min_lat, min_lon, max_lat, max_lon)
  - region_name: Farm or region name
  - ref_start: Reference period start date (YYYY-MM-DD)
  - ref_end: Reference period end date (YYYY-MM-DD)
  - recent_start: Recent period start date (YYYY-MM-DD)
  - recent_end: Recent period end date (YYYY-MM-DD)
- **Output**: NDVI/EVI indices, stress indicators, irrigation detection
- **Use Cases**: Precision agriculture, insurance claims, food security, water management
- **Data Sources**: Sentinel-2, Planet Labs
- **Example**: "Monitor wheat fields in Kansas for drought stress"

## Your Task:
When a user describes their problem or question:
1. **Understand** their business objective and constraints
2. **Evaluate** which of our 3 APIs best matches their need
3. **Check for required parameters** - if missing, ask the user for them
4. **Assign a confidence score** (0.0-1.0) for how well each API fits
5. **If API results are provided** - analyze and explain them thoroughly
6. Always provide useful content in `"response"` — even when there are no matching APIs, explain why and suggest alternatives based on backed up research or industry use cases

### Parameter Collection Strategy:
You are INTELLIGENT about extracting information from natural language. Try to infer and convert user input before asking for clarification.

**Geographic Information Extraction:**
- If user provides an address (e.g., "Bygdøyveien, 0287 Oslo"): Extract it and note that coordinates will be geocoded
- If user mentions a city/region: Use that as region_name
- If user provides coordinates: Use them directly
- ONLY ask for location if absolutely no geographic information is provided
- Never return null for bbox coordinates. If only region name is provided, use approximate coordinates.

**Time Information Extraction:**
- "past month" → Calculate: recent period = last 30 days, reference period = 30 days before that
- "last 6 months" → Recent = last 6 months, reference = 6 months before that
- "this year vs last year" → Recent = current year so far, reference = same period last year
- "summer 2024" → Recent = June-August 2024, reference = June-August 2023
- Specific dates → Use exactly as provided
- TODAY'S DATE for calculations: 2025-10-04
- If no date is provided, default to today's date and assume a recent time period for other missing date parameters.

**Smart Defaults:**
- For crop monitoring: Default to comparing last 30 days vs previous 30 days
- For deforestation: Default to last year vs previous year if not specified
- For urban heat: Default to most recent clear day if not specified

**When to Ask for Clarification:**
ONLY ask if:
1. No geographic information whatsoever (not even a country mentioned)
2. Time period is completely ambiguous or contradictory
3. User asks multiple conflicting things

### API Results Analysis:
When API results are included in the response, you MUST provide a comprehensive, conversational analysis. Think like a data analyst explaining findings to a client who may not be technical.

**Universal Analysis Principles (apply to ALL endpoints):**

1. **Understand the Context**: What API was called? What was the user trying to find out?

2. **Examine the Data Structure**: Look at all fields returned - metrics, statistics, counts, areas, scores, etc.

3. **Interpret Key Metrics**:
   - What do the numbers actually mean in plain language?
   - Are values high/low/normal for this type of analysis?
   - What do positive vs negative values indicate?
   - What do statistics (mean, std, min, max) tell us about patterns?

4. **Detect Patterns and Anomalies**:
   - Are there consistent trends (all positive, all negative)?
   - High variability (large std deviation) or uniform (small std)?
   - Any outliers in min/max values?
   - Zero detections vs significant detections?

5. **Connect to Real-World Meaning**:
   - Deforestation: Is forest being lost? How much? Where are hotspots?
   - Heat Islands: Which areas are hottest? By how much? Is it concerning?
   - Agriculture: Are crops healthy/stressed? Is irrigation present? Water changes?

6. **Assess Confidence and Quality**:
   - Confidence scores/fractions - NOTE: be as clear as possible, call it change fraction, detection confidence, etc.
   - Resolution and area analyzed
   - Any data quality indicators
   - Seasonal or weather-related caveats

7. **Provide Actionable Insights**:
   - What should the user do with this information?
   - What needs immediate attention?
   - What should be monitored over time?
   - When should they run the analysis again?

**Analysis Style Guidelines:**
- Write conversationally, not like a technical report
- Start with the "so what?" - the most important finding
- Use analogies and comparisons to make numbers relatable
- Break complex metrics into digestible pieces
- Always tie back to the user's specific use case and location
- Be honest about limitations and uncertainties
- End with clear next steps

**Common Metric Interpretations:**
- **Delta/Change metrics**: Positive = increase, Negative = decrease
- **Statistics (mean, std)**: Mean = average value, Std = how much variation exists
- **Thresholds**: Values used to classify whether something is detected or not
- **Confidence/Fraction**: How certain the analysis is (0-1 or 0-100%)
- **Area metrics**: Convert to relatable units (football fields, city blocks)
- **Pixel counts**: Relate to actual ground area
- "confidence_fraction" in API responses should be explained as "detection coverage" or "affected area fraction"
- When discussing this metric, always clarify: "The value labeled 'confidence_fraction' represents the proportion of the analyzed area where changes exceeded detection thresholds, NOT a measure of statistical confidence"

### Response Format:

**If you CAN extract/infer the information (NO API RESULTS YET):**
{
  "response": "A conversational summary of your understanding and recommendations",
  "understanding": "Rephrase what you understand",
  "confidence_level": "high|medium|low",
  "has_complete_info": true,
  "extracted_parameters": {
    "location_extracted": "Bygdøyveien, 0287 Oslo",
    "needs_geocoding": true,
    "time_period_interpretation": "past month = 2025-09-04 to 2025-10-04 (recent), 2025-08-04 to 2025-09-04 (reference)",
    "inferred_values": "List any assumptions you made"
  },
  "recommended_apis": [
    {
      "api_name": "Agricultural Health Monitoring",
      "api_endpoint": "/irrigation/detect",
      "relevance_score": 0.9,
      "match_type": "direct",
      "reasoning": "Why this API matches their need",
      "required_parameters": {
        "bbox": {
          "min_lat": 59.9087795,
          "min_lon": 10.6790478,
          "max_lat": 59.9122268,
          "max_lon": 10.6816216
        },
        "region_name": "Bygdøyveien, 0287 Oslo",
        "ref_start": "2025-08-04",
        "ref_end": "2025-09-04",
        "recent_start": "2025-09-04",
        "recent_end": "2025-10-04"
      }
    }
  ],
  "clarification_note": "I interpreted 'past month' as the last 30 days. Let me know if you'd like a different time range.",
  "alternative_applications": "ONLY include this field if ALL recommended APIs have relevance_score < 0.6. Provide 3-5 real-world use cases or research applications that demonstrate satellite data capabilities related to the user's domain of interest. Include specific examples, research papers, or industry applications."
}

**If API RESULTS ARE PROVIDED:**
{
  "understanding": "Rephrase the user's original question",
  "confidence_level": "high",
  "has_complete_info": true,
  
  "results_summary": "A conversational 2-4 sentence overview of what the data shows. Start with the most important finding.",
  
  "detailed_analysis": "A comprehensive, paragraph-form analysis that:
    - Explains what each key metric means in plain language
    - Identifies patterns and what they indicate
    - Compares values to typical ranges or expectations
    - Discusses variability and what it suggests
    - Connects findings to the user's specific location and use case
    - Notes any seasonal, weather, or contextual factors
    - Addresses data quality and confidence levels
    
    Write this as flowing prose, not bullet points. Imagine explaining to a colleague over coffee.",
  
  "key_takeaways": [
    "Most important finding 1 (with emoji if helpful: ✓, ⚠️, ℹ️)",
    "Most important finding 2",
    "Most important finding 3"
  ],
  
  "recommendations": {
    "immediate_actions": ["What to do right now"],
    "monitoring_plan": "How to track this over time",
    "follow_up_suggestions": "Additional analyses or considerations"
  },
  
  "technical_context": {
    "api_used": "API name and endpoint",
    "area_analyzed": "Size and resolution",
    "time_periods": "Reference vs recent periods",
    "key_thresholds": "Any detection thresholds used",
    "confidence_metrics": "Overall confidence in results"
  },
  
  "limitations": "Any caveats about the data quality, seasonal factors, or analysis constraints"
}

## Critical Guidelines:
- **ALWAYS provide content in the "response" field** - never leave it empty, even when no APIs match
- **BE SMART about extracting information** - don't ask for things the user already told you
- **Interpret natural language** - "past month", "last summer", "this year" are all valid
- **Extract locations** - addresses, city names, landmarks are all usable (note they need geocoding)
- **Show your work** - tell the user what you interpreted and give them a chance to correct
- **Make reasonable assumptions** - and tell the user what you assumed
- **Ask only when truly stuck** - no location mentioned at all, or completely ambiguous request

## Response Format Requirements:

**ALWAYS include "response" with useful content** - even when no APIs match:

**When NO APIs match (all relevance_score < 0.6 or no recommended_apis):**
- IMPORTANT: If you are going to recommend that our API be repurposed or adapted, put it under recommended_apis and explain how it can be adapted. You should NOT put it under alternative_applications. Query the API and explain the results. Follow the IF API RESULTS ARE PROVIDED format.
{
  "response": "A comprehensive,but concise explanation that:
    - Acknowledges the user's specific domain/interest
    - Explains why our current APIs don't directly match their needs
    - Provides 3-5 specific alternative applications of satellite data for their domain
    - Includes real-world examples, research papers, or industry use cases
    - Suggests how they might adapt existing analyses or what future capabilities could help",
  "understanding": "Rephrase the user's query",
  "confidence_level": "low",
  "has_complete_info": true,
  "recommended_apis": [if our APIs could be adapted, put them here],
  "alternative_applications": [ # Make this REQUIRED when no APIs match
    {
      "title": "Specific application title",
      "description": "Detailed description of how satellite data is used",
      "research_basis": "Reference to studies or industry implementations",
      "potential_adaptation": "How our existing APIs might be partially adapted"
    },
    ... more applications ...
  ],
  "future_capabilities": "What emerging satellite technologies or analyses might better serve this need"
}

**CRITICAL: Never return an empty "response" field. If no APIs match, use the opportunity to educate about satellite data applications.**

**For follow-up questions or explanations (no new API recommendation needed):**
{
  "response": "Your detailed explanation or answer to the user's question. This should be comprehensive and directly address what they asked about.",
  "understanding": "What the user is asking about",
  "confidence_level": "high",
  "is_followup": true,
  "context": "Reference to previous conversation context if relevant"
}

## Response Type Detection:
- **New query requiring API recommendation**: Use the "If you CAN extract/infer" format
- **Follow-up explanation/clarification**: Use the "For follow-up questions" format with detailed response
- **API results provided**: Use the "If API RESULTS ARE PROVIDED" format
"""


# Request/Response models
class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[Dict[str, str]]] = []
    execute_api: bool = False


class ChatResponse(BaseModel):
    response: str
    recommended_apis: Optional[List[Dict]] = []
    metadata: Optional[Dict] = {}
    needs_more_info: bool = False
    missing_parameters: Optional[List[Dict]] = []
    api_results: Optional[Dict] = None


class UserQuery(BaseModel):
    query: str
    bbox: Optional[BoundingBox] = None
    region_name: Optional[str] = None
    ref_start: Optional[date] = None
    ref_end: Optional[date] = None
    recent_start: Optional[date] = None
    recent_end: Optional[date] = None
    scene_date: Optional[date] = None


# Initialize Gemini model with system instructions
model = get_gemini_model(
    model_name="gemini-2.0-flash-exp",
    system_instruction=SYSTEM_PROMPT,
    generation_config={
        "temperature": 0.7,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 2048,
        "response_mime_type": "application/json",
    },
)


async def analyze_api_results(
    original_query: str,
    api_name: str,
    api_endpoint: str,
    parameters: Dict,
    api_results: Dict,
) -> Dict:
    """
    Second pass: Have the LLM analyze the API results
    """
    analysis_prompt = f"""
The user asked: "{original_query}"

We called the {api_name} API ({api_endpoint}) with these parameters:
{json.dumps(parameters, indent=2)}

The API returned these results:
{json.dumps(api_results, indent=2)}

Now provide a comprehensive analysis of these results following the format specified in your instructions.
Remember to:
1. Explain what the data means in plain language
2. Identify patterns and insights
3. Connect findings to the user's specific use case and location
4. Provide actionable recommendations
5. Be conversational and insightful

Return your analysis in the JSON format specified for "If API RESULTS ARE PROVIDED" in your system instructions.
"""

    try:
        chat_session = model.start_chat(history=[])
        response = chat_session.send_message(analysis_prompt)

        analysis_json = json.loads(response.text)
        return analysis_json

    except json.JSONDecodeError as e:
        # Fallback if JSON parsing fails
        return {
            "results_summary": response.text[:500],
            "detailed_analysis": response.text,
            "key_takeaways": ["See detailed analysis above"],
            "recommendations": {
                "immediate_actions": ["Review the detailed analysis"],
                "monitoring_plan": "Continue monitoring as needed",
                "follow_up_suggestions": "Contact support if you need help interpreting results",
            },
        }
    except Exception as e:
        return {
            "error": f"Failed to analyze results: {str(e)}",
            "raw_results": api_results,
        }


# CHAT HISTORY
CHAT_HISTORY_FILE = "chat_history.json"


class ChatHistory(BaseModel):
    chats: List[dict]


@app.get("/api/chat-history")
async def get_chat_history():
    if os.path.exists(CHAT_HISTORY_FILE):
        with open(CHAT_HISTORY_FILE, "r") as f:
            data = json.load(f)
            return data
    return {"chats": []}


@app.post("/api/chat-history")
async def save_chat_history(history: ChatHistory):
    with open(CHAT_HISTORY_FILE, "w") as f:
        json.dump(history.dict(), f, indent=2)
    return {"status": "success", "message": "Chat history saved"}


@app.delete("/api/chat-history/{chat_id}")
async def delete_chat(chat_id: str):
    if os.path.exists(CHAT_HISTORY_FILE):
        with open(CHAT_HISTORY_FILE, "r") as f:
            data = json.load(f)

        data["chats"] = [c for c in data["chats"] if c["id"] != chat_id]

        with open(CHAT_HISTORY_FILE, "w") as f:
            json.dump(data, f, indent=2)

        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Chat not found")


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Main chat endpoint - processes user queries and returns AI recommendations
    """
    try:
        chat_session = model.start_chat(history=[])

        user_message = request.message

        if request.conversation_history:
            history_context = "\n\nPrevious conversation:\n"
            for msg in request.conversation_history[-5:]:
                history_context += f"{msg['role']}: {msg['content']}\n"
            user_message = history_context + "\nCurrent query: " + request.message

        # FIRST PASS: Get recommendations
        response = chat_session.send_message(user_message)

        try:
            response_json = json.loads(response.text)

            # Check if we need more information
            needs_more_info = "missing_information" in response_json
            missing_params = response_json.get("missing_information", [])

            if needs_more_info:
                return ChatResponse(
                    response=response_json.get("understanding", "")
                    + "\n\n"
                    + "\n".join(response_json.get("questions_for_user", [])),
                    recommended_apis=[],
                    metadata={
                        "understanding": response_json.get("understanding", ""),
                        "partial_recommendation": response_json.get(
                            "partial_recommendation", ""
                        ),
                    },
                    needs_more_info=True,
                    missing_parameters=missing_params,
                )

            recommended_apis = response_json.get("recommended_apis", [])

            # Try to geocode location if address was provided
            extracted_params = response_json.get("extracted_parameters", {})
            bbox = None
            if extracted_params.get("needs_geocoding") and extracted_params.get(
                "location_extracted"
            ):
                location = extracted_params["location_extracted"]
                bbox = await geocode_location(location)

                # Add geocoded coordinates to recommended APIs
                for api in recommended_apis:
                    if "required_parameters" in api and bbox:
                        api["required_parameters"]["bbox"] = {
                            "min_lat": bbox.min_lat,
                            "min_lon": bbox.min_lon,
                            "max_lat": bbox.max_lat,
                            "max_lon": bbox.max_lon,
                        }
                        api["required_parameters"]["geocoded"] = True

            # EXECUTE API AND ANALYZE RESULTS
            api_results = None
            results_analysis = None

            if request.execute_api and recommended_apis:
                # Execute the top recommended API
                top_api = recommended_apis[0]
                api_endpoint = top_api.get("api_endpoint")
                parameters = top_api.get("required_parameters", {})

                # If bbox not set and we have geocoded it, use that
                if "bbox" not in parameters and bbox:
                    parameters["bbox"] = {
                        "min_lat": bbox.min_lat,
                        "min_lon": bbox.min_lon,
                        "max_lat": bbox.max_lat,
                        "max_lon": bbox.max_lon,
                    }

                # Call the API
                api_results = await call_satellite_api(api_endpoint, parameters)

                # SECOND PASS: Analyze the results
                if api_results and "error" not in api_results:
                    results_analysis = await analyze_api_results(
                        original_query=request.message,
                        api_name=top_api.get("api_name", "Unknown"),
                        api_endpoint=api_endpoint,
                        parameters=parameters,
                        api_results=api_results,
                    )

            # Build the response
            final_response = response_json.get("response", "")
            if recommended_apis:
                top_api = recommended_apis[0]
                final_response = (
                    f"**Recommended Analysis: {top_api.get('api_name')}**\n"
                )
                final_response += (
                    f"Confidence Score: {top_api.get('relevance_score', 0):.1%}\n"
                )
                final_response += f"Match Type: {top_api.get('match_type', 'N/A')}\n\n"
                final_response += f"*{top_api.get('reasoning', '')}*\n\n"

            # Second Pass: Results Analysis (if available)
            if results_analysis:
                final_response += "---\n\n**Analysis Results:**\n\n"
                final_response += results_analysis.get("results_summary", "")
                if "detailed_analysis" in results_analysis:
                    final_response += "\n\n" + results_analysis["detailed_analysis"]
            elif not request.execute_api and recommended_apis:
                # If we didn't execute, explain what would happen
                final_response += (
                    "To run this analysis, set `execute_api: true` in your request."
                )

            return ChatResponse(
                response=final_response,
                recommended_apis=recommended_apis,
                metadata={
                    "understanding": response_json.get("understanding", ""),
                    "confidence_level": response_json.get("confidence_level", "medium"),
                    "implementation_steps": response_json.get(
                        "implementation_steps", []
                    ),
                    "estimated_value": response_json.get("estimated_value", ""),
                    "limitations": response_json.get("limitations", ""),
                    "has_complete_info": response_json.get("has_complete_info", False),
                    "extracted_parameters": extracted_params,
                    "clarification_note": response_json.get("clarification_note", ""),
                    # Add analysis metadata if available
                    "results_analysis": results_analysis if results_analysis else None,
                    "alternative_applications": response_json.get(
                        "alternative_applications", []
                    ),
                },
                needs_more_info=False,
                missing_parameters=[],
                api_results=api_results,
            )

        except json.JSONDecodeError:
            return ChatResponse(
                response=response.text,
                recommended_apis=[],
                metadata={},
                needs_more_info=False,
                missing_parameters=[],
            )

    except Exception as e:
        import traceback

        raise HTTPException(
            status_code=500,
            detail=f"Error processing chat: {str(e)}\n{traceback.format_exc()}",
        )


# Endpoint to execute API call once user provides all information
@app.post("/api/execute")
async def execute_analysis(query: UserQuery):
    """
    Execute the actual satellite analysis once all parameters are collected
    """
    try:
        # Determine which API to call based on query
        # This is a simplified version - you might want to use Gemini to classify the query

        async with httpx.AsyncClient() as client:
            # Example: Call deforestation endpoint
            if (
                query.ref_start
                and query.ref_end
                and query.recent_start
                and query.recent_end
            ):
                response = await client.post(
                    f"http://localhost:8000{API_MAP['deforestation']['endpoint']}",
                    json={
                        "bbox": query.bbox.dict() if query.bbox else None,
                        "region_name": query.region_name,
                        "ref_start": str(query.ref_start),
                        "ref_end": str(query.ref_end),
                        "recent_start": str(query.recent_start),
                        "recent_end": str(query.recent_end),
                    },
                )
                return response.json()

            # Example: Call urban heat endpoint
            elif query.scene_date:
                response = await client.post(
                    f"http://localhost:8000{API_MAP['urban_heat']['endpoint']}",
                    json={
                        "bbox": query.bbox.dict() if query.bbox else None,
                        "region_name": query.region_name,
                        "scene_date": str(query.scene_date),
                    },
                )
                return response.json()

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error executing analysis: {str(e)}"
        )


# Streaming endpoint
@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming chat endpoint - returns response as it's generated
    """

    async def generate():
        try:
            chat_session = model.start_chat(history=[])
            user_message = request.message

            response = chat_session.send_message(user_message, stream=True)

            for chunk in response:
                if chunk.text:
                    yield f"data: {json.dumps({'text': chunk.text})}\n\n"
                    await asyncio.sleep(0.01)

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "LEONA API"}


# Root endpoint
@app.get("/")
async def root():
    return {
        "service": "LEONA API",
        "version": "1.0.0",
        "description": "AI-powered satellite data intelligence platform",
        "endpoints": {
            "chat": "/api/chat",
            "chat_stream": "/api/chat/stream",
            "execute": "/api/execute",
            "deforestation": "/satellite/deforestation",
            "urban_heat": "/satellite/urban_heat",
            "irrigation": "/irrigation/detect",
        },
    }
