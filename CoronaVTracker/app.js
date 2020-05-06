window.addEventListener('DOMContentLoaded',initializeApp);

//Retrieving the data from this public api
const baseUrl = 'https://coronavirus-tracker-api.herokuapp.com/v2/locations';

 async function  initializeApp(){
    console.log("initializing done");
    setRefrences();
    doEventBidings();
    populateLocations();
    NProgress.start();
    await performAsyncCall();
    NProgress.done();
    renderUI(coronaData.latest,world=true);
    renderMap();
    console.log(`Corona Latest statsus:  ${coronaData.latest}`);
    console.log(`Corona locations : ${coronaData.locations}`);
}
let coronaData ={
    latest:[],
    locations:[],
};

let geoCoder;


async function getReverseFromLatLngToPlace(lat,lng){
    return new Promise((resolve,reject) => {
        geoCoder.mapboxClient.geocodeReverse({
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
        },
        function(error,response){
            if(error){
                reject(error);
            }
            resolve(response.features[0] && response.features[0].place_name);
        })
    })

}
 function renderMap(){
    mapboxgl.accessToken = 'pk.eyJ1Ijoic2NhcGVzY2VuZSIsImEiOiJjazl1bDB5eXQwMnNuM2Vtb3dqbXlyMXl2In0.Qamb5zTT2ma8kbpSKV4kOQ';
    const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v10',
    center: [-103.59179687498357, 40.66995747013945],
    zoom: 3
    });

    geoCoder = new MapboxGeocoder({
        accessToken : mapboxgl.accessToken,
    });
 map.addControl(geoCoder);
 map.addControl(new mapboxgl.NavigationControl());
     
    map.on('load',async function() {
    
    map.addSource('Locations', {
    type: 'geojson',
  
    data:
    {
        type:'FeatureCollection',
        crs: { 
            type: "name", 
            properties: { 
                name: "urn:ogc:def:crs:OGC:1.3:CRS84"
             } 
            },

        features : await Promise.all(coronaData.locations.map(async location => {
           let placeName = await getReverseFromLatLngToPlace(location.coordinates.latitude,location.coordinates.longitude); 
           console.log(placeName);
            return {
                type : "Feature",
                properties: {
               description : ` <table  class="table">
                <thead>
                ${placeName}</thead>
        
                <tbody>
                <tr>
                <td>Number of confirmed cases:</td>
                <td>${location.latest.confirmed}</td>
                </tr>
                <tr>
                <td>Number of death cases:</td>
                <td>${location.latest.deaths}</td>
                </tr>
                <td>Longitude:</td>
                <td>${location.coordinates.latitude}</td>
                </tr>
                <td>Latitude:</td>
                <td>${location.coordinates.longitude}</td>
                </tr>
                </tbody>
                
                </table>
                `,

                icon : "rocket"
            },
             geometry: {
                  type:"Point",
                  coordinates : [ 
                      `${location.coordinates.longitude}`,
                      `${location.coordinates.latitude}`
                      ]
             }
         }

           
        }))


    },
    cluster: true,
    clusterMaxZoom: 14, // Max zoom to cluster points on
    clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
    });
     
    map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'Locations',
    filter: ['has', 'point_count'],
    paint: {
    // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
    // with three steps to implement three types of circles:
    //   * Blue, 20px circles when point count is less than 100
    //   * Yellow, 30px circles when point count is between 100 and 750
    //   * Pink, 40px circles when point count is greater than or equal to 750
    'circle-color': [
    'step',
    ['get', 'point_count'],
    '#51bbd6',
    100,
    '#f1f075',
    750,
    '#f28cb1'
    ],
    'circle-radius': [
    'step',
    ['get', 'point_count'],
    20,
    100,
    30,
    750,
    40
    ]
    }
    });
     
    map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'Locations',
    filter: ['has', 'point_count'],
    layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12
    }
    });
     
    map.addLayer({
    id: 'unclustered-point',
    type: 'circle',
    source: 'Locations',
    filter: ['!', ['has', 'point_count']],
    paint: {
    'circle-color': '#11b4da',
    'circle-radius': 4,
    'circle-stroke-width': 1,
    'circle-stroke-color': '#fff'
    }
    });
     
    // inspect a cluster on click
    map.on('click', 'clusters', function(e) {
    var features = map.queryRenderedFeatures(e.point, {
    layers: ['clusters']
    });
    var clusterId = features[0].properties.cluster_id;
    map.getSource('Locations').getClusterExpansionZoom(
    clusterId,
    function(err, zoom) {
    if (err) return;
     
    map.easeTo({
    center: features[0].geometry.coordinates,
    zoom: zoom
    });
    }
    );
    });
     
    // When a click event occurs on a feature in
    // the unclustered-point layer, open a popup at
    // the location of the feature, with
    // description HTML from its properties.
    map.on('click', 'unclustered-point', function(event) {
    const coordinates = event.features[0].geometry.coordinates.slice();
    const {description} = event.features[0].properties;
    
     
    // Ensure that if the map is zoomed out such that
    // multiple copies of the feature are visible, the
    // popup appears over the copy being pointed to.
    while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
    coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360;
    }
     
    new mapboxgl.Popup()
    .setLngLat(coordinates)
    .setHTML(description
    )
    .addTo(map);
    });
     
    map.on('mouseenter', 'clusters', function() {
    map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', function() {
    map.getCanvas().style.cursor = '';
    });
    });

}
async function performAsyncCall(){

    let response = await fetch(`${baseUrl}`);

    let data = await response.json();
    coronaData.latest=data.latest;
    console.log(coronaData.latest);
    coronaData.locations=data.locations;
    console.log(coronaData.locations);
    
}
function populateLocation(country,country_code){
    const countryOption = document.createElement('option');
    countryOption.value = country;
    countryOption.textContent = `${country_code}-${country}`;
    console.log(countryOption.textContent);
   // console.log(countryOption);
   countrySelectDropdown.appendChild(countryOption);

}
function populateLocations(){
    Object.entries(countryCodes).forEach(([country_code, country]) => populateLocation(country,country_code));

}

function setRefrences(){
    coronaDEtailsContainer = document.querySelector('#corona-details');
    countrySelectDropdown = document.querySelector('[name="select-country"]');
    coronaWorldDetails = document.querySelector('#corona-world-details');
}

function doEventBidings(){
    countrySelectDropdown.addEventListener('change',renderDetailsForSelectedLocation);
}

//Container Displaying the corona details 

let coronaDEtailsContainer;

//Container for dropdown menu

let countrySelectDropdown;

//World details 
let coronaWorldDetails;

const countryCodes ={
    AF: 'Afghanistan',
    AX: 'Aland Islands',
    AL: 'Albania',
    DZ: 'Algeria',
    AS: 'American Samoa',
    AD: 'Andorra',
    AO: 'Angola',
    AI: 'Anguilla',
    AQ: 'Antarctica',
    AG: 'Antigua And Barbuda',
    AR: 'Argentina',
    AM: 'Armenia',
    AW: 'Aruba',
    AU: 'Australia',
    AT: 'Austria',
    AZ: 'Azerbaijan',
    BS: 'Bahamas',
    BH: 'Bahrain',
    BD: 'Bangladesh',
    BB: 'Barbados',
    BY: 'Belarus',
    BE: 'Belgium',
    BZ: 'Belize',
    BJ: 'Benin',
    BM: 'Bermuda',
    BT: 'Bhutan',
    BO: 'Bolivia',
    BA: 'Bosnia And Herzegovina',
    BW: 'Botswana',
    BV: 'Bouvet Island',
    BR: 'Brazil',
    IO: 'British Indian Ocean Territory',
    BN: 'Brunei Darussalam',
    BG: 'Bulgaria',
    BF: 'Burkina Faso',
    BI: 'Burundi',
    KH: 'Cambodia',
    CM: 'Cameroon',
    CA: 'Canada',
    CV: 'Cape Verde',
    KY: 'Cayman Islands',
    CF: 'Central African Republic',
    TD: 'Chad',
    CL: 'Chile',
    CN: 'China',
    CX: 'Christmas Island',
    CC: 'Cocos (Keeling) Islands',
    CO: 'Colombia',
    KM: 'Comoros',
    CG: 'Congo',
    CD: 'Congo, Democratic Republic',
    CK: 'Cook Islands',
    CR: 'Costa Rica',
    CI: 'Cote D\'Ivoire',
    HR: 'Croatia',
    CU: 'Cuba',
    CY: 'Cyprus',
    CZ: 'Czech Republic',
    DK: 'Denmark',
    DJ: 'Djibouti',
    DM: 'Dominica',
    DO: 'Dominican Republic',
    EC: 'Ecuador',
    EG: 'Egypt',
    SV: 'El Salvador',
    GQ: 'Equatorial Guinea',
    ER: 'Eritrea',
    EE: 'Estonia',
    ET: 'Ethiopia',
    FK: 'Falkland Islands (Malvinas)',
    FO: 'Faroe Islands',
    FJ: 'Fiji',
    FI: 'Finland',
    FR: 'France',
    GF: 'French Guiana',
    PF: 'French Polynesia',
    TF: 'French Southern Territories',
    GA: 'Gabon',
    GM: 'Gambia',
    GE: 'Georgia',
    DE: 'Germany',
    GH: 'Ghana',
    GI: 'Gibraltar',
    GR: 'Greece',
    GL: 'Greenland',
    GD: 'Grenada',
    GP: 'Guadeloupe',
    GU: 'Guam',
    GT: 'Guatemala',
    GG: 'Guernsey',
    GN: 'Guinea',
    GW: 'Guinea-Bissau',
    GY: 'Guyana',
    HT: 'Haiti',
    HM: 'Heard Island & Mcdonald Islands',
    VA: 'Holy See (Vatican City State)',
    HN: 'Honduras',
    HK: 'Hong Kong',
    HU: 'Hungary',
    IS: 'Iceland',
    IN: 'India',
    ID: 'Indonesia',
    IR: 'Iran, Islamic Republic Of',
    IQ: 'Iraq',
    IE: 'Ireland',
    IM: 'Isle Of Man',
    IL: 'Israel',
    IT: 'Italy',
    JM: 'Jamaica',
    JP: 'Japan',
    JE: 'Jersey',
    JO: 'Jordan',
    KZ: 'Kazakhstan',
    KE: 'Kenya',
    KI: 'Kiribati',
    KR: 'Korea',
    KW: 'Kuwait',
    KG: 'Kyrgyzstan',
    LA: 'Lao People\'s Democratic Republic',
    LV: 'Latvia',
    LB: 'Lebanon',
    LS: 'Lesotho',
    LR: 'Liberia',
    LY: 'Libyan Arab Jamahiriya',
    LI: 'Liechtenstein',
    LT: 'Lithuania',
    LU: 'Luxembourg',
    MO: 'Macao',
    MK: 'Macedonia',
    MG: 'Madagascar',
    MW: 'Malawi',
    MY: 'Malaysia',
    MV: 'Maldives',
    ML: 'Mali',
    MT: 'Malta',
    MH: 'Marshall Islands',
    MQ: 'Martinique',
    MR: 'Mauritania',
    MU: 'Mauritius',
    YT: 'Mayotte',
    MX: 'Mexico',
    FM: 'Micronesia, Federated States Of',
    MD: 'Moldova',
    MC: 'Monaco',
    MN: 'Mongolia',
    ME: 'Montenegro',
    MS: 'Montserrat',
    MA: 'Morocco',
    MZ: 'Mozambique',
    MM: 'Myanmar',
    NA: 'Namibia',
    NR: 'Nauru',
    NP: 'Nepal',
    NL: 'Netherlands',
    AN: 'Netherlands Antilles',
    NC: 'New Caledonia',
    NZ: 'New Zealand',
    NI: 'Nicaragua',
    NE: 'Niger',
    NG: 'Nigeria',
    NU: 'Niue',
    NF: 'Norfolk Island',
    MP: 'Northern Mariana Islands',
    NO: 'Norway',
    OM: 'Oman',
    PK: 'Pakistan',
    PW: 'Palau',
    PS: 'Palestinian Territory, Occupied',
    PA: 'Panama',
    PG: 'Papua New Guinea',
    PY: 'Paraguay',
    PE: 'Peru',
    PH: 'Philippines',
    PN: 'Pitcairn',
    PL: 'Poland',
    PT: 'Portugal',
    PR: 'Puerto Rico',
    QA: 'Qatar',
    RE: 'Reunion',
    RO: 'Romania',
    RU: 'Russian Federation',
    RW: 'Rwanda',
    BL: 'Saint Barthelemy',
    SH: 'Saint Helena',
    KN: 'Saint Kitts And Nevis',
    LC: 'Saint Lucia',
    MF: 'Saint Martin',
    PM: 'Saint Pierre And Miquelon',
    VC: 'Saint Vincent And Grenadines',
    WS: 'Samoa',
    SM: 'San Marino',
    ST: 'Sao Tome And Principe',
    SA: 'Saudi Arabia',
    SN: 'Senegal',
    RS: 'Serbia',
    SC: 'Seychelles',
    SL: 'Sierra Leone',
    SG: 'Singapore',
    SK: 'Slovakia',
    SI: 'Slovenia',
    SB: 'Solomon Islands',
    SO: 'Somalia',
    ZA: 'South Africa',
    GS: 'South Georgia And Sandwich Isl.',
    ES: 'Spain',
    LK: 'Sri Lanka',
    SD: 'Sudan',
    SR: 'Suriname',
    SJ: 'Svalbard And Jan Mayen',
    SZ: 'Swaziland',
    SE: 'Sweden',
    CH: 'Switzerland',
    SY: 'Syrian Arab Republic',
    TW: 'Taiwan',
    TJ: 'Tajikistan',
    TZ: 'Tanzania',
    TH: 'Thailand',
    TL: 'Timor-Leste',
    TG: 'Togo',
    TK: 'Tokelau',
    TO: 'Tonga',
    TT: 'Trinidad And Tobago',
    TN: 'Tunisia',
    TR: 'Turkey',
    TM: 'Turkmenistan',
    TC: 'Turks And Caicos Islands',
    TV: 'Tuvalu',
    UG: 'Uganda',
    UA: 'Ukraine',
    AE: 'United Arab Emirates',
    GB: 'United Kingdom',
    US: 'United States',
    UM: 'United States Outlying Islands',
    UY: 'Uruguay',
    UZ: 'Uzbekistan',
    VU: 'Vanuatu',
    VE: 'Venezuela',
    VN: 'Viet Nam',
    VG: 'Virgin Islands, British',
    VI: 'Virgin Islands, U.S.',
    WF: 'Wallis And Futuna',
    EH: 'Western Sahara',
    YE: 'Yemen',
    ZM: 'Zambia',
    ZW: 'Zimbabwe'
};

function renderDetailsForSelectedLocation(event){
    let selectedCountry = event.target.value;
    console.log(selectedCountry);

    let locationDetails=coronaData.locations.reduce((accumulator,currentLocation)=>{
        if(currentLocation.country === selectedCountry){
               accumulator['country']=currentLocation.country;
               accumulator['country_code']=currentLocation.country_code;
               accumulator.latest.confirmed +=currentLocation.latest.confirmed;
               accumulator.latest.deaths +=currentLocation.latest.deaths;
          }
          return accumulator;
    },{
        country:'',
        country_code:'',
        latest : {
            confirmed :0,
            deaths:0,
       }
      
    });
    console.log(locationDetails);
    let world =false;
    renderUI(locationDetails,world);

    }

    function renderUI(details,world=false){
        let html =`
        <table  class="table">
        <thead>
        ${world ?  `<h4>World Details</h4>` : `<tr>${details.country}--${details.country}</tr>` }</thead>

        <tbody>
        <tr>
        ${world ?  `<td>${details.confirmed}</td>` : `<td>${details.latest.confirmed}</td>` }
        
        </tr>
        <tr>
        ${world ?  `<td>${details.deaths}</td>` : `<td>${details.latest.deaths}</td>` }
        
        </tr>
        </tbody>
        
        </table>
    
        `;

        if(world){

            coronaWorldDetails.innerHTML = html;
        }else{
            coronaDEtailsContainer.innerHTML =html;
        }
    }