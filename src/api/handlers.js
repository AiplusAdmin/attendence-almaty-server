const fs = require('fs');

function getApiKey(city){
    var json = fs.readFileSync('./config.json','utf8');
    var data = JSON.parse(json);

    return data[city];
}

function isEmptyObject(obj) {
    return !Object.keys(obj).length;
}

module.exports = {
    isEmptyObject,
    getApiKey
}
