import { generateProceduralMap } from './generateMap';

// Worker types
export type GenerateMapMessage = {
  type: 'GENERATE_MAP';
  requestId: number;
  seed: string;
  width: number;
  height: number;
};

export type MapGeneratedMessage = {
  type: 'MAP_GENERATED';
  map: number[][]; // Raw 2D array of TileType values
  success: boolean;
  requestId: number;
};

self.onmessage = ({ data }: MessageEvent<GenerateMapMessage>) => {
  const { requestId, seed, width, height } = data;

  try {
    const map = generateProceduralMap(seed, width, height);
    const response: MapGeneratedMessage = {
      type: 'MAP_GENERATED',
      map,
      success: true,
      requestId,
    };
    self.postMessage(response);
  } catch {
    self.postMessage({
      type: 'MAP_GENERATED',
      map: [],
      success: false,
      requestId,
    });
  }
};
