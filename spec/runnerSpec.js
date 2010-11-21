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
        run._onMessage = function(name, mes) { received.push([name, mes]) }
        
        run.workers[1].postMessage({ command: 'showLog' })
        waitsFor(function() { return received.length > 0 })
        runs(function() {
            var init = { command: 'init', name: 1, options: { count: 2 } }
            expect(received).toEqual([ [1, [init]] ])
        })
    })
})
