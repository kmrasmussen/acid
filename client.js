// for tcp/network/socket functionality
let net = require('net')
// for structuring events/messages
let events = require('events').EventEmitter
let emitter = new events.EventEmitter()

// the introducer we want to connect to
let introducerADDRESS = '127.0.0.1'
let introducerPORT = 1234

// the node's position in the find
let MYPOSITION
// the certificate for a specific network
let CERTIFICATE

// connecting to introducer
let introducerClient = net.createConnection({port: introducerPORT}, () => {
    console.log('connected to server 1234')
})
introducerClient.on('end', () => {
    console.log('Connection ended')
})

// when connecting to introducer we will receive an I_AM with
// certificate and the introducer's position
// from that we can copy the certificate and generate a random
// position in the ring
// after that we can request a copy of the introducer's fingertable
// with an INIT_A_REQ request
emitter.on('I_AM', function(iam) {
    function validI_AM(iam) {
        return(iam.certificate.power 
            && iam.certificate.timestamp
            && iam.certificate.power 
            && iam.myPosition <= (2 ** iam.certificate.power)
        )
    }
    console.log('Received I_AM')
    if(validI_AM(iam)) {
        CERTIFICATE = iam.certificate
        MYPOSITION = Math.floor(Math.random() * (2 ** CERTIFICATE.power))
        console.log('My random position: ')
        console.log(MYPOSITION)
        // Send INIT_A_REQ
        introducerClient.send('INIT_A_REQ', {
            'certificate': CERTIFICATE,
            'myPosition': MYPOSITION
        })
    } else {
        console.log('invalid IAM:')
        console.log(iam)
    }
})

// When we send an INIT_A_REQ we may receive a response
// It will contain a copy of the introducer's fingertable
// from that we can build our own fingertable using the succ function
emitter.on('INIT_A_RES', function(cont) {
    function validINIT_A_RES(cont) {
        console.log(cont)
        if(cont.certificate 
            && cont.introducerFingertable 
            && cont.introducerPosition) {
                console.log('inner')
                if(JSON.stringify(cont.certificate) != JSON.stringify(CERTIFICATE)) {
                    console.log('Different certs')
                    console.log('My cert:')
                    console.log(CERTIFICATE)
                    console.log('INIT_A_RES cert:')
                    console.log(cont.certificate)
                    return false
                } else if (cont.introducerPosition > (2 ** CERTIFICATE.power - 1)) {
                    console.log('Invalid INIT_A_REQ pos:')
                    console.log(cont.introducerPosition + ' >' + (2 ** CERTIFICATE.power - 1))
                    console.log((cont.introducerPosition > (2 ** CERTIFICATE.power - 1)))
                    return false
                }
                return(true)
        } else {
            console.log('else')
            return(false)
        }
    }
    if(validINIT_A_RES(cont)) {
        console.log('Received INIT_A_RES')
        console.log('Introducer fingertable:')
        console.log(cont.introducerFingertable)
        console.log('Finding successor to me (' + MYPOSITION + ') from introducer fingertable:')
        let meSucc = succ(cont.introducerFingertable, MYPOSITION)
        console.log(meSucc)
    } else {
        console.log('Invalid INIT_A_RES')
    }
})

// when client receives data it is interpreted as having the JSON
// format {event: ..., content: ...}. We use the event-emitter, to
// emite the event
introducerClient.on('data', (data) => {
    var message = JSON.parse(data.toString())
    console.log('LOGGER on-data:')
    console.log(data.toString())
    if(message.event && message.content)
      emitter.emit(message.event, message.content);
    else
      console.log('Received un-emittable data:\n'+ (data.toString()))
})

introducerClient.send = (eventName, eventContent) => {
    let message = {
        event: eventName.toString(),
        content: eventContent
    }
    let encodedMessage = JSON.stringify(message)
    introducerClient.write(encodedMessage)
}

// successor takes a fingertable (from introducer currently)
// and for a number x finds the successor. Since it is a ring
// there may be looping, so we find the row in the table where
// it loops and do a linear search.
function succ(table, x) {
    // makes the correct array of index, to fix the wrapping around
    function indexSeq(start) {
        let m = 5
        let diff = (2 ** m) - start
        let loopStart = Math.ceil(Math.log2(diff))
        let a = [...Array(m-loopStart).keys()].map(x => x + loopStart)
        let b = [...Array(loopStart).keys()]
        let ba = a.concat(b)
        return(ba)
    }
    
    function findSuc(table, indexes, searchingFor) {
        // We simply subtract the position we are searching for from
        // the positions of the nodes and once we get a positive value
        // we have found the closest value
        for(i = 0; i < indexes.length; i++) {
            console.log('Checking row: ' + table[indexes[i]])
            if(table[indexes[i]][1] - searchingFor >= 0)
                return(table[indexes[i]])
        }
        return(0)
    }

    let start = table[0][1] - 1
    console.log('start: ' + start)
    let indexes = indexSeq(start)
    console.log('indexes:' + indexes)
    let succ = findSuc(table, indexes, x)
    console.log('succ index:' + succ)
    // returns the whole row
    return(succ)
}