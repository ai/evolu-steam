importScripts('./common.js')

options.mix     = function(a, b) { return [a, b] }
options.compare = function(a, b) { return b - a }

init(function(name, initMsg) {
    if (0 == name) {
        load('reduce')
    }
    
    if ('reduce' == name) {
        var population     = undefined
        var best           = undefined
        var bestFitness    = undefined
        var nextPopulation = []
        var processing     = false
        var generation     = 0
        var jobs           = 0
        var previousBest   = undefined
        var stagnation     = 0
        
        getter('population', function() {
            if ("undefined" == typeof(population)) populate()
            return population
        })
        getter('best',       function() { return best })
        getter('generation', function() { return generation })
        
        function populate() {
            population = []
            if ("undefined" == typeof(options.generator)) {
                population = options.population
                options.populationSize = population.length
            } else {
                for (var i = 0; i < options.populationSize; i++) {
                    population.push([options.generator(i), null])
                }
            }
        }
        
        function processNext(to) {
            if (0 == population.length) {
                if (0 != jobs) return
                
                if (previousBest == bestFitness) {
                    stagnation++
                } else {
                    stagnation = 0
                }
                previousBest = bestFitness
                
                nextPopulation.sort(function(a, b) {
                    return options.compare(a[1], b[1])
                })
                population = nextPopulation.slice(0, options.populationSize)
                nextPopulation = []
                generation++
                
                out('step', { generation: generation, stagnation: stagnation })
                
                if (options.isEnd(best, bestFitness, stagnation)) {
                    out('end', { best: best, generation: generation })
                } else {
                    if (processing) startProcessing()
                }
            } else if (processing) {
                var one = population.shift()
                var two = population.shift()
                worker(to, {
                    command: ':process',
                    genes: [one, two],
                    stagnation: stagnation
                })
                jobs++
            }
        }
        
        function startProcessing() {
            processing = true
            for (var i = 0; i < initMsg.count; i++) {
                processNext(i)
            }
        }
    
        on('start', function() {
            populate()
            startProcessing()
        })
        
        on('stop', function() {
            processing = false
        })
        
        on('resume', function() {
            startProcessing()
        })
        
        on(':processed', function(msg) {
            jobs--
            var diff, gene, genes = msg.genes
            for (var i = 0; i < genes.length; i++) {
                gene = genes[i]
                if ("undefined" == typeof(best) ||
                        options.compare(bestFitness, gene[1]) > 0) {
                    best = gene[0]
                    bestFitness = gene[1]
                }
                nextPopulation.push(gene)
            }
            processNext(msg.from)
        })
    
    } else {
    
        on(':process', function(msg) {
            var one = msg.genes[0][0]
            var two = msg.genes[1][0]
            var stagnation = msg.stagnation
            
            var pair1 = options.mix(options.mutate(one, stagnation),
                                    options.mutate(two, stagnation))
            var pair2 = options.mix(options.mutate(one, stagnation),
                                    options.mutate(two, stagnation))
            var genes = [[pair1[0], options.fitness(pair1[0])],
                         [pair1[1], options.fitness(pair1[1])],
                         [pair2[0], options.fitness(pair2[0])],
                         [pair2[1], options.fitness(pair2[1])]]
            worker('reduce', { command: ':processed', genes: genes })
        })
        
    }
})
