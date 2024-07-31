import requests
from arcgis.gis import GIS
from arcgis.features import GeoAccessor
import pandas as pd
from dotenv import load_dotenv
import os

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
    params = {
        "datasetid": "GHCND",
        "stationid": station_id,
        "startdate": start_date,
        "enddate": end_date,
        "limit": 1000,
        "units": "metric"
    }
    
    response = requests.get(f"{NOAA_API_BASE_URL}data", headers=headers, params=params)
    response.raise_for_status()
    data = response.json()
    
    # Process the data into a more usable format
    processed_data = []
    for item in data.get('results', []):
        date = item['date']
        datatype = item['datatype']
        value = item['value']
        
        existing_entry = next((entry for entry in processed_data if entry['date'] == date), None)
        if existing_entry:
            existing_entry[datatype] = value
        else:
            processed_data.append({'date': date, datatype: value})
    
    return processed_data

def get_weather_data(station_id, start_date, end_date):
    return fetch_weather_data(station_id, start_date, end_date)