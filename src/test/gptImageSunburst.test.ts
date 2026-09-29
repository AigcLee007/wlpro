import { describe, expect, it } from 'vitest';
import imageModelCatalog from '../../config/imageModels.json';
import imageRouteCatalog from '../../config/imageRoutes.json';
import {
  getGptImageQualityOptions,
  isGptImageModel,
} from '../config/imageModels';

const SUNBURST_MODEL_ID = 'gpt-image-2.5-sunburst';

describe('gpt-image-2.5-sunburst catalog', () => {
  it('defines the model with all supported sizes', () => {
    const model = imageModelCatalog.models.find((item) => item.id === SUNBURST_MODEL_ID);

    expect(model).toMatchObject({
      id: SUNBURST_MODEL_ID,
      requestModel: SUNBURST_MODEL_ID,
      modelFamily: SUNBURST_MODEL_ID,
      routeFamily: SUNBURST_MODEL_ID,
      defaultSize: '2k',
      sizeOptions: ['1k', '2k', '4k'],
    });
  });

  it('defines three priced routes with the server key environment variables', () => {
    const routes = imageRouteCatalog.routes.filter(
      (route) => route.modelFamily === SUNBURST_MODEL_ID,
    );

    expect(routes).toHaveLength(3);
    expect(routes.map((route) => route.id)).toEqual([
      'gpt-image-2.5-sunburst-line1',
      'gpt-image-2.5-sunburst-line2',
      'gpt-image-2.5-sunburst-line3',
    ]);
    expect(routes.map((route) => route.apiKeyEnv)).toEqual([
      'IMAGE_ROUTE_VIP_KEYS',
      'IMAGE_ROLL_IMAGE2.5_BIG',
      'IMAGE_ROLL_IMAGE2.5_MAX',
    ]);
    expect(routes.map((route) => [
      route.sizeOverrides?.['1k']?.pointCost,
      route.sizeOverrides?.['2k']?.pointCost,
      route.sizeOverrides?.['4k']?.pointCost,
    ])).toEqual([
      [2.5, 3, 3.5],
      [3.5, 4, 4.5],
      [5, 5.5, 6],
    ]);
  });
});

describe('GPT image quality options', () => {
  it('recognizes both GPT image model IDs', () => {
    expect(isGptImageModel('gpt-image-2')).toBe(true);
    expect(isGptImageModel(SUNBURST_MODEL_ID)).toBe(true);
    expect(isGptImageModel('nano-banana-pro')).toBe(false);
  });

  it('limits sunburst line1 to the four supported quality values', () => {
    expect(getGptImageQualityOptions(SUNBURST_MODEL_ID, 'line1')).toEqual([
      'auto',
      'low',
      'medium',
      'high',
    ]);
  });

  it('exposes xhigh and max on sunburst lines 2 and 3', () => {
    expect(getGptImageQualityOptions(SUNBURST_MODEL_ID, 'line2')).toEqual([
      'auto',
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ]);
    expect(getGptImageQualityOptions(SUNBURST_MODEL_ID, 'line3')).toEqual([
      'auto',
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ]);
  });
});
