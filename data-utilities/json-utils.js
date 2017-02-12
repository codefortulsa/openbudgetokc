// var _ = require("underscore")

// combine duplicate keys and sum any numbers
function sumBy(ObjectArray, byKey){
    var result = []
    var keys = []
    var original = ObjectArray
    var summaryKey = byKey

    ObjectArray.map(function(item){
        var idx = keys.indexOf(item[summaryKey])

        if (idx === -1){
            keys.push(item[summaryKey])
            result.push(Object.assign({},item))
        } else {
            for (key in item){
                if (Number.isInteger(item[key])){
                    result[idx][key]+=item[key]
                }
            }
        }
    })
    return result
}


function sumDuplicates(ObjectArray,names){
    var matchKeys = names
    var result = []
    var keys = []

    ObjectArray.forEach(function(item){
        let allKeyValues = matchKeys.reduce(
            (all,name)=>{return all+item[name]},''
        )
        let idx = keys.indexOf(allKeyValues)

        if (idx == -1){
            keys.push(allKeyValues)
            //push a shallow clone of item
            result.push(Object.assign({},item))
        } else {
            // sum any integers that are not keys
            for (key in item){
                if (matchKeys.indexOf(key) == -1){
                    if (Number.isInteger(item[key])){
                        result[idx][key]+=item[key]
                    }
                }
            }
        }
    })

    return result
}

function findMissingKey(ObjectArray,checkforKey){
    ObjectArray.forEach(function(item){
        try {
            (item[checkforKey])
        } catch (e) {
            console.log(item)
        }
    })
}

module.exports = {
    sumBy: sumBy,
    sumDuplicates: sumDuplicates,
    findMissingKey: findMissingKey
};
