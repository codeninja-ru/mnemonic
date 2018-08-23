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

var states = [
    {
        cond: h(1),
        action: function() {
        }
    }
];

//TODO vmayorov: implement
function hujakStates(states) {
}

function state() {

}
