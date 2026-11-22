import { afterEach, expect, it, vi } from 'vitest';

import { MAP_HEIGHT, MAP_WIDTH, generatePath } from '../../../constants';
import { generateProceduralMap } from '../../../game/wfc/generateMap';
import type { GenerateMapMessage, MapGeneratedMessage } from '../../../game/wfc/wfc.worker';
import { WFCClient } from '../../../game/wfc/WFCClient';

it('generates deterministic maps with a long BFS path and no 2×2 walkable blocks', () => {
  for (let index = 0; index < 100; index++) {
    const seed = String(index);
    const map = generateProceduralMap(seed, MAP_WIDTH, MAP_HEIGHT);
    expect(map).toEqual(generateProceduralMap(seed, MAP_WIDTH, MAP_HEIGHT));
    expect(generatePath(map).length).toBeGreaterThanOrEqual(18);
    for (let y = 0; y < MAP_HEIGHT - 1; y++) {
      for (let x = 0; x < MAP_WIDTH - 1; x++) {
        expect([map[y][x], map[y][x + 1], map[y + 1][x], map[y + 1][x + 1]]).toContain(0);
      }
    }
  }
});

class MockWorker {
  static instances: MockWorker[] = [];
  onmessage?: (event: { data: MapGeneratedMessage }) => void;
  onerror?: () => void;
  postMessage = vi.fn<(request: GenerateMapMessage) => void>();
  terminate = vi.fn();
  constructor() {
    MockWorker.instances.push(this);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  MockWorker.instances = [];
});

it('lazily starts a worker and routes concurrent same-seed replies by request ID', async () => {
  vi.stubGlobal('Worker', MockWorker);
  const client = new WFCClient();
  expect(MockWorker.instances).toHaveLength(0);
  const first = client.generateMap('same', 12, 8);
  const second = client.generateMap('same', 12, 8);
  const [worker] = MockWorker.instances;

  for (const [index, [request]] of worker.postMessage.mock.calls.entries()) {
    worker.onmessage?.({
      data: { type: 'MAP_GENERATED', requestId: request.requestId, success: true, map: [[index]] },
    });
  }
  await expect(Promise.all([first, second])).resolves.toEqual([[[0]], [[1]]]);
});

it('settles outstanding requests on worker error and creates a replacement on demand', async () => {
  vi.stubGlobal('Worker', MockWorker);
  const client = new WFCClient();
  const first = client.generateMap('one', 12, 8);
  const second = client.generateMap('two', 12, 8);
  const [worker] = MockWorker.instances;
  worker.onerror?.();
  await expect(Promise.all([first, second])).resolves.toEqual([[], []]);
  expect(worker.terminate).toHaveBeenCalledOnce();

  const next = client.generateMap('next', 12, 8);
  expect(MockWorker.instances).toHaveLength(2);
  client.terminate();
  await expect(next).resolves.toEqual([]);
});
