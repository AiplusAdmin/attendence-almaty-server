const axios = require('axios');
const Promise = require('bluebird');

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
            console.log("Error API class: " + error);
            reject(error);
        })
    });
}

function post(key,method,params){
	var url = 'https://'+key.domain+'.t8s.ru//Api/V2/'+method+'?authkey='+key.apikey;
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
            console.log(error);
            reject(error);
        })
    });
}

module.exports = {
    get,
	post
}