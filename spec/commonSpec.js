describe('drivers/common.js', function() {
    var run
    afterEach(function () { run.terminate() })

    it('should have functions for common drivers tasks', function() {
        run = new evoplus.steam.Runner('/__spec__/commoner.js', 1)
        log = []
        run.workers[0].onmessage = function(e) { log.push(e.data) }
        
        run.workers[0].postMessage({ command: 'talk', data: 'test' })
        
        waitsFor(function() { return log.length == 4 })
        runs(function() {
            expect(log).toEqual([
                { command: 'log',    data: 'test' },
                { command: 'load',   name: 'A', params: { a: 1 } },
                { command: 'worker', data: { b: 2 }, to: 'A' },
                { command: 'out',    data: { c: 3 } }
            ])
        })
    })

})
