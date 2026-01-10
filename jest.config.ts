import { createDefaultPreset } from 'ts-jest';
import tsConfig from './tsconfig.json' with { type: 'json' };
import type { Config } from 'jest';

const tsJestTransformCfg = createDefaultPreset().transform;

export default {
  ...createDefaultPreset({
    tsconfig: 'tsconfig.json',
  }),
  testEnvironment: 'jsdom',
  transform: {
    ...tsJestTransformCfg,
  },

  roots: ['<rootDir>'],
  modulePaths: [
    tsConfig.compilerOptions.baseUrl,
  ],
} satisfies Config;