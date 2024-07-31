import requests
from arcgis.gis import GIS
from arcgis.features import GeoAccessor
import pandas as pd

NOAA_API_BASE_URL = "https://www.ncdc.noaa.gov/cdo-web/api/v2/"
NOAA_API_TOKEN = "YOUR_NOAA_API_TOKEN_HERE"  # Replace with your actual token

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
    return response.json()

def process_weather_data(raw_data):
    df = pd.DataFrame(raw_data['results'])
    df['date'] = pd.to_datetime(df['date'])
    df = df.pivot(index='date', columns='datatype', values='value')
    return df

def get_station_info(station_id):
    headers = {"token": NOAA_API_TOKEN}
    response = requests.get(f"{NOAA_API_BASE_URL}stations/{station_id}", headers=headers)
    response.raise_for_status()
    return response.json()

def create_geospatial_df(df, station_info):
    gis = GIS()
    df['longitude'] = station_info['longitude']
    df['latitude'] = station_info['latitude']
    return GeoAccessor.from_df(df, sr=4326)

def get_weather_data(station_id, start_date, end_date):
    raw_data = fetch_weather_data(station_id, start_date, end_date)
    processed_data = process_weather_data(raw_data)
    station_info = get_station_info(station_id)
    geospatial_df = create_geospatial_df(processed_data, station_info)
    return geospatial_df