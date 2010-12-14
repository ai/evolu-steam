var listeners = {}

onmessage = function(e) {
    var callback = listeners[e.data.command]
    if (callback) callback(e.data)
}

/**
 * Set _callback_ as worker constructor. It will be call on _init_ command and
 * send _initialized_ command after _callback_ finish.
 
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
 * Set _callback_ as listener for some _command_. To listen _init_ command use
 * _init_ function.
 * 
 * @param command {String} command name
 * @param callback {Function} will be receive message object, when it come
 */
function on(command, callback) {
    listeners[command] = callback
}

/**
 * Send _log_ command to print _data_ by _console.log_.
 * 
 * @param data any variable to print
 */
function log(data) {
    postMessage({ command: 'log', data: data })
}

/**
 * Send _load_ command to load another worker with some _name_ and _params_.
 * Try to call it only in _init_.
 * 
 * @param name {String} new worker name
 * @param params {Object} worker parameters
 */
function load(name, params) {
    postMessage({ command: 'load', name: name, params: params })
}

/**
 * Send _out_ command to send results out from workers to main JS cycle
 */
function out(data) {
    postMessage({ command: 'out', data: data })
}

/**
 * Send _worker_ command to send _data_ to another _worker_. Use “:” prefix for
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
 * Return result of _callback_ for _name_ data get request. Call it only in
 * _init_.
 * 
 * @param name {String} data name
 * @param data {Function} data calculation callback
 */
function getter(name, callback) {
    getters[name] = callback
    postMessage({ command: 'getter', name: name })
}

/**
 * Hash of worker options received by _option_ command. Function will be
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
