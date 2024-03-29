let audioContext;
let fftSize = 256 * 2;
let prevMean= 0, currMean =0;
let prevMaxFreq=0, currMaxFreq=0;
let freqSensitivity = 20;
let size = 2;
let freqMeanThreshold = 50;
let currentAudioIntervalData = [];
console.log(freqMeanThreshold);
let audioChanged = false;
let audioRecentlyChanged = false;
let data;
/*
let soundHistory = Array(size);
//last index is the current mean
for(let i = 0; i < size; ++i){
    soundHistory[i] = {mean: 0, maxFreq: 0};
}
*/


//prompt user for microphone premisison
if (!navigator.getUserMedia)
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia || navigator.msGetUserMedia;

if (navigator.getUserMedia) {

    navigator.getUserMedia({ audio: true },
        function (stream) {
            audioContext = new (AudioContext || webketAudioContext)();
           process(stream);
        },
        function (e) {
            alert('Error capturing audio.');
        }
    );

} else { alert('getUserMedia not supported in this browser.'); }
//determine if there is a change in audio every 200 millis
function audioHasChanged(){
    
        let result = false;
        if(currentAudioIntervalData != []){
            currMean         = AudioMeanCalculator(currentAudioIntervalData);
            let currMeanThreshold = freqMeanThreshold * currentAudioIntervalData.length;
            if(Math.abs(currMean - prevMean) > currMeanThreshold ){
                result = true;
            }
            prevMaxFreq = currMaxFreq;
            prevMean = currMean;
            line = true;
            currentAudioIntervalData = [];
        }
    return result;
}
function getAudioData(){
    let data         = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data); 
    return data;
}
let source;
let filter;
let analyser;
let volume;
let dest;
function process(stream) {
    //creating nodes
    source           = audioContext.createMediaStreamSource(stream);
    filter           = audioContext.createBiquadFilter(); 
    analyser         = audioContext.createAnalyser();
    volume           = audioContext.createGain();
    dest             = audioContext.createMediaStreamDestination();
    //config
    audioContext.fftSize = fftSize;
    filter.type = "bandpass";
    filter.Q.value =  0.2;
    analyser.fftSize = fftSize;
    volume.gain.value = 1;

    //connect nodes
    source.connect(volume);
    volume.connect(filter);
    filter.connect(analyser);
    analyser.connect(dest);
    
}
function AudioMeanCalculator(arr){
    let sum = 0;
    for(let row = 0; row < arr.length; ++row){
        arr[row].forEach(i =>{
            sum += i;
        });
    }
    
    return sum / arr.length;
}

document.getElementById("sensitivity").value = freqMeanThreshold;
function changeSensitivity(val){
    freqMeanThreshold = parseInt(val);
}