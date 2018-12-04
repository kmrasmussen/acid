let net = require('net')
events = require('events').EventEmitter

class Communicator {
    
    //constructor(serverArg, certificateArg, ipArg, portArg, myPositionArg) {
    constructor(ME) {
        this.ME = ME
        this.connections = {}
        this.emitter = new events.EventEmitter()
        this.incomingEmitter = new events.EventEmitter()
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

    //incomingResponse(responseID, type, body) {
    //    console.log('incomingResponse')
    //    this.incomingEmitter.emit('replyId-' + replyId, body)
    //}
        
    direct(type, origin, body) {
        //console.log('--communicatorIn: direct: ' + type)
        if(type == 'getSuccessor') {
            //console.log('my pre: ')
            //console.log(this.ME.PREDECESSOR)
            //console.log(this.ME.PREDECESSOR[0])
            //console.log('my pos:' + this.ME.MYPOSITION)
            //console.log('x: ' + body.x)
            if(inInterval(this.ME.PREDECESSOR[0] + 1, this.ME.MYPOSITION, body.x)) {
                //console.log('I am responsible for ' + body.x)
                //console.log('Origin Port: ' + origin.port)
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
            //console.log('icomitEmitter.emit ' + 'replyId-' + body.replyId)
            this.incomingEmitter.emit('replyId-' + body.replyId, body)
        }
    }

    msg(port, eventName, eventContent) {
        if(this.connections[{port: port}]) {
            //console.log('MSG: connection already')
            let c = this.connections[{port: port}]
            let message = {
                type: eventName,
                certificate: this.ME.CERTIFICATE,
                origin: {port: this.ME.PORT},
                body: eventContent ,
                id: Math.floor(Math.random()*(1000000000)),
                timestamp: Date.now()
            }
            //console.log('Constructed message:')
            //console.log(message)
            c.send('commToolsData', message)
        } else {
            //console.log('MSG: new connection')
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
            this.connections[{port: port}] = c
            let message = {
                type: eventName,
                certificate: this.ME.CERTIFICATE,
                origin: {port: this.ME.PORT},
                body: eventContent ,
                id: Math.floor(Math.random()*(1000000000)),
                timestamp: Date.now()
            }
            //console.log('Constructed message:')
            //console.log(message)
            c.send('commToolsData', message)
        }
    }
}

function inInterval(a, b, x) {
    if(a <= b) return((a <= x) && (x <= b))
    else return((a <= x) || (x <= b))
}

module.exports.Communicator = Communicator

