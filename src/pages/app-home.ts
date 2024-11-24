import { LitElement, css, html } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';

import { styles } from '../styles/shared-styles';

import { fluentButton, fluentTextArea, provideFluentDesignSystem } from '@fluentui/web-components';

provideFluentDesignSystem().register(fluentButton(), fluentTextArea());


@customElement('app-home')
export class AppHome extends LitElement {

  @property() message = 'Welcome!';

  @state() transcribedText: string = '';
  @state() transcribing: boolean = false;
  @state() transcriptSubtitleFile: any = null;
  @state() currentFileData: any = null;
  @state() videoGenerated: boolean = false;

  static styles = [
    styles,
    css`
      fluent-text-area {
        width: 100%;
        height: 100%;
      }

      p {
        backdrop-filter: blur(46px);
        padding: 10px;
        border-radius: 8px;
        background: #34343d;
        font-size: 14px;
        margin: 0;
        animation: fadeup 0.5s;
      }

      fluent-text-area::part(control) {
        height: 100%;
        border: none;
        border-radius: 8px;
        overflow-y: hidden;
      }

      #video-background {
        z-index: 999;


        align-items: flex-start;
        flex-direction: column;

        animation: fadeup 0.5s;

        justify-content: flex-start;
      }

      #video-background p {
        font-weight: bold;
        margin-top: 0;
      }

      #video-block video {
        width: 100%;
        border-radius: 8px;
        box-shadow: #000000cc 0px 0px 12px 0px;
      }

      main {
        padding: 8px;

        padding-top: 30px;

        flex-direction: column;
        gap: 8px;
        overflow-y: hidden;

        display: flex;
        align-items: normal;
      }

      #main-content {
        display: flex;
        flex-direction: column;
        height: 86vh;
        gap: 8px;

        display: flex;
        align-items: center;
        overflow-y: scroll;
      }

      h1 {
        font-size: 26px;
        margin-left: 10vw;
        margin-top: 6vh;
      }

      #action-bar {
        display: flex;
        gap: 12px;
        height: -webkit-fill-available;
        padding: 8px;

        flex-direction: row;
        justify-content: space-between;
      }

      #sub-actions {
        display: flex;
        gap: 8px;

        flex-direction: row;
      }

      p {
        width: 68vw;
        max-width: 68vw;
      }

      #video-background {
        max-width: 70vw;
        width: 70vw;
      }

      fluent-button img {
        margin-top: 2px;
      }

      fluent-button.neutral::part(control) {
        background: transparent;
      }

      @media(prefers-color-scheme: dark) {
        fluent-text-area::part(control) {
            background: #ffffff0f;
            color: white;
        }

        fluent-button.neutral::part(control) {
          background: transparent;
          color: white;
        }
      }

      @media(prefers-color-scheme: light) {
        #video-background, p {
          background: white;
        }

        #video-block video {
          box-shadow: #000000ab 0px 0px 12px 0px;
        }
      }

      @media(prefers-color-scheme: dark) {
        fluent-button img {
          filter: invert(1);
        }
      }

      @keyframes fadeup {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
  `];

  async firstUpdated() {
    setTimeout(async () => {
      if ((window as any).shareTargetFile) {
        const sharedFile = (window as any).shareTargetFile;

        console.log("sharedFile blob image", (window as any).shareTargetFile);

        if (sharedFile) {
          // this.recorded = file;
          console.log("file", sharedFile);

          this.currentFileData = sharedFile;


          await this.handleTranscribing(sharedFile);
          await this.makeVideoElAndSubTrack();
        }
      }
    }, 2000);

    window.addEventListener("interim-transcription", (e: any) => {
      console.log('interim-transcription', e.detail);

      this.transcribedText = e.detail.message;
    });

    this.handleDragAndDrop();

    const { loadTranscriber } = await import("../services/ai");
    await loadTranscriber("tiny");
  }

  async handleDragAndDrop() {
    // handle drag and drop of files onto the page
    const dropArea = this.shadowRoot!.querySelector('main') as HTMLElement;

    dropArea.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    dropArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    dropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    dropArea.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const dt = e.dataTransfer;
      const files = dt!.files;

      if (files.length > 0) {
        const file = files[0];
        this.currentFileData = file;

        await this.handleTranscribing(file);

        await this.makeVideoElAndSubTrack();
      }

    });
  }

  async transcribeFile() {
    this.shadowRoot?.querySelector("#video-block")?.removeChild(this.shadowRoot?.querySelector("#video-block")?.firstChild!);

    this.transcribedText = "";
    this.transcriptSubtitleFile = undefined;
    this.videoGenerated = false;

    const pickerOpts = {
      types: [
        {
          description: "Video",
          accept: {
            "video/*": [".wav"],
          },
        },
      ],
      excludeAcceptAllOption: true,
      multiple: false,
    };
    // Open file picker and destructure the result the first handle
    // @ts-ignore
    const [fileHandle] = await window.showOpenFilePicker(pickerOpts);

    // get file contents
    const fileData = await fileHandle.getFile();

    this.currentFileData = fileData;

    await this.handleTranscribing(fileData);

    console.log("finished transcribing");
    await this.makeVideoElAndSubTrack();
  }

  private async handleTranscribing(fileData: any) {
    this.transcribing = true;

    const { doLocalWhisper } = await import('../services/ai');
    const transcript = await doLocalWhisper(fileData, "tiny");

    console.log("transcript", transcript)

    this.transcribedText = transcript.transcription;
    this.transcriptSubtitleFile = transcript.subtitles;
    this.transcribing = false;
  }

  async share() {
    const shareData = {
      title: 'Transcribed text',
      text: this.transcribedText,
    };

    await navigator.share(shareData);
  }

  async copy() {
    await navigator.clipboard.writeText(this.transcribedText);
  }

  async save() {
    // @ts-ignore
    const fileHandle = await window.showSaveFilePicker({
      types: [
        {
          description: "Text",
          accept: {
            "text/plain": [".txt"],
          },
        },
      ],
    });
    const writable = await fileHandle.createWritable();
    await writable.write(this.transcribedText);
    await writable.close();
  }

  async getSubtitles() {
    // @ts-ignore
    const fileHandle = await window.showSaveFilePicker({
      types: [
        {
          description: "Text",
          accept: {
            "text/vtt": [".vtt"],
          },
        },
      ],
    });
    const writable = await fileHandle.createWritable();
    await writable.write(this.transcriptSubtitleFile);
    await writable.close();
  }

  async makeVideoElAndSubTrack() {
    // make this.transcriptSubtitleFile a WebVTT file, its just formatted text
    const webVTTFile = new Blob([this.transcriptSubtitleFile], { type: 'text/vtt' });
    console.log("webVTTFile", webVTTFile);

    const video = document.createElement('video');
    video.src = URL.createObjectURL(this.currentFileData);
    video.controls = true;

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = 'English';
    track.srclang = 'en';
    track.default = true;
    track.src = URL.createObjectURL(webVTTFile);

    video.appendChild(track);

    this.videoGenerated = true;

    await this.updateComplete;

    console.log("here in video stuff");

    // await video.play();
    // this.renderFullVideoInCanvas(video);
    this.shadowRoot?.querySelector("#video-block")?.appendChild(video);
  }

  renderFullVideoInCanvas(video: HTMLVideoElement) {
    // play video in canvas
    const canvas = document.createElement('canvas');
    this.shadowRoot?.querySelector("#video-block")?.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {

      const updateCanvas = () => {
        ctx!.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Re-register the callback to run on the next frame
        video.requestVideoFrameCallback(updateCanvas);
      };

      // Initial registration of the callback to run on the first frame
      video.requestVideoFrameCallback(updateCanvas);
    } else {
      alert("Your browser does not support requestVideoFrameCallback().");
    }

  }

  render() {
    return html`

      <main>
        <div id="action-bar">
          <fluent-button appearance="accent" ?disabled="${this.transcribing}" @click="${() => this.transcribeFile()}">Generate Subtitles</fluent-button>

          ${this.transcribedText && this.transcribedText.length > 0 && this.transcribing === false ? html`<div id="sub-actions">
            <fluent-button @click="${() => this.save()}">
              <img src="assets/save-outline.svg" alt="Save" height="20" width="20" />
            </fluent-button>
            <!-- <fluent-button @click="${() => this.getSubtitles()}">Save Subtitle File</fluent-button> -->
            <fluent-button @click="${() => this.copy()}">
              <img src="assets/copy-outline.svg" alt="Copy" height="20" width="20" />
            </fluent-button>
            <fluent-button @click="${() => this.share()}">
              <img src="assets/share-social-outline.svg" alt="Share" height="20" width="20" />
            </fluent-button>
          </div>` : null}
        </div>

        <div id="main-content">
          <!-- <fluent-text-area .value="${this.transcribedText}" placeholder="Transcribed text will appear here"></fluent-text-area> -->
          ${this.videoGenerated === true ? html`<div id="video-background"><div id="video-block"></div></div>` : null}
          ${this.transcribedText && this.transcribedText.length > 0 ? html`<p>${this.transcribedText}</p>` : null}
        </div>
      </main>
    `;
  }
}
