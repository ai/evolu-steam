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
 * @param options {Object} options for runner and drivers.
 */
evoplus.steam.Runner = function(driver, options) {
    if (!options.count) options.count = 2
    this.options = options
    
    var self = this
    this.workers = []
    for (var i = 0; i < options.count; i++) {
        var worker = new Worker(driver)
        this.workers.push(worker)
    }
    for (var i = 0; i < options.count; i++) {
        this.workers[i].
            postMessage({command: 'init', name: i, options: options })
    }
}
evoplus.steam.Runner.prototype = {

    /** Web Workers with driver. */
    workers: [],
    
    /** Runner options from constructor. */
    options: {}
    
}
