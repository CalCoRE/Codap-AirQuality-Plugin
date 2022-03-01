var milesToKms = 1.60934
const myMAP = "my_location_map"

var requestOptions = {
    method: 'GET',
  };

function startCodapConnection() {
    var config = {
        title: "Purple Air Plugin",
        version: "001",
        dimensions: {width: 460, height: 500}
    };

    console.log("Starting codap connection");

    codapInterface.init(config).then(
        function () { //  at this point, purpleAir.state is populated!
            purpleAir.state = codapInterface.getInteractiveState();  // |S| initialize state variable!
            purpleAir.initialize();
            return Promise.resolve();
        }
    ).catch(function (msg) {
        console.log('warn: ' + msg);
    });
}

/**
 * This is the one global, a singleton, that we need or this game.
 * @type {{initialize: estimate.initialize, newGame: estimate.newGame, endGame: estimate.endGame, newTurn: estimate.newTurn, endTurn: purpleAir.endTurn}}
 */
var purpleAir = {

    initialize: function () {
        pluginHelper.initDataSet(purpleAir.dataSetDescription);
        purpleAir.fetchLocation()
        purpleAir.getDate()
    },

    updateMap: function (lat, long){
        const update_request = {
            "action": "update",
            "resource": `component[${myMAP}]`,
            "values": {
                "legendAttributeName": "Legend",
                "center": [lat, long],
                "zoom": 8
                }
            }
            console.info(update_request)
        codapInterface.sendRequest(update_request).
        then(function (result) {console.log(result);});
    },
    // getTable: function(){
    //     console.log('called')
    //     codapInterface.sendRequest({
    //         "action": "get",
    //         "resource": "dataContext[dataset]"
    //       }).then(x=>console.log(`get data context = ${JSON.stringify(x)}`))
    // },
    getDate: function(){
        // console.log('getting date')
        var today = new Date()

        var dd = String(today.getDate()-1).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();

        today = yyyy + '-' + mm + '-' + dd;
        // console.log(today);

        // var yesterdayString = `${today.getFullYear()}-${(today.getMonth()+1).padStart(2,'0')}-${today.getDay().padStart(2,'0')}`
        document.getElementById("startDate").max = today
        document.getElementById("startDate").value = today
        this.state.startDate = purpleAir.convertDate(today)
        // this.state.fullStartDate = new Date(this.state.startDate)
        // console.log("start date = " + document.getElementById('startDate').value)
    },
    convertDate: function(date){
        // date == "2022-02-28" string input as yyyy-mm-dd 
        // convert to "mm/dd/yyyy"
        var x = date.split("-")
        var stringDate = `${x[1]}/${x[2]}/${x[0]}`
        return stringDate
    },

    
    clearLocation: function(){
        purpleAir.state = {...purpleAir.default}
        console.log('clearing form')
        purpleAir.reset()
        console.log(purpleAir.state)

    },

    reset: function (){
        document.getElementById("city_input").value = ""
        document.getElementById("lat_long_input").value = ""
        document.getElementById("radiusRange").value = 50
        document.getElementById("radiusText").value = 50
    },

    fetchLocation: function(){
        console.log('fetchin location')
        document.getElementById("city_input").value = "Fetching"
        document.getElementById("lat_long_input").value = "Fetching"
        
          if (navigator.geolocation) {
            // location = getLocation()
            // console.log(navigator.geolocation.getCurrentPosition())
            navigator.geolocation.getCurrentPosition(success, error, options);
        } else { 
            x.innerHTML = "Geolocation is not supported by this browser.";
        }

        var options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
        };

        async function success(pos) {
            // getting lat long
            let lat = await pos.coords.latitude
            let long = await pos.coords.longitude

            let url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${long}&apiKey=cd1a1690ccd74ab1ba583af1dd732ec5`  
            // console.log(url)
            fetch(url, requestOptions)
            .then(response => response.json())
            .then(result=> {
                let results = result.features[0]
                // console.log(result)
                let geometry = results.geometry.coordinates
                let details = results.properties
                let city = details.city
                let state = details.state_code
                let zip = details.postcode
                let radiusInMiles = document.getElementById("radiusRange").value

                let bounding_box = purpleAir.getBoundsFromLatLong(lat, long, radiusInMiles*milesToKms)
                // saving in state info
                purpleAir.save_state(city, state, zip, lat, long, bounding_box)
    
                document.getElementById('lat_long_input').value = `${lat}, ${long}`
                document.getElementById('city_input').value = `${city}, ${state}, ${zip} `
            })
            .catch(error => console.log('error', error));
            
            // console.log(purpleAir.state)
            
        }
          
        function error(err) {
        console.warn(`ERROR(${err.code}): ${err.message}`);
        }
          

    },

    save_state: function(city, state, zip, lat, long, bounding_box){
        purpleAir.state.city = city
        purpleAir.state.state = state
        purpleAir.state.zip = zip
        purpleAir.state.latitude = lat;
        purpleAir.state.longitude = long;
        purpleAir.state.bounding_box = bounding_box

        setTimeout(() => {
            console.log(`state saved = `)
            console.log(purpleAir.state)
        }, 3000);
    },
    

    searchLocation: async function(){
        // console.log('search for location')
        let search = document.getElementById("city_input").value
        // document.getElementById("city_input").value = "Fetching"

        if (search === ""){
            console.log('inside')
            document.getElementById("msg").innerText = "Please enter city name to search for"
            document.getElementById("msg").style.display = "block"
        }
        else{
            document.getElementById("lat_long_input").value = "Fetching"
            document.getElementById("msg").style.display = "none"
        console.log('searching for city with text string = ' + search)

        let base_url = `https://api.geoapify.com/v1/geocode/autocomplete?apiKey=cd1a1690ccd74ab1ba583af1dd732ec5&text=`+ search + `&type=city&lang=en&filter=countrycode:us&format=json`
        // reverse geocoding api call to geoapify
        // console.log(base_url)
          
        await fetch(base_url, requestOptions)
        .then(response => response.json())
        .then(response => {

            let result = response.results[0]
            let radiusInMiles = document.getElementById("radiusRange").value
            let city = result.city 
            let state = result.state_code
            let zip = result.postcode || 0
            let lat = result.lat
            let long =  result.lon
            let bounding_box = purpleAir.getBoundsFromLatLong(lat, long, radiusInMiles*milesToKms)
            
            fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${long}&apiKey=cd1a1690ccd74ab1ba583af1dd732ec5`, 
                    requestOptions)
            .then(response => response.json())
            .then(result => zip = result.features[0].properties.postcode)
            .catch(error => console.log('error', error));

            setTimeout(() => {
                purpleAir.save_state(city, state, zip, lat, long, bounding_box)
                document.getElementById('lat_long_input').value = `${lat}, ${long}`
                document.getElementById('city_input').value = `${city}, ${state}`
            }, 500);

        })
        .catch(error => console.log('error', error));
    }
    },

    getDateFromTimeStamp: async function(timestamp){
        var date = (new Date(timestamp * 1000))
        const year = date.getFullYear();
        // console.log(year); // 👉️ 2025

        const month = String(date.getMonth() + 1).padStart(2, '0');
        // console.log(month); // 👉️ 03

        const day = String(date.getDate()).padStart(2, '0');
        // console.log(day); // 👉️ 05

        const joined = [month, day, year].join('/');
        // console.log(joined); // 👉️ 05/03/2025
        return joined
        
    },

    getPurpleAirData: async function(){
        let search = document.getElementById("city_input").value

        if (search === ""){
            console.log('inside')
            document.getElementById("msg").innerText = "Please fetch / search your desired location before moving forward"
            document.getElementById("msg").style.display = "block"
        }
        else{

            console.log('fetchin data from purple air')
            console.log('entry created')
            const BASE_URL = "https://api.purpleair.com/v1/sensors?api_key=CA299E4B-82DF-11EC-B9BF-42010A800003&"
            const REQUIRED_FIELDS = "name,date_created,humidity,temperature,pressure,pm2.5,pm10.0,latitude,longitude"
            const bounds = this.state.bounding_box
            const lat1 = bounds[0]
            const long1 = bounds[1]
            const lat2 = bounds[2]
            const long2 = bounds[3]
            const startTime = (new Date(this.state.startDate)).getTime()/1000
            // startTime = (startTime.getTime()/1000)
            console.log(`start time = ${startTime}`)
            
            const URL = `${BASE_URL}fields=${REQUIRED_FIELDS}&modified_since=1645599600&selat=${lat1}&selng=${long1}&nwlat=${lat2}&nwlng=${long2}`
            console.log(URL)
            console.log('fetch request')
            fetch(URL, requestOptions)
            .then(response => response.json())
            .then(result => {
                console.log('got the response')
                var data = result['data']
                console.log(data)
                data.forEach(element => {

                    var date;
                    purpleAir.getDateFromTimeStamp(element[2]).then( result => {
                        date = result
                    // console.log(date)
                    var caseValues = {
                        "User Location": `${this.state.city}, ${this.state.state}`,
                        "Sensor Index":element[0],
                        "Sensor Name":element[1],
                        "Date Created": date,
                        "Humidity":element[3],
                        "Temperature":element[4],
                        "Pressure":element[5],
                        "PM 2.5":element[6],
                        "AQI":element[6]*2,
                        "PM 10.0":element[7],
                        "latitude":element[8],
                        "longitude":element[9],
                    }
                    pluginHelper.createItems(caseValues)
                });
                });

                codapInterface.sendRequest(
                    {
                        "action": "create",
                        "resource": "component",
                        "values": {
                          "type": "map",
                          "name": myMAP,
                          "title": "map",
                          "position":"bottom",
                          "dataContextName": "purple air",
                          "legendAttributeName": "Legend",
                          "dimensions":{width: 460, height: 400}
                        }
                      }
                ).then(function (result) {
                    console.log(result);
                    
                });
            })
            .catch(error => console.log('error', error));

        }
    },

    /**
     * 
     * @param {takes in the latitude for a location} lat 
     * @param {takes in the longitude for a location} long 
     * @param {takes in the radius in kilometers for a location} radiusInKms 
     * @returns a bounding box array lat min, long max, lat max, long min (adjusted according to the purple air api results)
     */
    getBoundsFromLatLong: function (lat, long, radiusInKms) {
        var lat_change = radiusInKms/111.2
        var long_change = Math.abs(Math.cos(lat*(Math.PI/180)))
    
        var bounds = {
            lat_min: lat - lat_change,
            long_max: long + long_change,
            lat_max: lat + lat_change,
            long_min: long - long_change
        }
        // console.log(bounds)
        return [ 
            bounds.lat_min,
            bounds.long_max,
            bounds.lat_max, 
            bounds.long_min
            ]
    },

    changeRadius: function (value){
        console.log(this.state.bounding_box)
    }
};


/**
 * Called when the user selects a case (or cases) in CODAP
 * We deal with this in session 2.
 * @param iMessage
 */
purpleAir.codapSelects = function (iMessage) {      //  |N| part of session 2 solution
    var tMessageValue = iMessage.values;
    if (Array.isArray(tMessageValue)) {
        tMessageValue = tMessageValue[0]; //      the first of the values in the message
    }
    console.log("Received a " + tMessageValue.operation + " message");
};

/**
 * The "state" member variable.
 * Anything you want saved and restored that is NOT in CODAP, you put here,
 * @type {{playerName: string, lastClickPosition: number, lastInputNumber: number, gameNumber: number, turnNumber: number, currentScore: number, currentTruth: number, playing: boolean, restored: boolean}}
 */
 purpleAir.state = {
    latitude:0.00,
    longitude:0.00,
    city:"",
    state:"",
    zip:"",
    bounding_box:[],
    startDate: "",
    fullStartDate: ""
};

purpleAir.default = {
    latitude:0.00,
    longitude:0.00,
    city:"",
    state:"",
    zip:"",
    bounding_box:[],
    startDate: "",
    fullStartDate: ""
}


/**
 * A convenient place to stash constants
 * @type
 */
purpleAir.constants = {
    version: "001"
};


/**
 * Constant object CODAP uses to initialize our data set (a.k.a. Data Context)
 *
 * @type {{name: string, title: string, description: string, collections: [*]}}
 */
purpleAir.dataSetDescription = {
    name: "dataset",
    title: "Purple Air Table",
    description: "A set of values including humidity, precipitation, temperature, pm2.5 & pm10.0, AQI",
    dimensions:{width:800,height:400},
    collections: [
        {
            name: "Sensor Values",
            parent: null,       //  this.gameCollectionName,    //  this.bucketCollectionName,
            labels: {
                singleCase: "Value",
                pluralCase: "Values",
                setOfCasesWithArticle: "Set of Values"
            },

            attrs: [
                {name: "User Location", type: 'categorical', description: "user's location"},
                {name: "Sensor Index", type: 'numeric', description: "Sensors id"},
                {name: "Sensor Name", type: 'categorical', description: "Sensors Name"},
                {name: "Date Created", type: 'date', description: "date created data"},
                {name: "Humidity", type: 'numeric', precision: 3, description: "estimated value"},
                {name: "Temperature", type: 'numeric', precision: 3, description: "estimated value"},
                {name: "Pressure", type: 'numeric', precision: 3, description: "your name"},
                {name: "PM 2.5", type: 'numeric', precision: 3, description: "estimated value of pm 2.5"},
                {name: "AQI", type: 'numeric', precision: 3, description: "Air Quality Index"},
                {name: "PM 10.0", type: 'numeric', precision: 3, description: "estimated value of pm 10.0"},
                {name: "latitude", type: 'numeric', description: "user's location"},
                {name: "longitude", type: 'numeric', description: "user's location"},
                // {name: " - ", type: '', precision: 3, description: " "}
                //  |B|     here is where you make attributes in the data set, i.e., columns in the table
            ]
        }
    ]
};