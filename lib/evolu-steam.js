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
    evolu = { }
}
if ("undefined" == typeof(evolu.steam)) {
    /** Top level namespace for Evolu Steam library. */
    evolu.steam = { }
}

/** Evolu Steam version. */
evolu.steam.version = '0.1'

/**
 * Internal helper to create function, that will be call only after Runner
 * initializing. If Runner isn’t initialized, helper will remember function call
 * and recall it after initializing.
 */
evolu.steam._afterInit = function(name, real) {
    return function() {
        if (!this.isInitialized()) {
            this._callAfterInit.push({ name: name, arguments: arguments })
            return this
        } else {
            return real.apply(this, arguments)
        }
    }
}

/**
 * Create new runner to do evolutionary computation. Runner will create
 * `options.workers` count (by default, 2) of Web Workers with script in
 * `driver` path. Next it will sent `init` command to each worker with `option`
 * and `name` properties, make all next workers requests and
 * will wait `run` call.
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
    this._callAfterInit    = []
    
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
        for (var i = 0; i < this._callAfterInit.length; i++) {
            call = this._callAfterInit[i]
            this[call.name].apply(this, call.arguments)
        }
    })
}
evolu.steam.Runner.prototype = {

    /** Path to Web Worker JS file. */
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
    
    /** Array of `get` callbacks. */
    _requests: {},
    
    /** Last data request ID. */
    _lastRequest: null,
    
    /** Hash of workers, that can be requested to return some data by `get`. */
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
    _callAfterInit: [],
    
    /**
     * Is all workers are loaded. To set callback on initializing use `ready`.
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
     * Add event listener for some `event` type. `event` may be optional, so
     * `callback` will be call on every event.
     *
     * Every driver have events:
     * * `step` – fire on every new generation with `generation` number and
     *            evolution _stagnation_.
     * * `end` – fire, when evolution is end.
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
     * Sent `command` to all workers.
     * 
     * @param command {Object} command object with required `command` property
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
     * `func` command property, instead of `value`.
     * 
     * It will send message only after all workers will be initialized.
     *
     * @param name {String} option name
     * @param value option value
     * @return {Object} Current runner object
     */
    option: evolu.steam._afterInit('option',
        function(name, value) {
            if ('function' == typeof(value)) {
                this.send({ command: 'option', name: name, func: value.toString() })
            } else {
                this.send({ command: 'option', name: name, value: value })
            }
            return this
        }),
    
    /**
     * Send request for `name` data to workers and exec `callback` when request
     * is come back.
     * 
     * It will send message only after all workers will be initialized.
     *
     * @param name {String} data name
     * @param callback {Function} request callback(data, command, worker)
     * @return {Object} Current runner object
     */
    get: evolu.steam._afterInit('get',
        function(name, callback) {
            var id = this._lastRequest += 1
            this._requests[id] = callback
            this._getters[name].postMessage({ command: 'get', name: name, id: id })
            return this
        }),
    
    /**
     * Start computation. Send `start` command to each worker.
     * 
     * It will start computation from beginning, so use `resume` to resume
     * computation after last step.
     * 
     * It will send message only after all workers will be initialized.
     * 
     * @return {Object} Current runner object
     */
    start: evolu.steam._afterInit('start',
        function() {
            this.send({ command: 'start' })
            return this
        }),
    
    /**
     * Stop computation. Send `stop` command to each worker.
     * 
     * Use `resume` function to resume stopped computation.
     * 
     * It will send message only after all workers will be initialized.
     * 
     * @return {Object} Current runner object
     */
    stop: evolu.steam._afterInit('stop',
        function() {
            this.send({ command: 'stop' })
            return this
        }),
    
    /**
     * Resume stopped (by `stop` function) computation.
     * Send `resume` command to each worker.
     * 
     * It will send message only after all workers will be initialized.
     * 
     * @return {Object} Current runner object
     */
    resume: evolu.steam._afterInit('resume',
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
    
    /** Call all `event` listeners. */
    _trigger: function(event, from, msg) {
        var list = this._listeners[event]
        if (list) {
            for (var i = 0; i < list.length; i++) {
                list[i].call(this, msg.data, from, msg)
            }
        }
    },
    
    /**
     * Call, when worker send message. Message object must include `command`
     * key.
     * 
     * @param name {String} worker name
     * @param msg {Object} message object with key-value options
     */
    _onmessage: function(from, msg) {
        this['_on' + msg.command].call(this, from, msg)
    },
    
    /**
     * Call on `initialized` command. Increase `this.initialized` counter and
     * run all initializing listeners, when counter will be equal `this.all`.
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
    
    /** Call on `load` command. Load new worker with `msg.name` name. */
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
     * Call on `worker` command. Send `msg.data` to worker with `msg.to` name by
     * input `worker` command.
     */
    _onworker: function(from, msg) {
        var command = msg.content
        command.from = from
        this.workers[msg.to].postMessage(command)
    },
    
    /**
     * Call on `log` command. Debug tool to print `msg.data` by `console.log`.
     */
    _onlog: function(from, msg) {
        if (console && console.log) {
            console.log('Worker ' + from + ':', msg.data)
        }
    },
    
    /**
     * Call on `out` command. Send `msg.event` event with `msg.data` to out
     * listener, which was be added by `bind`.
     */
    _onout: function(from, msg) {
        this._trigger(msg.event, from, msg)
        this._trigger('_all', from, msg)
    },
    
    /**
     * Call on `result` command, which is answer for `get` data request. It exec
     * data callback.
     */
    _onresult: function(from, msg) {
        this._requests[msg.id].call(this, msg.data, msg, from)
    },
    
    /**
     * Call on `getter` command. It register worker as data request getter.
     */
    _ongetter: function(from, msg) {
        this._getters[msg.name] = this.workers[from]
    }
    
}
