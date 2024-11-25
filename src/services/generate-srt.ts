export function generateWebVTTFile(subtitles: any[]) {
    let webVTTContent = 'WEBVTT\n\n';

    for (let i = 0; i < subtitles.length; i++) {
        const { timestamp, text } = subtitles[i];
        const startTime = formatTime(timestamp[0]);
        const endTime = formatTime(timestamp[1]);

        webVTTContent += `${startTime} --> ${endTime}\n${text}\n\n`;
    }

    return webVTTContent;
}

export function formatTime(timeInSeconds: number): string {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);

    return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}.${padThree(milliseconds)}`;
}

function padZero(num: number): string {
    return num.toString().padStart(2, '0');
}

function padThree(num: number): string {
    return num.toString().padStart(3, '0');
}
