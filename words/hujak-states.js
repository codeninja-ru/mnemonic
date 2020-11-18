/**
 * Hujak state framework
 *
 * @example
 * var isLoading = h(true);
 * var states = {
 *  'loading': state(isLoading, loadingComp()),
 *  'sayHello: state(not(isLoading), function(name) {
 *      return div({click: function() {
 *      }}), 
 *      helloComp(name));
 *  }),
 *  'printYourName': printYourNameComp()
 * };
 *
 * return states(states).default('loading');
 */

//TODO vmayorov: implement
function hujakStates(v, states) {
    function firstState(states, value) {
        for (var idx in states) {
            if (states[idx].cond(value)) {
                return states[idx].comp;
            }
        }
    }

    var wrap = span({});

    stopWatching = v.watch(function(value) {
        var state = firstState(states, value);
        if (state != undefined) {
            replaceAllChildren(wrap, state);
        } else {
            //TODO vmayorov: 404 error
        }
    });

    replaceAllChildren(wrap, firstState(states, v.val));


    return el(wrap).down(function() {
        stopWatching();
    });
}

var fp = (function() {
    function eq(a) {
        return function (b) {
            return a == b;
        };
    }

    function and(f1, f2) {
        return function(a) {
            return f1(a) && f2(a);
        };
    }

    function or(f1, f2) {
        return function(a) {
            return f1(a) || f2(a);
        };
    }
    
    return {eq, and, or};
})();
