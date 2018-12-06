let net = require('net')
events = require('events').EventEmitter

let AcidAlgs = require('./algorithms.js')

class Communicator {
    
    //constructor(serverArg, certificateArg, ipArg, portArg, myPositionArg) {
    constructor(ME) {
        this.ME = ME
        this.connections = {}
        this.emitter = new events.EventEmitter()
        this.incomingEmitter = new events.EventEmitter()
    }

    generateReplyId() {
        return(Math.floor(Math.random()*(1000000000)))
    }

    getSuccessorFrom(adresseePort, x, cbf) {
        let replyId = Math.floor(Math.random()*(1000000000))
        let message = {
            x: x,
            replyId: replyId,
        }
        this.incomingEmitter.on('replyId-' + replyId, (data) => cbf(data))
        this.msg(adresseePort, 'getSuccessor', message)
    }

    getPredecessor(adresseePort, x, cbf) {
        let replyId = this.generateReplyId()
        let message = {
            x: x,
            replyId: replyId
        }
        this.incomingEmitter.on('replyId-' + replyId, (data) => cbf(data))
        this.msg(adresseePort, 'getPredecessor', message)
    }

    sendIExist(adresseePort) {
        this.msg(adresseePort, 'iExist', {})
    }
        
    direct(type, origin, body) {
        if(type == 'getSuccessor') {
            if(AcidAlgs.inInterval(this.ME.PREDECESSOR[0] + 1, this.ME.MYPOSITION, body.x)) {
                this.msg(origin.port, 'acidResponse',
                    {'replyId': body.replyId, 
                     'answer': {
                         'pos': this.ME.MYPOSITION,
                         'ip': this.ME.IP_ADDRESS,
                         'port': this.ME.PORT
                     }
                    }
                )
            } else {
                console.log('I am not responsible for ' + body.x)
            }
        } else if(type == 'acidResponse') {
            this.incomingEmitter.emit('replyId-' + body.replyId, body)
        } else if(type == 'getPredecessor') {
            this.msg(origin.port, 'acidResponse', {
                'replyId': body.replyId,
                'answer': this.ME.PREDECESSOR
            })
        } if(type == 'iExist') {
            console.log('Got iExist:')
            console.log(origin.position)
            console.log('Is ' + origin.position + ' in interval ' + (this.ME.PREDECESSOR[0] + 1) + '-' + (this.ME.MYPOSITION - 1))
            if(AcidAlgs.inInterval((this.ME.PREDECESSOR[0] + 1), this.ME.MYPOSITION - 1, origin.position)) {
                this.ME.PREDECESSOR = [origin.position, [origin.ip, origin.port]]
                console.log('NEW PREDECESSOR:')
                console.log(this.ME.PREDECESSOR)
            }
            for(let i = 0; i < this.ME.CERTIFICATE.power; i++) {
                if(AcidAlgs.inInterval(this.ME.FINGERS[i].start, this.ME.FINGERS[i].succ, origin.position)) {
                    this.ME.FINGERS[i].succ = origin.position
                    this.ME.FINGERS[i].ip = origin.ip
                    this.ME.FINGERS[i].port = origin.port
                }
            }
            console.log('New FINGERS:')
            console.log(this.ME.FINGERS)
        }
    }

    msg(port, eventName, eventContent) {
        if(this.connections[port]) {
            let c = this.connections[port]
            let message = {
                type: eventName,
                certificate: this.ME.CERTIFICATE,
                origin: {port: this.ME.PORT, position: this.ME.MYPOSITION, ip: this.ME.IP_ADDRESS},
                body: eventContent,
                id: Math.floor(Math.random()*(1000000000)),
                timestamp: Date.now()
            }
            c.send('commToolsData', message)
        } else {
            let c = net.createConnection({port: port}, () => {
                //console.log('--communicatorTools: new connection to ' + port)
            })
            c.send = (eventName, eventContent) => {
                let message = {
                    event: eventName.toString(),
                    content: eventContent

                }
                let encodedMessage = JSON.stringify(message)
                c.write(encodedMessage + 'ACIDMSGDELIMITER')
            }
            this.connections[port] = c
            let message = {
                type: eventName,
                certificate: this.ME.CERTIFICATE,
                origin: {port: this.ME.PORT, position: this.ME.MYPOSITION, ip: this.ME.IP_ADDRESS},
                body: eventContent ,
                id: Math.floor(Math.random()*(1000000000)),
                timestamp: Date.now()
            }
            c.send('commToolsData', message)
            c.on('end', () => {
                delete this.connections[port]
                c.destroy()
                console.log('commTools msg client closed')
                console.log(this.connections)
            })
            c.on('error', (e) => {
                console.log('commTools msg client error')
                console.log(e)
            })
        }
    }
}



module.exports.Communicator = Communicator

