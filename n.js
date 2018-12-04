// for tcp/network/socket functionality
let net = require('net')
// for structuring events/messages
let events = require('events').EventEmitter
let JoinIntro = require('./joinIntro.js')
let ip = require('ip')

class AcidNode {
    constructor(myPortArg, introPortArg) {
        this.IP_ADDRESS = require('ip').address() 
        this.PORT = myPortArg
        // the introducer we want to connect to
        this.introducerPORT = introPortArg
        // the node's position in the find
        this.MYPOSITION
        // the certificate for a specific network
        this.CERTIFICATE = {'nocert': true}
        // fingertable with other nodes in network I am connected to
        // format: [0<=i<=m-1, pos+2^i, succ for pos+2^i, ip for succ]
        this.FINGERTABLE
        this.PREDECESSOR
        this.INTERVALSTART
        this.SERVER
        //ME = this
        this.COMMUNICATOR
    }
    start() {
        this.SERVER = net.createServer((c) => {
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
                let messageStrings = data.toString().split('ACIDMSGDELIMITER')
                //console.log('ONDATA: messages:')
                //console.log(messageStrings)
                messageStrings.forEach((element) => {
                    if(element != "") {
                        var message = JSON.parse(element)
                        if(message.event && message.content)
                            emitter.emit(message.event, message.content)
                        else
                            console.log('Received un-emittable data:\n'+ (data.toString()))
                    }
                })
            })
        
            console.log('I ' + c.remotePort + ' : NEW_CONN')
            c.send('I_AM',
            {
              'certificate': this.CERTIFICATE,
              'myPosition': this.MYPOSITION,
              'fingertable': this.FINGERTABLE
            })
            console.log('O ' + c.remotePort + ' : I_AM')
        
            emitter.on('commToolsData', (data) => {
                //console.log('My cert:')
                //console.log(this.CERTIFICATE)
                if(JSON.stringify(this.CERTIFICATE) == JSON.stringify(data.certificate)) {
                    if(data.type && data.origin && data.body) {
                        this.COMMUNICATOR.direct(data.type, data.origin, data.body)
                    } else {
                        console.log('commToolsData: lacking type, origin or body')
                    }
                } else
                    console.log('commToolsData: not same certificate')
            })

            emitter.on('acidResponse', function(data) {
                if(JSON.stringify(this.CERTIFICATE) == JSON.stringify(data.certificate)) {
                    if(data.responseId, data.type, data.body) {
                        this.COMMUNICATOR.incomingResponse(data.responseId, data.type, data.body)
                    } else {
                        console.log('commToolsData: lacking type, origin or body')
                    }
                } else
                    console.log('acidResponse: not same certificate')
            })
        })
        this.SERVER.listen(this.PORT, () => {   
            console.log('// acid node // ' + this.IP_ADDRESS + ':' + this.PORT)
            JoinIntro.join(this, this.introducerPORT, (introFT) => {
                console.log('CERTIFICATE: ')
                console.log(this.CERTIFICATE)
                console.log('POSITION: ' + this.MYPOSITION)
                console.log('FINGERTABLE:')
                console.log(this.FINGERTABLE)
            })
        })
    }
}

module.exports.AcidNode = AcidNode