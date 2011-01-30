describe('drivers/genetic.js', function() {
    var run
    afterEach(function () { run.terminate() })
    
    var driver = '/drivers/genetic.js?' + (new Date).valueOf()
    
    it('should mutate and mix genes in separated map workers', function() {
        run = new evolu.steam.Runner(driver, 1)
        run.option('mutate',  function(a, stagnation) {
            for (var i = 0; i < stagnation; i++) { a += 'M' }
            return a
        })
        run.option('mix',     function(a, b) { return [b + '1', a + '2'] })
        run.option('fitness', function(a) {
            return ('A' == a.substr(0, 1)) ? 100 : 200
        })
        
        var log = []
        waitsFor(function() { return run.isInitialized() })
        runs(function() {
            run.workers[0].onmessage = function(e) { log.push(e.data) }
            
            run.workers[0].postMessage({
                command: ':process',
                genes: [['A', 0], ['B', 1]],
                stagnation: 2
            })
        })
        
        waitsFor(function() { return log.length > 0 })
        runs(function() {
            expect(log).toEqual([{ 
                command: 'worker',
                to: 'reduce', 
                content: {
                    command: ':processed',
                    genes: [['BMM1', 200], ['AMM2', 100],
                            ['BMM1', 200], ['AMM2', 100]]
                }
             }])
        })
    })
    
    it('should generate first population', function() {
        run = new evolu.steam.Runner(driver, 1)
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
        run = new evolu.steam.Runner(driver, 2)
        run.option('isEnd', function(best) { return false })
        run.option('population', [['a', 1], ['b', 2], ['c', 3], ['d', 4],
                                  ['e', 5], ['f', 6]])
        
        var log = []
        var generation = false, best = false, population = false
        
        run.get('generation', function(value) { generation = value })
        waitsFor(function() { return false !== generation }, 500)
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
                [0, { command: ':process',
                      genes: [['a', 1], ['b', 2]],
                      stagnation: 0 }],
                [1, { command: ':process',
                      genes: [['c', 3], ['d', 4]],
                      stagnation: 0 }]
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
                [0, { command: ':process',
                      genes: [['e', 5], ['f', 6]],
                      stagnation: 0 }]
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
                [0, { command: ':process',
                      genes: [['FF', 60], ['EE', 50]],
                      stagnation: 0 }],
                [1, { command: ':process',
                      genes: [['DD', 40], ['CC', 30]],
                      stagnation: 0 }]
            ])
        })
    })
    
    it('should end processing, when get answer', function() {
        run = new evolu.steam.Runner('/drivers/genetic.js', 1)
        run.option('population', [['a', 1], ['', 0]])
        run.option('mutate',  function(a)    { return a + 'a' })
        run.option('fitness', function(a)    { return a.length })
        run.option('isEnd',   function(best, fitness, stagnation) {
            return 'aaaa' == best && 4 == fitness && 0 == stagnation
        })
        
        var answer = false
        run.bind('end', function(data) { answer = data })
        
        run.start()
        
        waitsFor(function() { return false !== answer })
        runs(function() {
            expect(answer).toEqual({ best: 'aaaa', generation: 3 })
        })
    })
    
    it('should use custom fitness compare function', function() {
        run = new evolu.steam.Runner('/drivers/genetic.js', 1)
        run.option('population', [['aaaa', 4], ['aaaa', 4]])
        run.option('fitness', function(a) { return a.length })
        run.option('mutate',  function(a) {
            return (Math.random() > 0.5) ? a.substr(1) : a + 'b'
        })
        run.option('isEnd',   function(best) { return '' == best })
        run.option('compare', function(a, b) { return a - b })
        
        var end = false
        run.bind('end', function() { end = true })
        
        run.start()
        
        waitsFor(function() { return end })
    })
    
    it('should calculate stagnation', function() {
        run = new evolu.steam.Runner('/drivers/genetic.js', 1)
        run.option('population', [['a', 1], ['a', 1]])
        run.option('mutate',  function(a, stagnation) { return a + stagnation })
        run.option('fitness', function(a) { return 2 })
        run.option('isEnd',   function(best, fitness, stagnation) {
            return 4 == stagnation
        })
        
        var end = false
        run.bind('end', function() { end = true })
        
        run.start()
        
        var population = false
        waitsFor(function() { return end })
        runs(function() {
            run.get('population', function(value) { population = value })
        })
        
        waitsFor(function() { return false !== population })
        runs(function() {
            expect(population).toEqual([['a00123', 2], ['a00123', 2]])
        })
    })
    
    it('should send step event', function() {
        run = new evolu.steam.Runner('/drivers/genetic.js', 1)
        run.option('population', [['a', 1], ['a', 1]])
        run.option('mutate',  function(a, stagnation) { return a + stagnation })
        run.option('fitness', function(a) { return 2 })
        run.option('isEnd',   function(best, fitness, stagnation) {
            return 4 == stagnation
        })
        
        var end = false
        run.bind('end', function() { end = true })
        
        var steps = {}
        run.bind('step', function(e) { steps[e.generation] = e.stagnation })
        
        run.start()
        
        waitsFor(function() { return end })
        runs(function() {
            expect(steps).toEqual({ 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 })
        })
    })
    
})
