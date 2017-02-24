const margin = {top: 4, right: 1, bottom: 6, left: 1}
const width = ( ({left,right})=> 1100 - left - right)(margin)
const height = ( ({top,bottom})=> 600 - top - bottom)(margin)

let sankey_data ={}

const formatNumber = d3.format(",.0f"),
    format = (d)=> { return "$" + formatNumber(d); },
    sankey_color = d3.scale.category20();


let svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

function clear_svg(){
    svg.selectAll("*").remove();
}

function toggle_data(){
    toggle_data.index = toggle_data.index === 0 ? 1 : 0
    clear_svg()
    draw_sankey_with(sankey_data[toggle_data.index]);
}

toggle_data.index = 1

var sankey = d3.sankey()
    .nodeWidth(30)
    .nodePadding(10)
    .size([width, height]);

var path = sankey.link();

// label functions
const link_title = ({source, target, value})=>{
    return `${source.name} → ${target.name} ${format(value)}`
}

const title_text = ({name, value})=>{ return `${name}\n${format(value)}`}

const budget_fill = ({color, name})=>{
     return color = sankey_color(name.replace(/ .*/, ""))
 }

// mouse event functions
function hover_link({source, target, value}){
    const new_span = `<span>${source.name} to ${target.name} :  ${format(value)}</span>`
    $("#hover_description").append($(new_span))
}
function unhover_link(){
    $("#hover_description").find("span:last").remove()
}

function click_node(d){
    toggle_data()
}

// Changed to budget
function draw_sankey_with(data) {
    sankey
        .nodes(data.nodes)
        .links(data.links)
        .layout(32);

    var link = svg.append("g").selectAll(".link")
        .data(data.links)
        .enter().append("path")
        .attr("class", "link")
        .attr("d", path)
        .style("stroke-width", ({dy})=>{return Math.max(1, dy) })
        .sort(({dy:a}, {dy:b})=>{ b - a })
        .on("mouseover", hover_link)
        .on("mouseout", unhover_link);

    link.append("title").text(link_title)

    var node = svg.append("g")
        .selectAll(".node")
        .data(data.nodes)
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", ({x,y})=>{ return `translate(${x}, ${y})`} )

        node.append("rect")
            .attr("height", ({dy})=>dy)
            .attr("width", sankey.nodeWidth())
            .style("fill", budget_fill)
            .style("stroke", ({color})=>{ return d3.rgb(color).darker(2) })
            .on("click", click_node)
            .append("title")
                .text(title_text)

        node.append("text")
            .attr("x", -6)
            .attr("y", ({dy})=>{ return dy / 2 })
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .attr("transform", null)
            .text(d=>d.name)
                .filter(({x})=>{ return x < width / 2 })
                .attr("x", 6 + sankey.nodeWidth())
                .attr("text-anchor", "start");
};

d3.json("/data/tulsa/sankey-nodes-links.json", function(budget) {
    sankey_data = budget
    draw_sankey_with(budget[0]);
})
