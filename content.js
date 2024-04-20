function codeToLoad() {
	function hexToAscii(hexString) {
		let asciiString = '';
		for(let i = 0; i < hexString.length; i += 2) {
			let byteValue = parseInt(hexString.substring(i, i + 2), 16);
			asciiString += String.fromCharCode(byteValue);
		}
		return asciiString;
	}

	const onPageLoad = () => {
		if (document.querySelector("div[class*='primary-menu_wrapper__3ahEU']") == null) {
			setTimeout(onPageLoad, 50);
		}else {
			if (document.querySelector("div[class*='geocoach-item']") != null) {
				return;
			}
			let menu = document.querySelector("div[class*='primary-menu_wrapper__3ahEU']")
			var clone = menu.children[7].cloneNode(true);
			clone.classList.add("geocoach-item");
			menu.insertBefore(clone, menu.children[8]);
			let span = document.querySelector("div[class*='geocoach-item'] span");
			span.innerHTML = "GeoCoach";

			let dialog = document.createElement("dialog");
			dialog.classList.add("geocoach-dialog");
			dialog.style.width = "100%";
			dialog.style.height = "100%";
			dialog.style.position = "absolute";	
			dialog.style.top = "0";
			dialog.style.left = "0";
			dialog.style.backgroundColor = "rgba(0,0,0,0.5)";
			dialog.style.backdropFilter = 'blur(10px)';

			let dialogContent = document.createElement("div");
			dialogContent.style.width = "50%";
			dialogContent.style.height = "50%";
			dialogContent.style.position = "absolute";
			dialogContent.style.top = "25%";
			dialogContent.style.left = "25%";
			dialogContent.style.borderRadius = "10px";
			dialogContent.style.padding = "20px";

			let dialogTitle = document.createElement("h1");
			dialogTitle.innerHTML = "GeoCoach";
			dialogTitle.style.color = "white";
			dialogTitle.style.textAlign = "center";
			dialogTitle.style.fontStyle = "italic";
			dialogTitle.style.fontWeight = "700";
			dialogTitle.style.fontFamily = "neo-sans,sans-serif";
			dialogTitle.style.fontSize = "1.75rem";

			let closeButton = document.createElement("button");
			closeButton.innerHTML = "CLOSE";
			closeButton.style.color = "white";
			closeButton.style.position = "absolute";
			closeButton.style.backgroundColor = "transparent";
			closeButton.style.border = "none";
			closeButton.style.fontSize = "0.875rem";
			closeButton.style.cursor = "pointer";
			closeButton.style.background = "hsla(0,0%,100%,.2)";
			closeButton.style.borderRadius = "3.75rem";
			closeButton.style.padding = "0.75rem 1.5rem";
			closeButton.style.fontFamily = "neo-sans,sans-serif";
			closeButton.style.fontWeight = "700";
			closeButton.style.fontStyle = "italic";
			
			closeButton.onclick = function() {
				dialog.close();
			}

			dialogContent.appendChild(dialogTitle);
			dialogContent.appendChild(closeButton);
			dialog.appendChild(dialogContent);

			document.body.appendChild(dialog);

			let button = document.querySelector("div[class*='geocoach-item'] button");
			button.onclick = function() {
				dialog.showModal();
			}
			
		}
	}

	if (window.location.href == "https://www.geoguessr.com/") {		
		onPageLoad();
	} 

	setInterval(() => {
		if (window.location.href == "https://www.geoguessr.com/") {
			onPageLoad();
		}
	}, 500);

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

								let tipElement               = document.createElement('h3');
								tipElement.style.margin      = "auto";
								tipElement.style.marginRight = "25px";

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

								resultsContainer.appendChild(container);

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

								let pollIntervalHandle = setInterval(async () => {
									let tipRes = await fetch(`http://localhost:8080/tips?round_id=${roundsRes.ID}`, {
										method: 'GET',
									});

									if(tipRes.status === 200) {
										clearInterval(pollIntervalHandle);
										let tipData          = await tipRes.json();
										tipElement.innerHTML = tipData.TipString;
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
	var script  = document.createElement('script');
	script.type = 'text/javascript';
	script.id   = 'GeoCoachScript';
	var code    = 'const inline = 1;' + codeToLoad.toString() + 'codeToLoad();';
	script.appendChild(document.createTextNode(code));

	var container = document.head || document.documentElement
	container.insertBefore(script, container.children[0]);
}

codeLoad();