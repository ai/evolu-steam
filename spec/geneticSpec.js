describe('drivers/genetic.js', function() {
    var run
    afterEach(function () { run.terminate() })
    
    it('should mutate and mix genes in separated map workers', function() {
        run = new evoplus.steam.Runner('/drivers/genetic.js', 1)
        run.option('mutate',  function(a) { return a + 'M' })
        run.option('mix',     function(a, b) { return [b + '1', a + '2'] })
        run.option('fitness', function(a) {
            return ('A' == a.substr(0, 1)) ? 100 : 200
        })
        
        var log = []
        waitsFor(function() { return run.isInitialized() })
        runs(function() {
            run.workers[0].onmessage = function(e) { log.push(e.data) }
            
            run.workers[0].postMessage({
                command: ':process', genes: ['A', 'B'] })
        })
        
        waitsFor(function() { return log.length > 0 })
        runs(function() {
            expect(log).toEqual([{ 
                command: 'worker',
                to: 'reduce', 
                content: {
                    command: ':processed',
                    genes: [['BM1', 200], ['AM2', 100],
                            ['BM1', 200], ['AM2', 100]]
                }
             }])
        })
    })
    
})
