importScripts('../drivers/common.js')

init(function(name, command) {
    log('I am ' + name + ' from ' + command.count)
    getter('answer', function() { return 42 })
})

on('talk', function(msg) {
    log(msg.data)
    load('A', { a: 1 })
    worker('A', { command: 'b', b: 2 })
    out({ c: 3 })
    log(options.a)
    log(options.sum(1, 2))
})
