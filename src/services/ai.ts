let whisperWorker: Worker;

import { formatTime } from './generate-srt';
// @ts-ignore
import WhisperWorker from './local-ai?worker'

export async function loadTranscriber(model: "tiny" | "base"): Promise<void> {
    whisperWorker = new WhisperWorker();
    whisperWorker.postMessage({
        type: "load",
        model: model || "tiny",
    });
}

export function doLocalWhisper(audioFile: Blob, model: "tiny" | "base"): Promise<any> {
    return new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.onloadend = async () => {
            const audioCTX = new AudioContext({
                sampleRate: 16000,
            });
            const arrayBuffer = fileReader.result as ArrayBuffer;
            const audioData = await audioCTX.decodeAudioData(arrayBuffer);

            let audio;
            if (audioData.numberOfChannels === 2) {
                const SCALING_FACTOR = Math.sqrt(2);

                const left = audioData.getChannelData(0);
                const right = audioData.getChannelData(1);

                audio = new Float32Array(left.length);
                for (let i = 0; i < audioData.length; ++i) {
                    audio[i] = SCALING_FACTOR * (left[i] + right[i]) / 2;
                }
            } else {
                // If the audio is not stereo, we can just use the first channel:
                audio = audioData.getChannelData(0);
            }

            whisperWorker.onmessage = async (e) => {
                if (e.data.type === "transcribe") {
                    console.log("e.data.transcript", e.data.transcription);
                    console.log("e.data.subtitles", e.data.subtitles);



                    resolve(e.data);
                }
                else if (e.data.type === "transcribe-interim") {
                    let timestamp = "";
                    if (e.data.timestamp.length > 0) {
                        e.data.timestamp.forEach((t: number) => {
                            timestamp += formatTime(t) + " ";
                        });
                    }

                    window.dispatchEvent(new CustomEvent('interim-transcription', {
                        detail: {
                            message: e.data.transcription,
                            timestamp
                        }
                    }));
                }
            }

            whisperWorker.postMessage({
                type: "transcribe",
                blob: audio,
                model: model || "tiny",
            })

        };
        fileReader.readAsArrayBuffer(audioFile);
    })
}