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
                command: ':process', genes: [['A', 0], ['B', 1]] })
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
    
    it('should generate first population', function() {
        run = new evoplus.steam.Runner('/drivers/genetic.js', 1)
        run.option('generator', function(i) { return 10 * i })
        run.option('populationSize', 3)
        
        var population = false
        run.get('population', function(result) { population = result })
        
        waitsFor(function() { return population !== false }, 1000)
        runs(function() {
            expect(population).toEqual([[0, null], [10, null], [20, null]])
        })
    })
    
    it('should send work to map workers', function() {
        run = new evoplus.steam.Runner('/drivers/genetic.js', 2)
        run.option('isEnd', function(best) { return false })
        run.option('population', [['a', 1], ['b', 2], ['c', 3], ['d', 4],
                                  ['e', 5], ['f', 6]])
        
        var log = []
        var generation = false, best = false, population = false
        
        run.get('generation', function(value) { generation = value })
        waitsFor(function() { return false !== generation })
        runs(function() { expect(generation).toEqual(0) })
        
        waitsFor(function() { return run.isInitialized() })
        runs(function() {
            run._onworker = function(_, msg) { log.push([msg.to, msg.content]) }
            run.workers[0].postMessage = function() {}
            run.workers[1].postMessage = function() {}
            run.start()
        })
        
        waitsFor(function() { return 2 <= log.length })
        runs(function() {
            expect(log).toEqual([
                [0, { command: ':process', genes: [['a', 1], ['b', 2]] }],
                [1, { command: ':process', genes: [['c', 3], ['d', 4]] }]
            ])
            log = []
            
            run.workers.reduce.postMessage({
                command: ':processed', from: 0,
                genes: [['AA', 10], ['AB', 5], ['BA', 5], ['BB', 20]]
            })
        })
         
        waitsFor(function() { return 1 <= log.length })
        runs(function() {
            expect(log).toEqual([
                [0, { command: ':process', genes: [['e', 5], ['f', 6]] }]
            ])
            log = []
            
            run.workers.reduce.postMessage({
                command: ':processed', from: 1,
                genes: [['CC', 30], ['CD', 5], ['DC', 5], ['DD', 40]]
            })
            
            run.stop()
            
            run.workers.reduce.postMessage({
                command: ':processed', from: 0,
                genes: [['EE', 50], ['EF', 5], ['FE', 5], ['FF', 60]]
            })
                
            run.get('generation', function(value) { generation = value })
            run.get('population', function(value) { population = value })
            run.get('best',       function(value) { best = value })
        })
        
        waitsFor(function() { return false !== generation && false !== best &&
                                     false !== population })
        runs(function() {
            expect(generation).toEqual(1)
            expect(population).toEqual([['FF', 60], ['EE', 50], ['DD', 40],
                                        ['CC', 30], ['BB', 20], ['AA', 10]])
            expect(best).toEqual('FF')
            
            run.resume()
        })
        
        waitsFor(function() { return 2 <= log.length })
        runs(function() {
            expect(log).toEqual([
                [0, { command: ':process', genes: [['FF', 60], ['EE', 50]] }],
                [1, { command: ':process', genes: [['DD', 40], ['CC', 30]] }]
            ])
        })
    })
    
    it('should end processing, when get answer', function() {
        run = new evoplus.steam.Runner('/drivers/genetic.js', 1)
        run.option('population', [['a', 1], ['', 0]])
        run.option('mutate',  function(a)    { return a + 'a' })
        run.option('mix',     function(a, b) { return [a, b] })
        run.option('fitness', function(a)    { return a.length })
        run.option('isEnd',   function(best, fitness) {
            return 'aaaa' == best && 4 == fitness
        })
        
        var answer = false
        run.bind('end', function(data) { answer = data })
        
        waitsFor(function() { return run.isInitialized() })
        runs(function() { run.start() })
        
        waitsFor(function() { return false !== answer }, 1000)
        runs(function() {
            expect(answer).toEqual({ best: 'aaaa', generation: 3 })
        })
    })
    
})
