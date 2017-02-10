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
            result.push(item)
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

module.exports = {
    sumBy: sumBy
};
