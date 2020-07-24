var config = getDefaultConfig();

var keyboard = "qwertz";
var interval = 25; // ms
var balls = [];
var t = 0;
var typedKeys = [];
var bgSaturation = 0;
var currId = 0;
var isPaused = false;
var score = 0;
var hiScore = 0;
var mainInterval;
var level = 0;
var isGameOver = false;
var maxSteps;
var stats = [];

var sounds = {
	badKey : new Audio("audio/Funny-noise.mp3"),
	ballAtBottom : new Audio("audio/ball-at-bottom.mp3"),
	keyPress : new Audio("audio/Button-click-sound.mp3"),
	ballComplete : new Audio("audio/Level-up-sound-effect.mp3"),
	gameOver : new Audio("audio/Game-over-robotic-voice.mp3")
};

function onLoad() {
	gameCanvas = document.getElementById("game-canvas");
	gameContext = gameCanvas.getContext("2d");
	progressBar = document.getElementById("game-progress");

	if (!setup()) {
		selectLevel(2);
	}
}

function setup() {
	var html = "<ul>";
	for ( var i in config.levels) {
		html += "<li><a href=\"#\" id=\"level-" + i + "\" onClick=\"selectLevel(" + i + ");\">" + config.levels[i].name + "</a></li>";
	}
	html += "</ul>";
	var levelSelectionDiv = document.getElementById("level-selection");
	levelSelectionDiv.innerHTML = html;

	var storedStats = localStorage.getItem("stats");
	if (storedStats) {
		stats = JSON.parse(storedStats);
	}
	var storedConfig = localStorage.getItem("config");
	if (storedConfig) {
		config = JSON.parse(storedConfig);
	}
	var storedHiScore = localStorage.getItem("hiScore");
	if (storedHiScore) {
		hiScore = storedHiScore;
		document.getElementById("hi-score").innerHTML = Math.round(hiScore);
	}
	var storedKeyboard = localStorage.getItem("keyboard");
	if (storedKeyboard) {
		setKeyboard(storedKeyboard);
	}
	var storedLevel = localStorage.getItem("level");
	if (storedLevel) {
		selectLevel(storedLevel);
		return true;
	}
	return false;

}

function start() {
	maxSteps = config.maxTime * (1000 / interval);
	isGameOver = false;
	isPaused = false;
	typedKeys = [];
	balls = [];
	score = 0;
	t = 0;
	currId = 0;
	bgSaturation = 0;
	addScore(0);
	if (mainInterval) {
		clearInterval(mainInterval);
	}
	mainInterval = setInterval(step, interval);
}

function step() {
	if (isPaused) {
		setMessage("PAUSED");
		return;
	}
	t++;
	if (t > maxSteps) {
		clearInterval(mainInterval);

		if (!stats[level].gamesPlayed) {
			stats[level].gamesPlayed = 0;
		}
		stats[level].gamesPlayed++;

		isPaused = true;
		isGameOver = true;
		hiScore = Math.max(hiScore, score);
		localStorage.setItem("hiScore", hiScore);

		var levelHiScore = stats[level].hiScore;
		if (!levelHiScore) {
			levelHiScore = score;
		}
		stats[level].hiScore = Math.max(score, levelHiScore);

		localStorage.setItem("stats", JSON.stringify(stats));

		document.getElementById("hi-score").innerHTML = Math.round(hiScore);

		setMessage("GAME OVER");
		stopSounds();
		sounds.gameOver.play();
		return;
	}

	progressBar.style.width = (100 * t / maxSteps) + "%";

	var grams = config.levels[level].grams[keyboard];
	if (balls.length < grams.length && Math.random() < config.newBallProbability) {
		var gram;
		var index = Math.floor(Math.random() * (grams.length - balls.length));
		var currIndex = 0;
		for (var i = 0; i < grams.length && !gram; i++) {
			var exists = false;
			for (var j = 0; j < balls.length && !exists; j++) {
				var ball = balls[j];
				exists = ball.gram == grams[i];
			}
			if (!exists) {
				if (currIndex == index) {
					gram = grams[i];
				}
				currIndex++;
			}
		}
		if (gram) {
			var ball = {
				y : 0,
				x : Math.random(),
				vel : {
					x : (Math.random() - 0.5) * 0.01,
					y : Math.random() * 0.0012
				},
				gram : gram,
				hue : Math.random(),
				opacity : 0.8,
				radius : 25 + (Math.random() * 15),
				radiusFreq : 8 + (Math.random() * 5),
				radiusAmplitude : 4 + (Math.random() * 2),
				typedLettersIndex : -1,
				id : currId++,
				isComplete : false,
				fontSize : 28
			};
			balls.push(ball);
		} else {
			console.log("gram not defined!  this should not be happening.");
		}
	}

	if (bgSaturation > 0) {
		bgSaturation -= 0.1;
		bgSaturation = Math.max(0, bgSaturation);
	}
	gameContext.fillStyle = rgbToHex(hsvToRgb(1, bgSaturation, 0.9));
	gameContext.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

	var toRemove = [];
	for ( var i in balls) {
		var ball = balls[i];
		if (ball.isComplete) {
			ball.radius *= 1.1;
			ball.fontSize++;
			ball.opacity -= 0.05;
			//			ball.fontSize = Math.max(1, ball.fontSize);
			if (ball.opacity <= 0) {
				toRemove.push(ball);
			}
		} else {
			ball.vel.y += config.levels[level].gravity;
			ball.y += ball.vel.y;
			ball.x += ball.vel.x;
			if (ball.x < 0) {
				ball.x *= -1;
				ball.vel.x *= -1;
			} else if (ball.x >= 1) {
				ball.x = 2 - ball.x;
				ball.vel.x *= -1;
			}
			if (ball.y > 1) {
				toRemove.push(ball);
				addScore(-40);
				sounds.ballAtBottom.play();
			}
		}
		var radius = Math.max(0, ball.radius + (Math.sin(t / ball.radiusFreq) * ball.radiusAmplitude));

		var x = ball.x * gameCanvas.width;
		var y = ball.y * gameCanvas.height + radius;
		var grd = gameContext.createRadialGradient(x, y - radius, radius, x, y - radius, 0);
		var rgb = hsvToRgb(ball.hue, 0.4, 0.8);
		var color = rgbToRgba(rgb, ball.opacity);
		grd.addColorStop(0, color);
		grd.addColorStop(1, "white");

		gameContext.fillStyle = grd;
		gameContext.beginPath();
		gameContext.arc(x, y - radius, radius, 0, 2 * Math.PI);
		gameContext.fill();

		gameContext.font = "bold " + ball.fontSize + "px Arial";
		gameContext.textBaseline = "middle";
		var typedLetters = ball.gram.substring(0, ball.typedLettersIndex + 1);
		var untypedLetters = ball.gram.substring(ball.typedLettersIndex + 1);
		//		if (typedLetters.length) {
		//			console.log(ball.gram + " " + typedLetters + " + " + untypedLetters);
		//		}
		var typedLettersWidth = gameContext.measureText(typedLetters).width;
		var untypedLettersWidth = gameContext.measureText(untypedLetters).width;
		var halfWidth = (typedLettersWidth + untypedLettersWidth) / 2;
		gameContext.fillStyle = "#ee0000";
		gameContext.fillText(typedLetters, x - halfWidth, y - radius);
		gameContext.fillStyle = "#000000";
		gameContext.fillText(untypedLetters, x - halfWidth + typedLettersWidth, y - radius);
	}

	removeBalls(toRemove);
}

function removeBalls(toRemove) {
	for ( var j in toRemove) {
		for ( var i in balls) {
			var ball = balls[i];
			if (ball.id == toRemove[j].id) {
				balls.splice(i, 1);
				break;
			}
		}
	}
}

function togglePause() {
	isPaused = !isPaused;
}

function onClick(e) {
	// e.detail == 1 means that the mouse was really clicked, not space bar
	if (e.detail) {
		if (e.target.id == "pause-button") {
			hide("config");
			hide("stats");
			togglePause();
		} else if (e.target.id == "start-button") {
			hide("config");
			hide("stats");
			start();
		} else if (e.target.id == "stats-button") {
			isPaused = true;
			hide("config");
			showStats();
			show("stats");
		} else if (e.target.id == "reset-stats") {
			stats[level] = {
				goodKeyCounts : {},
				badKeyCounts : {},
			};
			localStorage.setItem("stats", JSON.stringify(stats));
			showStats();
		} else if (e.target.id == "close-stats") {
			hide("stats");
		} else if (e.target.id == "edit-config") {
			isPaused = true;
			hide("stats");
			show("config");

			var configText = document.getElementById("config-text");
			configText.focus();
			configText.value = JSON.stringify(config, null, "\t") + "\n";

			if (configText.createTextRange) {
				var range = elem.createTextRange();
				range.move("character", 0);
				range.select();
			} else if (configText.selectionStart) {
				configText.setSelectionRange(0, 0);
			}

		} else if (e.target.id == "save-config") {
			var configStr = document.getElementById("config-text").value;
			try {
				config = JSON.parse(configStr);
			} catch (err) {
				alert("Failed to parse configuration!  Check again.");
				return;
			}
			hide("config");
			localStorage.setItem("config", configStr);
			setup();
			selectLevel(level);
		} else if (e.target.id == "cancel-config") {
			hide("config");
		} else if (e.target.id == "reset-config") {
			document.getElementById("config-text").value = JSON.stringify(getDefaultConfig(), null, "\t") + "\n";
		} else if (e.target.id == "keyboard-qwertz") {
			hide("stats");
			hide("config");
			setKeyboard("qwertz");
			start();
		} else if (e.target.id == "keyboard-azerty") {
			hide("stats");
			hide("config");
			setKeyboard("azerty");
			start();
		}
	}
	//	console.log(JSON.stringify(e.target.id));
}

function showStats() {
	var html = "";
	var badKeys = [];
	var totalBadKeys = 0;
	if (stats[level] && stats[level].badKeyCounts) {
		for ( var key in stats[level].badKeyCounts) {
			var count = stats[level].badKeyCounts[key];
			totalBadKeys += count;
			badKeys.push({
				key : key,
				count : count
			});
		}
	}
	badKeys.sort(function(key1, key2) {
		return key1.count < key2.count;
	});

	var totalKeys = totalBadKeys;
	if (stats[level] && stats[level].goodKeyCounts) {
		for ( var key in stats[level].goodKeyCounts) {
			totalKeys += stats[level].goodKeyCounts[key];
		}
	}

	var badKeyRatio = totalKeys ? totalBadKeys / totalKeys : 0;
	html += "<h1>Stats for Level: " + config.levels[level].name + "</h1>\n";
	html += "<table>\n";

	html += "<tr>\n";
	html += "	<td class=\"stat-label\">Games played</td>\n";
	html += "	<td class=\"stat-item\">" + ((stats[level] && stats[level].gamesPlayed) || 0) + "</td>\n";
	html += "</tr>\n";

	var hiScore = "-";
	if (stats[level] && stats[level].hiScore) {
		hiScore = Math.round(stats[level].hiScore);
	}
	html += "<tr>\n";
	html += "	<td class=\"stat-label\">Hi score</td>\n";
	html += "	<td class=\"stat-item\">" + hiScore + "</td>\n";
	html += "</tr>\n";

	html += "<tr>\n";
	html += "	<td class=\"stat-label\">Missed key ratio</td>\n";
	html += "	<td class=\"stat-item\">" + (100 * badKeyRatio).toFixed(2) + "%</td>\n";
	html += "</tr>\n";

	html += "<tr>\n";
	html += "	<td class=\"stat-label\">Most missed keys</td>\n";
	html += "	<td class=\"stat-item\">\n";
	for (var i = 0; i < Math.min(badKeys.length, 5); i++) {
		html += badKeys[i].key.toUpperCase() + " ";
	}
	html += "	</td>\n";
	html += "</tr>\n";

	html += "</table>\n";
	document.getElementById("stats-content").innerHTML = html;
}

function hide(id) {
	document.getElementById(id).style.display = "none";
	document.getElementById("dim-overlay").style.display = "none";
}

function show(id) {
	document.getElementById(id).style.display = "block";
	document.getElementById("dim-overlay").style.display = "block";
}

function onKeyUp(e) {
	if (e.keyCode == 27) {
		hide("stats");
		hide("config");
	}
}

function onKeyPress(e) {
	var key = e.key.toLowerCase();
	if (key == " ") {
		if (isGameOver) {
			start();
		} else {
			togglePause();
		}
		return;
	}
	if (isPaused) {
		return;
	}
	typedKeys.push(key);

	var completedBalls = [];
	var isFound = false;
	for ( var i in balls) {
		var ball = balls[i];
		if (!ball.isComplete) {
			if (ball.gram.charAt(ball.typedLettersIndex + 1) == key) {
				ball.typedLettersIndex++;
				isFound = true;
				if (ball.typedLettersIndex + 1 == ball.gram.length) {
					ball.isComplete = true;
					completedBalls.push(ball);
					for ( var j in balls) {
						var ball2 = balls[j];
						if (ball2.id != ball.id) {
							ball2.typedLettersIndex = -1;
						}
					}
				}
				//			console.log(ball.gram + " " + ball.typedLettersIndex);
			}
		}
	}

	if (!stats[level]) {
		stats[level] = {
			goodKeyCounts : {},
			badKeyCounts : {}
		};
	}
	if (!stats[level].goodKeyCounts) {
		stats[level].goodKeyCounts = {};
	}
	if (!stats[level].badKeyCounts) {
		stats[level].badKeyCounts = {};
	}

	if (isFound) {
		sounds.keyPress.play();

		if (!stats[level].goodKeyCounts[key]) {
			stats[level].goodKeyCounts[key] = 0;
		}
		stats[level].goodKeyCounts[key]++;
	} else {
		bgSaturation = 0.9;
		addScore(-10);

		if (!stats[level].badKeyCounts[key]) {
			stats[level].badKeyCounts[key] = 0;
		}
		stats[level].badKeyCounts[key]++;
		sounds.badKey.play();
	}

	if (completedBalls.length > 0) {
		for ( var i in completedBalls) {
			var ball = completedBalls[i];
			addScore(40 * (1 - ball.y) * ball.gram.length);
		}
		//		removeBalls(completedBalls);
		stopSounds();
		sounds.ballComplete.play();
	}
}

function stopSounds() {
	for ( var sound in sounds) {
		sounds[sound].pause();
		sounds[sound].currentTime = 0;
	}
}

function setMessage(message) {
	gameContext.font = "bold 80px Arial";
	gameContext.textBaseline = "middle";
	gameContext.fillStyle = "#ee0000";
	var textWidth = gameContext.measureText(message).width;
	var y = gameCanvas.height / 2;
	gameContext.fillText(message, (gameCanvas.width - textWidth) / 2, y);
}

function selectLevel(l) {
	document.getElementById("level-" + level).className = "";
	level = l;
	document.getElementById("level-" + level).className = "selected";
	localStorage.setItem("level", level);

	hide("config");
	hide("stats");
	start();
}

function setKeyboard(k) {
	document.getElementById("keyboard-" + keyboard).className = "";
	keyboard = k;
	document.getElementById("keyboard-" + keyboard).className = "selected";
	localStorage.setItem("keyboard", keyboard);
	hide("config");
	hide("stats");
}

function getDefaultConfig() {
	return {
		maxTime : 40, // secs	
		newBallProbability : 0.025,
		levels : [
			{
				name : "Beginner",
				gravity : 0.00001,
				grams : {
					qwertz : [ "a", "s", "d", "f", "j", "k", "l", "g", "h" ],
					azerty : [ "q", "s", "d", "f", "g", "h", "j", "k", "l", "m" ],
				}
			},
			{
				name : "Level 2",
				gravity : 0.000012,
				grams : {
					qwertz : [ "aq", "sw", "de", "fr", "ju", "ki", "lo", "p", "ft", "jh", "fg" ],
					azerty : [ "qa", "sz", "de", "fr", "ju", "ki", "lo", "mp", "ft", "jh", "fg" ],
				}
			},
			{
				name : "Level 3",
				gravity : 0.000012,
				grams : {
					qwertz : [ "ay", "sx", "dc", "fv", "gv", "jn", "jm", "k,", "l.", "jh", "fg" ],
					azerty : [ "qw", "sx", "dc", "fv", "gv", "jn", "jm", "k,", "l;", "jh", "fg" ],
				}
			},
			{
				name : "Intermediate",
				gravity : 0.000015,
				grams : {
					qwertz : [ "papa", "haha", "lolo", "mama", "rar", "dada", "fifi", "fofo", "nana", "popo", "tata", "toto", "fyfy", "gogo", "gaga" ],
					azerty : [ "sasa", "haha", "lolo", "mama", "kaka", "dada", "fifi", "fofo", "dede", "popo", "tata", "toto", "fyfy", "gogo", "gaga" ],
				}
			},
			{
				name : "Advanced",
				gravity : 0.00002,
				grams : {
					qwertz : [ "jun", "jul", "may", "jan", "ver", "sew", "wet", "pol", "nop", "fre", "nuh", "vop", "dee", "boo", "oop", "bin", "hex",
						"dec", "ibm", "ocr", "fra", "usa", "the", "une", "dog", "cat", "big", "pig", "sun", "eat", "dot", "dig", "pup", "hen", "vat",
						"ici", "moi", "ton", "nos", "him", "his", "her", "she", "out", "our" ],
					azerty : [ "jun", "jul", "may", "jan", "ver", "sew", "wet", "pol", "nop", "fre", "nuh", "vop", "dee", "boo", "oop", "bin", "hex",
						"dec", "ibm", "ocr", "fra", "usa", "the", "une", "dog", "cat", "big", "pig", "sun", "eat", "dot", "dig", "pup", "hen", "vat",
						"ici", "moi", "ton", "nos", "him", "his", "her", "she", "out", "our" ],
				}
			},
			{
				name : "Hardcore",
				gravity : 0.000025,
				grams : {
					qwertz : [ "the", "quick", "brown", "fox", "jumped", "over", "lazy", "kangaroo", "dog", "monkey", "duck", "jump", "troll",
						"giant", "zulu", "boat", "ship", "work", "play", "rain", "cloud", "west", "north", "south", "east", "atom", "quark", "mouse",
						"bunny" ],
					azerty : [ "the", "quick", "brown", "fox", "jumped", "over", "lazy", "kangaroo", "dog", "monkey", "duck", "jump", "troll",
						"giant", "zulu", "boat", "ship", "work", "play", "rain", "cloud", "west", "north", "south", "east", "atom", "quark", "mouse",
						"bunny" ],
				}
			},
			{
				name : "Ludicrous",
				gravity : 0.00006,
				grams : {
					qwertz : [ "this", "here", "omg", "wtf", "madness", "wow", "r5zq", "please", "stop", "321go", "words", "fast", "very", "8px32",
						"dd6gv", "bq992" ],
					azerty : [ "this", "here", "omg", "wtf", "madness", "wow", "r5zq", "please", "stop", "321go", "words", "fast", "very", "8px32",
						"dd6gv", "bq992" ],
				}
			}, ]
	};
}

function addScore(n) {
	score += n;
	score = Math.max(0, score);
	document.getElementById("score").innerHTML = Math.round(score);
}

function hsvToRgb(h, s, v) {
	var r, g, b;
	var i = Math.floor(h * 6);
	var f = h * 6 - i;
	var p = v * (1 - s);
	var q = v * (1 - f * s);
	var t = v * (1 - (1 - f) * s);
	switch (i % 6) {
	case 0:
		r = v, g = t, b = p;
		break;
	case 1:
		r = q, g = v, b = p;
		break;
	case 2:
		r = p, g = v, b = t;
		break;
	case 3:
		r = p, g = q, b = v;
		break;
	case 4:
		r = t, g = p, b = v;
		break;
	case 5:
		r = v, g = p, b = q;
		break;
	}
	var rgb = {
		r : Math.round(r * 255),
		g : Math.round(g * 255),
		b : Math.round(b * 255)
	};
	return rgb;
}

function rgbToHex(rgb) {
	var componentToHex = function(c) {
		var hex = c.toString(16);
		if (hex.length == 1) {
			hex = "0" + hex;
		}
		return hex;
	}

	return "#" + componentToHex(rgb.r) + componentToHex(rgb.g) + componentToHex(rgb.b);
}

function rgbToRgba(rgb, a) {
	return "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + a + ")";
}
