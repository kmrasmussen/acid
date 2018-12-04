let net = require('net')
// for structuring events/messages
let events = require('events').EventEmitter

let CommunicatorTool = require('./communicatorTools.js').Communicator
let AcidAlgs = require('./algorithms.js')

let certificate
let myPosition
let receivedIAM = false
let introPort

module.exports.getCertificate = (introPort, cbf) => {
    let client = net.createConnection({port: introPort}, () => {
        //console.log('joinIntoducer client to ' + introPort)
    })
    // when client receives data it is interpreted as having the JSON
    // format {event: ..., content: ...}. We use the event-emitter, to
    // emite the event
    client.on('data', (data) => {
        var message = JSON.parse(data.toString())
        if(message.event && message.content)
        emitter.emit(message.event, message.content);
        else
        console.log('Received un-emittable data:\n'+ (data.toString()))
    })

    client.send = (eventName, eventContent) => {
        let message = {
            event: eventName.toString(),
            content: eventContent
        }
        let encodedMessage = JSON.stringify(message)
        client.write(encodedMessage)
    }

    emitter = new events.EventEmitter()

    emitter.on('I_AM', function(iam) {
        //console.log('I ' + introPort + ' : I_AM')
        function validI_AM(iam) {
            return(iam.certificate.power 
                && iam.certificate.timestamp
                && iam.certificate.power 
                && iam.myPosition <= (2 ** iam.certificate.power)
            )
        }
        if(validI_AM(iam)) {
            receivedIAM = true
            myPosition = Math.floor(Math.random() * (2 ** iam.certificate.power))
            client.end()
            cbf({
                'certificate' : iam.certificate,
                'myPosition'  : myPosition,
                'fingertable' : iam.fingertable
            })
        } else {
            console.log('ERROR: I_AM invalid')
        }
    })
}

module.exports.join = (ME, introPort, cbf) => {
    if(introPort == ME.PORT) {
        console.log('NEW')
        initializeNewNetwork(ME, 5)
        //COMMUNICATOR = new CommunicatorTool(nodeServer, CERTIFICATE, IP_ADDRESS, PORT, MYPOSITION)
        ME.COMMUNICATOR = new CommunicatorTool(ME)
        cbf()
    } else {
        console.log('JOINING ' + introPort)
        this.getCertificate(introPort, (data) => {
            ME.CERTIFICATE = data.certificate
            ME.MYPOSITION = data.myPosition
            //console.log('MYPOSITION: ' + ME.MYPOSITION)
            //console.log('INTRO FT:')
            //console.log(data.fingertable)
            
            ME.COMMUNICATOR = new CommunicatorTool(ME)

            //console.log('Making my own finger table:')
            let ftDict = {}
            for(let i = 0; i < ME.CERTIFICATE.power; i++) {
                //console.log('i: ' + i)
                let iStart = (ME.MYPOSITION + 2 ** i) % (2 ** ME.CERTIFICATE.power)
                //console.log('iStart: ' + iStart)
                let preiStart = AcidAlgs.precedes(ME, data.fingertable, iStart)
                //console.log('pre iStart: ' + preiStart)
                //console.log(preiStart)
                ME.COMMUNICATOR.getSuccessorFrom(preiStart[3][1], iStart, (result) => {
                    //console.log('succ of ' + iStart + ':')
                    //console.log(result)
                    ftDict[i] = {
                        start: iStart,
                        succ: result.answer.pos, 
                        ip: result.answer.ip,
                        port: result.answer.port
                    }
                    if(AcidAlgs.ftDictFull(ftDict, ME.CERTIFICATE.power)) {
                        ME.FINGERTABLE = ftDict
                        cbf()
                    }
                })
            }



        })
    }
}

initializeNewNetwork = (ME, m) => {
    // a chord-network is defined by an id between 0 and a billion
    // the time-stamp when it was defined
    // and a power such that the ring has length 2^power
    ME.CERTIFICATE = {
        'id': Math.floor(Math.random()*(1000000000)),
        'timestamp': Date.now(),
        'power': m
    }
    ME.MYPOSITION  = Math.floor(Math.random() * (2 ** m))
    ME.FINGERTABLE = [...Array(ME.CERTIFICATE.power).keys()].map(
        i => [i, ((ME.MYPOSITION+(2**i)) % (2 ** ME.CERTIFICATE.power)), 
                ME.MYPOSITION, [ME.IP_ADDRESS, ME.PORT]])
    ME.SUCCESSOR = [ME.MYPOSITION, [ME.IP_ADDRESS, ME.PORT]]
    ME.PREDECESSOR = [ME.MYPOSITION, [ME.IP_ADDRESS, ME.PORT]]
    ME.INTERVALSTART = ME.MYPOSITION + 1
}