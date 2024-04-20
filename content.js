function codeToLoad() {
	function hexToAscii(hexString) {
		let asciiString = '';
		for(let i = 0; i < hexString.length; i += 2) {
			let byteValue = parseInt(hexString.substring(i, i + 2), 16);
			asciiString += String.fromCharCode(byteValue);
		}
		return asciiString;
	}

	window.origFetch = window.fetch;

	window.fetch = function(url, options = {}) {
		return new Promise((res, rej) => {
			let isGamesPost    = false;
			let submissionData = null;

			if(url.startsWith && url.startsWith('https://www.geoguessr.com/api/v3/games')
				&& options.method === 'POST') {
				isGamesPost    = true;
				submissionData = JSON.parse(options.body);
			}

			// if (url.startsWith &&
			// url.startsWith("https://streetviewpixels-pa.googleapis.com/v1/tile")) {
			//     console.log(new URLSearchParams(new URL(url).search).queryParams);
			// }

			window.origFetch(url, options).then(response => {
				if(isGamesPost) {
					response.clone().json().then((roundsData) => {
						console.log(roundsData.player.guesses, roundsData.rounds);

						setTimeout(async () => {
							let resultsContainer = document.querySelector('div[class*="result-layout_bottom"]');

							if(resultsContainer) {
								resultsContainer.style.maxHeight = '310px';
								resultsContainer.style.background
									= 'linear-gradient(180deg,var(--ds-color-purple-100) 0%,var(--ds-color-black) 100%)';

								let container                  = document.createElement('div');
								container.style.display        = 'flex';
								container.style.justifyContent = 'flex-start';
								container.style.flexDirection  = 'column';

								let coachContainer                  = document.createElement('div');
								coachContainer.style.display        = 'flex';
								coachContainer.style.justifyContent = 'flex-start';
								coachContainer.style.flexDirection  = 'row';

								let img          = document.createElement('img');
								img.src          = 'http://localhost:8080/assets/owlmouthclosed.png';
								img.style.width  = '200px';
								img.style.height = '200px';

								let tipElement          = document.createElement('h3');
								tipElement.style.margin = "20px";

								setInterval(() => {
									if(img.src.endsWith('owlmouthclosed.png')) {
										img.src = 'http://localhost:8080/assets/owlmouthopen.png';
									} else {
										img.src = 'http://localhost:8080/assets/owlmouthclosed.png';
									}
								}, 500);

								// resultsContainer.firstElementChild.remove();
								resultsContainer.firstElementChild.style.background = '';

								coachContainer.appendChild(img);
								coachContainer.appendChild(tipElement);
								container.appendChild(coachContainer);
								container.appendChild(resultsContainer.firstElementChild);

								console.log(container);
								resultsContainer.appendChild(container);

								// https://nominatim.openstreetmap.org/reverse?format=json&lat=32.7762719&lon=-96.7968559
								let currentGuess  = roundsData.player.guesses[roundsData.player.guesses.length - 1];
								let currentActual = roundsData.rounds[roundsData.rounds.length - 1];
								let currentActualPanoramaID = hexToAscii(currentActual.panoId);

								let guessReverseSearch
									= await (await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${
												 currentGuess.lat}&lon=${currentGuess.lng}`))
										  .json();
								let actualReverseSearch
									= await (await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${
												 currentActual.lat}&lon=${currentActual.lng}`))
										  .json();
								console.log(guessReverseSearch.display_name, actualReverseSearch.display_name,
									currentActualPanoramaID);
								console.log(roundsData);

								let roundsRes = await (await fetch('http://localhost:8080/rounds', {
									body: JSON.stringify({
										guessLat: currentGuess.lat,
										guessLon: currentGuess.lng,
										guessAddress: guessReverseSearch.display_name,
										roundLat: currentActual.lat,
										roundLon: currentActual.lon,
										roundAddress: actualReverseSearch.display_name,
										panoramaID: currentActualPanoramaID,
										score: currentGuess.roundScoreInPoints,
										userID: roundsData.player.id,
									}),
									method: 'POST',
								})).json();

								console.log(roundsRes);

								let pollIntervalHandle = setInterval(async () => {
									let tipRes = await fetch(`http://localhost:8080/tips?round_id=${roundsRes.ID}`, {
										method: 'GET',
									});

									if(tipRes.status === 200) {
										clearInterval(pollIntervalHandle);
										let tipData          = await tipRes.json();
										tipElement.innerHTML = tipData.tip;
									}
								}, 1000);
							}
						}, 100);
					});
				}

				res(response);
			});
		})
	}
}

function codeLoad() {
	// Add script element to bypass firefox content script limitations
	var script  = document.createElement('script');
	script.type = 'text/javascript';
	script.id   = 'GeoCoachScript';
	var code    = 'const inline = 1;' + codeToLoad.toString() + 'codeToLoad();';
	script.appendChild(document.createTextNode(code));

	var container = document.head || document.documentElement
	container.insertBefore(script, container.children[0]);
}

codeLoad();