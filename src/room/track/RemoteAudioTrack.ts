import { AudioReceiverStats, computeBitrate } from '../stats';
import RemoteTrack from './RemoteTrack';
import { Track } from './Track';

export default class RemoteAudioTrack extends RemoteTrack {
  private prevStats?: AudioReceiverStats;

  private elementVolume: number | undefined;

  constructor(mediaTrack: MediaStreamTrack, sid: string, receiver?: RTCRtpReceiver) {
    super(mediaTrack, sid, Track.Kind.Audio, receiver);
  }

  /**
   * sets the volume for all attached audio elements
   */
  setVolume(volume: number) {
    for (const el of this.attachedElements) {
      el.volume = volume;
    }
    this.elementVolume = volume;
  }

  /**
   * gets the volume of attached audio elements (loudest)
   */
  getVolume(): number {
    if (this.elementVolume) {
      return this.elementVolume;
    }
    let highestVolume = 0;
    this.attachedElements.forEach((element) => {
      if (element.volume > highestVolume) {
        highestVolume = element.volume;
      }
    });
    return highestVolume;
  }

  attach(): HTMLMediaElement;
  attach(element: HTMLMediaElement): HTMLMediaElement;
  attach(element?: HTMLMediaElement): HTMLMediaElement {
    if (!element) {
      element = super.attach();
    } else {
      super.attach(element);
    }
    if (this.elementVolume) {
      element.volume = this.elementVolume;
    }
    return element;
  }

  protected monitorReceiver = async () => {
    if (!this.receiver) {
      this._currentBitrate = 0;
      return;
    }
    const stats = await this.getReceiverStats();

    if (stats && this.prevStats && this.receiver) {
      this._currentBitrate = computeBitrate(stats, this.prevStats);
    }

    this.prevStats = stats;
  };

  protected async getReceiverStats(): Promise<AudioReceiverStats | undefined> {
    if (!this.receiver) {
      return;
    }

    const stats = await this.receiver.getStats();
    let receiverStats: AudioReceiverStats | undefined;
    stats.forEach((v) => {
      if (v.type === 'inbound-rtp') {
        receiverStats = {
          type: 'audio',
          timestamp: v.timestamp,
          jitter: v.jitter,
          bytesReceived: v.bytesReceived,
          concealedSamples: v.concealedSamples,
          concealmentEvents: v.concealmentEvents,
          silentConcealedSamples: v.silentConcealedSamples,
          silentConcealmentEvents: v.silentConcealmentEvents,
          totalAudioEnergy: v.totalAudioEnergy,
          totalSamplesDuration: v.totalSamplesDuration,
        };
      }
    });
    return receiverStats;
  }
}
