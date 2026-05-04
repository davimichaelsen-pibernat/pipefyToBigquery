const fs = require("fs")

let logTypes = ["info", "warning", "debug", "error"]

let logFiles = []

module.exports = {
    write : function(logTypeName, message){
        const moment = this.currentTime()
        const logType = _getLogType(logTypeName)
        const logLine = `[${moment}] ${logType.toUpperCase()}: ${message}`
        console.log(logLine)
        _writeToFile(logType, logLine)
    },
    info : function(message){
        const moment = this.currentTime()
        const logLine = `[${moment}] INFO: ${message}`
        console.log(logLine)
        _writeToFile("info", logLine)
    },
    debug : function(message){
        const moment = this.currentTime()
        const logLine = `[${moment}] DEBUG: ${message}`
        console.log(logLine)
        _writeToFile("debug", logLine)
    },
    warning : function(message){
        const moment = this.currentTime()
        const logLine = `[${moment}] WARNING: ${message}`
        console.log(logLine)
        _writeToFile("warning", logLine)
    },
    error : function(message){
        const moment = this.currentTime()
        const logLine = `[${moment}] ERROR: ${message}`
        console.log(logLine)
        _writeToFile("error", logLine)
    },
    currentTime : function(){
        var moment = new Date()
        moment = moment.toLocaleString("pt-BR", { timeZone: 'America/Sao_Paulo' }).replace(",", "")
        return moment;
    },
    createLogFile : function(filePath, logTypes){
        logFiles.push({
            logPath : filePath,
            logTypes : logTypes
        })

        if(!fs.existsSync(filePath))
            fs.createWriteStream(filePath, {flag: "w+", mode: 0o755})
    },

    createLogType : function(newTypeName){
        logTypes.push(newTypeName);
    }
}

function _getLogType(t){
    return logTypes.find((ltype) => ltype == t)
}

function _writeToFile(logType, message){
    for(const log of logFiles){
        if(log.logTypes.includes(logType)){        
            fs.appendFile(log.logPath, message + "\n", function(err){
                if(err) {
                    console.log("ERRO AO ESCREVER NO ARQUIVO: " + err)
                    throw err;
                }
            })
        }
    }
}