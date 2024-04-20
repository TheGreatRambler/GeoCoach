function codeToLoad() {
    window.origFetch = window.fetch;

    window.fetch = function(url, options = {}) {
        return new Promise((res, rej) => {
            let isGamesPost = false;
            let submissionData = null;

            if (url.startsWith && url.startsWith("https://www.geoguessr.com/api/v3/games") && options.method === "POST") {
                isGamesPost = true;
                submissionData = JSON.parse(options.body);
            }
    
            window.origFetch(url, options).then(response => {
                if (isGamesPost) {
                    response.clone().json().then(roundsData => {
                        console.log(roundsData.player.guesses, roundsData.rounds);

                        setTimeout(() => {
                            console.log(window.document);

                            let resultsContainer = document.querySelector('div[class*="result-layout_bottom"]');

                            if (resultsContainer) {
                                let img = document.createElement("img");
                                img.src = browser.runtime.getURL("assets/owlmouthclosed.png");
                                resultsContainer.insertBefore(img, resultsContainer.children[0]);
                            }
                        }, 200);
                    });
                }

                res(response);
            });
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
    container.insertBefore(script, container.children[0]);
}
  
codeLoad();