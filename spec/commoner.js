importScripts('/drivers/common.js')

on('talk', function(msg) {
    log(msg.data)
    load('A', { a: 1 })
    worker('A', { b: 2 })
    out({ c: 3 })
})
