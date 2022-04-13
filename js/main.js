(function () {

    window.onload = setMap();

    //variables for data join
    var attrArray = ["Bachelor", "Senior_High", "Junior_High", "Primary", "Illiteracy"];
    var expressed = attrArray[0];

    function setMap() {

        // //map frame dimensions
        var width = 760,
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

            setGraticule(map, path);
            //translate Asia and China TopoJSON
            var ChinaProvince = topojson.feature(China, China.objects.ChinaProvince).features;
            var AsianCountries = topojson.feature(Asia, Asia.objects.world_countries_2020);
            //add basemap of countries to the map
            var countries = map.append("path")
                .datum(AsianCountries)
                .attr("class", "countries")
                .attr("d", path);

            var colorScale = makeColorScale(csvData);
            ChinaProvince = joinData(ChinaProvince, csvData);

            setEnumerationUnits(ChinaProvince, map, path, colorScale);
            setChart(csvData, colorScale)
        };

    }


    //to create color scale generator
    function makeColorScale(data) {
        var colorClasses = [
            "#edf8fb",
            "#b2e2e2",
            "#66c2a4",
            "#2ca25f",
            "#006d2c",
        ];
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function (d) {
            return d3.min(d);
        });
        //remove first value from domain array to create class breakpoints
        domainArray.shift();
        colorScale.domain(domainArray);

        return colorScale;
    };

    //function to create coordinated bar chart
    function setChart(csvData, colorScale) {
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.45,
            chartHeight = 460;

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart")
            .style("background-color", "white")
        //create a second svg element to hold the bar chart

        //set bars for each province
        //create a scale to size bars proportionally to frame
        var yScale = d3.scaleLinear()
            .range([0, chartHeight])
            .domain([0, 105]);

        //set bars for each province
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return b[expressed] - a[expressed]
            })
            .attr("class", function (d) {
                return "bars " + d.Province;
            })
            .attr("width", chartWidth / csvData.length - 1)
            .attr("x", function (d, i) {
                return i * (chartWidth / csvData.length);
            })
            .attr("height", function (d) {
                console.log(parseFloat(d[expressed]) * 0.01);
                return parseFloat(d[expressed]) * 0.01;
            })
            .attr("y", function (d) {
                console.log(chartHeight)
                console.log(chartHeight - parseFloat(d[expressed]) * 0.01)
                return chartHeight - parseFloat(d[expressed]) * 0.01;
            })
            .style("fill", function (d) {
                return colorScale(d[expressed]);
            });

        var numbers = chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function (a, b) {
                return b[expressed] - a[expressed]
            })
            .attr("class", function (d) {
                return "numbers " + d.Province;
            })
            .attr("text-anchor", "middle")
            .attr("x", function (d, i) {
                var fraction = chartWidth / csvData.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .attr("y", function (d) {
                return chartHeight - parseFloat(d[expressed]) * 0.01 + 25;
            })
            .text(function (d) {
                return d[expressed];
            });
        var chartTitle = chart.append("text")
            .attr("x", 35)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of citizens (10000) with " + expressed + "'s degree");
    };


    function setGraticule(map, path) {
        var graticule = d3.geoGraticule()
            .step([20, 20]); //place graticule lines every 20 degrees of longitude and latitude
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
        //...GRATICULE BLOCKS FROM Week 8
    };

    function joinData(ChinaProvince, csvData) {
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.Province; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a = 0; a < ChinaProvince.length; a++) {

                var geojsonProps = ChinaProvince[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.Name; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {

                    //assign all attributes and values
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };

        return ChinaProvince;
    };

    function setEnumerationUnits(ChinaProvince, map, path, colorScale) {
        //add China provinces to map
        var regions = map.selectAll(".regions")
            .data(ChinaProvince)
            .enter()
            .append("path")
            .attr("class", function (d) {

                return "regions ";
            })
            .attr("d", path)
            .style("fill", function (d) {
                return colorScale(d.properties[expressed])
            })
    };


})();
