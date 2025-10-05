import ee

# Initialize Earth Engine when the app starts
try:
    ee.Initialize(project="ee-jamietohhl")
    print("✅ Google Earth Engine initialized successfully")
except Exception as e:
    print(f"⚠️  Earth Engine initialization failed: {e}")
