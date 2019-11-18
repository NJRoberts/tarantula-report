///UW-Madison GEOG 777 project II. Park web map project.
// Nathalia Roberts. Fall 2019.


const map = L.map('map').setView([36.4907, -121.1687], 12.5);
let input;
//map.scrollWheelZoom.disable();


// Mapbox outdoor Tile Layer basemap
L.tileLayer('https://api.mapbox.com/styles/v1/njroberts/ck2y2mc3c0jsa1do50cboi9hr/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoibmpyb2JlcnRzIiwiYSI6ImNqNzExcWxsZDAwZWYyd213cWtibGN2cTkifQ.HjVFYKPHguKbs5nZCqL_dg', {
maxZoom: 24
}).addTo(map);

//L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png', {
//maxZoom: 24
//}).addTo(map);

//CARTO user info
const client = new carto.Client({
  apiKey: '4bb6255265a887a462d24ab78295f257ffd3cdf5',
  username: 'njroberts3'
});


//populate dropdown menu
populateDropDown();


//parktrails
const trailsSource = new carto.source.Dataset('parktrails');
const trailsStyle = new carto.style.CartoCSS(`
  #parktrails {
    line-width: 1.5;
    line-color: #dc8f1c;
    line-opacity: 1;
  }

  #layer::labels {
    text-name: [trlname];
    text-face-name: 'DejaVu Sans Book';
    text-size: 14;
    text-fill: #FFFFFF;
    text-label-position-tolerance: 0;
    text-halo-radius: 1;
    text-halo-fill: #6F808D;
    text-dy: -10;
    text-allow-overlap: false;
    text-placement: point;
    text-placement-type: dummy;
    [zoom < 14]{text-size: 0}
  }
  `);

const trailsLayer = new carto.layer.Layer(trailsSource, trailsStyle);

// dropdown functions below

// function to get list of trail names to populate dropdown menu
function populateDropDown(){
    return fetch(
        `https://njroberts3.carto.com/api/v2/sql?format=geojson&q=SELECT the_geom, trlname FROM parktrails ORDER BY trlname ASC`
        ).then((resp) => resp.json())
        .then((response) => {
            return response['features'].map(function(feature){
                option = document.createElement("option")
                option.setAttribute("value", feature.properties.trlname)
                option.textContent = feature.properties.trlname
                document.getElementById("selectDrop").appendChild(option);
            });
        }).catch((error) => {
            console.log(error)
        })
}

// when select option from downdown menu, change bounding box of map
// to geometry of the selected trail name
document.getElementById('selectDrop').addEventListener("change", function (e) {
    input = e.currentTarget.selectedOptions[0].attributes[0].value;
    return  fetch(`https://njroberts3.carto.com/api/v2/sql?format=geojson&q=SELECT * FROM parktrails where trlname Ilike '${input}'`)
    .then((resp) => resp.json())
    .then((response) => {
        geojsonLayer = L.geoJson(response)
        map.fitBounds(geojsonLayer.getBounds());
    })
});

//dropdown functions above

//parkboundary
const boundarySource = new carto.source.Dataset('parkboundary');
const boundaryStyle = new carto.style.CartoCSS(`
  #layer {
  polygon-fill: #91a492;
  polygon-opacity: 0.31;
}
#layer::outline {
  line-width: 1;
  line-color: #FFFFFF;
  line-opacity: 0.5;
}`);
const boundaryLayer = new carto.layer.Layer(boundarySource, boundaryStyle);

//Carto Filter for parkpois(parkfeatures)

function getSelectedParkTypes () {
  const inputControls = document.querySelectorAll('#filterControls input');
  const values = [];

  inputControls.forEach(input => input.checked ? values.push(input.value): null);
  return values;
}


function applyFilters () {
  parkTypeFilter.setFilters({ in: getSelectedParkTypes() });

}

function registerListeners () {
  document.querySelectorAll('#filterControls input').forEach(
    input => input.addEventListener('click', () => applyFilters())
  );
}

const parkTypeFilter = new carto.filter.Category('poitype', { in: getSelectedParkTypes() });


//park POIs
const poiSource = new carto.source.Dataset('parkfeatures');
poiSource.addFilter(parkTypeFilter);

const poiStyle = new carto.style.CartoCSS(`
  #layer {
    marker-width: 20;
    marker-fill: ramp([poitype], (#7F3C8D, #11A579, #ebb505, #261bca, #cd1818, #80BA5A, #E68310, #008695, #CF1C90, #f97b72, #A5AA99), ("Campsite", "Restroom", "Picnic Area", "Potable Water", "Amphitheater", "Campground", "Education Center", "Entrance Station", "Trailhead", "Visitor Center"), "=");
    marker-fill-opacity: 1;
    marker-file: ramp([poitype], (url('https://s3.amazonaws.com/com.cartodb.users-assets.production/maki-icons/campsite-18.svg'), url('https://s3.amazonaws.com/com.cartodb.users-assets.production/maki-icons/toilets-18.svg'), url('https://s3.amazonaws.com/com.cartodb.users-assets.production/maki-icons/restaurant-18.svg'), url('https://s3.amazonaws.com/com.cartodb.users-assets.production/maki-icons/water-18.svg'), url('https://s3.amazonaws.com/com.cartodb.users-assets.production/maki-icons/theatre-18.svg'), url('https://s3.amazonaws.com/com.cartodb.users-assets.production/maki-icons/triangle-stroked-18.svg'), url('https://s3.amazonaws.com/com.cartodb.users-assets.production/maki-icons/town-hall-18.svg'), url('https://s3.amazonaws.com/com.cartodb.users-assets.production/maki-icons/embassy-18.svg'), url('https://s3.amazonaws.com/com.cartodb.users-assets.production/maki-icons/warehouse-18.svg')), ("Campsite", "Restroom", "Picnic Area", "Potable Water", "Amphitheater", "Campground", "Education Center", "Trailhead", "Visitor Center"), "=");
    marker-allow-overlap: true;
    marker-line-width: 1;
    marker-line-color: #FFFFFF;
    marker-line-opacity: 1;
  }`);
const poiLayer = new carto.layer.Layer(poiSource, poiStyle);


client.addLayers([trailsLayer, poiLayer, boundaryLayer])
.then(() =>{
  console.log('Layers added');
})
.catch (cartoError => {
  console.error(cartoError.message);
});
client.getLeafletLayer().addTo(map);


//Carto Filter for POIs
registerListeners();

//Show or hide Park Features
function closeFilter() {
  var x = document.getElementById("filterControls");
  if (x.style.display === "none") {
    x.style.display = "block";
  } else {
    x.style.display = "none";
  }
}


/// CARTO code examples ABOVE DatViz examples BELOW -----------------------


// Add Data from CARTO using the SQL API
// Declare Variables
// Create Global Variable to hold CARTO points
var cartoDBPoints = null;

// Set your CARTO Username
var cartoDBusername = 'njroberts3';

// Write SQL Selection Query to be Used on CARTO Table
// Name of table is 'data_collector'
var sqlQuery = "SELECT * FROM tarantula_report";


// Get CARTO selection as GeoJSON and Add to Map
function getGeoJSON(){
  $.getJSON("https://"+cartoDBusername+".cartodb.com/api/v2/sql?format=GeoJSON&q="+sqlQuery, function(data) {
    cartoDBPoints = L.geoJson(data,{
      pointToLayer: function(feature,latlng){
        var marker = L.marker(latlng);
        marker.bindPopup('' +'Info: '+ feature.properties.description + '<br>Contact: ' + feature.properties.email + '<br>Date: ' + feature.properties.date +'');
        return marker;
      }
    }).addTo(map);
  });
};

//Run showAll function automatically when document loads
$( document ).ready(function() {
  getGeoJSON();
});



// Create Leaflet Draw Control for the draw tools and toolbox
var drawControl = new L.Control.Draw({
  draw : {
    polygon : false,
    polyline : false,
    rectangle : false,
    circle : false
  },
  edit : false,
  remove: false
});

// Boolean global variable used to control visiblity
var controlOnMap = false;

// Create variable for Leaflet.draw features
var drawnItems = new L.FeatureGroup();

// Function to add the draw control to the map to start editing SEE HTML BUTTONS
function startEdits(){
  if(controlOnMap == true){
    map.removeControl(drawControl);
    controlOnMap = false;
  }
  map.addControl(drawControl);
  controlOnMap = true;
};

// Function to remove the draw control from the map
function stopEdits(){
  map.removeControl(drawControl);
  controlOnMap = false;
};

// Function to run when feature is drawn on map
map.on('draw:created', function (e) {
  var layer = e.layer;
  drawnItems.addLayer(layer);
  map.addLayer(drawnItems);
  dialog.dialog("open");
});


//get user location..not DataViz example
var marker = L.marker({
  title: "My Location",
  draggable: true
});

function getLocation() {
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var lat = position.coords.latitude,
        lng = position.coords.longitude;
        marker.setLatLng([lat,lng]).addTo(map);

        //alert("Location found at LAT: " + lat + " and LONG: " + lng);
        map.panTo(new L.LatLng(lat,lng));

      })
    } else {
            // if browser doesn't support Geolocation
            alert("Geolocation is disabled. Please select location on the map instead.");
          }
}


// Use the jQuery UI dialog to create a dialog and set options
var dialog = $("#dialog").dialog({
  autoOpen: false,
  height: 300,
  width: 350,
  modal: true,
  position: {
    my: "center center",
    at: "center center",
    of: "#map"
  },
  buttons: {
    "Add to Database": setData,
    Cancel: function() {
      dialog.dialog("close");
      map.removeLayer(drawnItems);
    }
  },
  close: function() {
    form[ 0 ].reset();
    console.log("Dialog closed");
  }
});

// Stops default form submission and ensures that setData or the cancel function run
var form = dialog.find("form").on("submit", function(event) {
  event.preventDefault();
});

function setData() {
    var enteredEmail = email.value;
    var enteredDescription = description.value;
    var enteredDate = date.value;
    drawnItems.eachLayer(function (layer) {
        var sql = "INSERT INTO tarantula_report (the_geom, description, email, date, latitude, longitude) VALUES (ST_SetSRID(ST_GeomFromGeoJSON('";
        var a = layer.getLatLng();
        var sql2 ='{"type":"Point","coordinates":[' + a.lng + "," + a.lat + "]}'),4326),'" + enteredDescription + "','" + enteredEmail + "','"+ enteredDate +"','" + a.lat + "','" + a.lng +"')";
        var pURL = sql+sql2;
        submitToProxy(pURL);
        console.log("Feature has been submitted to the Proxy");
    });
    map.removeLayer(drawnItems);
    drawnItems = new L.FeatureGroup();
    console.log("drawnItems has been cleared");
    dialog.dialog("close");
};


// Submit data to the PHP using a jQuery Post method
 var submitToProxy = function(q){
   $.post("php/callProxy.php", { // <--- Enter the path to your callProxy.php file here
     qurl:q,
     cache: false,
     timeStamp: new Date().getTime()
   }, function(data) {
     console.log(data);
     refreshLayer();
   });
 };

 // refresh the layers to show the updated dataset
 function refreshLayer() {
   if (map.hasLayer(cartoDBPoints)) {
     map.removeLayer(cartoDBPoints);
   };
   getGeoJSON();
 };
