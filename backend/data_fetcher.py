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
    
    logger.info(f"Fetching weather stations from NOAA API")
    response = requests.get(f"{NOAA_API_BASE_URL}stations", headers=headers, params=params)
    
    logger.info(f"NOAA API response status code for stations: {response.status_code}")
    logger.info(f"NOAA API response content for stations: {response.text[:500]}...")  # Log first 500 characters
    
    response.raise_for_status()
    return response.json()

def fetch_weather_data(station_id, start_date, end_date):
    headers = {"token": NOAA_API_TOKEN}
    
    # Convert dates to datetime objects
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')
    today = datetime.now()

    # Check if dates are in the future
    if start > today:
        raise ValueError("Start date cannot be in the future.")
    if end > today:
        end = today
        logger.info(f"End date adjusted to today: {end.strftime('%Y-%m-%d')}")

    # Fetch station metadata to check date range
    try:
        station_metadata = fetch_station_metadata(station_id)
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching station metadata: {str(e)}")
        raise ValueError(f"Unable to fetch metadata for station {station_id}")

    station_start = datetime.strptime(station_metadata['mindate'], '%Y-%m-%d')
    station_end = datetime.strptime(station_metadata['maxdate'], '%Y-%m-%d')

    # Adjust date range to station's available data
    original_start, original_end = start, end
    if start < station_start:
        start = station_start
    if end > station_end:
        end = station_end

    # Ensure the date range is not more than 1 year
    if (end - start).days > 365:
        end = start + timedelta(days=365)

    # Check if we have a valid date range after adjustments
    if start >= end:
        raise ValueError("No data available for the selected date range after adjustments")

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
    
    logger.info(f"NOAA API response status code: {response.status_code}")
    logger.info(f"NOAA API response content: {response.text[:500]}...")  # Log first 500 characters
    
    response.raise_for_status()
    data = response.json()
    
    results = data.get('results', [])
    logger.info(f"Received {len(results)} records from NOAA API")
    
    adjusted_range = {
        "start": start.strftime('%Y-%m-%d'),
        "end": end.strftime('%Y-%m-%d'),
        "original_start": original_start.strftime('%Y-%m-%d'),
        "original_end": original_end.strftime('%Y-%m-%d')
    }
    
    return results, adjusted_range

def fetch_station_metadata(station_id):
    headers = {"token": NOAA_API_TOKEN}
    response = requests.get(f"{NOAA_API_BASE_URL}stations/{station_id}", headers=headers)
    response.raise_for_status()
    return response.json()

def get_weather_data(station_id, start_date, end_date):
    try:
        return fetch_weather_data(station_id, start_date, end_date)
    except Exception as e:
        logger.error(f"Error in get_weather_data: {str(e)}")
        raise