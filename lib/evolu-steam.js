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

if ("undefined" == typeof(evolu)) {
    /** Top level namespace for all libraries from Evolu Lab. */
    evolu = {}
}

/** Top level namespace for Evolu Steam library. */
evolu.steam = { }

/** Evolu Steam version. */
evolu.steam.version = '0.1'

evolu.steam.afterInit = function(name, real) {
    return function() {
        if (!this.isInitialized()) {
            this._afterInit.push({ name: name, arguments: arguments })
            return this
        } else {
            return real.apply(this, arguments)
        }
    }
}

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
evolu.steam.Runner = function(driver, count) {
    if ('undefined' == typeof(count)) count = 2
    this.all = this.count = count
    this.driver = driver
    
    this._listeners        = {}
    this._requests         = {}
    this._lastRequest      = 0
    this._getters          = {}
    this._initialized      = 0
    this._readyListeners   = []
    this._afterInit        = []
    
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
    
    this.ready(function() {
        var call
        for (var i = 0; i < this._afterInit.length; i++) {
            call = this._afterInit[i]
            this[call.name].apply(this, call.arguments)
        }
    })
}
evolu.steam.Runner.prototype = {

    /** Path to Web Worker JS-file. */
    driver: null,

    /** Web Workers with driver. */
    workers: {},
    
    /** Main workers count. */
    count: null,
    
    /** All workers count. */
    all: null,
    
    /** Count of initialized workers. */
    _initialized: null,
    
    /** Event listeners for special event type. */
    _listeners: {},
    
    /** Array of _get_ callbacks. */
    _requests: {},
    
    /** Last data request ID. */
    _lastRequest: null,
    
    /** Hash of workers, that can be requested to return some data by _get_. */
    _getters: {},
    
    /**
     * List of callbacks, which will be call, when all workers will be
     * initialized
     */
    _readyListeners: [],
    
    /**
     * List of methods calls, to be execute only after all workers was
     * initialization. Them will be send to workers by ready listener.
     */
    _afterInit: [],
    
    /**
     * Is all workers are loaded. To set callback on initializing use _ready_.
     * 
     * @return {Boolean} Is runner is initialized
     */
    isInitialized: function() {
        return this.all == this._initialized
    },
    
    /**
     * Call _callback_ after all workers initializing.
     * 
     * @param callback {Function} initialized callback
     * @return {Object} Current runner object
     */
    ready: function(callback) {
        if (this.isInitialized()) {
            callback.call(this)
        } else {
            this._readyListeners.push(callback)
        }
        return this
    },
    
    /**
     * Add event listener for some _event_ type. _event_ may be optional, so
     * _callback_ will be call on every event.
     *
     * Every driver have events:
     * * _step_ – fire on every new generation with _generation_ number and
     *            evolution _stagnation_.
     * * _end_ – fire, when evolution is end.
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
     * Set option for worker. Function will be convert to string and send in
     * _func_ command property, instead of _value_.
     * 
     * It will send message only after all workers will be initialized.
     *
     * @param name {String} option name
     * @param value option value
     * @return {Object} Current runner object
     */
    option: evolu.steam.afterInit('option',
        function(name, value) {
            if ('function' == typeof(value)) {
                this.send({ command: 'option', name: name, func: value.toString() })
            } else {
                this.send({ command: 'option', name: name, value: value })
            }
            return this
        }),
    
    /**
     * Send request for _name_ data to workers and exec _callback_ when request
     * is come back.
     * 
     * It will send message only after all workers will be initialized.
     *
     * @param name {String} data name
     * @param callback {Function} request callback(data, command, worker)
     * @return {Object} Current runner object
     */
    get: evolu.steam.afterInit('get',
        function(name, callback) {
            var id = this._lastRequest += 1
            this._requests[id] = callback
            this._getters[name].postMessage({ command: 'get', name: name, id: id })
            return this
        }),
    
    /**
     * Start computation. Send _start_ command to each worker.
     * 
     * It will start computation from beginning, so use _resume_ to resume
     * computation after last step.
     * 
     * It will send message only after all workers will be initialized.
     * 
     * @return {Object} Current runner object
     */
    start: evolu.steam.afterInit('start',
        function() {
            this.send({ command: 'start' })
            return this
        }),
    
    /**
     * Stop computation. Send _stop_ command to each worker.
     * 
     * Use _resume_ function to resume stopped computation.
     * 
     * It will send message only after all workers will be initialized.
     * 
     * @return {Object} Current runner object
     */
    stop: evolu.steam.afterInit('stop',
        function() {
            this.send({ command: 'stop' })
            return this
        }),
    
    /**
     * Resume stopped (by _stop_ function) computation.
     * Send _resume_ command to each worker.
     * 
     * It will send message only after all workers will be initialized.
     * 
     * @return {Object} Current runner object
     */
    resume: evolu.steam.afterInit('resume',
        function() {
            this.send({ command: 'resume' })
            return this
        }),
    
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
        this['_on' + msg.command].call(this, from, msg)
    },
    
    /**
     * Call on _initialized_ command. Increase _this.initialized_ counter and
     * run all initializing listeners, when counter will be equal _this.all_.
     */
    _oninitialized: function() {
        this._initialized += 1
        if (this.isInitialized()) {
            for (var i = 0; i < this._readyListeners.length; i++) {
                this._readyListeners[i].call(this)
            }
            this._readyListeners = []
        }
    },
    
    /** Call on _load_ command. Load new worker with _msg.name_ name. */
    _onload: function(from, msg) {
        this.all += 1
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
        var command = msg.content
        command.from = from
        this.workers[msg.to].postMessage(command)
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
    },
    
    /**
     * Call on _result_ command, which is answer for _get_ data request. It exec
     * data callback.
     */
    _onresult: function(from, msg) {
        this._requests[msg.id].call(this, msg.data, msg, from)
    },
    
    /**
     * Call on _getter_ command. It register worker as data request getter.
     */
    _ongetter: function(from, msg) {
        this._getters[msg.name] = this.workers[from]
    }
    
}