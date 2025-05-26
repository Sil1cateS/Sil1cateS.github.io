// index2.html 图表脚本，避免id冲突
const width2 = 850, height2 = 400;
const margin2 = { top: 40, right: 40, bottom: 40, left: 60 };
d3.json("data/top10_institutions.json").then(data => {
    data.forEach(d => {
        if (d.Affiliation !== "Unknown") {
            d.Affiliation = d.Affiliation.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
    });
    const fields = ["Chemistry", "Physics", "Medicine"];
    const stack = d3.stack().keys(fields);
    const series = stack(data);
    const x = d3.scaleBand()
        .domain(data.map(d => d.Affiliation))
        .range([margin2.left, width2 - margin2.right])
        .padding(0.2);
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d =>
            fields.reduce((sum, field) => sum + (d[field] || 0), 0)
        )])
        .nice()
        .range([height2 - margin2.bottom, margin2.top]);
    const color = d3.scaleOrdinal()
        .domain(fields)
        .range(d3.schemeTableau10);
    const svg = d3.select("#stack-plot")
        .attr("width", width2)
        .attr("height", height2);
    svg.selectAll("g.layer")
        .data(series)
        .join("g")
        .attr("class", "layer")
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.data.Affiliation))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .on("mouseover", function(event, d) {
            const total = fields.reduce((sum, field) => sum + d.data[field], 0);
            d3.select("#tooltip2")
                .style("opacity", 1)
                .style("display", "block")
                .html(`
                    <strong>${d.data.Affiliation}</strong>
                    <div style="margin: 8px 0 4px; border-bottom: 1px solid #eee"></div>
                    <div><span>领域：</span>${fields.map((field, i) => `<span style=\"color: ${color(field)}\">${field}：${d.data[field]}</span>`).join(" ")}</div>  
                    <div><span>数量：</span>${d[1] - d[0]}</div>
                    <div><span>总获奖数：</span>${total}</div>
                `);
        })
        .on("mousemove", function(event) {
            d3.select("#tooltip2")
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            d3.select("#tooltip2")
                .style("opacity", 0)
                .style("display", "none");
        });
    svg.append("g")
        .attr("transform", `translate(0,${height2 - margin2.bottom})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .selectAll("text")
        .attr("transform", "rotate(-36)")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.5em")
        .style("font-size", "16px") ;
    svg.append("g")
        .attr("transform", `translate(${margin2.left},0)`)
        .call(d3.axisLeft(y).ticks(5));
    svg.append("text")
        .attr("transform", `translate(${width2/2},${height2 - margin2.bottom/2})`)
        .style("text-anchor", "middle")
        .text("Institutions")
        .style("font-size", "16px") 
        .style("fill", "grey")
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin2.left/3)
        .attr("x", -height2/2+60)
        .style("text-anchor", "middle")
        .text("Number of Nobel Prizes")
        .style("font-size", "18px") 
        .style("fill", "grey")
        ;
    const legend = svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 16)
        .attr("transform", `translate(${width2 - 140},40)`);
    fields.forEach((field, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0,${i * 25})`);
        legendRow.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", color(field));
        legendRow.append("text")
            .attr("x", 24)
            .attr("y", 9)
            .attr("dy", "0.35em")
            .text(field);
    });
    /*
	svg.append("text")
        .attr("x", width2/2)
        .attr("y", margin2.top)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .text("Top 10 Nobel Prize-Winning Institutions by Research Field");
	*/
}).catch(error => {
    console.error("数据加载失败：", error);
    const svg = d3.select("#stack-plot").append("svg")
        .attr("width", width2)
        .attr("height", height2);
    svg.append("text")
        .attr("x", width2/2)
        .attr("y", height2/2)
        .text("数据加载失败：" + error.message);
}); 