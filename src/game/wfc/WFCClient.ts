import type { GenerateMapMessage, MapGeneratedMessage } from './wfc.worker';

class WFCClient {
  private worker: Worker;
  private pendingResolves: Map<string, (map: number[][]) => void> = new Map();

  constructor() {
    this.worker = new Worker(new URL('./wfc.worker.ts', import.meta.url), {
      type: 'module',
    });

    this.worker.onmessage = ({ data }: MessageEvent<MapGeneratedMessage>) => {
      const { map, seed, success } = data;
      const resolve = this.pendingResolves.get(seed);

      if (resolve) {
        if (success) {
          resolve(map);
        } else {
          console.error(`Map generation failed for seed: ${seed}`);
          resolve([]);
        }

        this.pendingResolves.delete(seed);
      }
    };
  }

  public generateMap(seed: string, width: number, height: number): Promise<number[][]> {
    return new Promise((resolve) => {
      this.pendingResolves.set(seed, resolve);
      this.worker.postMessage({
        type: 'GENERATE_MAP',
        seed,
        width,
        height,
      });
    });
  }

  public terminate() {
    this.worker.terminate();
  }
}

export const wfcClient = new WFCClient();
