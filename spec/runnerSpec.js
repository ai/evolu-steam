describe('evoplus.steam.Runner', function() {
    it('should create and init workers', function() {
        var run = new evoplus.steam.Runner('/__spec__/log.js', { a: 1 })
        
        expect(run.driver).toEqual('/__spec__/log.js')
        expect(run.options).toEqual({ count: 2, a: 1 })
        expect(run.workers.length).toEqual(2)
        
        var first = null
        run.workers[0].onmessage = function(e) { first = e.data }
        run.workers[0].postMessage({ command: 'showLog' })
        
        var second = null
        run.workers[1].onmessage = function(e) { second = e.data }
        run.workers[1].postMessage({ command: 'showLog' })
        
        waitsFor(function() { return first != null && second != null })
        
        runs(function() {
            expect(first).toEqual([
                { command: 'init', name: 0, options: { count: 2, a: 1 } }
            ])
            expect(second).toEqual([
                { command: 'init', name: 1, options: { count: 2, a: 1 } }
            ])
        })
    })
    
    it('should load options.count workers', function() {
        var run = new evoplus.steam.Runner('/__spec__/log.js', { count: 3 })
        expect(run.workers.length).toEqual(3)
        expect(run.options.count).toEqual(3)
    })
    
    it('should receive messages from workers', function() {
        var run = new evoplus.steam.Runner('/__spec__/log.js')
        
        var received = []
        run._onmessage = function(from, msg) { received.push([from, msg]) }
        
        run.workers[1].postMessage({ command: 'showLog' })
        waitsFor(function() { return received.length > 0 })
        runs(function() {
            var init = { command: 'init', name: 1, options: { count: 2 } }
            expect(received).toEqual([ [1, [init]] ])
        })
    })
    
    it('should dispatch method on message', function() {
        var run = new evoplus.steam.Runner('/__spec__/log.js')
        
        run._ontest = function() { }
        spyOn(run, '_ontest')
        
        run._onmessage(0, { command: 'test' })
        expect(run._ontest).toHaveBeenCalledWith(0, { command: 'test' })
    })
    
    it('should load another worker by _worker_ command', function() {
        var run = new evoplus.steam.Runner('/__spec__/log.js')
        run._onload(0, { command: 'load', name: 'test' })
        
        expect(run.workers.length).toEqual(3)
        
        var log = null
        run._onmessage = function(name, msg) { log = msg }
        
        run.workers[2].postMessage({ command: 'showLog' })
        waitsFor(function() { return log != null })
        runs(function() {
            expect(log).toEqual([{
                command: 'init', name: 'test', options: { count: 2 },
                from: 0, params: { command: 'load', name: 'test' }
            }])
        })
    })
})
