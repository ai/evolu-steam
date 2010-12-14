importScripts('../drivers/common.js')

init(function() {
    getter('answer', function() { return 42 })
})

on('talk', function(msg) {
    log(msg.data)
    load('A', { a: 1 })
    worker('A', { b: 2 })
    out({ c: 3 })
    log(options.a)
    log(options.sum(1, 2))
})
