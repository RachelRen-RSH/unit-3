(function () {

    window.onload = setMap();

    //variables for data join
    var attrArray = ["Bachelor", "Senior High", "Junior High", "Primary", "Illiteracy"];
    var expressed = attrArray[0];

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.45,
        chartHeight = 473
    leftPadding = window.innerWidth * 0.45,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    var colorClasses = [
        "#edf8fb",
        "#b2e2e2",
        "#66c2a4",
        "#2ca25f",
        "#006d2c",
    ];
    var domainArray = [];
    function setMap() {

        // //map frame dimensions
        var width = 760,
            height = 460;

        //create new svg container for the map and add the zoom / pan function to the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height)
            .call(d3.zoom().on("zoom", function () {
                map.attr("transform", d3.zoomTransform(this))
            }))
            .append("g")

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
            setChart(csvData, colorScale);
            createDropdown(csvData);
            setLegend();
            setMetadata();
        };

    }

//function to create color scale generator
function makeColorScale(data){

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build two-value array of minimum and maximum expressed attribute values
    var minmax = [
        d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        d3.max(data, function(d) { return parseFloat(d[expressed]); })
    ];
    //assign two-value array as scale domain
    colorScale.domain(minmax);

    return colorScale;
};
////////////////////////////////////////////////////////////
    //function to create coordinated bar chart
    function setChart(csvData, colorScale) {
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

        //set bars for each province
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return b[expressed] - a[expressed]
            })
            .attr("class", function (d) {
                return "bars " + d.Name;
            })
            .attr("width", chartWidth / csvData.length - 1)
            .on("mouseover", function (event, d) {
                highlight(d);
            })
            .on("mouseout", function (event, d) {
                dehighlight();
            })
            .on("mousemove", moveLabel);
        updateChart(bars, csvData.length, colorScale);

        var chartTitle = chart.append("text")
            .attr("x", 35)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of citizens (100,000) with " + expressed + "'s degree");

        var yScale = d3.scaleLinear()
            .range([473, 0])
            .domain([0, 45000]);
        var yAxis = d3.axisLeft()
            .scale(yScale);
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);
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
            var csvKey = csvRegion.Name; //the CSV primary key

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
                return "regions " + d.properties.Name;
            })
            .attr("d", path)
            .style("fill", function (d) {
                return colorScale(d.properties[expressed])
            })
            .on("mouseover", function (event, d) {
                highlight(d.properties);
            })
            .on("mouseout", function (event, d) {
                dehighlight();
            })
            .on("mousemove", moveLabel);
    };
    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData) {
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function () {
                changeAttribute(this.value, csvData)
            });
        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select level");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function (d) { return d })
            .text(function (d) { return d });
    };

    //Add a legend to the map
    function setLegend() {
        // //map frame dimensions
        var width = 250,
            height = 130;

        //create new svg container for the map
        var legend = d3.select("body")
            .append("svg")
            .attr("class", "legend")
            .attr("width", width)
            .attr("height", height)

        var legendTitle = legend.append("text")
            .attr("x", 20)
            .attr("y", 20)
            .text("Number of citizens / 100,000");

        var firstClass = legend.append("rect")
            .attr("x", 20)
            .attr("y", 30)
            .attr("width", 20)
            .attr("height", 15)
            .attr("fill", "#006d2c")
            .attr("id", "rectLabel");
        var secondClass = legend.append("rect")
            .attr("x", 20)
            .attr("y", 50)
            .attr("width", 20)
            .attr("height", 15)
            .attr("fill", "#2ca25f")
            .attr("id", "rectLabel");
        var thirdClass = legend.append("rect")
            .attr("x", 20)
            .attr("y", 70)
            .attr("width", 20)
            .attr("height", 15)
            .attr("fill", "#66c2a4")
            .attr("id", "rectLabel");
        var fourthClass = legend.append("rect")
            .attr("x", 20)
            .attr("y", 90)
            .attr("width", 20)
            .attr("height", 15)
            .attr("fill", "#b2e2e2")
            .attr("id", "rectLabel");
        var fifthClass = legend.append("rect")
            .attr("x", 20)
            .attr("y", 110)
            .attr("width", 20)
            .attr("height", 15)
            .attr("fill", "#edf8fb")
            .attr("id", "rectLabel");

        var firstBreak = legend.append("text")
            .attr("class", "first")
            .attr("x", 60)
            .attr("y", 43)
            .text(">= 33872");
        var secondBreak = legend.append("text")
            .attr("class", "second")
            .attr("x", 60)
            .attr("y", 63)
            .text(">= 26940");
        var thirdBreak = legend.append("text")
            .attr("class", "third")
            .attr("x", 60)
            .attr("y", 83)
            .text(">= 16990");
        var fourthBreak = legend.append("text")
            .attr("class", "fourth")
            .attr("x", 60)
            .attr("y", 103)
            .text(">= 10806");
        var fifthBreak = legend.append("text")
            .attr("class", "fifth")
            .attr("x", 60)
            .attr("y", 123)
            .text("None");
    }


    //dropdown change event handler
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var regions = d3.selectAll(".regions")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                var value = d.properties[expressed];

                if (value) {
                    return colorScale(d.properties[expressed]);
                } else {
                    return "white";
                }
            });
        var bars = d3.selectAll(".bars")
            //Sort bars
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .transition()
            .duration(1000)
        
        // set the legend to dynamic
        if (expressed == "Senior High") {
            var first = d3.select(".first")
                .text(">= 15239");
            var second = d3.select(".second")
                .text(">= 12937");
            var third = d3.select(".third")
                .text(">= 9951");
            var fourth = d3.select(".fourth")
                .text(">= 7051");
            var fifth = d3.select(".fifth")
                .text("None");
        }
        else if (expressed == "Junior High"){
            var first = d3.select(".first")
                .text(">= 34280");
            var second = d3.select(".second")
                .text(">= 27423");
            var third = d3.select(".third")
                .text(">= 23289");
            var fourth = d3.select(".fourth")
                .text(">= 15757");
            var fifth = d3.select(".fifth")
                .text("None");
        }
        else if (expressed == "Primary"){
            var first = d3.select(".first")
                .text(">= 29808");
            var second = d3.select(".second")
                .text(">= 21686");
            var third = d3.select(".third")
                .text(">= 16123");
            var fourth = d3.select(".fourth")
                .text(">= 10503");
            var fifth = d3.select(".fifth")
                .text("None");
        }
        else if (expressed == "Illiteracy"){
            var first = d3.select(".first")
                .text(">= 34065");
            var second = d3.select(".second")
                .text(">= None");
            var third = d3.select(".third")
                .text(">= 15326");
            var fourth = d3.select(".fourth")
                .text(">= 6924");
            var fifth = d3.select(".fifth")
                .text("5026");
        }

        updateChart(bars, csvData.length, colorScale);

    }

// create the function to update the chart bars height and the color scales
    function updateChart(bars, n, colorScale) {
        //position bars
        bars
            .attr("x", function (d, i) {
                return i * (chartWidth / n);
            })
            //resize bars
            .attr("height", function (d, i) {
                return parseFloat(d[expressed]) * 0.01;
            })
            .attr("y", function (d, i) {
                return 473 - parseFloat(d[expressed]) * 0.01;
            })
            //recolor bars
            .style("fill", function (d) {
                var value = d[expressed];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });
        var chartTitle = d3.select(".chartTitle")
            .text("Number of citizens (100,000) with " + expressed + "'s degree");
    };

    //function to highlight enumeration units and bars
    function highlight(props) {
        //change stroke
        var selected = d3.selectAll("." + props.Name)
            .style("stroke", "red")
            .style("stroke-width", "3");
        setLabel(props)
    };
    function dehighlight() {

        var regions = d3.selectAll(".regions")
            .style("stroke", "black")
            .style("stroke-width", "1");
        var regions = d3.selectAll(".bars")
            .style("stroke", "none")
            .style("stroke-width", "0");
        d3.select(".infolabel")
            .remove();
    };

    //function to create dynamic label
    function setLabel(props) {
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + props.Name + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.Name + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.name);
    };
    //function to move info label with mouse
    function moveLabel() {
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };

    // add the metadata information to the right corner of the whole page
    function setMetadata(){
        var Metadata = d3.select("body")
            .append("svg")
            .attr("class", "metadata")
            .attr("width", 320)
            .attr("height", 120)
        var name = Metadata.append("text")
            .attr("class", "metaInfo")
            .attr("x",10)
            .attr("y",20)
            .text("Project name: Educational level in China (2020)")
        var author = Metadata.append("text")
            .attr("class", "metaInfo")
            .attr("x",10)
            .attr("y",40)
            .text("Author: Sihan Ren")
        var date = Metadata.append("text")
            .attr("class", "metaInfo")
            .attr("x",10)
            .attr("y",60)
            .text("Date: 4/20/2022")
        var projection = Metadata.append("text")
            .attr("class", "metaInfo")
            .attr("x",10)
            .attr("y",80)
            .text("Projection: D3 Albers Equal-Area")
        var source = Metadata.append("text")
            .attr("class", "metaInfo")
            .attr("x",10)
            .attr("y",100)
            .text("Data source: National Bureau of Statistics of China")

    }
})();
