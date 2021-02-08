function audioContext() {
    if (this.ctx == undefined) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    return this.ctx;
}

function fillBufferWithWhiteNoise(buffer) {
    let frameCount = buffer.sampleRate * 2.0;
    // Fill the buffer with white noise;
    //just random values between -1.0 and 1.0
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        // This gives us the actual array that contains the data
        let data = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            // Math.random() is in [0; 1.0]
            // audio needs to be in [-1.0; 1.0]
            data[i] = Math.random() * 2 - 1;
        }
    }
    
    return buffer;
}

function fillBufferWithPinkNoise(buffer) {
    let frameCount = buffer.sampleRate * 2.0;
    // Fill the buffer with white noise;
    //just random values between -1.0 and 1.0
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        var b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
        // This gives us the actual array that contains the data
        let data = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            // Math.random() is in [0; 1.0]
            // audio needs to be in [-1.0; 1.0]
            var white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 /*+ b6*/ + white * 0.5362;
            data[i] *= 0.11; // (roughly) compensate for gain
            b6 = white * 0.115926;
        }
    }
    
    return buffer;
}

function fillBufferWithBrownNoise(buffer) {
    let frameCount = buffer.sampleRate * 2.0;
    // Fill the buffer with white noise;
    //just random values between -1.0 and 1.0
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        var lastOut = 0.0;
        // This gives us the actual array that contains the data
        let data = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            // Math.random() is in [0; 1.0]
            // audio needs to be in [-1.0; 1.0]
            var white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // (roughly) compensate for gain
        }
    }
    
    return buffer;
}


function buffer() {
    // Create an empty two second stereo buffer at the
    // sample rate of the AudioContext
    let channels = 2;
    let frameCount = audioContext().sampleRate * 2.0;

    let myArrayBuffer = audioContext().createBuffer(channels, frameCount, audioContext().sampleRate);

    return myArrayBuffer;
}

function bufferSource(buffer) {
    // Get an AudioBufferSourceNode.
    // This is the AudioNode to use when we want to play an AudioBuffer
    let source = audioContext().createBufferSource();
    // set the buffer in the AudioBufferSourceNode
    source.buffer = buffer;
    source.loop = true;

    return source;
}

function connectNoises() {
    let whiteSource = bufferSource(fillBufferWithWhiteNoise(buffer()));
    let whiteGain = audioContext().createGain();
    whiteGain.gain.value = .01;
    whiteSource.connect(whiteGain).connect(audioContext().destination);
    whiteSource.start();

    let pinkSource = bufferSource(fillBufferWithPinkNoise(buffer()));
    let pinkGain = audioContext().createGain();
    pinkGain.gain.value = .01;
    pinkSource.connect(pinkGain).connect(audioContext().destination);
    pinkSource.start();

    let brownSource = bufferSource(fillBufferWithBrownNoise(buffer()));
    let brownGain = audioContext().createGain();
    brownGain.gain.value = .01;
    brownSource.connect(brownGain).connect(audioContext().destination);
    brownSource.start();

    document.getElementById('whiteVolume').addEventListener("input", function(event) {
        whiteGain.gain.value = this.value;
    });

    document.getElementById('pinkVolume').addEventListener("input", function(event) {
        pinkGain.gain.value = this.value;
    });

    document.getElementById('brownVolume').addEventListener("input", function(event) {
        brownGain.gain.value = this.value;
    });

    audioContext().suspend();

    return audioContext();
}

function BackgroundNoise() {
    var canvas = document.querySelector('.noise canvas');

    const FRAME_COUNT = 10;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var ctx = canvas.getContext('2d');

    var makeFrames = () => {
        return Array(FRAME_COUNT).fill(0).map(() => {
            const idata = ctx.createImageData(canvas.width, canvas.height);
            const buffer32 = new Uint32Array(idata.data.buffer);
            const len = buffer32.length;

            for (let i = 0; i < len; i++) {
                if (Math.random() < 0.5) {
                    buffer32[i] = 0xff000000;
                }
            }

            return idata;
        });
    }

    var frames = makeFrames();

    window.addEventListener("resize", function(event) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        frames = makeFrames();
    });

    var timerHandler;
    this.resume = function() {
        var i = 0;
        timerHandler = window.setInterval(() => {
            if (!document.hidden) {
                if (i >= frames.length) {
                    i = 0;
                }
                if (frames[i]) {
                    ctx.putImageData(frames[i], 0, 0);
                }
                i++;
            }
        }, 100);
        canvas.style.display = 'block';
    };


    this.suspend = function() {
        if (timerHandler) {
            window.clearInterval(timerHandler);
        }
        canvas.style.display = 'none';
    };


}

const audio = connectNoises();
const bgNoise = new BackgroundNoise();

document.getElementById('start-btn').addEventListener("click", function(event) {
    if (audio.state == 'suspended') {
        audio.resume();
        bgNoise.resume();
        this.textContent = 'Stop!';
    } else {
        audio.suspend();
        bgNoise.suspend();
        this.textContent = 'Start!';
    }
});
