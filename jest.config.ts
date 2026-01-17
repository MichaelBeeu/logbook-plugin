import { createDefaultPreset } from 'ts-jest';
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
    'src',
  ],
} satisfies Config;