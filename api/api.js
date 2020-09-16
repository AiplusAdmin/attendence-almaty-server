const axios = require('axios');
const Promise = require('bluebird');
const intel = require('intel');
intel.basicConfig({
	'file': './logs/ApiError.log', // file and stream are exclusive. only pass 1
	'format': "[%(date)s] {%(levelname)s} %(name)s : %(message)s",
	'level': intel.ERROR
});

function  get(domain,method,params,api){
    return new Promise((resolve,reject) => {
        var url = 'https://'+domain+'.t8s.ru//Api/V2/'+method+'?'+params+'&authkey='+api;
        var unit = method.replace('Get','');
        axios.get(url)
        .then(response => {
            if(response.status == 200){
                var json = response.data;
                resolve(json[unit]);
            }
        })
        .catch(error => {
			intel.error(error.response.data);
			console.log("Error API class: " + error);
			reject(error);
        });
    });
}

function post(domain,method,params,api){
	var url = 'https://'+domain+'.t8s.ru//Api/V2/'+method+'?authkey='+api;
    return new Promise((resolve, reject) => {
        axios({
            method: 'post',
            url: url,
            data: JSON.stringify(params),
            headers: { 'Content-Type':'application/json;charset=utf-8'}
        })
        .then((res) => {
            resolve(res);
        })
        .catch(error => {
			intel.error(error.response.data);
            reject(error);
        })
    });
}

module.exports = {
    get,
	post
}