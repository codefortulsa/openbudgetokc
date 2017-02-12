
var _ = require("underscore")
var jsonfile = require('jsonfile');
var revenues = require("../_src/data/tulsa/c4tul_fy2017Revenue.json")
var operations = require("../_src/data/tulsa/c4tul_fy2017.json")
var getFundCategory = require('../data-utilities/convert-tulsa-common').getFundCategory
var jtils = require("../data-utilities/json-utils")
var OUTPUT_JSON_LOCATION = './_src/data/tulsa/sankey-nodes-links.json';

/*
This file reads tulsa revenue and expenses files to
build a json object for a d3 sankey charter

The structure of the object is:

{"nodes":[
    {"name":"General Fund"},
    {"name":"Mayor"},
    {"name":"City Council"},
    {"name":"City Administrator"},
    {"name":"City Attorney"},
    {"name":"City Auditor"},
    {"name":"City Clerk"}
],
"links":[
    {"source":0,"target":1,"value":10},
    {"source":0,"target":2,"value":20},
    {"source":0,"target":3,"value":30},
    {"source":1,"target":3,"value":30}
]}

Nodes are the bars and links are the bands that connect them
*/

var node_names = []
var data ={"nodes":[],"links":[]}

process.stdout.write("<START>\n");

// util func for terminal
function ArrayOutput (name,array){
    process.stdout.write(`${name} : ${array.length}\n`)
}

//take a string and finds it's index in data.nodes
//adds the string as a new node if not found
function FindNodeIndex(NodeName){
    if (node_names.indexOf(NodeName) === -1) {
        node_names.push(NodeName)
        data.nodes.push({"name": NodeName})
    }
    return node_names.indexOf(NodeName)
}

function BuildNodeFinder(context){
    var {source, target, value, source_title, target_title } = context
    return function (item){
        var source_name = ( source_title ? source_title(item[source]) : item[source])
        if (!source_name){ source_name = "Unknown Source"}

        var target_name = ( target_title ? target_title(item[target]) : item[target])
        if (!target_name){ target_name = "Unknown Target"}

        var value_name = this.value
        var source_index = FindNodeIndex(source_name)
        var target_index = FindNodeIndex(target_name)
        var calc_value = Math.trunc(Math.abs((item[value])))

        data.links.push({"source":source_index,"target":target_index,"value":calc_value})
    }
}

// functions for cleaning node descriptions
function RevenueSource(RevDetail){
    //strip off leading 'CC -' or 'C -' in source title
    try {
        var r = /[A-Z][A-Z]?[a-z]?[\s-]{1,4}(.*)/
        return r.exec(RevDetail)[1]
    } catch(e) {
        return ''
    }
}

function full_fund_desc(FundCode){
    return `${FundCode} ${getFundCategory(FundCode)}`
}

function ops_decription(operation){
    // append char to distinquish from fund categories
    return ` ${operation}`
}

revenue_context ={
    "source" : "RevDetailNode",
    "source_title" : RevenueSource,
    "target" : "FundCode",
    "target_title" : getFundCategory,
    "value" : "amount"
}

operations_context ={
    "source" : "fund",
    "source_title" : getFundCategory,
    "target" : "program",
    "target_title" : ops_decription,
    "value" : "value"
}

revenues.map(BuildNodeFinder(revenue_context))
operations.map(BuildNodeFinder(operations_context))

// revSummary = jtils.sumBy(revenues,"RevCategory")
// opsSummary = jtils.sumBy(operations,"program")
// revSummary.map(BuildNodeFinder(revenue_context))
// opsSummary.map(BuildNodeFinder(operations_context))

// compress and sort links from biggest to smallest
unique_links = jtils.sumDuplicates(data.links,["source","target"])
data.links = _.sortBy(unique_links,"value").reverse()

ArrayOutput("nodes", data.nodes)
ArrayOutput("links", data.links)

jsonfile.writeFile(OUTPUT_JSON_LOCATION, data, function (err) {
    console.error(err);
});

process.stdout.write("<END>")
