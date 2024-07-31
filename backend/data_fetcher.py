import requests
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

NOAA_API_BASE_URL = "https://www.ncdc.noaa.gov/cdo-web/api/v2/"
NOAA_API_TOKEN = os.getenv("NOAA_API_TOKEN")

def fetch_weather_stations(limit=1000, offset=1):
    headers = {"token": NOAA_API_TOKEN}
    params = {
        "datasetid": "GHCND",
        "limit": limit,
        "offset": offset
    }
    
    response = requests.get(f"{NOAA_API_BASE_URL}stations", headers=headers, params=params)
    response.raise_for_status()
    return response.json()

def fetch_weather_data(station_id, start_date, end_date):
    headers = {"token": NOAA_API_TOKEN}
    
    # Convert dates to datetime objects
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')
    
    # Ensure start date is not in the future
    today = datetime.now()
    if start > today:
        raise ValueError("Start date cannot be in the future")
    
    # Ensure end date is not before start date
    if end < start:
        raise ValueError("End date cannot be before start date")
    
    # Limit request to 1 year of data at a time
    if (end - start).days > 365:
        end = start + timedelta(days=365)
        logger.warning(f"Date range too large. Limiting to one year: {start.date()} to {end.date()}")
    
    params = {
        "datasetid": "GHCND",
        "stationid": station_id,
        "startdate": start.strftime('%Y-%m-%d'),
        "enddate": end.strftime('%Y-%m-%d'),
        "limit": 1000,
        "units": "metric"
    }
    
    logger.info(f"Fetching data from NOAA API for station {station_id}")
    response = requests.get(f"{NOAA_API_BASE_URL}data", headers=headers, params=params)
    
    if response.status_code == 400:
        logger.error(f"400 Client Error: {response.text}")
        raise ValueError(f"Invalid request: {response.text}")
    
    response.raise_for_status()
    data = response.json()
    
    logger.info(f"Received {len(data.get('results', []))} records from NOAA API")
    
    # Process the data into a more usable format
    processed_data = {}
    for item in data.get('results', []):
        date = item['date'][:10]  # Extract just the date part
        datatype = item['datatype']
        value = item['value']
        
        if date not in processed_data:
            processed_data[date] = {}
        
        processed_data[date][datatype] = value
    
    # Convert to list and calculate average temperature
    result = []
    for date, values in processed_data.items():
        temp = None
        if 'TAVG' in values:
            temp = values['TAVG']
        elif 'TMAX' in values and 'TMIN' in values:
            temp = (values['TMAX'] + values['TMIN']) / 2
        
        if temp is not None:
            result.append({
                'date': date,
                'temperature': temp
            })
    
    # Sort by date
    result.sort(key=lambda x: datetime.strptime(x['date'], '%Y-%m-%d'))
    
    logger.info(f"Processed {len(result)} records with temperature data")
    
    if not result:
        raise ValueError("No temperature data available for the selected date range")
    
    return result

def get_weather_data(station_id, start_date, end_date):
    try:
        return fetch_weather_data(station_id, start_date, end_date)
    except Exception as e:
        logger.error(f"Error in get_weather_data: {str(e)}")
        raise