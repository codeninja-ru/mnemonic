/**
 * Hujak url routing framework
 */

//TODO vmayorov: should return read-only variable
function hujakUrl() {
    function hash() {
        return location.hash.slice(1) || '/';
    }
    var url = h(hash());
    window.addEventListener("hashchange", function(event) {
        url.val = hash();
    });
    window.addEventListener("load", function(event) {
        url.val = hash();
    });

    return url;
}
