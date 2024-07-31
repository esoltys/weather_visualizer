require([
    "esri/Map",
    "esri/views/MapView",
    "esri/widgets/Search",
    "esri/Graphic",
    "esri/layers/GraphicsLayer"
], function(Map, MapView, Search, Graphic, GraphicsLayer) {
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

            const pointGraphic = new Graphic({
                geometry: point,
                symbol: markerSymbol,
                attributes: station
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
                console.log("Selected station:", selectedStation);
            }
        });
    });

    view.on("click", function(event) {
        view.hitTest(event).then(function(response) {
            const result = response.results[0];
            if (result && result.graphic) {
                selectedStation = result.graphic.attributes.stationid;
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

        fetch(`/api/weather/${selectedStation}?start_date=${startDate}&end_date=${endDate}`)
            .then(response => response.json())
            .then(data => {
                // Process and visualize the data using Chart.js
                const dates = data.map(d => d.date);
                const temps = data.map(d => d.TAVG);

                if (chart) {
                    chart.destroy();
                }

                const ctx = document.getElementById("weatherChart").getContext('2d');
                chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: dates,
                        datasets: [{
                            label: 'Average Temperature',
                            data: temps,
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: false
                            }
                        }
                    }
                });
            })
            .catch(error => console.error('Error:', error));
    });
});