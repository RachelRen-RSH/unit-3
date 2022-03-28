
//SVG dimension variables
var w = 950, h = 500;

//Example 1.4 line 1...container block
//Example 1.5 line 1...container block
var container = d3.select("body") //get the <body> element from the DOM
    .append("svg") //put a new svg in the body
    .attr("width", w) //assign the width
    .attr("height", h) //assign the height
    .attr("class", "container") //assign a class name
    .style("background-color", "rgba(0,0,0,0.2)"); //svg background color

//innerRect block
var innerRect = container.append("rect") //put a new rect in the 
    .datum(400)
    .attr("width", function (d) {
        return d * 2+65;
    }) //rectangle width
    .attr("height", function (d) {
        return d;
    }) //rectangle height
    .attr("class", "innerRect")
    .attr("x", 50)
    .attr("y", 60)
    .style("fill", "#FFFFFF")
// <rect> is now the operand of the container block

var cityPop = [
    {
        city: 'Madison',
        population: 233209
    },
    {
        city: 'Milwaukee',
        population: 594833
    },
    {
        city: 'Green Bay',
        population: 104057
    },
    {
        city: 'Superior',
        population: 27244
    }
];

var x = d3.scaleLinear()
    .range([90, 810])
    .domain([0, 3])
//find the minimum value of the array
var minPop = d3.min(cityPop, function (d) {
    return d.population;
});

//find the maximum value of the array
var maxPop = d3.max(cityPop, function (d) {
    return d.population;
});

//scale for circles center y coordinate
var y = d3.scaleLinear()
    .range([450, 50])
    .domain([
        0, 700000
    ]);
//color scale generator 
var color = d3.scaleLinear()
    .range([
        "#FDBE85",
        "#D94701"
    ])
    .domain([
        minPop,
        maxPop
    ]);
//Example 2.6 line 3
var circles = container.selectAll(".circles") //create an empty selection
    .data(cityPop) //here we feed in an array
    .enter() //one of the great mysteries of the universe
    .append("circle") //inspect the HTML--holy crap, there's some circles there
    .attr("class", "circles")
    .attr("id", function (d) {
        return d.city;
    })
    .attr("r", function (d) {
        //calculate the radius based on population value as circle area
        var area = d.population * 0.01;
        return Math.sqrt(area / Math.PI);
    })
    .attr("cx", function (d, i) {
        //use the index to place each circle horizontally
        return x(i);
    })
    .attr("cy", function (d) {
        //subtract value from 450 to "grow" circles up from the bottom instead of down from the top of the SVG
        return y(d.population);
    })
    .style("fill", function (d, i) { //add a fill based on the color scale generator
        return color(d.population);
    })
    .style("stroke", "#000"); //black circle stroke

var yAxis = d3.axisLeft(y);
var axis = container.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(50,10)")
    .call(yAxis);

var title = container.append("text")
    .attr("class", "title")
    .attr("text-anchor", "middle")
    .attr("x", 450)
    .attr("y", 30)
    .text("City Populations");

    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function(d){
            //vertical position centered on each circle
            return y(d.population) + 5;
        });

    //first line of label
    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function(d,i){
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .text(function(d){
            return d.city;
        });

    //create format generator
    var format = d3.format(",");

    //Example 3.16 line 1...second line of label
    var popLine = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .attr("dy", "15") //vertical offset
        .text(function(d){
            return "Pop. " + format(d.population); //use format generator to format numbers
        });


