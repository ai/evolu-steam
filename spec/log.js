var log = []

onmessage = function(e) {
    if ('showLog' == e.data.command) {
        postMessage(log)
    } else {
        log.push(e.data)
    }
}
