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
                resolve({status: 200,data: json[unit]});
            }
        })
        .catch(error => {
			console.log("Error API class: " + error);
            reject({status: 410,message: error});
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
        .then((response) => {
            if(response.status === 200){
				resolve({status: 200,message: 'OK'});
			}
        })
        .catch(error => {
			console.log(error);
            reject({status: 410,message: error});
        })
    });
}

module.exports = {
    get,
	post
}