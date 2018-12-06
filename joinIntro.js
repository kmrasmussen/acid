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

    client.on('end', () => {
        emitter.removeAllListeners()
        client.destroy()
        console.log('introducer client closed')
    })
    client.on('error', (e) => {
        console.log('introclient error')
        console.log(e)
    })
}

module.exports.join = (ME, introPort, cbf) => {
    // make a network with just myself
    if(introPort == ME.PORT) {
        console.log('NEW')
        initializeNewNetwork(ME, 5)
        //COMMUNICATOR = new CommunicatorTool(nodeServer, CERTIFICATE, IP_ADDRESS, PORT, MYPOSITION)
        ME.COMMUNICATOR = new CommunicatorTool(ME)
        cbf()

    // join another node
    } else {
        console.log('JOINING ' + introPort)
        // getCertificate gets certificate, position and fingertable from introducer
        this.getCertificate(introPort, (data) => {
            ME.CERTIFICATE = data.certificate
            ME.MYPOSITION = data.myPosition
            
            ME.COMMUNICATOR = new CommunicatorTool(ME)

            // We will make our own fingertable by calculating the 'starts' in our fingertable
            // and contacting the closest predecessors to this start according to the
            // introducers fingertable to get the successor to our starts
            // this is an asynchrous process where we gradually fill the fingertable
            // dictionary
            let ftDict = {}
            for(let i = 0; i < ME.CERTIFICATE.power; i++) {
                let iStart = (ME.MYPOSITION + 2 ** i) % (2 ** ME.CERTIFICATE.power)
                let preiStart = AcidAlgs.precedes(ME, data.fingertable, iStart)
                ME.COMMUNICATOR.getSuccessorFrom(preiStart[3][1], iStart, (result) => {
                    ftDict[i] = {
                        start: iStart,
                        succ: result.answer.pos, 
                        ip: result.answer.ip,
                        port: result.answer.port
                    }
                    // if done with fingertable:
                    if(AcidAlgs.ftDictFull(ftDict, ME.CERTIFICATE.power)) {
                        let constructTable = []
                        for(let i = 0; i < ME.CERTIFICATE.power; i++) {
                            constructTable.push([i, ftDict[i].start, ftDict[i].succ, [ftDict[i].ip, ftDict[i].port]])
                        }
                        // get the predecessor of our successor, which will now be
                        // our predecessor
                        ME.FINGERS = ftDict
                        console.log(ME.FINGERS)
                        ME.FINGERTABLE = constructTable
                        console.log('-Made fingertable')
                        ME.COMMUNICATOR.getPredecessor(ME.FINGERS[0].port, ME.FINGERS[0].succ, (data) => {
                            console.log('-Got my predecessor')
                            ME.PREDECESSOR = data.answer
                            console.log('Sending iExist to: ' + ME.PREDECESSOR[1][1])
                            ME.COMMUNICATOR.sendIExist(ME.PREDECESSOR[1][1])
                            cbf()
                        })
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
    let fingerDict = {}
    for(let i = 0; i < ME.CERTIFICATE.power; i++) {
        fingerDict[i] = {
            i: i,
            start: (ME.MYPOSITION+(2**i)) % (2 ** ME.CERTIFICATE.power),
            succ: ME.MYPOSITION,
            ip: ME.IP_ADDRESS,
            port: ME.PORT
        }
    }
    ME.FINGERS = fingerDict
    ME.SUCCESSOR = [ME.MYPOSITION, [ME.IP_ADDRESS, ME.PORT]]
    ME.PREDECESSOR = [ME.MYPOSITION, [ME.IP_ADDRESS, ME.PORT]]
    ME.INTERVALSTART = ME.MYPOSITION + 1
}