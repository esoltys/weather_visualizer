require([
    "esri/Map",
    "esri/views/MapView",
    "esri/widgets/Search",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "esri/PopupTemplate"
], function(Map, MapView, Search, Graphic, GraphicsLayer, PopupTemplate) {
    const map = new Map({
        basemap: "topo-vector"
    });

    const view = new MapView({
        container: "mapView",
        map: map,
        zoom: 3,
        center: [-98, 39] // Centered on the United States
    });

    const search = new Search({
        view: view
    });

    view.ui.add(search, "top-right");

    const stationsLayer = new GraphicsLayer();
    map.add(stationsLayer);

    let selectedStation = null;

    function addStationsToMap(stations) {
        stations.forEach(station => {
            const point = {
                type: "point",
                longitude: station.longitude,
                latitude: station.latitude
            };

            const markerSymbol = {
                type: "simple-marker",
                color: [226, 119, 40],
                outline: {
                    color: [255, 255, 255],
                    width: 1
                }
            };

            const popupTemplate = new PopupTemplate({
                title: station.name,
                content: [
                    {
                        type: "fields",
                        fieldInfos: [
                            {
                                fieldName: "id",
                                label: "Station ID"
                            },
                            {
                                fieldName: "elevation",
                                label: "Elevation (meters)"
                            },
                            {
                                fieldName: "dateRange",
                                label: "Available Date Range"
                            }
                        ]
                    }
                ]
            });

            const pointGraphic = new Graphic({
                geometry: point,
                symbol: markerSymbol,
                attributes: station,
                popupTemplate: popupTemplate
            });

            stationsLayer.add(pointGraphic);
        });
    }

    fetch('/api/stations')
        .then(response => response.json())
        .then(data => {
            addStationsToMap(data.results);
        })
        .catch(error => console.error('Error:', error));

    view.on("click", function(event) {
        view.hitTest(event).then(function(response) {
            const result = response.results[0];
            if (result && result.graphic) {
                selectedStation = result.graphic.attributes.id;
                document.getElementById("stationInfo").innerHTML = `Selected station: ${result.graphic.attributes.name}`;
                console.log("Selected station:", selectedStation);
            }
        });
    });

    let chart = null;

    document.getElementById("fetchData").addEventListener("click", function() {
        if (!selectedStation) {
            alert("Please select a weather station on the map first.");
            return;
        }

        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;

        // Clear previous chart and show loading message
        if (chart) {
            chart.destroy();
            chart = null;
        }
        document.getElementById("weatherChart").innerHTML = "Loading data...";

        fetch(`/api/weather/${selectedStation}?start_date=${startDate}&end_date=${endDate}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.detail || `HTTP error! status: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log("Received data:", data);  // Log the received data
                if (!Array.isArray(data.results) || data.results.length === 0) {
                    throw new Error('No data available for the selected station and date range');
                }
                
                // Check if the date range was adjusted
                if (data.adjusted_range) {
                    const { start, end, original_start, original_end } = data.adjusted_range;
                    if (start !== original_start || end !== original_end) {
                        alert(`Date range adjusted due to data availability:\nOriginal range: ${original_start} to ${original_end}\nAdjusted range: ${start} to ${end}`);
                    }
                }

                // Process and visualize the data using Chart.js
                const validData = data.results.filter(d => d.value !== null && d.value !== 0 && !isNaN(d.value));
                const chartData = validData.map(d => ({
                    x: luxon.DateTime.fromISO(d.date.split('T')[0]),
                    y: d.value
                }));

                const ctx = document.getElementById("weatherChart").getContext('2d');
                chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        datasets: [{
                            label: 'Temperature',
                            data: chartData,
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1,
                            pointRadius: 0,
                            borderWidth: 1.5
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            x: {
                                type: 'time',
                                time: {
                                    unit: 'month'
                                },
                                title: {
                                    display: true,
                                    text: 'Date'
                                }
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: 'Temperature (°C)'
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                            },
                            zoom: {
                                zoom: {
                                    wheel: {
                                        enabled: true,
                                    },
                                    pinch: {
                                        enabled: true
                                    },
                                    mode: 'xy',
                                }
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById("weatherChart").innerHTML = `Error: ${error.message}`;
                alert(`Error: ${error.message}`);
            });
    });
});