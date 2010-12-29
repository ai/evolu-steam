importScripts('./common.js')

init(function(name) {
    if (0 == name) {
        load('reduce')
    }
    
    if ('reduce' == name) {
    
        on('start', function() {
            
        })
        
        on('stop', function() {
            
        })
        
        on(':processed', function(msg) {
            
        })
    
    } else {
    
        on(':process', function(msg) {
            var first  = options.mix(options.mutate(msg.genes[0]),
                                     options.mutate(msg.genes[1]))
            var second = options.mix(options.mutate(msg.genes[0]),
                                     options.mutate(msg.genes[1]))
            var genes = [[first[0],  options.fitness(first[0])],
                         [first[1],  options.fitness(first[1])],
                         [second[0], options.fitness(second[0])],
                         [second[1], options.fitness(second[1])]]
            worker('reduce', { command: ':processed', genes: genes })
        })
        
    }
})
