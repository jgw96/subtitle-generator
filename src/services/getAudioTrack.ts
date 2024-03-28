export async function extractAudioFromVideo(videoFile: Blob) {
    const audioContext = new window.AudioContext();
    const fileData = new Blob([videoFile]);

    // Convert the video file to an audio buffer
    const videoFileAsBuffer = await getBuffer(fileData);

    audioContext.decodeAudioData(videoFileAsBuffer).then((decodedAudioData) => {
        // `decodedAudioData` contains the audio binary data
        // You can use this data as needed (e.g., send it to a web service)
        console.log("Extracted audio data:", decodedAudioData);

        return decodedAudioData;
    });

}

function getBuffer(fileData: Blob): Promise<any> {
    return new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.onload = function () {
            resolve(fileReader.result);
        };
        fileReader.readAsArrayBuffer(fileData);
    });
}

// Example usage:
// const videoFile = input.files[0]; // Replace with your video file input
// extractAudioFromVideo(videoFile);
