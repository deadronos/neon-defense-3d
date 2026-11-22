import type { GenerateMapMessage, MapGeneratedMessage } from './wfc.worker';

export class WFCClient {
  private worker?: Worker;
  private nextRequestId = 0;
  private pendingResolves = new Map<number, (map: number[][]) => void>();

  private createWorker(): Worker {
    const worker = new Worker(new URL('./wfc.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<MapGeneratedMessage>) => {
      if (this.worker !== worker) return;
      const { map, requestId, success } = data;
      const resolve = this.pendingResolves.get(requestId);
      this.pendingResolves.delete(requestId);
      resolve?.(success ? map : []);
    };
    const handleFailure = () => {
      if (this.worker === worker) this.terminate();
    };
    worker.onerror = handleFailure;
    worker.onmessageerror = handleFailure;
    return worker;
  }

  public generateMap(seed: string, width: number, height: number): Promise<number[][]> {
    return new Promise((resolve) => {
      const requestId = this.nextRequestId++;
      try {
        this.worker ??= this.createWorker();
        this.pendingResolves.set(requestId, resolve);
        const request: GenerateMapMessage = {
          type: 'GENERATE_MAP',
          requestId,
          seed,
          width,
          height,
        };
        this.worker.postMessage(request);
      } catch {
        this.pendingResolves.delete(requestId);
        resolve([]);
      }
    });
  }

  public terminate() {
    this.worker?.terminate();
    this.worker = undefined;
    for (const resolve of this.pendingResolves.values()) resolve([]);
    this.pendingResolves.clear();
  }
}

export const wfcClient = new WFCClient();
