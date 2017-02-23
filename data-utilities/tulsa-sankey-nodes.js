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

process.stdout.write("<START>\n");

// util func for terminal
function ArrayOutput (name,array){
    process.stdout.write(`${name} : ${array.length}\n`)
}

// functions for cleaning node descriptions
function RevDetailNode({RevDetailNode: rev_title , RevCategory: fallback }){
    //strip off leading 'CC -' or 'C -' in source title
    try {
        const r = /[A-Z][A-Z]?[a-z]?[\s-]{1,4}(.*)/
        const [,title] = r.exec(rev_title)
        return title
    } catch (e) {
        return fallback
    }
}

const FundCode = ({ FundCode: code })=>getFundCategory(code)
const fund = ({ fund: code })=>getFundCategory(code)

//add a space to names to avoid duplicate fund titles
const program =(({program: name})=>{return ` ${name}`})
const RevCategory =(({RevCategory: name})=>{return ` ${name}`})



const sorted_revenues = _.sortBy(revenues,"amount").reverse()
const sorted_operations = _.sortBy(operations,"value").reverse()


// context for high level
const high_level_contexts = {
    revenue_context : {
        "source": RevCategory,
        "target": FundCode,
        "value": "amount"
    },
    operations_context : {
        "source": fund,
        "target": "lob",
        "value": "value"
    },
    ops_carryover : {
        "source": "key",
        "target": fund,
        "value": "value"
    }
}

// context for detailed flow
const detail_contexts = {
    revenue_context : {
        "source": RevDetailNode,
        "target": FundCode,
        "value": "amount"
    },
     operations_context : {
        "source": fund,
        "target": program,
        "value": "value"
    },
     ops_carryover : {
        "source": "key",
        "target": fund,
        "value": "value"
    }
}



function buildSankeyData({revenue_context: rev, operations_context: ops, ops_carryover: carry}){
    const node_names = []
    const data ={"nodes":[],"links":[]}

    //take a string and finds it's index in data.nodes
    //adds the string as a new node if not found
    function FindNodeIndex(NodeName){
        if (node_names.indexOf(NodeName) === -1) {
            node_names.push(NodeName)
            data.nodes.push({"name": NodeName})
        }
        return node_names.indexOf(NodeName)
    }

    function BuildNodeFinder({source, target, value}){

        const makeNameProcessor = (type, processor)=>{
            const getName = (
                typeof processor === 'function' ? processor : (item)=>item[processor]
            )
            return (item)=>{
                const name = getName(item)
                return name ? name : `Unknown ${type}`
            }
        }

        const getValue = (
                typeof value === 'function' ? value : (item)=>Math.abs(item[value])
        )

        const getSourceName = makeNameProcessor("Source",source)
        const getTargetName = makeNameProcessor("Target",target)

        return (item)=>{
            const source_name = getSourceName(item)
            const target_name = getTargetName(item)
            const source = FindNodeIndex(source_name)
            const target = FindNodeIndex(target_name)
            const value = getValue(item)
            data.links.push({source_name, target_name, source, target,value})
        }
    }

    const rev_node_finder = BuildNodeFinder(rev)
    const ops_node_finder = BuildNodeFinder(ops)
    const carryover_node_finder = BuildNodeFinder(carry)

    for(let item of sorted_revenues ){
        rev_node_finder(item)
    }

    for(let item of sorted_operations){
        if (item.value<0){
            carryover_node_finder(item)
        } else {
            ops_node_finder(item)
        }
    }

    // dedup links
    data.links = sumDuplicates(data.links,["source","target"])

    ArrayOutput("nodes", data.nodes)
    ArrayOutput("links", data.links)

    return data
}

const detail_sankey = buildSankeyData(detail_contexts)
const high_level_sankey = buildSankeyData(high_level_contexts)

data = [high_level_sankey,detail_sankey]

jsonfile.writeFile(
    OUTPUT_JSON_LOCATION, data, err=>err ? console.error(err) : ''
)

process.stdout.write("<END>")
