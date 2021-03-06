describe('drivers/common.js', function() {
    var run
    afterEach(function () { run.terminate() })
    
    var commonerDriver = '/__spec__/workers/commoner.js?' + (new Date).valueOf()

    it('should have functions for common drivers tasks', function() {
        run = new evolu.steam.Runner(commonerDriver, 1)
        log = []
        run.workers[0].onmessage = function(e) { log.push(e.data) }
        
        run.option('a', 1).option('a', 2).
            option('sum', function(a, b) { return a + b })
        
        run._oninitialized()
        
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
                { command: 'out',    event: 'OutEvent', data: { c: 3 } },
                { command: 'log',    data: 2 },
                { command: 'log',    data: 'default' },
                { command: 'log',    data: 3 }
            ])
        })
    })
    
    it('should return requested data', function() {
        run = new evolu.steam.Runner(commonerDriver, 1)
        run._onlog = function() { }
        
        var result = []
        run.get('answer', function(data) { result.push(data) })
        
        waitsFor(function() { return result.length != 0 })
        runs(function() { expect(result).toEqual([42]) })
    })

})
