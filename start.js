let Acid = require('./n.js')
let myAcidNode = new Acid.AcidNode(process.argv[2], process.argv[3])
myAcidNode.start()