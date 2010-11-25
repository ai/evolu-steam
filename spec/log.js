var log = []

onmessage = function(e) {
    if ('showLog' == e.data.command) {
        postMessage(log)
    } else if ('clearLog' == e.data.command) {
        log = []
    } else {
        log.push(e.data)
    }
}
