module.exports.precedes = (ME, table, x) => {
    let a = (2 ** ME.CERTIFICATE.power) - (table[0][1] - 1)
    let b = Math.ceil(Math.log2(a))
    let predecRow = []
    for(j = b; j < ME.CERTIFICATE.power + b; j++) {
        if(table[j % ME.CERTIFICATE.power][1] >= x) {
            let predecIndex = j - 1
            if(predecIndex == -1) {
                return(table[ME.CERTIFICATE.power - 1])
            } else {
                return(table[(j - 1) % ME.CERTIFICATE.power])
            }
        }
    }
    console.log('ÆLLLER?')
    return(table[ME.CERTIFICATE.power - 1])      
}

module.exports.ftDictFull = (ftDict, m) => {
    for(let i = 0; i < m; i++) {
        if(ftDict[i] == undefined)
            return(false)
    }
    return(true)
}