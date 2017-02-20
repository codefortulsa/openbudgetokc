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

const _ = require("underscore")
const jsonfile = require('jsonfile');

const {sumDuplicates} = require("../data-utilities/json-utils")
const {getFundCategory} = require('../data-utilities/convert-tulsa-common')

const revenues = require("../_src/data/tulsa/c4tul_fy2017Revenue.json")
const operations = require("../_src/data/tulsa/c4tul_fy2017.json")
const OUTPUT_JSON_LOCATION = './_src/data/tulsa/sankey-nodes-links.json';

const node_names = []
const data ={"nodes":[],"links":[]}

process.stdout.write("<START>\n");

// util func for terminal
function ArrayOutput (name,array){
    process.stdout.write(`${name} : ${array.length}\n`)
}

// functions for cleaning node descriptions
function rev_source(item){
    //strip off leading 'CC -' or 'C -' in source title
    try {
        const r = /[A-Z][A-Z]?[a-z]?[\s-]{1,4}(.*)/
        const [,RevTitle] = r.exec(item.RevDetailNode)
        return RevTitle
    } catch (e) {
        return item.RevCategory
    }
}

const rev_category = ({ FundCode: code })=>getFundCategory(code)
const ops_category = ({ fund: code })=>getFundCategory(code)

//add a space to program to avoid duplicate fund titles
const ops_decription =(({program})=>{return ` ${program}`})

//take a string and finds it's index in data.nodes
//adds the string as a new node if not found
function FindNodeIndex(NodeName){
    if (node_names.indexOf(NodeName) === -1) {
        node_names.push(NodeName)
        data.nodes.push({"name": NodeName})
    }
    return node_names.indexOf(NodeName)
}

function BuildNodeFinder({source, target, value, carryover}){

    const makeNameFinder = (process)=>{
        return (typeof process === 'function'  ? process : (item)=>item[process])
    }



    const makeItemProcessor = (type, processor)=>{
        const getName = makeNameFinder(processor)
        return (item)=>{
            const name = getName(item)
            return name ? name : `Unknown ${type}`
        }
    }

    const getSourceName = makeItemProcessor("Source",source)
    const getTargetName = makeItemProcessor("Target",target)

    if (carryover){
        const getCarryoverSourceName = makeItemProcessor("Source",carryover.source)
        const getCarryoverTargetName = makeItemProcessor("Target",carryover.target)
    }


    return (item)=>{

        link_value = Math.abs(item[value])

        // //use carryover values for negative values
        if (item[value]<0 && carryover){
            ({source, target} = carryover)
        }

        var source_name = getSourceName(item)
        var source_index = FindNodeIndex(source_name)

        var target_name = getTargetName(item)
        var target_index = FindNodeIndex(target_name)

        data.links.push(
            {   "source_name": source_name,
                "source": source_index,
                "target_name": target_name,
                "target": target_index,
                "value": link_value
            }
        )
    }
}

const sorted_revenues = _.sortBy(revenues,"amount").reverse()
const sorted_operations = _.sortBy(operations,"value").reverse()

const revenue_context ={
    "source": rev_source,
    "target": rev_category,
    "value": "amount"
}

const operations_context ={
    "source": ops_category,
    "target": ops_decription,
    "value": "value",
    "carryover": {
        "source": "key",
        "target": ops_category
    }
}

const rev_node_finder = BuildNodeFinder(revenue_context)
const ops_node_finder = BuildNodeFinder(operations_context)

for(let item of sorted_revenues ){
    rev_node_finder(item)
}

for(let item of sorted_operations){
    ops_node_finder(item)
}

// dedup links
data.links = sumDuplicates(data.links,["source","target"])

ArrayOutput("nodes", data.nodes)
ArrayOutput("links", data.links)

jsonfile.writeFile(
    OUTPUT_JSON_LOCATION, data, err=>{(err) ? console.error(err):''}
)

process.stdout.write("<END>")
