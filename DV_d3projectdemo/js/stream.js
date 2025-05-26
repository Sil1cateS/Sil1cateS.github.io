// 河流图 chart3.js
const color = d3.scaleOrdinal()
  .domain(["electron", "quantum", "atom", "neutrino", "radiation", "protein", "synthesis", "molecular", "dna", "hydrogen", "cell", "acid", "nerve", "liver", "gene", "magnetic", "beam", "ion", "liquid", "catalyst", "metal", "clinical", "cancer", "therapy"])
  .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#dbdb8d", "#ffcc00", "#ffbb78", "#98df8a", "#aec7e8", "#ff9896", "#c49c94", "#c5b0d5", "#f7b6d2", "#9edae5"]);

const tooltip = d3.select("#tooltip");

const files = {
  "Chemistry": ["data/Chemistry_streamgraph_data_updated.json", "data/comparison_sample_Chemistry.json"],
  "Physics": ["data/Physics_streamgraph_data_updated.json", "data/comparison_sample_Physics.json"],
  "Medicine": ["data/Medicine_streamgraph_data_updated.json", "data/comparison_sample_Medicine.json"]
};

function drawField(field) {
  Promise.all(files[field].map(f => d3.json(f))).then(([data1, data2]) => {
    drawStream("svg1", data1, 400, 40);
    drawStream("svg2", data2, 400, 25);
    drawLegend("legend1", Object.keys(data1[0]).filter(k => k !== "year"));
    drawLegend("legend2", Object.keys(data2[0]).filter(k => k !== "year"));
  });
}

function drawStream(id, data, height, maxY) {
  const svg = d3.select("#" + id);
  svg.selectAll("*").remove();
  const width = 850;
  const margin = {top: 20, right: 30, bottom: 30, left: 40};

  const keys = Object.keys(data[0]).filter(k => k !== "year");
  const years = data.map(d => +d.year);
  const stack = d3.stack().keys(keys).offset(d3.stackOffsetWiggle);
  const series = stack(data);

  const x = d3.scaleLinear().domain(d3.extent(years)).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear()
              .domain([
                d3.min(series, s => d3.min(s, d => d[0])),
                d3.max(series, s => d3.max(s, d => d[1]))
              ])
              .range([height - margin.bottom, margin.top]);

  const area = d3.area()
    .x((d, i) => x(data[i].year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveBasis);

  const paths = svg.selectAll("path")
    .data(series)
    .join("path")
    .attr("fill", (d, i) => color(keys[i]))
    .attr("d", area)
    .attr("opacity", 0.85)
    .on("mousemove", function(event, d) {
      const idx = series.indexOf(d);
      d3.select(this).attr("opacity", 1).attr("stroke", "#222").attr("stroke-width", 2);
      tooltip
        .style("left", (event.pageX + 20) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("opacity", 1)
        .html(`<span style='font-weight:bold;color:${color(keys[idx])}'>${keys[idx]}</span>`);
      d3.selectAll(`#${id.replace('svg','legend')} .legend-item`).filter((_,i)=>i===idx)
        .style("background","rgba(200,200,255,0.25)")
        .style("font-weight","bold");
    })
    .on("mouseleave", function(event, d) {
      d3.select(this).attr("opacity", 0.85).attr("stroke", null);
      tooltip.style("opacity", 0);
      d3.selectAll(`#${id.replace('svg','legend')} .legend-item`)
        .style("background",null)
        .style("font-weight",null);
    });

  svg.append("g")
    .attr("transform", "translate(0," + (height - margin.bottom) + ")")
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")));
}

function drawLegend(id, keywords) {
  const legend = d3.select("#" + id);
  legend.selectAll("*").remove();
  keywords.forEach(k => {
    const item = legend.append("div").attr("class", "legend-item").style("display","flex").style("align-items","center").style("margin-right","12px");
    item.append("div")
      .attr("class", "legend-color")
      .style("background-color", color(k))
      .style("width","16px").style("height","16px").style("margin-right","6px").style("border-radius","3px");
    item.append("span").text(k);
  });
}

d3.select("fieldSelect").on("change", function () {
  drawField(this.value);
});

drawField("Chemistry"); 