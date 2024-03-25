import { LitElement, css, html } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';

import { styles } from '../styles/shared-styles';

import { fluentButton, fluentTextArea, provideFluentDesignSystem } from '@fluentui/web-components';

provideFluentDesignSystem().register(fluentButton(), fluentTextArea());

import 'speech-to-text-toolkit';


@customElement('app-home')
export class AppHome extends LitElement {

  @property() message = 'Welcome!';

  @state() transcribedText: string = '';
  @state() transcribing: boolean = false;

  static styles = [
    styles,
    css`
      fluent-text-area::part(control) {
        height: 94vh;
        border: none;
        border-radius: 8px;
      }

      main {
        display: grid;
        grid-template-columns: 1fr 5fr;
        padding: 8px;

        padding-top: 30px;

        flex-direction: column;
        align-items: center;
        gap: 8px;
        overflow-y: hidden;
      }

      h1 {
        font-size: 26px;
        margin-left: 10vw;
        margin-top: 6vh;
      }

      #action-bar {
        display: flex;
        flex-direction: column;
        gap: 12px;
        height: -webkit-fill-available;
        padding: 8px;
      }

      #sub-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      @media(prefers-color-scheme: dark) {
        fluent-text-area::part(control) {
            background: #ffffff0f;
            color: white;
        }

        fluent-button.neutral::part(control) {
          background: #ffffff14;
          color: white;
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

          await this.handleTranscribing(sharedFile);
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
        await this.handleTranscribing(file);
      }

    });
  }

  async transcribeFile() {
    const pickerOpts = {
      types: [
        {
          description: "Audio",
          accept: {
            "audio/*": [".wav"],
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

    await this.handleTranscribing(fileData);
  }

  private async handleTranscribing(fileData: any) {
    this.transcribing = true;
    const textArea: any = this.shadowRoot!.querySelector('fluent-text-area');
    textArea.readonly = true;
    this.transcribedText = "Loading Model...";

    const { doLocalWhisper } = await import('../services/ai');
    const transcript = await doLocalWhisper(fileData, "tiny");

    this.transcribedText = transcript;
    this.transcribing = false;

    textArea.readonly = false;
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

  render() {
    return html`
      <main>
        <div id="action-bar">
          <fluent-button appearance="accent" ?disabled="${this.transcribing}" @click="${() => this.transcribeFile()}">Transcribe File</fluent-button>

          <div id="sub-actions">
            <fluent-button @click="${() => this.save()}">Save</fluent-button>
            <fluent-button @click="${() => this.copy()}">Copy</fluent-button>
            <fluent-button @click="${() => this.share()}">Share</fluent-button>
          </div>
        </div>

        <fluent-text-area .value="${this.transcribedText}" placeholder="Transcribed text will appear here"></fluent-text-area>

        <speech-to-text localOrCloud="local">
        </speech-to-text>
      </main>
    `;
  }
}
