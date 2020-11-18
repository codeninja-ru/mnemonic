/**
 * Hujak url routing framework
 */

//TODO vmayorov: should return read-only variable
var hujakUrl = (function() {
    function hash() {
        var h = location.hash.slice(1) || '/';
        return h.replace('!/', '');
    }
    var url = h(hash());
    window.addEventListener("hashchange", function(event) {
        url.val = hash();
    });
    window.addEventListener("load", function(event) {
        url.val = hash();
    });

    return function() {
        return url;
    };
})(window);
