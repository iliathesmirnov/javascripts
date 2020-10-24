
// ******************************************************************************************
// *********************************** DATA IMPORTING ***************************************
// ******************************************************************************************


function importData(uri) {
// ==================== Import data ====================

var dataFile = new Array();
var dataPoints = new Array();
var importedText = "!";

var importer = new XMLHttpRequest();
importer.open('GET', uri, false);

importer.onreadystatechange = function () {
    if (importer.readyState === 4)
        if (importer.status === 200 || importer.status === 0)
            importedText = importer.responseText;
}

importer.send();

var i = 0;
var tempChar;
var tempString = '';
var dataPoint = {
    x : '',
    y : ''
};

    // '!' = EOF token
    // ' ' = Switch from x to y token
    // ',' = End of data pair token
    // ';' = End of data collection token
    // Example input: x1 y1,x2 y2,x3 y3,;x4 x5,;!
do {
    tempChar = importedText[i];

    switch (tempChar) {
        case ' '  :    dataPoint.x = tempString;
                       tempString = '';
                       break;

        case ','  :    dataPoint.y = tempString;
                       tempString = '';
                       dataPoints.push( {
                           x : parseFloat(dataPoint.x),
                           y : parseFloat(dataPoint.y)
                       });
                       break;

        case ';'  :    dataFile.push(dataPoints);
                       dataPoints = new Array();
                       break;

        default    :   tempString += tempChar;
                       break;
    }
    i++;
}
while ( tempChar != '!');
return dataFile;
} // end of importData()


// ******************************************************************************************
// *********************************** GRAPHING SCRIPT **************************************
// ******************************************************************************************

function makePlot(canvasId,
           dataCollection,
           usedPaths = [0],					// Which paths out of the data collection are used
           findBounds = true,					// Automatically find bounds?
           bounds = [],						// Used if bounds not automatically found
           colors = ['rgb(0,0,220)'],
           stdev = false,
           label = {x: '', y: ''},				// Axis labels
	   sci = {x: true, y: false},				// Use scientific notation for axis labels
	   decimalPts = {x: 2, y: 2},
           lineThickness = 1) {

// ==================== Plot ====================

// Set up canvas

const canvas = document.getElementById(canvasId);
const ctx = canvas.getContext('2d');

ctx.clearRect(0, 0, canvas.width, canvas.height);

const gridColor = 'rgb(180, 180, 180)';

const textHeight = Math.max(measureTextHeight(label.x), 10);
// Max takes care of empty labels

if (findBounds) {
    bounds = {
        xMin : Infinity,
        xMax : -Infinity,
        yMin : Infinity,
        yMax : -Infinity
    };

    var pointSet;
    usedPaths.forEach ( function(index) {
        if (stdev) pointSet = dataCollection[index][1];
        else pointSet = dataCollection[index];
        pointSet.forEach ( function(pt) {
      		bounds.xMin = Math.min(bounds.xMin, pt.x);
            	bounds.xMax = Math.max(bounds.xMax, pt.x);
            	bounds.yMin = Math.min(bounds.yMin, pt.y);
            	bounds.yMax = Math.max(bounds.yMax, pt.y);
        });
    });
}

const dataSpread = {
    x : bounds.xMax - bounds.xMin,
    y : bounds.yMax - bounds.yMin,
};
dataSpread.xOrderMagn = Math.floor (Math.log10 (dataSpread.x));
dataSpread.yOrderMagn = Math.floor (Math.log10 (dataSpread.y));
dataSpread.xOMUnit = Math.pow(10, dataSpread.xOrderMagn);
dataSpread.yOMUnit = Math.pow(10, dataSpread.yOrderMagn);

const orderMagnLabel = "e" + dataSpread.xOrderMagn;

var ticks = {
    xNumTicks : Math.floor(dataSpread.x * (1/dataSpread.xOMUnit)),
    yNumTicks : Math.floor(dataSpread.y * (1/dataSpread.yOMUnit)),
    xFirstTick : Math.floor(bounds.xMin * (1/dataSpread.xOMUnit)),
    yFirstTick : Math.floor(bounds.yMin * (1/dataSpread.yOMUnit)),
    xLabels : [],
    yLabels : [],
    xWidth : 0,
    yWidth : 0
};

var xLabelAccuracy;

function secondDigit(num, OM, base) {
    return ( Math.floor (num * (1/Math.pow(base,OM-1)) ) % base )
}
function thirdDigit(num, OM, base) {
    return ( Math.floor (num * (1/Math.pow(base, OM-2)) ) % base)
}

if (  secondDigit(bounds.xMax, dataSpread.xOrderMagn, 10) == 0
   && thirdDigit(bounds.xMax, dataSpread.xOrderMagn, 10) == 0
   && secondDigit(bounds.xMin, dataSpread.xOrderMagn, 10) == 0
   && thirdDigit(bounds.xMin, dataSpread.xOrderMagn, 10) == 0)
    xLabelAccuracy = 0;
else xLabelAccuracy = 2;

var xMaxLabel, xMinLabel;
if (sci.x) {
    xMaxLabel = (bounds.xMax * (1/dataSpread.xOMUnit)).toFixed(xLabelAccuracy);
    xMinLabel = (bounds.xMin * (1/dataSpread.xOMUnit)).toFixed(xLabelAccuracy);
}
else {
    xMaxLabel = bounds.xMax.toFixed(decimalPts.x);
    xMinLabel = bounds.xMin.toFixed(decimalPts.x);
}

var currLabel = '';
for (i = 1; i <= ticks.xNumTicks; i++) {
    if (sci.x) currLabel = (i+ticks.xFirstTick).toFixed(xLabelAccuracy);
    else currLabel = ((i+ticks.xFirstTick)*dataSpread.xOMUnit).toFixed(decimalPts.x);
    ticks.xLabels.push(currLabel);
    ticks.xWidth = Math.max(ticks.xWidth, ctx.measureText(currLabel).width);
}

for (i = 1; i <= ticks.yNumTicks; i++) {
    currLabel = ((i+ticks.yFirstTick)*dataSpread.yOMUnit).toFixed(decimalPts.y);
    ticks.yLabels.push(currLabel);
    ticks.yWidth = Math.max(ticks.yWidth, ctx.measureText(currLabel).width);
}


ticks.xWidth = Math.max(ticks.xWidth, ctx.measureText(xMaxLabel).width);
ticks.xWidth = Math.max(ticks.xWidth, ctx.measureText(xMinLabel).width);


const offset = {
    widthL : 3 * textHeight + ticks.yWidth,
    heightD : 4 * textHeight,
    widthR : 0.5 * ticks.xWidth,
    heightU : 0.5 * textHeight
};

const graphDim = {
    width : canvas.width - offset.widthL - offset.widthR,
    height : canvas.height - offset.heightD - offset.heightU
};

const unit = {
        x : graphDim.width / dataSpread.x,
        y : graphDim.height / dataSpread.y,
};

ticks.xFirstOffset = offset.widthL + (ticks.xFirstTick*dataSpread.xOMUnit - bounds.xMin) * unit.x;
ticks.yFirstOffset = offset.heightU + graphDim.height - ((ticks.yFirstTick*dataSpread.yOMUnit - bounds.yMin) * unit.y);
ticks.xUnit = dataSpread.xOMUnit * unit.x;
ticks.yUnit = dataSpread.yOMUnit * unit.y;



// Draw grid

var labelHeight, labelWidth;

ctx.strokeStyle = gridColor;
ctx.lineWidth = 1;
ctx.beginPath();

for (i = 1; i < ticks.xNumTicks; i++) {
    ctx.moveTo(ticks.xFirstOffset + i*ticks.xUnit, offset.heightU);
    ctx.lineTo(ticks.xFirstOffset + i*ticks.xUnit, offset.heightU + graphDim.height + textHeight);
}
for (i = 1; i < ticks.yNumTicks; i++) {
    ctx.moveTo(offset.widthL - textHeight, ticks.yFirstOffset - i*ticks.yUnit);
    ctx.lineTo(canvas.width - 0.5 * ticks.xWidth, ticks.yFirstOffset - i*ticks.yUnit);
}
ctx.stroke();

// Label the mins and maxes (avoid label overlaps)

class labelBounds {
    constructor(x, y, left, right, up, down) {
        this.x = x;
        this.y = y;
        this.left = left;
        this.right = right;
        this.up = up;
        this. down = down;
    }
}
class colBounds {
    constructor(x, y, left, right, up, down) {
        this.x = x;
        this.y = y;
        this.left = left;
        this.right = right;
        this.up = up;
        this. down = down;
    }
}


ctx.beginPath();

// xMin

var xMinlB = new labelBounds(offset.widthL,
             offset.heightU + graphDim.height + 2*textHeight,
        	    		 0, 0, 0, 0);

xMinlB.left = xMinlB.x - 0.5 * ctx.measureText(xMinLabel).width;
xMinlB.right = xMinlB.x + 0.5 * ctx.measureText(xMinLabel).width;


var xMincB = new colBounds(ticks.xFirstOffset + ticks.xUnit,
             xMinlB.y,
	            		 0, 0, 0, 0);

xMincB.left = xMincB.x - 0.5 * ctx.measureText(ticks.xLabels[0]).width;
xMincB.right = xMincB.x + 0.5 * ctx.measureText(ticks.xLabels[0]).width;


ctx.moveTo(xMinlB.x, offset.heightU + graphDim.height);
ctx.lineTo(xMinlB.x, offset.heightU + graphDim.height + textHeight);

if (xMincB.left > (xMinlB.right + textHeight)) {
    ctx.moveTo(xMincB.x, offset.heightU);
    ctx.lineTo(xMincB.x, offset.heightU + graphDim.height + textHeight);
}


// xMax

var xMaxlB = new labelBounds(offset.widthL + graphDim.width,
             offset.heightU + graphDim.height + 2*textHeight,
	            		 0, 0, 0, 0);

xMaxlB.left = xMaxlB.x - 0.5 * ctx.measureText(xMaxLabel).width;
xMaxlB.right = xMaxlB.x + 0.5 * ctx.measureText(xMaxLabel).width;

var xMaxcB = new colBounds(ticks.xFirstOffset + ticks.xNumTicks * ticks.xUnit,
             xMaxlB.y,
        	    		 0, 0, 0, 0);

xMaxcB.left = xMaxcB.x - 0.5 * ctx.measureText(ticks.xLabels[ticks.xNumTicks - 1]).width;
xMaxcB.right = xMaxcB.x + 0.5 * ctx.measureText(ticks.xLabels[ticks.xNumTicks - 1]).width;

ctx.moveTo(xMaxlB.x, offset.heightU);
ctx.lineTo(xMaxlB.x, offset.heightU + graphDim.height + textHeight);


if ((xMaxcB.right + textHeight) < xMaxlB.left) {
    ctx.moveTo( xMaxcB.x, offset.heightU);
    ctx.lineTo( xMaxcB.x, offset.heightU + graphDim.height + textHeight);
}


// yMin
var yMinlB = new labelBounds( offset.widthL - 1.5 * textHeight - ctx.measureText((bounds.yMin).toFixed(2)).width,
                  offset.heightU + graphDim.height + 0.5*measureTextHeight((bounds.yMin).toFixed(2)),
            	 		0, 0, 0, 0);
yMinlB.down = yMinlB.y + 0.5 * measureTextHeight((bounds.yMin).toFixed(2));
yMinlB.up = yMinlB.y   - 0.5 * measureTextHeight((bounds.yMin).toFixed(2));

var yMincB = new colBounds( yMinlB.x,
                ticks.yFirstOffset - ticks.yUnit + graphDim.height + 0.5 * measureTextHeight(ticks.yLabels[0]),
            		 	0, 0, 0, 0);

yMincB.down = yMincB.y + 0.5 * measureTextHeight(ticks.yLabels[0]);
yMincB.down = yMincB.y - 0.5 * measureTextHeight(ticks.yLabels[0]);

ctx.moveTo(offset.widthL - textHeight, yMinlB.up);
ctx.lineTo(offset.widthL, yMinlB.up);

if ((yMincB.down + textHeight) < yMinlB.up) {
//    ctx.moveTo(offset.widthL - textHeight, yMincB.up);
//    ctx.lineTo(canvas.width, yMincB.up);
}

// yMax
var yMaxlB = new labelBounds ( offset.widthL - 1.5 * textHeight - ctx.measureText((bounds.yMax).toFixed(2)).width,
                   offset.heightU + 0.5 * measureTextHeight((bounds.yMax).toFixed(2)),
	           		  0, 0, 0, 0);

yMaxlB.down = yMaxlB.y + 0.5 * measureTextHeight((bounds.yMax).toFixed(2));
yMaxlB.up = yMaxlB.y   - 0.5 * measureTextHeight((bounds.yMax).toFixed(2));


var yMaxcB = new colBounds ( yMaxlB.x,
                 ticks.yFirstOffset - ticks.yNumTicks * ticks.yUnit + 0.5 * measureTextHeight(ticks.yLabels[ticks.yNumTicks - 1]),
		                  0, 0, 0, 0);

yMaxcB.down = yMaxcB.y + 0.5 * measureTextHeight(ticks.yLabels[ticks.yNumTicks - 1]);
yMaxcB.up = yMaxcB.y   - 0.5 * measureTextHeight(ticks.yLabels[ticks.yNumTicks - 1]);


ctx.moveTo(offset.widthL - textHeight, yMaxlB.up);
ctx.lineTo(offset.widthL + graphDim.width, yMaxlB.up);

if ((yMaxcB.up - textHeight) > yMaxlB.down) {
    ctx.moveTo(offset.widthL - textHeight, yMaxcB.y);
    ctx.lineTo(offset.widthL + graphDim.width, yMaxcB.y);
}


ctx.stroke();


function measureTextHeight (string) {
    return (ctx.measureText(string).actualBoundingBoxAscent + ctx.measureText(string).actualBoundingBoxDescent);
}



// Draw the graph

function plotGraph(dataPoints, color) {
    ctx.lineWidth = lineThickness;
    ctx.strokeStyle = color;
    var pt;
    ctx.beginPath();
    for (var i = 0; i < dataPoints.length; i++) {
        pt = dataPoints[i];
        ctx.lineTo(offset.widthL + ((pt.x - bounds.xMin) * unit.x), offset.heightU + graphDim.height - ((pt.y - bounds.yMin) * unit.y));
    }
    ctx.stroke();
    ctx.lineWidth = 1;
}


if (!stdev) {
    usedPaths.forEach ( function(index) {
        plotGraph(dataCollection[index], colors[index % colors.length]);
    });

}
else {         //stdev

    var lowStDevBdry = [],  meanLine = [],  highStDevBdry = [];
    var colorPair = [], meanLineColor = '', stDevColor = '';
    var pt;

    usedPaths.forEach ( function(index) {

	lowStDevBdry = dataCollection[index][0];
	meanLine = dataCollection[index][1];
	highStDevBdry = dataCollection[index][2];

	colorPair = colors[index % colors.length];
	meanLineColor = colorPair[0];
	stDevColor = colorPair[1];

	ctx.strokeStyle = ctx.fillStyle = stDevColor;
	ctx.beginPath();
	for (var i = 0; i < lowStDevBdry.length; i++) {
		pt = lowStDevBdry[i];
		ctx.lineTo( offset.widthL + ((pt.x - bounds.xMin) * unit.x),
			    offset.heightU + graphDim.height - ((pt.y - bounds.yMin) * unit.y));
	}
	for (var i = highStDevBdry.length-1; i >= 0; i--) {
		pt = highStDevBdry[i];
		ctx.lineTo( offset.widthL + ((pt.x - bounds.xMin) * unit.x),
			    offset.heightU + graphDim.height - ((pt.y - bounds.yMin) * unit.y));
	}
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	plotGraph(meanLine, meanLineColor);

    });
}

// Draw the axes

ctx.strokeStyle = 'rgb(0,0,0)';
ctx.beginPath();
    ctx.moveTo(offset.widthL, offset.heightU);
    ctx.lineTo(offset.widthL, offset.heightU + graphDim.height);
    ctx.lineTo(offset.widthL + graphDim.width, offset.heightU + graphDim.height);
ctx.stroke();


// Draw axis labels

ctx.fillStyle = 'black';
    ctx.fillText(label.x,
		 offset.widthL + 0.5 * (graphDim.width - ctx.measureText(label.x).width),
		 canvas.height - textHeight);

ctx.rotate(-11/7);
    ctx.fillText(label.y,
		  -offset.heightU - 0.5 * (graphDim.height + ctx.measureText(label.y).width),
		 textHeight);
ctx.rotate(11/7);


ctx.beginPath();
for (i = 2; i < ticks.xNumTicks; i++) {
    ctx.fillText(ticks.xLabels[i-1],
		 ticks.xFirstOffset + i*ticks.xUnit - 0.5*ctx.measureText(ticks.xLabels[i-1]).width,
		 offset.heightU + graphDim.height + 2*textHeight);
}
for (i = 1; i < ticks.yNumTicks; i++) {
    labelHeight = measureTextHeight(ticks.yLabels[i-1]);
    labelWidth = ctx.measureText(ticks.yLabels[i-1]).width;
    ctx.fillText(ticks.yLabels[i-1],
		 offset.widthL - 1.5 * textHeight - labelWidth,
		 ticks.yFirstOffset - i*ticks.yUnit + 0.5*labelHeight);
}


// Label the mins and maxes (avoid label overlaps)

    // xMin
        ctx.fillText(xMinLabel, xMinlB.left, xMinlB.y);

        if (xMincB.left > (xMinlB.right + textHeight))
            ctx.fillText(ticks.xLabels[0], xMincB.left, xMincB.y);

    // xMax
        ctx.fillText(xMaxLabel, xMaxlB.left, xMaxlB.y);
        if (sci.x) ctx.fillText(orderMagnLabel, xMaxlB.right - ctx.measureText(orderMagnLabel).width, xMaxlB.y + textHeight);

        if ((xMaxcB.right + textHeight) < xMaxlB.left)
            ctx.fillText(ticks.xLabels[ticks.xNumTicks - 1], xMaxcB.left, xMaxcB.y);

    // yMin
        ctx.fillText((bounds.yMin).toFixed(2), yMinlB.x, yMinlB.y);

        if ((yMincB.down + textHeight) < yMinlB.up)
            ctx.fillText(ticks.yLabels[0], yMincB.x, yMincB.y);

    // yMax
        ctx.fillText((bounds.yMax).toFixed(2), yMaxlB.x, yMaxlB.y);

        if ((yMaxcB.up - textHeight) > yMaxlB.down)
            ctx.fillText(ticks.yLabels[ticks.yNumTicks - 1], yMaxcB.x, yMaxcB.y);

ctx.stroke();


function measureTextHeight (string) {
    return (ctx.measureText(string).actualBoundingBoxAscent + ctx.measureText(string).actualBoundingBoxDescent);
}



} // end of makePlot()

