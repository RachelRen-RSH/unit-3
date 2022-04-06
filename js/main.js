
//begin script when window loads
window.onload = setMap();

function setMap() {

    // //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on China
    var projection = d3.geoAlbers()
        .center([-5.45, 36.51])
        .rotate([-109.91, 0, 0])
        .parallels([26.55, 44.52])
        .scale(700)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/EducationLevel_China.csv")); //load attributes from csv    
    promises.push(d3.json("data/world_countries_2020.topojson"));
    promises.push(d3.json("data/ChinaProvince.topojson")); //load background spatial data       
    Promise.all(promises).then(callback);

    function callback(data) {

        var csvData = data[0];
        var Asia = data[1];
        var China = data[2];

        //translate Asia and China TopoJSON
        var ChinaProvince = topojson.feature(China, China.objects.ChinaProvince).features;
        var AsianCountries = topojson.feature(Asia, Asia.objects.world_countries_2020);

        var graticule = d3.geoGraticule()
            .step([20, 20]); //place graticule lines every 20 degrees of longitude and latitude
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines

        //add basemap of countries to the map
        var countries = map.append("path")
            .datum(AsianCountries)
            .attr("class", "countries")
            .attr("d", path);

        //add China provinces to map
        var regions = map.selectAll(".regions")
            .data(ChinaProvince)
            .enter()
            .append("path")
            .attr("class", function (d) {

                return "regions ";
            })
            .attr("d", path);

    };

}

