// JavaScript Document
// index.html 折线图脚本
const margin = {top: 40, right: 40, bottom: 40, left: 60},
      width = 850 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

Promise.all([
    d3.csv("data/Prize-winning paper record.csv"),
    d3.csv("data/Physics publication record.csv"),
    d3.csv("data/Chemistry publication record.csv"),
    d3.csv("data/Medicine publication record.csv")
]).then(function([prizeData, physicsData, chemistryData, medicineData]) {
    const categoryToLaureates = {Physics: [], Chemistry: [], Medicine: []};
    const laureateInfo = {};
    const laureateCategory = {};
    prizeData.forEach(d => {
        const name = d["Laureate name"];
        const category = d["Field"];
        if (categoryToLaureates[category] && !categoryToLaureates[category].includes(name)) {
            categoryToLaureates[category].push(name);
        }
        laureateInfo[name] = +d["Prize year"];
        laureateCategory[name] = category;
    });
    const categorySelect = d3.select("#line-category-select");
    const laureateSelect = d3.select("#line-laureate-select");
    function updateLaureateOptions(category) {
        const names = (categoryToLaureates[category] || []).sort();
        laureateSelect.selectAll("option").remove();
        laureateSelect.selectAll("option")
            .data(names)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d);
        if (names.length > 0) {
            drawChart(names[0], laureateInfo, allPubs);
        } else {
            d3.select('#line-chart').selectAll('*').remove();
        }
    }
    categorySelect.on("change", function() {
        updateLaureateOptions(this.value);
    });
    laureateSelect.on("change", function() {
        drawChart(this.value, laureateInfo, allPubs);
    });
    const allPubs = physicsData.concat(chemistryData, medicineData);
    updateLaureateOptions("Physics");
});

function drawChart(laureateName, laureateInfo, allPubs) {
    const svg = d3.select("#line-chart");
    svg.selectAll("*").remove();
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const data = allPubs.filter(d => d["Laureate name"] === laureateName);
    if (data.length === 0) return;
    const years = data.map(d => +d["Pub year"]);
    const minYear = d3.min(years), maxYear = d3.max(years);
    const yearRange = d3.range(minYear, maxYear + 1);
    const yearCount = {};
    yearRange.forEach(y => yearCount[y] = 0);
    data.forEach(d => {
        yearCount[+d["Pub year"]]++;
    });
    const lineData = yearRange.map(y => ({year: y, count: yearCount[y]}));
    const prizeYear = laureateInfo[laureateName];
    d3.csv("data/Prize-winning paper record.csv").then(prizePapers => {
        const laureatePapers = prizePapers.filter(d => d["Laureate name"] === laureateName);
        const pubYearObjs = laureatePapers.map((d, i) => ({
            year: +d["Pub year"],
            title: d["Title"] || ("获奖论文" + (i+1))
        })).filter(d => !isNaN(d.year));
        pubYearObjs.sort((a, b) => a.year - b.year);
        let timeDiff = null;
        let earliestYear = null;
        if (pubYearObjs.length > 0) {
            earliestYear = pubYearObjs[0].year;
            timeDiff = prizeYear - earliestYear;
        }
        const x = d3.scaleLinear()
            .domain([minYear, maxYear])
            .range([0, width]);
        const y = d3.scaleLinear()
            .domain([0, d3.max(lineData, d => d.count)]).nice()
            .range([height, 0]);
        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")));
        g.append("g")
            .call(d3.axisLeft(y));
        g.append("path")
            .datum(lineData)
            .attr("fill", "none")
            .attr("stroke", "#007acc")
            .attr("stroke-width", 2)
            .attr("d", d3.line()
                .x(d => x(d.year))
                .y(d => y(d.count))
            );
        const tooltip = d3.select("body").append("div")
            .attr("class", "line-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(255,255,255,0.95)")
            .style("border", "1px solid #aaa")
            .style("border-radius", "5px")
            .style("padding", "6px 12px")
            .style("pointer-events", "none")
            .style("font-size", "1em")
            .style("color", "#222")
            .style("box-shadow", "0 2px 8px rgba(0,0,0,0.08)")
            .style("display", "none");
        g.selectAll(".dot")
            .data(lineData)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(d.count))
            .attr("r", 4)
            .attr("fill", "#007acc")
			.attr("opacity", 0) 
            .attr("stroke", "none")
            .on("mouseover", function(event, d) {
                d3.select(this).attr("fill", "#005f99")
					.attr("opacity", 1) ;
                tooltip.style("display", "block")
                    .html(`<strong>年份：</strong>${d.year}<br/><strong>出版数量：</strong>${d.count}`);
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX + 16) + "px")
                    .style("top", (event.pageY - 24) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).attr("fill", "#007acc")
					.attr("opacity", 0) ;
                tooltip.style("display", "none");
            });
        if (prizeYear >= minYear && prizeYear <= maxYear) {
            g.append("line")
                .attr("x1", x(prizeYear))
                .attr("x2", x(prizeYear))
                .attr("y1", 0)
                .attr("y2", height)
                .attr("stroke", "red")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "6,4");
            let labelX = x(prizeYear) + 5;
            let anchor = "start";
            let labelText = "获奖年份：" + prizeYear;
            if (x(prizeYear) > width - 90) {
                labelX = x(prizeYear) - 5;
                anchor = "end";
            }
            g.append("text")
                .attr("x", labelX)
                .attr("y", 18)
                .attr("fill", "red")
                .attr("font-size", "1em")
                .attr("text-anchor", anchor)
                .text(labelText);
        }
        if (pubYearObjs.length > 0) {
            const colorList = ["#FFD600"].concat(d3.schemeCategory10);
            pubYearObjs.forEach((obj, i) => {
                const py = obj.year;
                if (py >= minYear && py <= maxYear) {
                    g.append("line")
                        .attr("x1", x(py))
                        .attr("x2", x(py))
                        .attr("y1", 0)
                        .attr("y2", height)
                        .attr("stroke", colorList[i % colorList.length])
                        .attr("stroke-width", 2)
                        .attr("stroke-dasharray", "6,4");
                    let labelX = x(py) + 5;
                    let anchor = "start";
                    let labelText = (i === 0 ? "最早获奖论文发表：" : "获奖论文发表：") + py;
                    let labelY = 38 + i * 20;
                    if (Math.abs(x(py) - x(prizeYear)) < 40) {
                        labelY = 58 + i * 20;
                    }
                    if (x(py) > width - 110) {
                        labelX = x(py) - 5;
                        anchor = "end";
                    }
                    g.append("text")
                        .attr("x", labelX)
                        .attr("y", labelY)
                        .attr("fill", colorList[i % colorList.length])
                        .attr("font-size", "1em")
                        .attr("text-anchor", anchor)
                        .text(labelText);
                }
            });
        }
        g.append("text")
            .attr("x", width/2)
            .attr("y", height + 35)
            .attr("text-anchor", "middle")
            .attr("class", "axis-label")
            .text("年份");
        g.append("text")
            .attr("x", -height/2)
            .attr("y", -40)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .attr("class", "axis-label")
            .text("出版记录数量");
        svg.append("text")
            .attr("x", margin.left + width/2)
            .attr("y", 28)
            .attr("text-anchor", "middle")
            .attr("font-size", "1.2em")
            .attr("font-weight", "bold")
            .text(laureateName + " 的学术产出时间分布");
        if (timeDiff !== null && timeDiff >= 0) {
            const minR = 18, maxR = 60;
            let r = minR + (Math.min(timeDiff, 20) / 20) * (maxR - minR);
            const centerX = margin.left + width/2;
            const minGap = 80;
            const centerY = margin.top + height + minGap + r;
            svg.append("circle")
                .attr("cx", centerX)
                .attr("cy", centerY)
                .attr("r", r)
                .attr("fill", "orange")
                .attr("opacity", 0.7);
            svg.append("text")
                .attr("x", centerX)
                .attr("y", centerY + r + 28)
                .attr("text-anchor", "middle")
                .attr("font-size", "1.1em")
                .attr("fill", "#e67e22")
                .text("最早获奖论文发表年份与获奖年份的时间差");
            svg.append("text")
                .attr("x", centerX)
                .attr("y", centerY + 8)
                .attr("text-anchor", "middle")
                .attr("font-size", "1.3em")
                .attr("fill", "#fff")
                .attr("font-weight", "bold")
                .text(timeDiff + " 年");
        }
    });
}

document.body.style.overflowY = 'auto'; 