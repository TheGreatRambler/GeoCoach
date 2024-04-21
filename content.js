function codeToLoad() {
	window.origFetch = window.fetch;
	let myChart;
	let dropDown = document.createElement("select");
	let avgSpan = document.createElement("span");
	let medianSpan = document.createElement("span");
	let modeSpan = document.createElement("span");

	function hexToAscii(hexString) {
		let asciiString = '';
		for(let i = 0; i < hexString.length; i += 2) {
			let byteValue = parseInt(hexString.substring(i, i + 2), 16);
			asciiString += String.fromCharCode(byteValue);
		}
		return asciiString;
	}

	async function fetchData() {
		const response = await window.origFetch('http://localhost:8080/rounds');
		const rounds = await response.json();
		return rounds.map(round => round.Score);
	}

	// async function fetchStats() {
	// 	const temp = await fetchData();
	// 	const reverse = temp.reverse();
	// 	const rev_scores = parseInt(dropDown.value) === -1 ? reverse : reverse.slice(0, parseInt(dropDown.value));
	// 	const scores = rev_scores.reverse();

	// 	const sum = scores.reduce((a, b) => a + b, 0);
	// 	const avg = sum / scores.length;
	// 	avgSpan.innerHTML = `${avg.toFixed(2)}`;

	// 	const sortedScores = scores.slice().sort((a, b) => a - b);
	// 	const middle = Math.floor(sortedScores.length / 2);
	// 	const isEven = sortedScores.length % 2 === 0;
	// 	const median = isEven ? (sortedScores[middle - 1] + sortedScores[middle]) / 2 : sortedScores[middle];
	// 	medianSpan.innerHTML = `${median}`;

	// 	const counts = {};
	// 	scores.forEach(score => {
	// 		counts[score] = counts[score] ? counts[score] + 1 : 1;
	// 	});
	// 	const mode = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
	// 	modeSpan.innerHTML = `${mode}`;
	// }

	async function createChart() {
		const temp = await fetchData();
		const reverse = temp.reverse();
		const rev_scores = parseInt(dropDown.value) === -1 ? reverse : reverse.slice(0, parseInt(dropDown.value));
		const scores = rev_scores.reverse();

		const ctx = document.getElementById('scoreChart');
		if (myChart) {
			myChart.destroy();
		}
		myChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: scores.map((_, index) => `Round ${index + 1}`),
				datasets: [{
					label: 'Scores',
					data: scores,
					borderColor: 'rgb(75, 192, 192)',
					tension: 0.1
				}]
			},
			options: {
				scales: {
					y: {
						beginAtZero: true
					}
				}
			}
		});
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
			dialog.style.backgroundColor = "rgba(16,16,28,0.6)";
			dialog.style.backdropFilter = 'blur(15px)';

			let dialogContent = document.createElement("div");
			dialogContent.style.width = "70%";
			dialogContent.style.height = "70%";
			dialogContent.style.position = "absolute";
			dialogContent.style.top = "15%";
			dialogContent.style.left = "15%";
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
			closeButton.style.left = "50%";
			closeButton.style.bottom = "0";
			closeButton.style.margin = "0";
			closeButton.style.transform = "translateX(-50%)";

			let divChartContainer = document.createElement("div");
			divChartContainer.style.width = "100%";
			divChartContainer.style.height = "80%";
			divChartContainer.style.display = "flex";
			divChartContainer.style.flexDirection = "column";
			divChartContainer.style.justifyContent = "center";
			divChartContainer.style.alignItems = "center";

			let canvas = document.createElement("canvas");
			canvas.id = "scoreChart";
			canvas.style.width = "100%";
			canvas.style.height = "80%";
			canvas.style.maxWidth = "600px";
			canvas.style.maxHeight = "600px";

			let avgLabel = document.createElement("label");
			avgLabel.innerHTML = "Average: ";
			avgLabel.style.color = "white";
			avgLabel.style.fontFamily = "neo-sans,sans-serif";	
			avgLabel.style.fontWeight = "700";
			avgLabel.style.fontStyle = "italic";
			avgLabel.style.fontSize = "1rem";

			avgSpan.style.color = "white";
			avgSpan.style.fontFamily = "neo-sans,sans-serif";
			avgSpan.style.fontWeight = "700";
			avgSpan.style.fontStyle = "italic";
			avgSpan.style.fontSize = "1rem";

			let medianLabel = document.createElement("label");
			medianLabel.innerHTML = "Median: ";
			medianLabel.style.color = "white";
			medianLabel.style.fontFamily = "neo-sans,sans-serif";
			medianLabel.style.fontWeight = "700";
			medianLabel.style.fontStyle = "italic";
			medianLabel.style.fontSize = "1rem";

			medianSpan.style.color = "white";
			medianSpan.style.fontFamily = "neo-sans,sans-serif";
			medianSpan.style.fontWeight = "700";
			medianSpan.style.fontStyle = "italic";
			medianSpan.style.fontSize = "1rem";

			let modeLabel = document.createElement("label");
			modeLabel.innerHTML = "Mode: ";
			modeLabel.style.color = "white";
			modeLabel.style.fontFamily = "neo-sans,sans-serif";
			modeLabel.style.fontWeight = "700";
			modeLabel.style.fontStyle = "italic";
			modeLabel.style.fontSize = "1rem";

			modeSpan.style.color = "white";
			modeSpan.style.fontFamily = "neo-sans,sans-serif";
			modeSpan.style.fontWeight = "700";
			modeSpan.style.fontStyle = "italic";
			modeSpan.style.fontSize = "1rem";

			let divStats = document.createElement("div");
			divStats.style.width = "100%";
			divStats.style.height = "50px";
			divStats.style.display = "flex";
			divStats.style.flexDirection = "row";
			divStats.style.justifyContent = "space-around";
			divStats.style.alignItems = "center";

			divStats.appendChild(avgLabel);
			divStats.appendChild(avgSpan);
			divStats.appendChild(medianLabel);
			divStats.appendChild(medianSpan);
			divStats.appendChild(modeLabel);
			divStats.appendChild(modeSpan);

			dropDown.style.width = "100%";
			dropDown.style.height = "50px";
			dropDown.style.marginTop = "10px";
			dropDown.style.marginBottom = "10px";
			dropDown.style.backgroundColor = "transparent";
			dropDown.style.color = "white";
			dropDown.style.border = "1px solid white";
			dropDown.style.borderRadius = "5px";
			dropDown.style.padding = "5px";
			dropDown.style.fontFamily = "neo-sans,sans-serif";
			dropDown.style.fontWeight = "700";
			dropDown.style.fontStyle = "italic";
			dropDown.style.fontSize = "1rem";
			dropDown.style.textAlign = "center";

			let option1 = document.createElement("option");
			option1.value = "5";
			option1.innerHTML = "5";
			let option2 = document.createElement("option");
			option2.value = "10";
			option2.innerHTML = "10";
			let option3 = document.createElement("option");
			option3.value = "25";
			option3.innerHTML = "25";
			let option4 = document.createElement("option");
			option4.value = "50";
			option4.innerHTML = "50";
			let option5 = document.createElement("option");
			option5.value = "-1";
			option5.innerHTML = "All";
			// default
			option5.selected = true;

			dropDown.appendChild(option1);
			dropDown.appendChild(option2);
			dropDown.appendChild(option3);
			dropDown.appendChild(option4);
			dropDown.appendChild(option5);

			dropDown.onchange = function() {
				createChart();
				// fetchStats();
			}

			divChartContainer.appendChild(canvas);
			
			closeButton.onclick = function() {
				dialog.close();
			}

			dialogContent.appendChild(dialogTitle);
			dialogContent.appendChild(divChartContainer);
			// dialogContent.appendChild(divStats);
			dialogContent.appendChild(dropDown);
			dialogContent.appendChild(closeButton);
			dialog.appendChild(dialogContent);

			document.body.appendChild(dialog);

			let button = document.querySelector("div[class*='geocoach-item'] button");
			button.onclick = function() {
				dialog.showModal();
				createChart();			  
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
	var container = document.head || document.documentElement

	var lscript = document.createElement('script');
	lscript.type = 'text/javascript';
	lscript.src = "https://cdn.jsdelivr.net/npm/chart.js";
	lscript.id = 'ChartJSScript';
	container.insertBefore(lscript, container.children[0]);

	var script  = document.createElement('script');
	script.type = 'text/javascript';
	script.id   = 'GeoCoachScript';
	var code    = 'const inline = 1;' + codeToLoad.toString() + 'codeToLoad();';
	script.appendChild(document.createTextNode(code));

	container.insertBefore(script, container.children[0]);
}

codeLoad();