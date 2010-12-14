describe('drivers/common.js', function() {
    var run
    afterEach(function () { run.terminate() })

    it('should have functions for common drivers tasks', function() {
        run = new evoplus.steam.Runner('/__spec__/commoner.js', 1)
        log = []
        run.workers[0].onmessage = function(e) { log.push(e.data) }
        
        run.option('a', 1).option('a', 2).
            option('sum', function(a, b) { return a + b })
        
        run.workers[0].postMessage({ command: 'talk', data: 'test' })
        
        waitsFor(function() { return log.length >= 4 })
        runs(function() {
            expect(log).toEqual([
                { command: 'getter', name: 'answer' },
                { command: 'initialized' },
                { command: 'log',    data: 'test' },
                { command: 'load',   name: 'A', params: { a: 1 } },
                { command: 'worker', data: { b: 2 }, to: 'A' },
                { command: 'out',    data: { c: 3 } },
                { command: 'log',    data: 2 },
                { command: 'log',    data: 3 }
            ])
        })
    })
    
    it('should return requested data', function() {
        run = new evoplus.steam.Runner('/__spec__/commoner.js', 1)
        run.ready(function() {
            var result = []
            run.get('answer', function(data) { result.push(data) })
            
            waitsFor(function() { return result.length != 0 })
            runs(function() { expect(result).toEqual(42) })
        })
    })

})
