// for tcp-server/sockets
let net = require('net')
// event-emission for tcp messages
let events = require('events').EventEmitter
let ip = require('ip')

const IP_ADDRESS = require('ip').address() 
const m = 5
const PORT = 1234

function newCertificate(m) {
    let cert = {
        'id': Math.floor(Math.random()*(1000000000)),
        'timestamp': Date.now(),
        'power': m
    }
    return(cert)
}
  
// the initialserver starts a new chord-network by making a new certificate
let CERTIFICATE = newCertificate(m)
// the initialserver places itself in a random place in the ring
let MYPOSITION = Math.floor(Math.random() * (2 ** m))
//console.log('My position: ' + MYPOSITION)
// Since the network contains only the initialserver, every finger points to itself
// the fingertable has format [0<=i<=m-1, pos+2^i, succ for pos+2^i, ip for succ]
let FINGERTABLE = [...Array(CERTIFICATE.power).keys()].map(
    i => [i, ((MYPOSITION+(2**i)) % (2 ** CERTIFICATE.power)), MYPOSITION, [IP_ADDRESS, PORT]])

let SUCCESSOR = [MYPOSITION, [IP_ADDRESS, PORT]]
let PREDECESSOR = [MYPOSITION, [IP_ADDRESS, PORT]]
//console.log('MY FINGERTABLE:')
//console.log(FINGERTABLE)

let myServer = net.createServer((c) => {
    // emitter is used to coordinate events
    let emitter = new events.EventEmitter()
    // c is the connection and we bind a function to it with which we
    // can send json-objects under the header of an 'eventName'
    c.send = (eventName, eventContent) => {
        // the data we send to the client is formatted like this:
        let message = {
            event: eventName.toString(),
            content: eventContent
        }
        // we encode the data as json and write it to the client
        let encodedMessage = JSON.stringify(message)
        c.write(encodedMessage)
    }
    // when we receive data from the client we will handle it
    // and check if it is formmatted by {event: -, content: -}
    // if so we will _emit_ it
    c.on('data', (data) => {
        //console.log('LOGGER on-data:')
        //console.log(data.toString())
        var message = JSON.parse(data.toString())
        if(message.event && message.content)
          emitter.emit(message.event, message.content)
        else
          console.log('Received un-emittable data:\n'+ (data.toString()))
    })
    // After a potential introducer connects it receives the I_AM with the 
    // certificate, if it wants, it can send an INIT_A_REQ with a copy of the
    // certificate it received and a random position it wants to be in
    // it will receive a copy of the initialserver's fingertable to make
    // its own
    emitter.on('INIT_A_REQ', (cont) => {
        console.log('I ' +  c.remotePort + ' : INIT_A_REQ')
        function validINIT_A_REQ(cont) {
            if (cont.certificate && cont.myPosition)
                return(cont.myPosition <= (2 ** CERTIFICATE.power))
            else return(false)
        }
        if(validINIT_A_REQ(cont)) {
            c.send('INIT_A_RES', {
               'certificate': CERTIFICATE,
               'introducerPosition': MYPOSITION,
               'introducerFingertable': FINGERTABLE
            })
        } else {
            console.log('INVALID INIT_A_REQ')
        }
    })

    // When a new node connects we send the I_AM with a certificate and our
    // own position
    console.log('I ' + c.remotePort + ' : NEW_CONN')
    c.send('I_AM',
    {
      'certificate': CERTIFICATE,
      'myPosition': MYPOSITION,
      'fingerTable': FINGERTABLE
    })
    console.log('O ' + c.remotePort + ' : I_AM')
})

myServer.on('error', (err) => {
    console.log('myServer error')
})

// Start server listening
myServer.listen(PORT, () => {   
    console.log('ACID - introducer.js')
    console.log(IP_ADDRESS + ':' + PORT)
})
