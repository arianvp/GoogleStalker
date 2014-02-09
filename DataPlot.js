
var MY_MAPTYPE_ID = "custom_style";


function initialize() {


    var mapOptions = {
        zoom: 2,
        center: new google.maps.LatLng(521582117/10000000, 51667033/10000000),
        mapTypeControlOptions: {
            mapTypeIds: [google.maps.MapTypeId.ROADMAP, MY_MAPTYPE_ID]
        },
        mapTypeId: MY_MAPTYPE_ID
    };
    var featureOpts = [
        {
            stylers: [
                { hue: "#890000" },
                { visibility: "simplified" },
                { gamma: 0.5 },
                { weight: 0.5 }            
            ]
        },
        {
            elementType: "labels",
            stylers: [
                { visibility:  "on" }
            ]
        },
        {
            featureType: "water",
            stylers: [
                { color: "#890000" }
            ]
        }
    ];
    var styledMapOptions = {
        name: "Custom Style"
    };
    var customMapType = new google.maps.StyledMapType(featureOpts, styledMapOptions);



    function calculateMean(locations) {
        var longitudeAccum = 0;
        var latitudeAccum = 0;
        locations.forEach(function(e){
            longitudeAccum += e.longitudeE7/1E7;
            latitudeAccum  += e.latitudeE7/1E7;
        });

        var longitude = longitudeAccum / locations.length;
        var latitude  = latitudeAccum / locations.length;
        return new google.maps.LatLng(latitude, longitude);
    }

    var map;
    function decorateMap(locationData) {

        var g = document.createElement('div');
        g.setAttribute("id", "map-canvas");
        map = new google.maps.Map(g, mapOptions);


        map.mapTypes.set(MY_MAPTYPE_ID, customMapType);
        var fromDate = new Date(document.getElementById("fromDate").value);
        var toDate   = new Date(document.getElementById("toDate").value);
    
        var locations = locationData.locations.filter(function(e){
            var date = new Date(+e.timestampMs);
            return fromDate <= date  && date <= toDate;
        });

        map.panTo(calculateMean(locations));

        /** HEATMAP **/
        var heatmapData = locations.map(function(e){
            return new google.maps.LatLng(e.latitudeE7/1E7, e.longitudeE7/1E7);
        });

        var heatmap = new google.maps.visualization.HeatmapLayer({
            data: new google.maps.MVCArray(heatmapData)
        });
        var heatmapRadius = document.getElementById("heatmapRadius");

        heatmap.set("radius", +heatmapRadius.value);
        heatmap.setMap(map);

        heatmapRadius.addEventListener("change", function(e){
            heatmap.set("radius", +e.target.value);
        });

        document.getElementById("heatmap").addEventListener("click", function(e){
            heatmap.setMap(e.target.checked  ? map : null);
        });

        var trace = new google.maps.Polyline({
            geodesic: false,
            strokeColor: "#3f00ff" ,
            strokeOpacity: 0.5,
            strokeWeight: 1.0
        });

        var traceEl = document.getElementById("trace");

        traceEl.addEventListener("click", function(e){
            trace.setMap(e.target.checked ? map : null);
        });

        trace.setMap(traceEl.checked ? map : null);
        //     locations[type].forEach(function(e){
        //         var info = new google.maps.InfoWindow({
        //             content: "Date:"+new Date(+e.timestampMs)+"<br>"
        //         });
        //         e.marker = new google.maps.Marker({
        //             icon: type+".png",
        //             position: new google.maps.LatLng(e.latitudeE7/1E7, e.longitudeE7/1E7)
        //         });
        //         google.maps.event.addListener(e.marker,"click",function(){
        //             info.open(map,e.marker);
        //         });


        locations.forEach(function(loc){
            // check type
            // place marker
            // add poly

            // determine the activity for this location
            var activities = [{type:"unknown", confidence:100}];
            var activity = "unknown";
            if (loc.activitys) {
                loc.activitys.forEach(function(e){
                    if(e.activities) {
                        activities = e.activities.sort(function(e1,e2) { return e2.confidence - e1.confidence; });
                        activity = activities[0].type;
                    }
                });
            }


            var latLng = new google.maps.LatLng(loc.latitudeE7/1E7, loc.longitudeE7/1E7);



            var marker = new google.maps.Marker({
                icon: activity+".png",
                position: latLng
            });



            var actEl = document.getElementById(activity);     

            actEl.addEventListener("click", function(e){
                marker.setMap(e.target.checked ? map : null);
            });
            marker.setMap(actEl.checked ? map : null);

            function toRows() {
                var str="";
                activities.forEach(function(a){
                    str += "<tr><td>"+a.type+"</td><td>"+a.confidence+"</td></tr>";
                });
                return str;
            }
            var info = new google.maps.InfoWindow({
                content: "<h2>"+new Date(+loc.timestampMs)+"</h2>" +
                         "<table><thead><th>Activity</th><th>Confidence</th></thead>" +
                         "<tbody>" + toRows() + "</tbody></table>"
            });
            google.maps.event.addListener(marker, "click", function(){
                info.open(map,marker);
            });


            trace.getPath().push(latLng);
        });
    }


    // loading JSON file
    function handleFileSelect(e) {
        var file = e.target.files[0];

        var reader = new FileReader();

        reader.onload = function (e) {
            try {

            var data = JSON.parse(reader.result);

            } catch (e) {
                alert("You should try giving me a JSON file. I'd enjoy that.");
            }
            var fromDate   = new Date(+data.locations[data.locations.length-1].timestampMs);
            var toDate     = new Date(+data.locations[0].timestampMs);


            function format(now) {
                var day = ("0" + now.getDate()).slice(-2);
                var month = ("0" + (now.getMonth() + 1)).slice(-2);

                var today = now.getFullYear()+"-"+(month)+"-"+(day) ;            
                
                return today;     
            }
            document.getElementById("fromDate").value = format(fromDate);
            document.getElementById("toDate").value = format(toDate);
            document.getElementById("dates").disabled = false;


            document.getElementById("go").addEventListener("click",function(){
                if (fromDate >= toDate) {
                    alert("You fromDate needs to be lower and not equal to than toDate");
                    return;
                }

                document.getElementById("settings").disabled = false;
                document.getElementById("files").disabled = true;
                document.getElementById("dates").disabled = true;
                document.getElementById("about").remove();
                decorateMap(data);
            });
            //document.getElementById("settings").disabled = false;
            //decorateMap(data);
        };
        reader.readAsText(file);
    }
    document.getElementById("files").addEventListener("change", handleFileSelect, false);
}

google.maps.event.addDomListener(window, "load", initialize);