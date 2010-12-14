describe('drivers/common.js', function() {
    var run
    afterEach(function () { run.terminate() })

    it('should have functions for common drivers tasks', function() {
        run = new evoplus.steam.Runner('/__spec__/workers/commoner.js', 1)
        log = []
        run.workers[0].onmessage = function(e) { log.push(e.data) }
        
        run.option('a', 1).option('a', 2).
            option('sum', function(a, b) { return a + b })
        
        run.workers[0].postMessage({ command: 'talk', data: 'test' })
        
        waitsFor(function() { return log.length >= 9 })
        runs(function() {
            expect(log).toEqual([
                { command: 'log',    data: 'I am 0 from 1' },
                { command: 'getter', name: 'answer' },
                { command: 'initialized' },
                { command: 'log',    data: 'test' },
                { command: 'load',   name: 'A', params: { a: 1 } },
                { command: 'worker', to: 'A', content: { command: ':b' } },
                { command: 'out',    data: { c: 3 } },
                { command: 'log',    data: 2 },
                { command: 'log',    data: 3 }
            ])
        })
    })
    
    it('should return requested data', function() {
        run = new evoplus.steam.Runner('/__spec__/workers/commoner.js', 1)
        run.ready(function() {
            var result = []
            run.get('answer', function(data) { result.push(data) })
            
            waitsFor(function() { return result.length != 0 })
            runs(function() { expect(result).toEqual(42) })
        })
    })

})
