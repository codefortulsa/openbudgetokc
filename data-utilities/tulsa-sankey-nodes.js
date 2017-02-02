var _ = require('underscore')
var jsonfile = require('jsonfile');

var revenues = require("../_src/data/tulsa/c4tul_fy2017Revenue.json")
var programs = require("../_src/data/tulsa/c4tul_fy2017.json")


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

var data ={"nodes":[],"links":[]}

process.stdout.write("<START>");

//build node list
var node_names = []

for (item of revenues){
    //strip off leading 'CC -' or 'C -' in source title
    var r = /[A-Z][A-Z]?[a-z]?[\s-]{1,4}(.*)/
    var SourceNode = r.exec(item.RevDetailNode)[1]
    node_names.push(SourceNode)
    node_names.push(item.FundDescription)
}

// for (item of programs){
//     node_names.push(item.fund)
//     node_names.push(item.program)
// }

var uniq_node_names = _.uniq(node_names)

for (name of uniq_node_names){
    data.nodes.push({"name": name})
}

process.stdout.write(`unique nodes: ${uniq_node_names.length}`)

// create links
// Link object -->   {"source":0,"target":1,"value":10}

for (item of revenues){
    var r = /[A-Z][A-Z]?[a-z]?[\s-]{1,4}(.*)/
    var SourceNode = r.exec(item.RevDetailNode)[1]
    var source_index = uniq_node_names.indexOf(SourceNode)
    var target_index = uniq_node_names.indexOf(item.FundDescription)
    var value = Math.abs((item.amount/1000))
    data.links.push({"source":source_index,"target":target_index,"value":value
    // ,"source_name": SourceNode, "target_name":item.FundDescription
    })
}


// for (item of programs){
//     var source_index = uniq_node_names.indexOf(item.fund)
//     var target_index = uniq_node_names.indexOf(item.program)
//     if (source_index === -1 || target_index === -1){
//         console.log(`Problem with ${item.fund} or ${item.program}`)
//     } else {
//         data.links.push({"source":source_index,"target":target_index,"value":item.value
//         // ,"source_name": item.fund, "target_name":item.program
//         })
//     }
// }


jsonfile.writeFile(OUTPUT_JSON_LOCATION, data, function (err) {
    console.error(err);
});


process.stdout.write("<END>")
