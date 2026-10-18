import test from "node:test";
import assert from "node:assert/strict";

import { anthropicConfig } from "./config.mjs";

const withEnv = (values, fn) => {
  const saved = {};
  for (const [key, value] of Object.entries(values)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test("anthropicConfig: 기본값은 DeepSeek Anthropic 호환 엔드포인트", () => {
  withEnv({ ANTHROPIC_BASE_URL: undefined, ANTHROPIC_MODEL: undefined }, () => {
    const config = anthropicConfig();
    assert.equal(config.url, "https://api.deepseek.com/anthropic/v1/messages");
    assert.equal(config.version, "2023-06-01");
    assert.equal(config.model, "claude-sonnet-4-20250514");
    assert.equal(config.maxTokens, 4096);
  });
});

test("anthropicConfig: env 로 base URL·모델을 바꾸고 끝 슬래시를 정리한다", () => {
  withEnv({ ANTHROPIC_BASE_URL: "https://example.test/anthropic/", ANTHROPIC_MODEL: "test-model" }, () => {
    const config = anthropicConfig();
    assert.equal(config.url, "https://example.test/anthropic/v1/messages");
    assert.equal(config.model, "test-model");
  });
});
