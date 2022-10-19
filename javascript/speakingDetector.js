const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const sampleIntervalDuration = 250;
const frequencyIntervalDuration = 1000;
const threshold = 0.003;
let wasTalking = false;
let isTalking = false;
let currentInterval = 0;
let currentIntervalData = new Array();
let dataPoints = new Array(20);
for(let i = 0; i < 20; ++i){
    dataPoints[i] = [{}, false];
}
let speakingFrequency = {
    maxNumberOfPoints: 10,
    points: dataPoints,//[point data, point is greater than thershold]
    pointsGreaterThanThreshold: 0, 
    frontOfQueue: 0
}
const faceMesh = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  }});
  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    selfieMode: true
  });
  faceMesh.onResults(onResults);
  
  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await faceMesh.send({image: videoElement});
    },
    width: 1280,
    height: 720
  });
  camera.start();

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.drawImage(
        results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {

            currentIntervalData.push(XYZPointDistances(landmarks[13], landmarks[14]));

            drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {color: '#E0E0E0'});
            drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW, {color: '#E0E0E0'});
            drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_IRIS, {color: '#E0E0E0'});
            drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, {color: '#E0E0E0'});
            drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW, {color: '#E0E0E0'});
            drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_IRIS, {color: '#E0E0E0'});
            drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {color: '#C0C0C070', lineWidth: 1});
            drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, {color: '#E0E0E0'});
            drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, {color: (isTalking || wasTalking ? '#00FF00': '#E0E0E0')});
        }
    }
    //checking if the user is still talking
    if(new Date().getTime() > currentInterval){
        if(userIsTalking()){
            wasTalking = isTalking;
            isTalking = true;
        }else{
            wasTalking = isTalking
            isTalking = false;
        }
        currentInterval = new Date().getTime()+ sampleIntervalDuration;
    }
    //outputing to the canvas whether the client is talking or not
    canvasCtx.rect(10,10, canvasElement.width * .30, 100);
    if(isTalking || wasTalking){
        canvasCtx.fillStyle = "rgba(0, 255,255, 0.7)";//0.7
        canvasCtx.fill();
        canvasCtx.fillStyle = "#000000";
        canvasCtx.font = "40px Verdana";
        canvasCtx.fillText("Talking", 15, 70);
    }else{
        canvasCtx.fillStyle = "rgba(0, 255,255, 0.5)";//0.5
        canvasCtx.fill();
        canvasCtx.fillStyle = "#000000";
        canvasCtx.font = "40px Verdana";
        canvasCtx.fillText("Not Detected", 15, 70);
    }

    canvasCtx.restore();
}
function distanceBetweenTwoPoints(p1,p2){
    return Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 , (p1.z - p2.z)**2 )
} 
function userIsTalking(){
    let result = false;
    let newMean          = meanCalculator(currentIntervalData);
    let MAD   = meanAbsoluteDeviation(currentIntervalData, newMean);
    for(let i = 0; i < 3; ++i){
        
        if(MAD[i] >=  threshold){
            result = true;
        }
    }
    currentIntervalData = [];
    return result;
}
function meanCalculator(arr){
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    arr.forEach(i =>{
        sumX += i.x;
        sumY += i.y;
        sumZ += i.z;
    });
    return [ sumX / arr.length, sumY / arr.length, sumZ / arr.length];
}
function meanAbsoluteDeviation(arr, mean){
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    arr.forEach(i =>{
        sumX += Math.abs(i.x - mean[0]);
        sumY += Math.abs(i.y - mean[1]);
        sumZ += Math.abs(i.z - mean[2]);
    });
    return[
        sumX/(arr.length),
        sumY/(arr.length),
        sumZ/(arr.length)
    ]
}
function XYZPointDistances(p1,p2){
    return {x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z};
}

// function FrequencyCalculator(mean){
//     let i = speakingFrequency.frontOfQueue;
//     //insert all elements to speakingFrequency
//     for(let point of currentIntervalData){
//         if(    Math.abs(point.x - mean[0]) >= threshold
//             || Math.abs(point.y - mean[1]) >= threshold
//             || Math.abs(point.z - mean[2]) >= threshold){

//                 if(!speakingFrequency.points[i][1]){
//                     ++speakingFrequency.pointsGreaterThanThreshold;
//                     speakingFrequency.points[i][1] = true;
//                 }
//         }else{
//             //if the point was greater than the threshold and the new point is not greater than the threshold
//             // then decrement the number of points greater than the threshold
//             if(speakingFrequency.points[i][1]){
//                 --speakingFrequency.pointsGreaterThanThreshold;
//             }
//             speakingFrequency.points[i][1] = false;
//         }
//         speakingFrequency.points[i][0] = point;
//         i = i + 1 >= speakingFrequency.maxNumberOfPoints? 0: i + 1;
//     }
// }