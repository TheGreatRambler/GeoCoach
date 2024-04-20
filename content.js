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
                            let resultsContainer = document.querySelector('div[class*="result-layout_bottom"]');

                            if (resultsContainer) {
                                resultsContainer.style.maxHeight = "350px";
                                resultsContainer.style.background = "linear-gradient(180deg,var(--ds-color-purple-100) 0%,var(--ds-color-black) 100%)";

                                let container = document.createElement("div");
                                container.style.display = "flex";
                                container.style.justifyContent = "flex-start";
                                container.style.flexDirection = "column";

                                let img = document.createElement("img");
                                img.src = "http://localhost:8080/assets/owlmouthclosed.png";
                                img.style.width = "200px";
                                img.style.height = "200px";

                                setInterval(() => {
                                    if (img.src.endsWith("owlmouthclosed.png")) {
                                        img.src = "http://localhost:8080/assets/owlmouthopen.png";
                                    } else {
                                        img.src = "http://localhost:8080/assets/owlmouthclosed.png";
                                    }
                                }, 500);

                                //resultsContainer.firstElementChild.remove();
                                resultsContainer.firstElementChild.style.background = "";

                                container.appendChild(img);
                                container.appendChild(resultsContainer.firstElementChild);

                                console.log(container);
                                resultsContainer.appendChild(container);
                            }
                        }, 0);
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