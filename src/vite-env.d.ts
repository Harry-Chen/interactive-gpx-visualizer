/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;
declare const __REPOSITORY_URL__: string;
declare const __PUBLIC_SITE_URL__: string;
declare const __DEPENDENCY_LICENSES__: Array<{
  name: string;
  version: string;
  license: string;
}>;

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
