/*
 * Copyright (C) 2010 Andrey “A.I.” Sitnik <andrey@sitnik.ru>
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Function to work with byte steam genes (arrays of numbers between 0 and 255).
 */
evolu.steam.bytes = {

    /**
     * Return generator of random byte arrays to use in `generator` option.
     * 
     *   runner.option('populationSize', 100)
     *   runner.option('generator', evolu.steam.bytes.generator(10, 20))
     * 
     * @param minLength {Number} minimum of random length for each byte array
     *                  gene. Must be more than 0.
     * @param maxLength {Number} maximum of random length. If it will be empty,
     *                  length of all genes will be equal to `minLength`
     *                  (no random length).
     * @return {evolu.steam.Function} generator function as string to use in
     *         option and next be evaled to string in worker
     */
    generator: function(minLength, maxLength) {
        var length = ''
        if ("undefined" == typeof(maxLength)) {
            length = minLength
        } else {
            var diff = maxLength - minLength
            length += minLength + ' + Math.round(' + diff + ' * Math.random())'
        }
        return new evolu.steam.Function("function() {",
            'var l = ' + length,
            'var gene = []',
            'for (var i = 0; i < l; i++) {',
            '    gene.push(Math.round(255 * Math.random()))',
            '}',
            'return gene',
        '}')
    },
    
    /**
     * Return mutate function for byte array. It change, remove or add some
     * array element.
     * 
     *   runner.option('mutate', evolu.steam.bytes.mutate(1, 3))
     * 
     * @param minActions {Number} minimum of random action count for
     *                   change/add/remove (default is 1)
     * @param minActions {Number} maximum of random action count (default is 3)
     * @return {evolu.steam.Function} mutate function as string to use in
     *         option and next be evaled to string in worker
     */
    mutate: function(minActions, maxActions) {
        if ("undefined" == typeof(minActions)) minActions = 1
        if ("undefined" == typeof(maxActions)) maxActions = 3
        
        var diff = maxActions - minActions
        
        return new evolu.steam.Function("function(gene) {",
            'var count = ' + minActions + ' + ' +
                'Math.round(' + diff + ' * Math.random())',
            'var type, el',
            'for (var i = 0; i < count; i++) {',
            '    type = 3 * Math.random()',
            '    if (type <= 1) {',
            '        el = Math.round((gene.length - 1) * Math.random())',
            '        gene.splice(el, 1)',
            '    } else if (type <= 2) {',
            '        el = Math.round(gene.length * Math.random())',
            '        gene.splice(el, 0, Math.round(255 * Math.random()))',
            '    } else if (type <= 3) {',
            '        el = Math.round((gene.length - 1) * Math.random())',
            '        gene[el] = Math.round(255 * Math.random())',
            '    }',
            '}',
            'return gene',
        '}')
    },
    
    /**
     * Return function to signle crossover two byte arrays.
     * 
     *   runner.option('mix', evolu.steam.bytes.crossover())
     * 
     * @return {evolu.steam.Function} crossover function as string to use in
     *         option and next be evaled to string in worker
     */
    crossover: function() {
        return new evolu.steam.Function('function(a, b) {',
            'var min = Math.min(a.length, b.length)',
            'var middle = Math.floor(min * Math.random())',
            'var newA = a.slice(0, middle)',
            'newA.push.apply(newA, b.slice(middle, b.length))',
            'var newB = b.slice(0, middle)',
            'newB.push.apply(newB, a.slice(middle, a.length))',
            'return [newA, newB]',
        '}')
    }
    
}
