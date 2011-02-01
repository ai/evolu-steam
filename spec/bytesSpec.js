describe('evolu.steam.bytes', function() {
    var random
    beforeEach(function() { random = Math.random })
    afterEach( function() { Math.random = random })
    
    it('should generate genes with exactly length', function() {
        var generator = evolu.steam.bytes.generator(11)
        
        var i = -0.1
        Math.random = function() { return i += 0.1 }
        
        expect(generator.call()).toEqual(
            [0, 26, 51, 77, 102, 128, 153, 179, 204, 229, 255])
    })
    
    it('should generate genes with random length', function() {
        var generator = evolu.steam.bytes.generator(10, 20)
        
        var first = true
        Math.random = function() {
            if (first) {
                first = false
                return 0.5
            } else {
                return 0
            }
        }
        
        expect(generator.call()).toEqual(
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
        expect(generator.call()).toEqual(
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    })
    
    it('should mutate byte stream', function() {
        var mutator = evolu.steam.bytes.mutate(2, 4)
        
        var randoms = [0.5,         // 3 actions
                       0, 0.2,      // remove first element
                       0.5, 1, 1,   // add new 255 element after last
                       1, 0.5, 0.5] // change 3rd element to 128
        Math.random = function() { return randoms.shift() }
        
        expect(mutator.call([1, 2, 3, 4, 5])).toEqual([1, 3, 128, 5, 255])
    })
    
    it('should return crossover operator', function() {
        var crossover = evolu.steam.bytes.crossover(10, 20)
        
        Math.random = function() { return 0.5 }
        
        expect(crossover.call([1, 2, 3, 4], [10, 20, 30, 40, 50])).toEqual(
            [[1, 2, 30, 40, 50], [10, 20, 3, 4]])
    })
})
