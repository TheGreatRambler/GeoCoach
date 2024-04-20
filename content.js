function codeToLoad() {
    window.origFetch = window.fetch;

    window.fetch = function(url, options = {}) {
        return new Promise((res, rej) => {
            if (url.startsWith && url.startsWith("https://www.geoguessr.com/api/v3/games")) {
                console.log(options);
            }
    
            window.origFetch(url, options).then(obj => res(obj));
        })
    }
}
  
function codeLoad() {
    // Add script element to bypass firefox content script limitations
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = 'GeoCoachScript';
    var code = codeToLoad.toString() + 'codeToLoad();';
    script.appendChild(document.createTextNode(code));

    var container = document.head || document.documentElement
    container.insertBefore(script, container.children[0])
}
  
codeLoad();