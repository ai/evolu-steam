describe('evolu.steam.Runner', function() {
    var run
    afterEach(function () { run.terminate() })
    
    var logDriver = '/__spec__/workers/log.js?' + (new Date).valueOf()
    
    it('should create and init workers', function() {
        run = new evolu.steam.Runner(logDriver)
        
        expect(run.driver).toEqual(logDriver)
        expect(run.count).toEqual(2)
        expect(run.workers[0]).not.toBeNull()
        expect(run.workers[1]).not.toBeNull()
        
        var first = null
        run.workers[0].onmessage = function(e) { first = e.data }
        run.workers[0].postMessage('showLog')
        
        var second = null
        run.workers[1].onmessage = function(e) { second = e.data }
        run.workers[1].postMessage('showLog')
        
        waitsFor(function() { return first != null && second != null })
        
        runs(function() {
            expect(first).toEqual([
                { command: 'init', name: 0, count: 2 }
            ])
            expect(second).toEqual([
                { command: 'init', name: 1, count: 2 }
            ])
        })
    })
    
    it('should load options.count workers', function() {
        run = new evolu.steam.Runner(logDriver, 3)
        expect(run.workers[2]).not.toBeNull()
        expect(run.count).toEqual(3)
    })
    
    it('should send commands to workers', function() {
        run = new evolu.steam.Runner(logDriver, 2)
        spyOn(run.workers[0], 'postMessage')
        spyOn(run.workers[1], 'postMessage')
        
        var result = run.send({ a: 1 })
        
        expect(result).toEqual(run)
        
        expect(run.workers[0].postMessage).toHaveBeenCalledWith({ a: 1 })
        expect(run.workers[1].postMessage).toHaveBeenCalledWith({ a: 1 })
    })
    
    it('should receive messages from workers', function() {
        run = new evolu.steam.Runner(logDriver)
        
        var received = []
        run._onmessage = function(from, msg) { received.push([from, msg]) }
        
        run.workers[0].postMessage('showLog')
        waitsFor(function() { return received.length > 0 })
        runs(function() {
            var init = { command: 'init', name: 0, count: 2 }
            expect(received).toEqual([ [0, [init]] ])
        })
    })
    
    it('should dispatch method on message', function() {
        run = new evolu.steam.Runner(logDriver, 0)
        
        run._ontest = function() { }
        spyOn(run, '_ontest')
        
        run._onmessage(0, { command: 'test' })
        expect(run._ontest).toHaveBeenCalledWith(0, { command: 'test' })
    })
    
    it('should load another worker by _worker_ command', function() {
        run = new evolu.steam.Runner(logDriver)
        run._onload('0', { command: 'load', name: 'test', params: { a: 1 } })
        
        expect(run.workers.test).not.toBeNull()
        expect(run.count).toEqual(2)
        expect(run.all).toEqual(3)
        
        var log = null
        run._onmessage = function(name, msg) { log = msg }
        
        run.workers.test.postMessage('showLog')
        waitsFor(function() { return log != null })
        runs(function() {
            expect(log).toEqual([{
                command: 'init', name: 'test', count: 2,
                from: '0', params: { a: 1 }
            }])
        })
    })
    
    it('should allow set listener for workers loading', function() {
        run = new evolu.steam.Runner(logDriver)
        
        var callback = jasmine.createSpy()
        var result = run.ready(callback)
        expect(result).toEqual(run)
        
        run._onload(0, { command: 'load', name: 'test' })
        
        expect(run._initialized).toEqual(0)
        expect(run.isInitialized()).toBeFalsy()
        
        run._oninitialized()
        run._oninitialized()
        expect(run._initialized).toEqual(2)
        expect(run.isInitialized()).toBeFalsy()
        expect(callback).not.toHaveBeenCalled()
        
        run._oninitialized()
        expect(run._initialized).toEqual(3)
        expect(run.isInitialized()).toBeTruthy()
        expect(callback).toHaveBeenCalled()
        
        var callback2 = jasmine.createSpy()
        run.ready(callback2)
        expect(callback2).toHaveBeenCalled()
    })
    
    it('should send messages between workers', function() {
        run = new evolu.steam.Runner(logDriver)
        
        run.workers[0].postMessage('clearLog')
        run.workers[1].postMessage('clearLog')
        
        run._onworker(0, { command: 'worker', to: 1,
                           content: { command: ':test', a: 1 } })
        
        var log = {}
        run._onmessage = function(name, msg) { log[name] = msg }
        
        run.workers[0].postMessage('showLog')
        run.workers[1].postMessage('showLog')
        waitsFor(function() { return log[0] && log[1] })
        runs(function() {
            expect(log[0]).toEqual([])
            expect(log[1]).toEqual([{ command: ':test', from: 0, a: 1 }])
        })
    })
    
    it('should have debug log command', function() {
        run = new evolu.steam.Runner(logDriver, 0)
        
        spyOn(console, 'log')
        run._onlog(0, { data: { a: 1 } })
        
        expect(console.log).toHaveBeenCalledWith('Worker 0:', { a: 1 })
    })
    
    it('should send out commands to listeners', function() {
        run = new evolu.steam.Runner(logDriver, 0)
        
        var log = []
        run.bind('a', function() { log.push(['a', arguments, this]) })
        var result = run.bind(function() { log.push(['all', arguments, this]) })
        
        expect(result).toEqual(run)
        
        var a = { command: 'out', event: 'a', data: { a: 1 } }
        run._onout(0, a)
        var b = { command: 'out', event: 'b', data: { b: 2 } }
        run._onout(1, b)
        
        expect(log).toEqual([
            ['a',   [{ a: 1 }, 0, a], run],
            ['all', [{ a: 1 }, 0, a], run],
            ['all', [{ b: 2 }, 1, b], run]
        ])
    })
    
    it('should allow to set options to worker', function() {
        run = new evolu.steam.Runner(logDriver, 1)
        run.workers[0].postMessage('clearLog')
        
        var result = run.option('a', { a: 1 })
        run.option('fitness', function (a) { return a + 1; })
        
        expect(result).toEqual(run)
        
        var log = null
        run._onmessage = function(name, msg) { log = msg }
        
        run.workers[0].postMessage('showLog')
        waitsFor(function() { return log != null })
        runs(function() {
            expect(log).toEqual([])
            run._oninitialized()
            
            log = null
            run.workers[0].postMessage('showLog')
        })
        
        waitsFor(function() { return log != null })
        runs(function() {
            expect(log).toEqual([
                { command: 'option', name: 'a', value: { a: 1 } },
                {
                    command: 'option',
                    name:    'fitness',
                    func:    'function (a) { return a + 1; }'
                }
            ])
        })
    })
    
    it('should terminate workers', function() {
        run = new evolu.steam.Runner(logDriver, 0)
        run.workers[0] = { terminate: function() {} }
        run.workers[1] = { terminate: function() {} }
        
        spyOn(run.workers[0], 'terminate')
        spyOn(run.workers[1], 'terminate')
        
        var result = run.terminate()
        
        expect(result).toEqual(run)
        
        expect(run.workers[0].terminate).toHaveBeenCalled()
        expect(run.workers[1].terminate).toHaveBeenCalled()
    })
    
    it('should start, stop and resume computation', function() {
        run = new evolu.steam.Runner(logDriver, 1)
        run.workers[0].postMessage('clearLog')
        run._oninitialized()
        
        var result = run.start()
        expect(result).toEqual(run)
        
        result = run.stop()
        expect(result).toEqual(run)
        
        result = run.resume()
        expect(result).toEqual(run)
        
        var log = null
        run._onmessage = function(name, msg) { log = msg }
        
        run.workers[0].postMessage('showLog')
        waitsFor(function() { return log != null })
        runs(function() {
            expect(log).toEqual([
                { command: 'start' }, { command: 'stop' }, { command: 'resume' }
            ])
        })
    })
    
    it('should request data from workers', function() {
        run = new evolu.steam.Runner(logDriver, 2)
        spyOn(run.workers[0], 'postMessage')
        spyOn(run.workers[1], 'postMessage')
        
        run._onmessage(1, { command: 'getter', name: 'a' })
        
        var callback = jasmine.createSpy()
        var result = run.get('a', callback)
        expect(result).toEqual(run)
        
        expect(run.workers[0].postMessage).not.toHaveBeenCalled()
        expect(run.workers[1].postMessage).not.toHaveBeenCalled()
        
        run._oninitialized()
        run._oninitialized()
        
        expect(run.workers[0].postMessage).not.toHaveBeenCalled()
        expect(run.workers[1].postMessage).toHaveBeenCalledWith({
            command: 'get', name: 'a', id: 1 })
        
        var command = { command: 'result', data: 'A', id: 1 }
        run._onmessage(1, command)
        expect(callback).toHaveBeenCalledWith('A', command, 1)
    })
    
    it('should call some methods only after initializing', function() {
        run = new evolu.steam.Runner(logDriver, 2)
        run._onmessage(0, { command: 'getter', name: 'a' })
        
        run.start().stop().resume().option('a', 1).get('a', function() { })
        
        var log = []
        run._onmessage = function(name, msg) { log.push(msg) }
        
        run._oninitialized()
        run.workers[0].postMessage('showLog')
        
        waitsFor(function() { return log.length == 1 })
        runs(function() {
            expect(log[0]).toEqual([
                { command : 'init', name : 0, count : 2 }
            ])
        
            run._oninitialized()
            run.workers[0].postMessage('showLog')
        })
        
        waitsFor(function() { return log.length == 2 })
        runs(function() {
            expect(log[1]).toEqual([
                { command : 'init', name : 0, count : 2 },
                { command : 'start' },
                { command : 'stop' },
                { command : 'resume' },
                { command : 'option', name : 'a', value : 1 },
                { command : 'get', name : 'a', id : 1 }
            ])
        })
    })
})
