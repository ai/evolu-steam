/*
 * Copyright (C) 2010 Andrey “A.I.” Sitnik <andrey@sitnik.ru>
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

if ("undefined" == typeof(evoplus)) {
    /** Top level namespace for all libraries from evo+lab. */
    evoplus = {}
}

/** Top level namespace for evo+steam library. */
evoplus.steam = { }

/** Evo+Steam version. */
evoplus.steam.version = '0.1'

/**
 * Create new runner to do evolutionary computation. Runner will create
 * _options.workers_ count (by default, 2) of Web Workers with script in
 * _driver_ path. Next it will sent _init_ command to each worker with _option_
 * and _name_ properties, make all next workers requests and
 * will wait _run_ call.
 *
 * @param driver {String} path to driver file
 * @param count {count} workers count
 * @constructor
 */
evoplus.steam.Runner = function(driver, count) {
    if ('undefined' == typeof(count)) count = 2
    this.count = count
    
    this.driver = driver
    this._listeners = {}
    
    this.workers = {}
    for (var i = 0; i < count; i++) {
        var worker = new Worker(driver)
        worker.onmessage = (function(self, name) {
            return function(e) { self._onmessage(name, e.data) }
        })(this, i)
        this.workers[i] = worker
    }
    for (var i = 0; i < count; i++) {
        this.workers[i].
            postMessage({ command: 'init', name: i, count: count })
    }
}
evoplus.steam.Runner.prototype = {

    /** Path to Web Worker JS-file. */
    driver: null,

    /** Web Workers with driver. */
    workers: {},
    
    /** Main workers count. */
    count: null,
    
    /** Event listeners for special event type. */
    _listeners: {},
    
    /**
     * Add event listener for some _event_ type. _event_ may be optional, so
     * _callback_ will be call on every event.
     * 
     * @param event {String} event type name
     * @param callback {Function} event callback(data, workerName, message)
     * @return {Object} Current runner object
     */
    bind: function(event, callback) {
        if ('function' == typeof(event)) {
            callback = event
            event = '_all'
        }
        var list = this._listeners[event]
        if (!list) {
            list = this._listeners[event] = []
        }
        list.push(callback)
        return this
    },
    
    /**
     * Sent _command_ to all workers.
     * 
     * @param command {Object} command object with required _command_ property
     * @return {Object} Current runner object
     */
    send: function(command) {
        for (i in this.workers) {
            this.workers[i].postMessage(command)
        }
        return this
    },
    
    /**
     * Set option for worker. You should use it instead of _option_ argument in
     * constructor to set large data of functions (for example, fitness).
     * 
     * Function will be convert to string and send in _func_ command property,
     * instead of _value_.
     *
     * @param name {String} option name
     * @param value option value
     * @return {Object} Current runner object
     */
    option: function(name, value) {
        if ('function' == typeof(value)) {
            this.send({ command: 'option', name: name, func: value.toString() })
        } else {
            this.send({ command: 'option', name: name, value: value })
        }
        return this
    },
    
    /**
     * Start computation. Send _start_ command to each worker.
     * 
     * @return {Object} Current runner object
     */
    start: function() {
        this.send({ command: 'start' })
        return this
    },
    
    /**
     * Stop computation. Send _stop_ command to each worker.
     * 
     * @return {Object} Current runner object
     */
    stop: function() {
        this.send({ command: 'stop' })
        return this
    },
    
    /**
     * Terminate all workers. You can’t resume computation after terminating.
     * 
     * @return {Object} Current runner object
     */
    terminate: function() {
        for (i in this.workers) {
            this.workers[i].terminate()
        }
        return this
    },
    
    /** Call all _event_ listeners. */
    _trigger: function(event, from, msg) {
        var list = this._listeners[event]
        if (list) {
            for (var i = 0; i < list.length; i++) {
                list[i].call(this, msg.data, from, msg)
            }
        }
    },
    
    /**
     * Call, when worker send message. Message object must include _command_
     * key.
     * 
     * @param name {String} worker name
     * @param msg {Object} message object with key-value options
     */
    _onmessage: function(from, msg) {
        var func = this['_on' + msg.command]
        if (!func) {
            throw "Undefined command " + msg.command + " from worker " + from
        }
        func.call(this, from, msg)
    },
    
    /** Call on _load_ command. Load new worker with _msg.name_ name. */
    _onload: function(from, msg) {
        var name = msg.name
        
        var worker = new Worker(this.driver)
        this.workers[name] = worker
        
        var self = this
        worker.onmessage = function(e) { self._onmessage(name, e.data) }
        
        worker.postMessage({
            command: 'init',
            name:    name,
            count:   this.count,
            from:    from,
            params:  msg.params
        })
    },
    
    /**
     * Call on _worker_ command. Send _msg.data_ to worker with _msg.to_ name by
     * input _worker_ command.
     */
    _onworker: function(from, msg) {
        this.workers[msg.to].postMessage({
            command: 'worker',
            from:    from,
            data:    msg.data
        })
    },
    
    /**
     * Call on _log_ command. Debug tool to print _msg.data_ by _console.log_.
     */
    _onlog: function(from, msg) {
        if (console && console.log) {
            console.log('Worker ' + from + ':', msg.data)
        }
    },
    
    /**
     * Call on _out_ command. Send _msg.event_ event with _msg.data_ to out
     * listener, which was be added by _bind_.
     */
    _onout: function(from, msg) {
        this._trigger(msg.event, from, msg)
        this._trigger('_all', from, msg)
    }
    
}
