describe('evolu.steam.Function', function() {
    it('should join string', function() {
        var f = new evolu.steam.Function('a')
        expect(f.string).toEqual('a')
        
        f = new evolu.steam.Function('function(a) {',
            'a += 1',
            'return a',
        '}')
        expect(f.string).toEqual("function(a) {\n" +
        "    a += 1;\n" +
        "    return a;\n" +
        "}")
    })
    
    it('should compile function', function() {
        var f = new evolu.steam.Function('function(a) {',
            'return a + 1',
        '}')
        
        expect(f.call(1)).toEqual(2)
        
        var func = f.compile()
        expect(typeof(func)).toEqual('function')
        expect(func(2)).toEqual(3)
    })
})
