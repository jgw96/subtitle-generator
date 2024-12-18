// @ts-ignore
import { AutomaticSpeechRecognitionPipeline, pipeline } from '@huggingface/transformers';
import { generateWebVTTFile } from './generate-srt';

let transcriber: AutomaticSpeechRecognitionPipeline | undefined = undefined;

self.onmessage = async (e) => {
    if (e.data.type === 'transcribe') {
        return new Promise((resolve) => {
            console.log("in worker", e.data)
            localTranscribe(e.data.blob, e.data.model).then((transcription) => {
                const subtitles = generateWebVTTFile(transcription[0].chunks);
                console.log("in worker", transcription)
                self.postMessage({
                    type: 'transcribe',
                    transcription: transcription[0].text,
                    subtitles
                });
                resolve(transcription);
            })
        })
    }
    else if (e.data.type === "load") {
        await loadTranscriber(e.data.model || "tiny");
        return Promise.resolve();
    }
    else {
        return Promise.reject('Unknown message type');
    }
}

export async function loadTranscriber(model: "tiny" | "base"): Promise<void> {
    return new Promise(async (resolve) => {
        if (!transcriber) {
            transcriber = await pipeline('automatic-speech-recognition', `Xenova/whisper-${model}`, {
                device: await webgpuCheck() ? "ml" in navigator ? "webnn" : "webgpu" : "wasm"
            });

            resolve();
        }
        else {
            resolve();
        }
    })
}

export async function localTranscribe(audio: Blob, model: "tiny" | "base"): Promise<any> {
    return new Promise(async (resolve) => {
        await loadTranscriber(model);

        if (transcriber) {
            const output = await transcriber([audio], {
                return_timestamps: true,
                chunk_length_s: 30,
                stride_length_s: 5,
                callback_function: callback_function, // after each generation step
                chunk_callback: chunk_callback, // after each chunk is processed
            });

            console.log('localTranscribe', output)

            resolve(output);
        }
    })
}

// Storage for chunks to be processed. Initialise with an empty chunk.
const chunks_to_process = [
    {
        tokens: [],
        finalised: false,
    },
];

// TODO: Storage for fully-processed and merged chunks
// let decoded_chunks = [];

function chunk_callback(chunk: any) {
    let last = chunks_to_process[chunks_to_process.length - 1];

    // Overwrite last chunk with new info
    Object.assign(last, chunk);
    last.finalised = true;

    // Create an empty chunk after, if it not the last chunk
    if (!chunk.is_last) {
        chunks_to_process.push({
            tokens: [],
            finalised: false,
        });
    }
}

// Inject custom callback function to handle merging of chunks
function callback_function(item: any) {
    const time_precision =
        transcriber!.processor.feature_extractor.config.chunk_length /
        transcriber!.model.config.max_source_positions;

    const last: any = chunks_to_process[chunks_to_process.length - 1];

    // Update tokens of last chunk
    last.tokens = [...item[0].output_token_ids];

    console.log("callback_function", item, last);
    console.log('last', chunks_to_process);

    if (last.tokens.length > 1) {
        // Merge text chunks
        // TODO optimise so we don't have to decode all chunks every time
        // @ts-ignore
        const data = transcriber!.tokenizer._decode_asr(chunks_to_process, {
            time_precision: time_precision,
            return_timestamps: true,
            force_full_sequences: false,
        });


        console.log('all data', data);

        self.postMessage({
            type: 'transcribe-interim',
            transcription: data[0],
            timestamp: data[1].chunks[0]?.timestamp || [],
        });
    }
}

async function webgpuCheck() {
    // check if you can actually use the webgpu api
    // not just if the api exists

    try {
        const adapter = await navigator.gpu.requestAdapter();
        const device = await adapter.requestDevice();

        if (device) {
            return true;
        }
        else {
            return false;
        }
    }
    catch {
        return false;
    }
}