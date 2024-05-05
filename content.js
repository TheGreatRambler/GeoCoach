function codeToLoad() {
	if(document.cookie.split(';').some((item) => item.trim().startsWith('geocoach='))) {
		console.log('Cookie geocoach already exists.');
	} else {
		document.cookie = "geocoach=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
		console.log('Cookie geocoach created and set to true.');
	}

	window.origFetch = window.fetch;
	let myChart      = null;
	let conceptChart = null;
	let dropDown     = document.createElement("select");
	let avgSpan      = document.createElement("span");
	let medianSpan   = document.createElement("span");
	let modeSpan     = document.createElement("span");
	let table;

	let mainPageState = "none"

	function hexToAscii(hexString) {
		let asciiString = '';
		for(let i = 0; i < hexString.length; i += 2) {
			let byteValue = parseInt(hexString.substring(i, i + 2), 16);
			asciiString += String.fromCharCode(byteValue);
		}
		return asciiString;
	}

	function usingGeocoach() {
		const cookieName = 'geocoach';
		let cookies      = document.cookie.split(';');
		let cookieValue  = cookies.find(cookie => cookie.trim().startsWith(cookieName + '='));

		if(cookieValue) {
			cookieValue = cookieValue.split('=')[1];
			return cookieValue === 'true';
		}
		return false;
	}

	function makeBird() {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", "0 0 25 25");

		// Define the bird's outline as a single path
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d",
			"M3,12 Q5,9 12.5,10 T23,12 Q22,18 12.5,18 T3,12 Z M10,14 Q10,13 11,13 T12,14 M17,14 Q17,13 18,13 T19,14");
		path.setAttribute("fill", "none");
		path.setAttribute("stroke", "white");
		path.setAttribute("stroke-width", "2.0");

		// Append the path to the SVG element
		svg.appendChild(path);

		return svg;
	}

	async function fetchData() {
		const userID   = window.__NEXT_DATA__.props.accountProps.account.user.userId;
		const response = await window.origFetch(`http://localhost:8080/rounds?user_id=${userID}`, { method: 'GET' });
		const rounds   = await response.json();
		return rounds.map(round => round.Score);
	}

	async function fetchStats(scores) {
		const sum         = scores.reduce((a, b) => a + b, 0);
		const avg         = sum / scores.length;
		avgSpan.innerHTML = `${avg.toFixed(2)}`;

		const sortedScores   = scores.slice().sort((a, b) => a - b);
		const middle         = Math.floor(sortedScores.length / 2);
		const isEven         = sortedScores.length % 2 === 0;
		const median         = isEven ? (sortedScores[middle - 1] + sortedScores[middle]) / 2 : sortedScores[middle];
		medianSpan.innerHTML = `${median}`;

		const counts = {};
		scores.forEach(score => { counts[score] = counts[score] ? counts[score] + 1 : 1; });
		const mode         = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
		modeSpan.innerHTML = `${mode}`;
	}

	async function createChart() {
		const temp = await fetchData();

		setTimeout(() => {
			const reverse    = temp.reverse();
			const rev_scores = parseInt(dropDown.value) === -1 ? reverse : reverse.slice(0, parseInt(dropDown.value));
			const scores     = rev_scores.reverse();

			const canvas = document.getElementById('scoreChart');

			if(!canvas) {
				console.log("Has to enter");
				setTimeout(createChart, 50);
				return
			}

			const ctx = canvas.getContext('2d');

			ctx.canvas.width  = 600;
			ctx.canvas.height = 400;

			if(myChart) {
				myChart.destroy();
			}

			myChart = new Chart(canvas, {
				type: 'line',
				data: {
					labels: scores.map((_, index) => `Round ${index + 1}`),
					datasets: [{
						label: 'Scores',
						data: scores,
						borderColor: 'rgb(75, 192, 192)',
						tension: 0.1,
					}]
				},
				options: {
					plugins: { legend: { labels: { color: "white", font: { size: 18 } } } },
					scales: {
						y: {
							ticks: {
								color: "white",
								font: {
									size: 18,
								},
								stepSize: 1,
								beginAtZero: true
							}
						},
						x: { ticks: { color: "white", font: { size: 14 }, stepSize: 1, beginAtZero: true } }
					}
				}
			});

			fetchStats(scores);
		}, 0);
	}

	async function createConceptHistogram() {
		const response    = await window.origFetch('http://localhost:8080/concepts');
		const conceptsRaw = await response.json();
		const concepts    = conceptsRaw.map(concept => concept.Concept);

		setTimeout(() => {
			const canvas = document.getElementById('conceptsCanvas');

			let conceptsBins = {};
			concepts.forEach((concept) => {
				if(!conceptsBins[concept]) {
					conceptsBins[concept] = 1;
				} else {
					conceptsBins[concept]++;
				}
			});

			let x = [];
			let y = [];
			for(const [key, value] of Object.entries(conceptsBins)) {
				x.push(key);
				y.push(value);
			}

			if(!canvas) {
				console.log("Has to enter");
				setTimeout(createConceptHistogram, 50);
				return
			}

			const ctx = canvas.getContext('2d');

			ctx.canvas.width  = 600;
			ctx.canvas.height = 400;

			if(conceptChart) {
				conceptChart.destroy();
			}

			conceptChart = new Chart(canvas, {
				type: 'bar',
				data: {
					labels: x,
					datasets: [{ label: "Concepts You Have Missed", data: y, borderWidth: 1 }],
				},
				options: {
					plugins: { legend: { labels: { color: "white", font: { size: 18 } } } },
					scales: {
						y: {
							ticks: {
								color: "white",
								font: {
									size: 18,
								},
								stepSize: 1,
								beginAtZero: true
							}
						},
						x: { ticks: { color: "white", font: { size: 14 }, autoSkip: false, beginAtZero: true } }
					}
				}
			});
		}, 0);
	}

	function addTableRow(location, guess, score, tip) {
		let row                   = document.createElement("tr");
		row.style.width           = "100%";
		row.style.display         = "table-row";
		row.style.alignItems      = "center";
		row.style.backgroundColor = "rgba(16,16,28,0.6)";
		row.style.borderRadius    = "10px";
		row.style.padding         = "10px";

		let locationElement              = document.createElement("td");
		locationElement.innerHTML        = location;
		locationElement.style.color      = "white";
		locationElement.style.fontFamily = "neo-sans,sans-serif";
		locationElement.style.fontWeight = "400";
		locationElement.style.fontStyle  = "italic";
		locationElement.style.fontSize   = "0.75rem";
		locationElement.style.width      = "20%";
		locationElement.padding          = "2%";
		locationElement.style.textAlign  = "center";
		locationElement.style.display    = "table-cell";

		let guessElement              = document.createElement("td");
		guessElement.innerHTML        = guess;
		guessElement.style.color      = "white";
		guessElement.style.fontFamily = "neo-sans,sans-serif";
		guessElement.style.fontWeight = "400";
		guessElement.style.fontStyle  = "italic";
		guessElement.style.fontSize   = "0.75rem";
		guessElement.style.width      = "20%";
		guessElement.padding          = "2%";
		guessElement.style.textAlign  = "center";
		guessElement.style.display    = "table-cell";

		let scoreElement              = document.createElement("td");
		scoreElement.innerHTML        = score;
		scoreElement.style.color      = "white";
		scoreElement.style.fontFamily = "neo-sans,sans-serif";
		scoreElement.style.fontWeight = "400";
		scoreElement.style.fontStyle  = "italic";
		scoreElement.style.fontSize   = "0.75rem";
		scoreElement.style.width      = "10%";
		scoreElement.padding          = "2%";
		scoreElement.style.textAlign  = "center";
		scoreElement.style.display    = "table-cell";

		let tipElement              = document.createElement("td");
		tipElement.innerHTML        = tip;
		tipElement.style.color      = "white";
		tipElement.style.fontFamily = "neo-sans,sans-serif";
		tipElement.style.fontWeight = "400";
		tipElement.style.fontStyle  = "italic";
		tipElement.style.fontSize   = "0.75rem";
		tipElement.style.width      = "50%";
		tipElement.padding          = "10px";
		tipElement.style.padding    = "2%";
		tipElement.style.textAlign  = "center";
		tipElement.style.display    = "table-cell";

		row.appendChild(locationElement);
		row.appendChild(guessElement);
		row.appendChild(scoreElement);
		row.appendChild(tipElement);

		table.appendChild(row);
	}

	const loadTips = async () => {
		while (table.children.length > 1) {
			table.removeChild(table.children[1]);
		}

		const userID = window.__NEXT_DATA__.props.accountProps.account.user.userId;

		let tips = await fetch(`http://localhost:8080/tips?user_id=${userID}`, {
			method: "GET"
		});
		tips = await tips.json();

		console.log(tips);

		let rounds = await fetch(`http://localhost:8080/rounds?user_id=${userID}`, {
			method: "GET"
		});
		rounds = await rounds.json();

		tips.forEach(tip => {
			let round = rounds.find(round => round.ID === tip.RoundID);
			tip.Location = round.RoundAddress;
			tip.Guess = round.GuessAddress;
			tip.Score = round.Score;
			addTableRow(tip.Location, tip.Guess, tip.Score, tip.TipString);
		})
	}

	const onPageLoad = () => {
		if (document.querySelector("div[class*='primary-menu_wrapper']") == null) {
			if (!usingGeocoach()) {
				return;
			}
			setTimeout(onPageLoad, 50);
		} else {
			if (!usingGeocoach()) {
				return;
			}
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
			dialogContent.style.display = "flex";
			dialogContent.style.justifyContent = "center";
			dialogContent.style.flexDirection = "column";

			let dialogTitle = document.createElement("h1");
			dialogTitle.innerHTML = "GeoCoach";
			dialogTitle.style.color = "white";
			dialogTitle.style.textAlign = "center";
			dialogTitle.style.fontStyle = "italic";
			dialogTitle.style.fontWeight = "700";
			dialogTitle.style.fontFamily = "neo-sans,sans-serif";
			dialogTitle.style.fontSize = "1.75rem";

			dialogContent.appendChild(dialogTitle);

			let tabsContainer = document.createElement("div");
			tabsContainer.classList.add("tabs-container");
			tabsContainer.style.display = "flex";
			tabsContainer.style.justifyContent = "center";
			tabsContainer.style.marginBottom = "10px";

			let tabGraph = document.createElement("button");
			tabGraph.innerHTML = "Stats";
			tabGraph.classList.add("tab");
			tabGraph.dataset.target = "graphContainer";
			tabGraph.style.marginRight = "10px";
			tabGraph.style.backgroundColor = "transparent";
			tabGraph.style.color = "white";
			tabGraph.style.border = "none";
			tabGraph.style.fontSize = "1rem";
			tabGraph.style.cursor = "pointer";
			tabGraph.style.fontFamily = "neo-sans,sans-serif";
			tabGraph.style.fontWeight = "700";
			tabGraph.style.fontStyle = "italic";
			tabGraph.style.borderRadius = "3.75rem";
			tabGraph.style.padding = "0.75rem 1.5rem";

			let tabNewView = document.createElement("button");
			tabNewView.innerHTML = "Tips";
			tabNewView.classList.add("tab");
			tabNewView.dataset.target = "newViewContainer";
			tabNewView.style.backgroundColor = "transparent";
			tabNewView.style.color = "white";
			tabNewView.style.border = "none";
			tabNewView.style.fontSize = "1rem";
			tabNewView.style.cursor = "pointer";
			tabNewView.style.fontFamily = "neo-sans,sans-serif";
			tabNewView.style.fontWeight = "700";
			tabNewView.style.fontStyle = "italic";
			tabNewView.style.borderRadius = "3.75rem";
			tabNewView.style.padding = "0.75rem 1.5rem";

			let tabConcepts = document.createElement("button");
			tabConcepts.innerHTML = "Concepts";
			tabConcepts.classList.add("tab");
			tabConcepts.dataset.target = "newViewContainer";
			tabConcepts.style.backgroundColor = "transparent";
			tabConcepts.style.color = "white";
			tabConcepts.style.border = "none";
			tabConcepts.style.fontSize = "1rem";
			tabConcepts.style.cursor = "pointer";
			tabConcepts.style.fontFamily = "neo-sans,sans-serif";
			tabConcepts.style.fontWeight = "700";
			tabConcepts.style.fontStyle = "italic";
			tabConcepts.style.borderRadius = "3.75rem";
			tabConcepts.style.padding = "0.75rem 1.5rem";

			tabsContainer.appendChild(tabGraph);
			tabsContainer.appendChild(tabNewView);
			tabsContainer.appendChild(tabConcepts);
			dialogContent.appendChild(tabsContainer);

			let closeButton = document.createElement("button");
			closeButton.innerHTML = "CLOSE";
			closeButton.style.color = "white";
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
			closeButton.style.bottom = "0";
			closeButton.style.marginLeft = "auto";
			closeButton.style.marginRight = "auto";
			closeButton.style.marginTop = "10px";

			let divChartContainer = document.createElement("div");
			divChartContainer.style.width = "100%";
			divChartContainer.style.height = "80%";
			divChartContainer.style.display = "flex";
			divChartContainer.style.flexDirection = "column";
			divChartContainer.style.justifyContent = "center";
			divChartContainer.style.alignItems = "center";

			let canvas = document.createElement("canvas");
			canvas.id = "scoreChart";
			canvas.width = 600;
			canvas.height = 400;
			canvas.style.maxWidth = "100%";
			canvas.style.height = "auto"; // Maintain aspect ratio
			canvas.style.display = "block"; // To block scale the width
			canvas.style.boxSizing = "border-box"; // Include padding and borders in the element's total width and height
			canvas.style.border = "1px solid white";

			divChartContainer.appendChild(canvas);

			let conceptsChartContainer = document.createElement("div");
			conceptsChartContainer.style.width = "100%";
			conceptsChartContainer.style.height = "80%";
			conceptsChartContainer.style.display = "none";
			conceptsChartContainer.style.flexDirection = "column";
			conceptsChartContainer.style.justifyContent = "center";
			conceptsChartContainer.style.alignItems = "center";

			let conceptsCanvas = document.createElement("canvas");
			conceptsCanvas.id = "conceptsCanvas";
			conceptsCanvas.width = 600;
			conceptsCanvas.height = 400;
			conceptsCanvas.style.maxWidth = "100%";
			conceptsCanvas.style.height = "auto"; // Maintain aspect ratio
			conceptsCanvas.style.display = "block"; // To block scale the width
			conceptsCanvas.style.boxSizing = "border-box"; // Include padding and borders in the element's total width and height
			conceptsCanvas.style.border = "1px solid white";

			conceptsChartContainer.appendChild(conceptsCanvas);
			dialogContent.appendChild(conceptsChartContainer);

			// Create early
			createChart();
			createConceptHistogram();

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
			divStats.style.margin = "10px";

			divStats.appendChild(avgLabel);
			divStats.appendChild(avgSpan);
			divStats.appendChild(medianLabel);
			divStats.appendChild(medianSpan);
			divStats.appendChild(modeLabel);
			divStats.appendChild(modeSpan);

			dropDown.style.width = "100%";
			dropDown.style.height = "50px";
			dropDown.style.marginTop = "10px";
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

			option5.selected = true;

			if (dropDown.children.length > 0) {
				dropDown.innerHTML = "";
			}

			dropDown.appendChild(option1);
			dropDown.appendChild(option2);
			dropDown.appendChild(option3);
			dropDown.appendChild(option4);
			dropDown.appendChild(option5);

			dropDown.onchange = function() {
				createChart();
			}
			
			closeButton.onclick = function() {
				dialog.close();
			}

			dialogContent.appendChild(divChartContainer);
			dialogContent.appendChild(divStats);
			dialogContent.appendChild(dropDown);
			dialog.appendChild(dialogContent);

			document.body.appendChild(dialog);

			table = document.createElement("table");
			table.style.width = "100%";
			table.style.height = "100%";
			table.style.alignItems = "center";
			table.style.tableLayout = "fixed";
			table.style.borderCollapse = "collapse";
			table.style.margin = "auto";
			table.style.display = "none";
			table.style.overflowY = "scroll";
			
			
			let header = document.createElement("tr");
			header.style.width = "100%";
			header.style.height = "50px";
			header.style.display = "table-row";
			header.style.alignItems = "center";
			header.style.backgroundColor = "rgba(16,16,28,0.6)";
			header.style.borderRadius = "10px";
			header.style.padding = "10px";

			let headerTitle = document.createElement("th");
			headerTitle.innerHTML = "Location";
			headerTitle.style.color = "white";
			headerTitle.style.fontFamily = "neo-sans,sans-serif";
			headerTitle.style.fontWeight = "700";
			headerTitle.style.fontStyle = "italic";
			headerTitle.style.fontSize = "1rem";
			headerTitle.style.width = "20%";
			headerTitle.style.textAlign = "center";
			headerTitle.style.boxSizing = "border-box";	

			let headerGuess = document.createElement("th");
			headerGuess.innerHTML = "Guess";
			headerGuess.style.color = "white";
			headerGuess.style.fontFamily = "neo-sans,sans-serif";
			headerGuess.style.fontWeight = "700";
			headerGuess.style.fontStyle = "italic";
			headerGuess.style.fontSize = "1rem";
			headerGuess.style.width = "20%";
			headerGuess.style.textAlign = "center";
			headerGuess.style.boxSizing = "border-box";

			let headerScore = document.createElement("th");
			headerScore.innerHTML = "Score";
			headerScore.style.color = "white";
			headerScore.style.fontFamily = "neo-sans,sans-serif";
			headerScore.style.fontWeight = "700";
			headerScore.style.fontStyle = "italic";
			headerScore.style.fontSize = "1rem";
			headerScore.style.width = "10%";
			headerScore.style.textAlign = "center";
			headerScore.style.boxSizing = "border-box";

			let headerTip = document.createElement("th");
			headerTip.innerHTML = "Tip";
			headerTip.style.color = "white";
			headerTip.style.fontFamily = "neo-sans,sans-serif";
			headerTip.style.fontWeight = "700";
			headerTip.style.fontStyle = "italic";
			headerTip.style.fontSize = "1rem";
			headerTip.style.width = "50%";
			headerTip.style.textAlign = "center";
			headerTip.style.boxSizing = "border-box";

			header.appendChild(headerTitle);
			header.appendChild(headerGuess);
			header.appendChild(headerScore);
			header.appendChild(headerTip);

			table.appendChild(header);

			dialogContent.appendChild(table);

			dialogContent.appendChild(closeButton);

			let button = document.querySelector("div[class*='geocoach-item'] button");
			button.onclick = function() {
				dialog.showModal();
			}

			tabGraph.onclick = function() {
				createChart();
				divChartContainer.style.display = "flex";
				divStats.style.display = "flex";
				dropDown.style.display = "block";
				table.style.display = "none";
				conceptsChartContainer.style.display = "none";
			}

			tabNewView.onclick = function() {
				loadTips();
				divChartContainer.style.display = "none";
				divStats.style.display = "none";
				dropDown.style.display = "none";
				table.style.display = "block";
				conceptsChartContainer.style.display = "none";
			}
			
			tabConcepts.onclick = function() {
				createConceptHistogram();
				divChartContainer.style.display = "none";
				divStats.style.display = "none";
				dropDown.style.display = "none";
				table.style.display = "none";
				conceptsChartContainer.style.display = "flex";
			}
		}
	}

	const onSettingsLoad = () => {
		if (!document.querySelector("label[class*='game-options_option']")) {
			setTimeout(onSettingsLoad, 50);
		}else {
			if (document.querySelector("label[class*='geocoach-item']")) {
				return;
			}

			console.log("Settings loaded");

			let option = document.querySelectorAll("label[class*='game-options_option']");
			let enableDisable = option[option.length-1].cloneNode(true);
			enableDisable.classList.add("geocoach-item");

			let label = enableDisable.children[1]
			label.innerHTML = "GeoCoach";

			let container = document.querySelector("div[class*='game-menu_optionsContainer']");
			container.appendChild(enableDisable);

			let checkbox = document.querySelector('label[class*="geocoach-item"] input');

			checkbox.value = usingGeocoach();
			checkbox.checked = usingGeocoach()

			checkbox.onchange = function() {
				if (checkbox.checked) {
					document.cookie = "geocoach=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
				}else {
					document.cookie = "geocoach=false; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/";
				}
			}

			enableDisable.children[0].remove();

			const birdSVG = makeBird();

			birdSVG.style.width = "1.5rem";
			birdSVG.style.height = "1.5rem";

			enableDisable.insertBefore(birdSVG, enableDisable.children[0]);

		}
	}

	const removeGeocoachMenu = () => {
		if (document.querySelector("div[class*='geocoach-item']")) {
			document.querySelector("div[class*='geocoach-item']").remove();
		}
	}

	setInterval(() => {
		if(window.location.href == "https://www.geoguessr.com/") {
			if(document.querySelector("div[class*='game-menu_settingsContainer']")) {
				onSettingsLoad();
				mainPageState = "settings";
			} else {
				onPageLoad();
				if(mainPageState != "settings") {
					if(!usingGeocoach()) {
						removeGeocoachMenu();
					}
				}
				mainPageState = "main";
			}
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
				if(isGamesPost && usingGeocoach()) {
					response.clone().json().then((roundsData) => {
						if(roundsData.player) {
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
									img.title        = "Tippy";

									// Big tip element
									let tipElement                = document.createElement('h3');
									tipElement.style.marginRight  = "25px";
									tipElement.style.marginLeft   = "25px";
									tipElement.style.marginTop    = "auto";
									tipElement.style.marginBottom = "auto";
									tipElement.innerHTML          = "Thinking.";

									setInterval(() => {
										if(img.src.endsWith('owlmouthnod.png')) {
											img.src = 'http://localhost:8080/assets/owlmouthopen.png';
										} else {
											img.src = 'http://localhost:8080/assets/owlmouthnod.png';
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

									let guessReverseSearch = await (
										await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${
											currentGuess.lat}&lon=${
											currentGuess.lng}`)).json();
									let actualReverseSearch = await (
										await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${
											currentActual.lat}&lon=${
											currentActual.lng}`)).json();

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

									let loadingScreenStrings = [
										"Thinking.",
										"Thinking..",
										"Thinking...",
									];
									let loadingScreenStringsIndex = 0;

									let pollIntervalHandle = setInterval(async () => {
										fetch(`http://localhost:8080/tips?round_id=${roundsRes.ID}`, {
											method: 'GET',
										})
											.then(async (tipRes) => {
												tipElement.innerHTML = loadingScreenStrings[loadingScreenStringsIndex];
												loadingScreenStringsIndex = (loadingScreenStringsIndex + 1) % 3;

												if(tipRes.status === 200) {
													let tipData = await tipRes.json();

													if(tipData.length > 0) {
														clearInterval(pollIntervalHandle);
														tipElement.innerHTML = tipData[0].TipString;
													}
												}
											})
											.catch(() => {});
									}, 1000);
								}
							}, 100);
						}
					});
				}

				res(response);
			});
		})
	}
}

function codeLoad() {
	var container = document.head || document.documentElement

	var lscript  = document.createElement('script');
	lscript.type = 'text/javascript';
	lscript.src  = "https://cdn.jsdelivr.net/npm/chart.js";
	lscript.id   = 'ChartJSScript';
	container.insertBefore(lscript, container.children[0]);

	var script  = document.createElement('script');
	script.type = 'text/javascript';
	script.id   = 'GeoCoachScript';
	var code    = 'const inline = 1;' + codeToLoad.toString() + 'codeToLoad();';
	script.appendChild(document.createTextNode(code));

	container.insertBefore(script, container.children[0]);
}

codeLoad();