/// <reference types="vite/client" />

declare module "@garmin/fitsdk" {
  export class Stream {
    static fromArrayBuffer(arrayBuffer: ArrayBuffer): Stream;
    static fromByteArray(data: number[]): Stream;
  }

  export class Decoder {
    constructor(stream: Stream);
    isFIT(): boolean;
    checkIntegrity(): boolean;
    read(options?: Record<string, unknown>): {
      messages: unknown;
      profileVersion?: number;
      errors: unknown[];
    };
  }
}
