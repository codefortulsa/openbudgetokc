var _ = require('underscore')
var jsonfile = require('jsonfile');

var revenues = require("../_src/data/tulsa/c4tul_fy2017Revenue.json")
var programs = require("../_src/data/tulsa/c4tul_fy2017.json")
var categories = require("../_src/data/tulsa/fund_categories.json").categories

var OUTPUT_JSON_LOCATION = './_src/data/tulsa/flow-test.json';

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
    var uniq_array = _.uniq(array)
    process.stdout.write(`${name} : ${uniq_array.length}\n`)
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

function FundType(FullCode){
    return FullCode
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

function FindNodesAndLinks(item, key, array) {
    var source_name = item[this.source]
    if (!source_name){
        source_name = "Unknown Source"
    }
    var target_name = item[this.target]
    if (!target_name){
        target_name = "Unknown Target"        
    }

    var value_name = this.value
    var source_index = FindNodeIndex(source_name)
    var target_index = FindNodeIndex(target_name)
    var value = Math.trunc(Math.abs((item[value_name]/1000)))

    data.links.push({"source":source_index,"target":target_index,"value":value})
}

revenue_context ={
    "source" : "RevDetailNode",
    "target" : "FundDescription",
    "value" : "amount"
}

_.each(revenues, FindNodesAndLinks, revenue_context)

programs_context ={
    "source" : "fund",
    "target" : "program",
    "value" : "value"
}
_.each(programs, FindNodesAndLinks, programs_context)

ArrayOutput("nodes", data.nodes)
ArrayOutput("links", data.links)

jsonfile.writeFile(OUTPUT_JSON_LOCATION, data, function (err) {
    console.error(err);
});

process.stdout.write("<END>")
