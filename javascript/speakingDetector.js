const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const sampleIntervalDuration = 350;
const frequencyIntervalDuration = 1000;
const threshold = 0.003;
let isTalking = false;
let currentInterval = 0
let currentIntervalData = new Array();
let speakingFrequency = {
    points: [],
    pointsGreaterThanThreshold: 0,
    totalPointsInInterval : 0,
    frequencyInterval: 0
};

const faceMesh = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  }});
  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
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
    if(isTalking){
        let percentage = speakingFrequency.pointsGreaterThanThreshold / speakingFrequency.totalPointsInInterval;
        canvasCtx.rect(10,10, 400 * percentage, 100)
        canvasCtx.fillStyle = "rgba(75, 115, 195, 0.5)";
        canvasCtx.fill();
    }
    if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
            if(new Date().getTime() > currentInterval){
                if(userIsTalking()){
                    isTalking = true;
                }else{
                    isTalking = false;
                }
                currentInterval = new Date().getTime()+ sampleIntervalDuration;

            }
            if(new Date().getTime() > speakingFrequency.frequencyInterval){
                speakingFrequency.pointsGreaterThanThreshold = 0;
                speakingFrequency.totalPointsInInterval = 0;
                speakingFrequency.frequencyInterval = new Date().getTime() + frequencyIntervalDuration;
            }
            if(isTalking){
                canvasCtx.fillStyle = "#000000";
                canvasCtx.font = "40px Verdana";
                canvasCtx.fillText("Talking", 15, 70);
            }
            currentIntervalData.push(XYZPointDistances(landmarks[13], landmarks[14]));

            drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION,
                        {color: '#C0C0C070', lineWidth: 1});
            drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, {color: '#E0E0E0'});
            drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, {color: '#E0E0E0'});
        }
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
    calculateFrequency(newMean);
    for(let i = 0; i < 3; ++i){
        
        if(MAD[i] >=  threshold){
            result = true;
        }
    }
    currentIntervalData = [];
    return result;
}
function calculateFrequency( mean){
    let count = 0;
    for(let point of currentIntervalData){
            if(    Math.abs(point.x - mean[0]) >= threshold
                || Math.abs(point.y - mean[1]) >= threshold
                || Math.abs(point.z - mean[2]) >= threshold){
                ++speakingFrequency.pointsGreaterThanThreshold;
            }
            ++speakingFrequency.totalPointsInInterval;
        
    }
    return count;
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