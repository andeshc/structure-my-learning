import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getProvider, getModel, MODELS } from './llm.js';

function setEnv(key, val) {
  if (val === undefined) delete process.env[key];
  else process.env[key] = val;
}

describe('getProvider', () => {
  let orig;
  beforeEach(() => { orig = process.env.AI_PROVIDER; });
  afterEach(() => setEnv('AI_PROVIDER', orig));

  it('defaults to anthropic when AI_PROVIDER is unset', () => {
    delete process.env.AI_PROVIDER;
    expect(getProvider()).toBe('anthropic');
  });

  it('defaults to anthropic when AI_PROVIDER is empty string', () => {
    process.env.AI_PROVIDER = '';
    expect(getProvider()).toBe('anthropic');
  });

  it('returns anthropic when AI_PROVIDER=anthropic', () => {
    process.env.AI_PROVIDER = 'anthropic';
    expect(getProvider()).toBe('anthropic');
  });

  it('returns openai when AI_PROVIDER=openai', () => {
    process.env.AI_PROVIDER = 'openai';
    expect(getProvider()).toBe('openai');
  });

  it('is case-insensitive (ANTHROPIC → anthropic)', () => {
    process.env.AI_PROVIDER = 'ANTHROPIC';
    expect(getProvider()).toBe('anthropic');
  });

  it('is case-insensitive (OpenAI → openai)', () => {
    process.env.AI_PROVIDER = 'OpenAI';
    expect(getProvider()).toBe('openai');
  });

  it('throws for an unknown provider', () => {
    process.env.AI_PROVIDER = 'bedrock';
    expect(() => getProvider()).toThrow('Unknown AI_PROVIDER');
  });

  it('error message includes the bad provider name', () => {
    process.env.AI_PROVIDER = 'bedrock';
    expect(() => getProvider()).toThrow('bedrock');
  });
});

describe('getModel', () => {
  let orig;
  beforeEach(() => { orig = process.env.AI_PROVIDER; });
  afterEach(() => setEnv('AI_PROVIDER', orig));

  it('returns the anthropic generate model by default', () => {
    delete process.env.AI_PROVIDER;
    expect(getModel('generate')).toBe(MODELS.anthropic.generate);
  });

  it('returns the anthropic review model by default', () => {
    delete process.env.AI_PROVIDER;
    expect(getModel('review')).toBe(MODELS.anthropic.review);
  });

  it('returns the openai generate model when AI_PROVIDER=openai', () => {
    process.env.AI_PROVIDER = 'openai';
    expect(getModel('generate')).toBe(MODELS.openai.generate);
  });

  it('returns the openai review model when AI_PROVIDER=openai', () => {
    process.env.AI_PROVIDER = 'openai';
    expect(getModel('review')).toBe(MODELS.openai.review);
  });

  it('anthropic generate and review model IDs are distinct', () => {
    expect(MODELS.anthropic.generate).not.toBe(MODELS.anthropic.review);
  });

  it('openai generate and review model IDs are distinct', () => {
    expect(MODELS.openai.generate).not.toBe(MODELS.openai.review);
  });
});
