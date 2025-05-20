// 示例数据
/*
const data = {
    nodes: [
        { name: "Agricultural" },
        { name: "Residential" },
        { name: "Industry" },
        { name: "Reclaimed" },
        { name: "Evaporation" },
        { name: "River" }
    ],
    links: [
        { source: "Agricultural", target: "Reclaimed", value: 50 },
        { source: "Agricultural", target: "Evaporation", value: 20 },
        { source: "Residential", target: "Reclaimed", value: 30 },
        { source: "Residential", target: "Evaporation", value: 10 },
        { source: "Industry", target: "Reclaimed", value: 20 },
        { source: "Reclaimed", target: "River", value: 100 },
        { source: "Evaporation", target: "River", value: 30 }
    ]
};
*/
function debug(output){
	d3.select("#test").text(output)
}

//去重合并
function dedupeMerge(keyProp, ...lists) {
  const seen = new Map();
  return lists.flat().reduce((acc, item) => {
    const key = item[keyProp];
    if (!seen.has(key)) {
      seen.set(key, true);
      acc.push(item);
    }
    return acc;
  }, []);
}

//合并并添加tag
function advancedMerge(sources) {
  return sources.flatMap(({ data, fieldTag }) => {
    return data.map(item => ({
      ...item,
      Field: fieldTag // 添加数据来源标识
    }));
  });
}

//从特定属性创建节点
function createNodes(datas, key) {
  const valueMap = new Map();

  datas.flat().forEach(obj => {
    const value = obj[key];
    if (value != null && !valueMap.has(value)) {
      valueMap.set(value, { name: value });
    }
  });
  return Array.from(valueMap.values());
}

//从数据创建连接
function createLinks(data, sourceKey, targetKey, options = {}) {
	const {
		dropEmpty=false,
		defaultSource = "Unknown",  // 默认源占位符
		defaultTarget = "Unknown",  // 默认目标占位符
		countStrategy = "occurrence",      // 计数策略：occurrence/weighted
		weightKey = "value",                // 权重字段（当countStrategy=weighted时使用）
		filterKey = null,				//过滤键名
		filterValue = null,			//过滤键值
	} = options;
	var filteredData = data;
	if(filterKey != null){
		filteredData = data.filter(item => {
			return (item[filterKey] === filterValue);
		});
	}
  	const linkMap = new Map();
	const sourceSet = new Set();
    const targetSet = new Set();
	
	const isEmptyValue = (val) => 
    val === null || 
    val === undefined || 
    (typeof val === 'string' && val.trim() === '');
	
  	filteredData.forEach(item => {
    // 处理源值
    let source = item[sourceKey];
	
    if (isEmptyValue(source)) {
		if (dropEmpty) return;
		source = defaultSource;
	}
    
    // 处理目标值
    let target = item[targetKey];
    if (isEmptyValue(target)){
		if(dropEmpty) return;
		target = defaultTarget;
	} 
		
		
	sourceSet.add(source);
    targetSet.add(target);
	
    // 复合键生成（优化性能）
    const linkKey = source+"\u241E"+target; // 使用不可见字符分隔
    
    // 计算权重值
    const increment = countStrategy === "weighted" 
      ? Number(item[weightKey]) || 0 
      : 1;

    // 更新计数器
    linkMap.set(linkKey, (linkMap.get(linkKey) || 0) + increment);
    });

  // 生成链接列表
    const links = Array.from(linkMap, ([key, value]) => {
    	const [s, t] = key.split('\u241E');
    	return { source: s, target: t, value };
    });

  // 生成节点列表
  	const sources = Array.from(sourceSet).map(name => ({ name }));
  	const targets = Array.from(targetSet).map(name => ({ name }));

  	return { links, sources, targets };
}

//选取一定数值以上的link
function filterLinksByValue(links, threshold) {
  // 参数校验
  if (typeof threshold !== 'number') {
    throw new TypeError('阈值必须是数字类型');
  }
  if (!Array.isArray(links)) {
    throw new TypeError('链接数据必须是数组');
  }
  // 筛选并深拷贝避免污染原数据
  return links
    .filter(link => 
      typeof link?.value === 'number' && 
      link.value > threshold
    )
    .map(link => ({ 
      source: link.source,
      target: link.target,
      value: link.value 
    }));
}

//从所给的links中获得nodes
function extractNodesFromLinks(links){
	const nodeSet= new Set();
	links.forEach(item => {
		nodeSet.add(item.source);
		nodeSet.add(item.target);
	})
	return Array.from(nodeSet).map(name => ({ name }));
}

//加载数据
function load_data([prizeData, physicsData, chemistryData, medicineData]){
	const recordData = advancedMerge([
			{data:physicsData, fieldTag:"Physics"},
			{data:chemistryData, fieldTag:"Chemistry"},
			{data:medicineData,  fieldTag: "Medicine"},
		]);
	return {
		prizeData,
		recordData,
	};
}

//绘制指定Sankey图
function draw_specific_Sankey(recordData,options={}){
	const {
		sourceKey="Field",
		targetKey="Journal",
		threshold=0,
		filterKey="Is prize-winning paper",
		filterValue="YES",
		dropEmpty=false,
	} = options
	const {links, sources,targets} = createLinks(recordData,sourceKey, targetKey,{
			dropEmpty,
			filterKey,
			filterValue,
		});
	//nodes = dedupeMerge("name",sources,targets);
	filtedLinks = filterLinksByValue(links,threshold);
	nodes = extractNodesFromLinks(filtedLinks);
	drawSankey(nodes,filtedLinks)
}

//绘制多层Sankey图，数据不合适
function draw_multiple_Sankey(recordData,options={}){
	const {
		keySeries=["Journal","Field","Pub year"],
		threshold=0,
		filterKey="Is prize-winning paper",
		filterValue="YES",
		dropEmpty=true,
	} = options
	var multilinks=[]
	for (let i = 0; i < keySeries.length-1; i++) {
		const {links, sources,targets} = createLinks(recordData,keySeries[i], keySeries[i+1],{
			dropEmpty,
			filterKey,
			filterValue,
		});
		multilinks=dedupeMerge("source",multilinks,links);
	}
	filtedLinks = filterLinksByValue(multilinks,threshold);
	nodes = extractNodesFromLinks(filtedLinks);
	drawSankey(nodes,filtedLinks)
}

// 自定义防抖函数
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}


//并行读取文件
function file_loader(folder_path) {

  	return Promise.all([
	  	d3.csv(folder_path + "/Prize-winning paper record.csv"),
	  	d3.csv(folder_path + "/Physics publication record.csv"),
	  	d3.csv(folder_path + "/Chemistry publication record.csv"),
	  	d3.csv(folder_path + "/Medicine publication record.csv")
  	]).then(([prizeData, physicsData, chemistryData, medicineData]) => { 
	 	const {prizeDatas,recordData}=load_data([prizeData, physicsData, chemistryData, medicineData]);
		
		const sourceSelect=d3.select("#source-select");
		const targetSelect=d3.select("#target-select");
		const dropnaSelect=d3.select("#dropna-select");
		const thresholdInput=d3.select("#threshold");
		const chartDiv = d3.select("#chart");
		
		sourceSelect.property("value", "Field");
		targetSelect.property("value", "Affiliation");
		dropnaSelect.property("checked", true);
		thresholdInput.property("value", 5);
		
		function getConfigParams() {
			return {
				sourceKey: sourceSelect.property("value"),
				targetKey: targetSelect.property("value"),
				threshold: Number(thresholdInput.property("value")),
				filterKey: "Is prize-winning paper",
				filterValue: "YES",
				dropEmpty: dropnaSelect.property("checked")
			};
		}
		
		const debouncedDraw = debounce(() => {
			chartDiv.selectAll("svg").remove(); 
		  	draw_specific_Sankey(recordData, getConfigParams());
		}, 300);


		[sourceSelect, targetSelect, dropnaSelect, thresholdInput].forEach(control => {
			control.on("change", debouncedDraw);
		});
		
		
		draw_specific_Sankey(recordData,{
			sourceKey:"Field",
			targetKey:"Affiliation",
			threshold:5,
			filterKey:"Is prize-winning paper",
			filterValue:"YES",
			dropEmpty:true,
		})
		/*
		draw_multiple_Sankey(recordData,{
			threshold:1,
			filterKey:"Is prize-winning paper",
			filterValue:"YES",
			dropEmpty:true,
		});*/
  });
}
//输出Sankey图
function drawSankey(nodelist,linklist,options = {}){
	
	const {
		width=1000,
		height=600,
		containerTag="#chart"
	} = options;
	
	// 转换数据格式
	const nodes = nodelist.map(d => ({ ...d }));
	const links = linklist.map(d => ({
		...d,
		source: nodes.find(n => n.name === d.source),
		target: nodes.find(n => n.name === d.target)
	}));

	// 创建 SVG 容器
	const svg = d3.select(containerTag)
		.append("svg")
		.attr("width", width)
		.attr("height", height);

	// 创建桑基图布局
	const sankey = d3.sankey()
		.nodeWidth(15)
		.nodePadding(10)
		.extent([[1, 1], [width - 1, height - 1]]);

	// 应用布局
	const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
		nodes: nodes,
		links: links
	});

	// 颜色比例尺
	const color = d3.scaleOrdinal(d3.schemeCategory10);

	// 绘制链接
	const link = svg.append("g")
		.selectAll("path")
		.data(sankeyLinks)
		.join("path")
		.attr("class", "link")
		.attr("d", d3.sankeyLinkHorizontal())
		.attr("stroke-width", d => Math.max(1, d.width))
		.style("stroke", d => color(d.source.name));

	// 绘制节点
	const node = svg.append("g")
		.selectAll("g")
		.data(sankeyNodes)
		.join("g")
		.attr("transform", d => `translate(${d.x0},${d.y0})`);

	node.append("rect")
		.attr("height", d => d.y1 - d.y0)
		.attr("width", sankey.nodeWidth())
		.attr("fill", d => color(d.name))
		.append("title")
		.text(d => `${d.name}\n${d.value}`);

	// 添加节点标签
	node.append("text")
		.attr("x", d => d.x0 < width / 2 ? sankey.nodeWidth() + 6 : -6)
		.attr("y", d => (d.y1 - d.y0) / 2)
		.attr("dy", "0.35em")
		.attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
		.text(d => d.name);// JavaScript Document

	// 调整布局参数
	sankey
		.nodeWidth(20)    // 节点宽度
		.nodePadding(20)  // 节点间距
		.iterations(32)   // 布局迭代次数
		.nodeAlign(d3.sankeyJustify);  // 节点对齐方式

	// 修改颜色方案
	/*const color = d3.scaleOrdinal()
		.domain(nodes.map(d => d.name))
		.range(d3.schemeTableau10);*/
	link.on("mouseover", function(d) {
		d3.select(this).style("stroke-opacity", 0.8);
	}).on("mouseout", function(d) {
        d3.select(this).style("stroke-opacity", 0.3);
    });
	node.on("mouseover", function(d) {
		d3.select(this).select("rect").attr("fill", "orange");
	}).on("mouseout", function(d) {
        d3.select(this).select("rect")
            .attr("fill", d => color(d.name))
    });
}


file_loader("data");

