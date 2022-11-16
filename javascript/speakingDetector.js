const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const sampleIntervalDuration = 200;
const cvsExportInterval = 1000; //export row every second
let row = [];
let csvData = [];
let col = 0;
const threshold = 0.003;
let mouthWasMoving      = false;
let mouthIsMoving       = false;
let startCollectingData = false;
let currentInterval = 0;
let currentIntervalData = new Array();
let dataPoints = new Array(20);
let isTalking = false;
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
            currentAudioIntervalData.push(getAudioData());
            drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, {color: (mouthIsMoving || mouthWasMoving ? '#00FF00': '#E0E0E0')});
        }
    }
    //checking if the user is talking
    if(new Date().getTime() > currentInterval){
        if(usermouthIsMoving()){
            mouthWasMoving = mouthIsMoving;
            mouthIsMoving = true;
        }else{
            mouthWasMoving = mouthIsMoving
            mouthIsMoving = false;
        }
        if(audioHasChanged()){
            audioRecentlyChanged = audioChanged;
            audioChanged = true;
            
        }else{
            audioRecentlyChanged = audioChanged;
            audioChanged = false;
        }
        isTalking = (mouthIsMoving || mouthWasMoving) && (audioChanged || audioRecentlyChanged);
        if(startCollectingData){
            row.push(isTalking? "1":"0");
            if(row.length == 5){
                csvData.push(row);
                row = [];
            }
        }
        currentInterval = new Date().getTime()+ sampleIntervalDuration;
    }
    //outputing to the canvas whether the client is talking or not
    canvasCtx.rect(10,10, canvasElement.width * .30, 100);
    if(isTalking){
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
function usermouthIsMoving(){
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
/////////////////
function exportData() {
    let csvContent = csvData.map(e => e.join(",")).join("\n");

    var hiddenElement = document.createElement('a');  
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvContent);  
    hiddenElement.target = '_blank';  
      
    //provide the name for the CSV file to be downloaded  
    hiddenElement.download = 'Talking_Data.csv';  
    hiddenElement.click();
  }