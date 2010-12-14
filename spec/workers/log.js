var log = []

onmessage = function(e) {
    if ('showLog' == e.data) {
        postMessage(log)
    } else if ('clearLog' == e.data) {
        log = []
    } else {
        log.push(e.data)
    }
}
