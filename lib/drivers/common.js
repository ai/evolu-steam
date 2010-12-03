var listeners = {}

onmessage = function(e) {
    var callback = listeners[e.data.command]
    if (callback) callback(e.data)
}

/**
 * Set _callback_ as listener for some _command_.
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
 * Send _worker_ command to send _data_ to another _worker_.
 * 
 * @param name {String} worker recipient name
 * @param data {Object} any variables, to communicate
 */
function worker(name, data) {
    postMessage({ command: 'worker', to: name, data: data })
}
