var listeners = {}

onmessage = function(e) {
    var callback = listeners[e.data.command]
    if (callback) callback(e.data)
}

/**
 * Set `callback` as worker constructor. It will be call on `init` command and
 * send `initialized` command after `callback` finish.
 
 * @param callback {Function} will be receive worker name and command object
 */
function init(callback) {
    listeners.init = function(command) {
        callback(command.name, command)
        postMessage({ command: 'initialized' })
    }
}

init(function() { }) // Default empty initializer

/**
 * Set `callback` as listener for some `command`. To listen `init` command use
 * `init` function.
 * 
 * @param command {String} command name
 * @param callback {Function} will be receive message object, when it come
 */
function on(command, callback) {
    listeners[command] = callback
}

/**
 * Send `log` command to print `data` by `console.log`.
 * 
 * @param data any variable to print
 */
function log(data) {
    postMessage({ command: 'log', data: data })
}

/**
 * Send `load` command to load another worker with some `name` and `params`.
 * Try to call it only in `init`.
 * 
 * @param name {String} new worker name
 * @param params {Object} worker parameters
 */
function load(name, params) {
    postMessage({ command: 'load', name: name, params: params })
}

/**
 * Send `out` command to send results out from workers to main JS cycle
 */
function out(event, data) {
    postMessage({ command: 'out', event: event, data: data })
}

/**
 * Send `worker` command to send `data` to another `worker`. Use “:” prefix for
 * your own command (for example, “:process”) to avoid conflict with build-in
 * runner commands.
 * 
 * @param name {String} worker recipient name
 * @param data {Object} any variables, to communicate
 */
function worker(name, command) {
    postMessage({ command: 'worker', to: name, content: command })
}

/**
 * Hash of data name to getter callback.
 */
var getters = {}

on('get', function(command) {
    var result = getters[command.name]()
    postMessage({ command: 'result', id: command.id, data: result })
})

/**
 * Return result of `callback` for `name` data get request. Call it only in
 * `init`.
 * 
 * @param name {String} data name
 * @param data {Function} data calculation callback
 */
function getter(name, callback) {
    getters[name] = callback
    postMessage({ command: 'getter', name: name })
}

/**
 * Hash of worker options received by `option` command. Function will be
 * automatically converted from Strings.
 */
var options = {}

on('option', function(command) {
    if (command.func) {
        options[command.name] = eval('(' + command.func + ')')
    } else {
        options[command.name] = command.value
    }
})
