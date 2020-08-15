var api = require('../api/api');
const { response } = require('express');

class Queue{
    constructor(data=[]){
        if(!Array.isArray(data))
            data = [];

        this.data = data;
        this._processing = false;

        if(data.length)
            this.handle();
    }

    async handle(){
        if(this.data.length){
			try {
				this._processing = true;
				var key = new Object();
				key.apikey = 'VdqvXSXu%2Fq1DWiLefLBUihGMn7MHlvSP59HIHoHH7%2BLEtHB5dtznB6sqyJIPjH5w';
				key.domain = 'aiplus'; 
				var response = await api.post(key,'AddEditEdUnitTestResult',this.data.shift())
				if(response.status == 200 && response.statusText === 'OK'){
					if(this.data.length)
						this.handle();
					else
						this._processing = false;
				} else {
					console.log("Ошибка -> ",response);
				}
			}catch(e){
				throw e;
			}
        }
    }

    add(data){
        this.data.push(data);

        if(!this._processing)
        	this.handle();
    }
}

module.exports = Queue;