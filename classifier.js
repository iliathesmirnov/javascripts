function NN_FPass(layers, NNNodes, NNValues, NNWeights, inputImage, subImage, probCanvas) {
    subSample(inputImage, subImage);
    drawImage('handdrawn-sub', 128, 128, subImage, [], false);
    NNValues[0] = subImage;
    for (r = 1; r < layers; r++) {
        for (n = 0; n < NNNodes[r]; n++) {
            NNValues[r][n] = 0.0;
            for (m = 0; m < NNNodes[r-1]; m++) {
                NNValues[r][n] += NNValues[r-1][m] * NNWeights[r-1][m + n*NNNodes[r-1]];
            }
            NNValues[r][n] = Math.max(NNValues[r][n], 0);    // ReLU nonlinearity
        }
    }
    let max = -100000, max_class;
    for (n = 0; n < 16; n++) {
        if (NNValues[layers-1][n] > max) {
            max = NNValues[layers-1][n];
            max_class = n;
        }
    }
    let sum = 0.0;
    for (n = 0; n < 16; n++) {
        NNValues[layers-1][n] -= max;
        NNValues[layers-1][n] = Math.exp(NNValues[layers-1][n]);
        sum += NNValues[layers-1][n];
    }
    for (n = 0; n < 16; n++) {
        NNValues[layers-1][n] /= sum;
    }
    displayProb(NNValues[layers-1], max_class, imageNames, probCanvas);
}

function drawCircleAt (inputImage, x, y, r, context) {
    for (i = -r; i <= r; i++) {
        for (j = -r; j <= r; j++) {
            if (i*i + j*j <= r*r) {
                inputImage[(x+i) + 384*(y+j)] = 1;
                context.fillRect(x+i,y+j,1,1);
            }
        }
    }
}

function traceCircles (inputImage, x0, y0, x1, y1, r, context) {
    let numSteps = (x0-x1)*(x0-x1) + (y0-y1)*(y0-y1);
    numSteps = Math.floor(Math.sqrt(numSteps));
    let i;
    let xm, ym;
    for (i = 0; i < numSteps; i++) {
        xm = ((numSteps-i)/numSteps)*x0 + (i/numSteps)*x1;
        ym = ((numSteps-i)/numSteps)*y0 + (i/numSteps)*y1;
        xm = Math.round(xm); ym = Math.round(ym);
        drawCircleAt(inputImage, xm, ym, r, context);
    }
}

function drawSquareAt (inputImage, x, y, r, context) {
    for (i = -r; i <= r; i++) {
        for (j = -r; j <= r; j++) {
            inputImage[(x+i) + 384*(y+j)] = 1;
            context.fillRect(x+i,y+j,1,1);
        }
    }
}

function fill(inputImage, x, y, context) {
    let coordQueue = new Array();
    let pt;
    let i, j, xn, yn;

    coordQueue.push({x: x, y: y});

    while (coordQueue.length > 0) {
        pt = coordQueue.pop();
        for (i = -1; i <= 1; i++) {
            for (j = -1; j <= 1; j++) {
                xn = pt.x + i; yn = pt.y + j;
                if ( (xn >= 0) && (xn < 384) && (yn >= 0) && (yn < 384) ) {
                    if (inputImage[xn + yn*384] == 0) {
                        inputImage[xn + yn*384] = 1;
                        context.fillRect(xn, yn, 1, 1);
                        coordQueue.push({x: xn, y: yn});
                    }
                }
            }
        }
    }
}

function clearImage(inputImage, width, height) {
    for (x = 0; x < width; x++) {
        for (y = 0; y < height; y++) {
            inputImage[x + width*y] = 0;
        }
    }
}

function subSample (input, output) {
    let max, inputIndex;
    let x, y, i, j;
    for (x = 0; x < 128; x++) {
        for (y = 0; y < 128; y++) {
            max = -1;
            for (i = 0; i < 3; i++) {
                for (j = 0; j < 3; j++) {
                    inputIndex = (3*x+i) + 384*(3*y+j);
                    max = Math.max(max, input[inputIndex]);
                }
            }
            output[x+128*y] = max;
        }
    }
}

function displayProb (probArray, maxIndex, imageNames, canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '12px Times New Roman';

    ctx.fillStyle = 'rgba(220, 120, 240, 0.5)';
    for (i = 0; i < 16; i++) ctx.fillRect(0, i*16, 128*probArray[i], 14);
    ctx.fillStyle = 'rgba(220, 120, 240, 1)';
    ctx.fillRect(0, maxIndex*16, 128*probArray[maxIndex], 14);

    ctx.fillStyle = 'rgb(0, 0, 0)';
    for (i = 0; i < 16; i++) {
        ctx.fillText(imageNames[i], 5, i*16+11);
        ctx.fillText(probArray[i].toFixed(3), 128+10, i*16+11);
    }
}

function displayNN (response, imageNames, canvas) {
    let inputChar, inputString = '', curFloat;
    let probArray = [];
    let max = -100000, curIndex = 0, maxIndex;
    for (let i = 0; (inputChar = response[i]) != '!'; i++) {
        switch(inputChar) {
            default     :    inputString += inputChar;
                             break;
            case ','    :    curFloat = parseFloat(inputString);
                             probArray.push(curFloat);
                             if ( curFloat > max) {
                                 max = curFloat;
                                 maxIndex = curIndex;
                             }
                             curIndex++;
                             inputString = '';
                             break;
        }
    }
    displayProb (probArray, maxIndex, imageNames, canvas);
}

function displayKNNClass (response, imageNames, canvas) {
    let i = 0, inputChar, inputString = '';
    for (; (inputChar = response[i]) != ';'; i++) {
        inputString += inputChar;
    }
    let cl = parseInt(inputString);
    let bitmap = [];
    for (;  (inputChar = response[i]) != '!'; i++) {
        bitmap.push(parseInt(inputChar));
    }
    let probArray = new Array(16).fill(0);
    probArray[cl] = 1.0;
    displayProb(probArray, cl, imageNames, canvas);
    drawImage('nn-canvas', 128, 128, bitmap, [], false);
}

function displayClassification (classifierSelection, response, imageNames, canvas) {
    switch(classifierSelection) {
        case 'Feedforward net'    :    displayNN (response, imageNames, canvas);
                                       break;
        case 'Convolutional net'  :    displayNN (response, imageNames, canvas);
                                       break;
        case 'kNN'    :    displayKNNClass (response, imageNames, canvas);
                           break;
    }
}
