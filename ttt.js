const ROWS = 3,
      COLS = 3;

const tableBorderLeft = 2,
      tableBorderRight = 2;

const canvas = document.getElementById('ttt-board');
const xButton = document.getElementById('X');
const oButton = document.getElementById('O');
const stratSelector = document.getElementById('strategy');

var STRATEGY = parseInt(stratSelector.value);
	// 0 - random
	// 1 - minimax

function offset(elem) {
	if (!elem) elem = this;

	var x = elem.offsetLeft;
	var y = elem.offsetTop;

	while (elem = elem.offsetParent) {
		x += elem.offsetLeft;
		y += elem.offsetTop;
	}
	return { left: x, top: y};
}

const canvasLeft = offset(canvas).left + tableBorderLeft;
const canvasTop = offset(canvas).top + tableBorderRight;
const ctx = canvas.getContext('2d');

var cells = [];
var board = [0,0,0,0,0,0,0,0,0];
var pl = 1;  		// X = 1;  O = -1;  X goes first
var gameOver = false;
var freeCells = ROWS*COLS;

canvas.addEventListener('click', function(event) {
	if (gameOver)
		newGame();
	else {
		var x = event.pageX - canvasLeft,		// Location of mouse-click
		    y = event.pageY - canvasTop;		// relative to the canvas

		cells.forEach( function(cell) {
		if ( (cell.pl == 0) &&
		       (x - cell.x >= 0) && (x - cell.x <= cellSide) &&
		       (y - cell.y >= 0) && (y - cell.y <= cellSide) ) {
		        cell.pl = pl;
			if ( !checkWin() ) {
				colorCell(cell, 1);
				board[cell.tag] = pl;
				freeCells--;
				pl *= -1;
				if (freeCells == 0)		// Tie
					highlightWinner([]);    // Lowlight all cells
				else
					makeComputerMove(STRATEGY);
				}
			}
		});
	}
}, false);


/* ==================== Initialize the game cells ==================== */

const cellSide = Math.min(canvas.width, canvas.height) / 5.2,  	// 3 Buttons, 2 offsets on the sides
      cellGap  = 0.1 * cellSide,
      cellVOffset = Math.max((canvas.height / 2) - 1.5 * cellSide - cellGap, cellSide),
      cellHOffset = Math.max((canvas.width / 2) - 1.5 * cellSide - cellGap, cellSide);

for (var i = 0; i < ROWS*COLS; i++) {
	var row = Math.floor(i / COLS),
	    col = i % COLS;

	cells.push({
		x : col * (cellSide + cellGap) + cellHOffset,
		y : row * (cellSide + cellGap) + cellVOffset,
	       pl : 0,		// 1 if X;  -1 if O
	      tag : i
	});
}


/* ==================== Draw background gradient ==================== */
var gradient = ctx.createLinearGradient(0, 0, 0,canvas.height);

const gradientBottom = 'rgba(52, 48, 202, 1)',
      gradientTop = 'rgba(140, 110, 140, 1)';

gradient.addColorStop(0, gradientTop);
gradient.addColorStop(1, gradientBottom);

refreshBG();

/* ==================== Draw the game cells ==================== */
const cellNoLow = 'rgba(0, 62, 52, 0.6)',
      cellNoNeutral = 'rgba(0, 62, 52, 0.8)',
      cellNoHigh = 'rgba(0, 62, 52, 1.0)',
      cellNoColor = [cellNoLow, cellNoNeutral, cellNoHigh],

      cellXLow = 'rgba(180, 180, 0, 0.6)',
      cellXNeutral = 'rgba(180, 180, 0, 1.0)',
      cellXHigh = 'rgba(200, 200, 0, 1.0)',
      cellXColor = [cellXLow, cellXNeutral, cellXHigh],

      cellOLow = 'rgba(48, 182, 180, 0.6)',
      cellONeutral = 'rgba(48, 182, 180, 1.0)',
      cellOHigh = 'rgba(48, 202, 200, 1.0)',
      cellOColor = [cellOLow, cellONeutral, cellOHigh];

const PI = 22/7,
      shapeThickness = 8,
      circleRadius = 0.35 * cellSide;

cells.forEach(function(cell) {
	colorCell(cell, 1);
});

function colorCell(cell, lnh) {
	switch (cell.pl) {
		case 1  : ctx.fillStyle = cellXColor[lnh];
			  break;
		case -1 : ctx.fillStyle = cellOColor[lnh];
			  break;
		default : ctx.fillStyle = cellNoColor[lnh];
			  break;
	}
	ctx.fillRect(cell.x, cell.y, cellSide, cellSide);

	ctx.lineWidth = shapeThickness;
	ctx.lineCap = 'round';
	ctx.strokeStyle = gradient;

	ctx.moveTo(cell.x + 0.5*cellSide, cell.y + 0.5*cellSide);

	ctx.beginPath();
	switch (cell.pl) {
		case 1  : ctx.moveTo(cell.x + 0.2*cellSide, cell.y + 0.2*cellSide);
	       		  ctx.lineTo(cell.x + 0.8*cellSide, cell.y + 0.8*cellSide);
			  ctx.moveTo(cell.x + 0.2*cellSide, cell.y + 0.8*cellSide);
			  ctx.lineTo(cell.x + 0.8*cellSide, cell.y + 0.2*cellSide);
			  break;
		case -1 : ctx.arc(cell.x + 0.5*cellSide, cell.y + 0.5*cellSide, circleRadius, 0, 2*PI);
			  break;
	}
	ctx.stroke();
}

/* ==================== Various helper functions ==================== */
function newGame() {
	gameOver = false;
	freeCells = ROWS*COLS;
	pl = 1;
	board = [0,0,0,0,0,0,0,0,0];

	refreshBG();

	cells.forEach( function(cell) {
		cell.pl = 0;
		colorCell(cell, 1);
	});

	if (oButton.checked) makeComputerMove(0);	// Always make first computer move randomly
}

function radioButtonChecked(){
	if (!gameOver) {
		makeComputerMove(STRATEGY);
	}
}

function checkWin() {
	var row, col,
	    winningCells,
	    checkWin,
	    cell;

	for (row = 0; row < ROWS; row++) {
		winningCells = [];
		checkWin = true;
		for (col = 0; col < COLS; col++) {
			cell = cells[COLS*row + col];
			checkWin = (checkWin && (cell.pl == pl));
			winningCells.push(cell);
		}
		if (checkWin) {
			highlightWinner(winningCells);
			return true;
		}
	}

	for (col = 0; col < COLS; col++) {
		winningCells = [];
		checkWin = true;
		for (row = 0; row < ROWS; row++) {
			cell = cells[COLS*row + col];
			checkWin = (checkWin && (cell.pl == pl));
			winningCells.push(cell);
		}
		if (checkWin) {
			highlightWinner(winningCells);
			return true;
		}
	}

	winningCells = [];
	checkWin = true;
	for (row = 0; row < ROWS; row++) {
		cell = cells[COLS*row + row];
		checkWin = (checkWin && (cell.pl == pl));
		winningCells.push(cell);
	}
	if (checkWin) {
		highlightWinner(winningCells);
		return true;
	}

	winningCells = [];
	checkWin = true;
	for (row = ROWS-1; row >= 0; row--) {
		cell = cells[COLS*row + (ROWS-1-row)];
		checkWin = (checkWin && (cell.pl == pl));
		winningCells.push(cell);
	}
	if (checkWin) {
		highlightWinner(winningCells);
		return true;
	}
	return false;
}

function highlightWinner(winningCells) {
	gameOver = true;
	refreshBG();

	cells.forEach( function(cell) {
		colorCell(cell, 0)
	} );
	winningCells.forEach( function(cell) {
		colorCell(cell, 2);
	} );
}

function sim() {
	if (pl == 1)
		makeComputerMove(2);
	else if (pl == -1)
		makeComputerMove(1);
}

function makeComputerMove(strategy) {
	// 1 - minimax
	// 2 - tabular Q-learned
	// 3 - heuribot
	// 4 - DQN
	// other - random

	var move,
	    cell,
	    index = boardIndex(board);

	switch (strategy) {
		case 1   :   move = stratMinimax[index];
			     break;
		case 2   :   move = stratQtab[index];
			     break;
		case 3 	 :   move = stratHeuribot[index];
			     break;
		case 4   :   move = stratDQN[index];
			     break;
		default  :   move = Math.floor(Math.random() * (ROWS*COLS));
			     cell = cells[move];
			     while(cell.pl != 0) {
		     		move = (move + 1) % (ROWS*COLS);
				cell = cells[move];
			     }
			     break;
	}

	cell = cells[move];
	cell.pl = pl;
	board[cell.tag] = pl;
	if ( !checkWin() ) {
		colorCell(cell, 1);
		freeCells--;
		pl *= -1;
		if (freeCells == 0)		// Tie
			highlightWinner([]);
	}
}


function boardIndex(board) {
	var index = 0;
	var i, t;
	for (i = 0; i < ROWS*COLS; i++) {
		switch(board[i]) {
			case 1   :   t = 1;
				     break;
			case -1  :   t = 2;
				     break;
			default  :   t = 0;
				     break;
		}
		index += t*Math.pow(3, i);
	}
	return index;
}


function refreshBG() {
	ctx.fillStyle = gradient;
	ctx.fillRect(0,0, canvas.width,canvas.height);
}

function refreshStrat() {
	STRATEGY = parseInt(stratSelector.value);
}


/* ==================== Import strategy files =============== */

const uriRoot = "http://smirnovi.com/ttt/strat/";
const uriMinimax = encodeURI(uriRoot + "minimax.txt");
const uriQtab = encodeURI(uriRoot + "Qtab.txt");
const uriHeuribot = encodeURI(uriRoot + "heuribot.txt");
const uriDQN = encodeURI(uriRoot + "DQN.txt");

const stratMinimax = importStrat(uriMinimax);
const stratQtab = importStrat(uriQtab);
const stratHeuribot = importStrat(uriHeuribot);
const stratDQN = importStrat(uriDQN);

function importStrat(uri) {
	var importedText = "",
	    importer = new XMLHttpRequest();

	var strat = [];

	importer.open("GET", uri, false);

	importer.onreadystatechange = function() {
		if (importer.readyState === 4) {
			if (importer.status === 200 || importer.status === 0) {
				importedText = importer.responseText;
			}
		}
	}

	importer.send();

	var i = 0;
	var tempString = "";

		// '.' = EOF token;  ' ' = Next board token
	while ( importedText[i] != '.') {
		tempString = "";
		while ( importedText[i] != ' ' ) {
			tempString += importedText[i];
			i++;
		}
		strat.push( parseInt(tempString) );
		i++;
	}
	return strat;
}
