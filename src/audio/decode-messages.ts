/** A request from the main thread to the decode Worker. */
export interface DecodeRequest {
  readonly type: 'decode';
  /** An id that the replies of this request repeat. */
  readonly id: number;
  /** The URLs of the SF3 preset files. */
  readonly urls: readonly string[];
}

/** One sound bank that the decode Worker converted to PCM SF2. */
export interface DecodedBank {
  /** The URL of the SF3 file. */
  readonly url: string;
  /** The bytes of the PCM SF2 file. The Worker transfers this buffer. */
  readonly data: ArrayBuffer;
}

/** A reply of the decode Worker. */
export type DecodeReply =
  | {
      readonly type: 'progress';
      readonly id: number;
      /** The number of files that are ready. */
      readonly done: number;
      readonly total: number;
    }
  | {
      readonly type: 'decoded';
      readonly id: number;
      /** The banks in the order of the request URLs. */
      readonly banks: readonly DecodedBank[];
      /** The sum of the PCM SF2 sizes in bytes (design 9.7, "Memory"). */
      readonly pcmBytes: number;
    }
  | {
      readonly type: 'failed';
      readonly id: number;
      readonly message: string;
    };
