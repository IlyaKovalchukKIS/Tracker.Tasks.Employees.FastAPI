/**
 * Every string the interface asks for must exist in both languages.
 *
 * The keys are collected from the source instead of being listed here, so a new
 * `t('…')` call without a translation fails the suite.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { ROLES, TASK_PRIORITIES, TASK_STATUSES } from '../js/core/domain.js';
import en from '../js/core/locales/en.js';
import ru from '../js/core/locales/ru.js';

const SOURCE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'js');

// `t('key')` — the negative lookbehind keeps unrelated calls such as
// `params.get('status')` out of the results.
const CALL_PATTERN = /(?<![\w.])t\('([a-z][\w.]*)'/g;
// Keys passed around as data, for example `labelKey: 'nav.tasks'`.
const KEY_PROPERTY_PATTERN = /(?:labelKey|titleKey|crumbKey):\s*'([a-z][\w.]*)'/g;
// Entries of the translated-string arrays, for example the sign-in highlights.
const KEY_ARRAY_PATTERN = /'((?:auth\.highlight|error\.state)[\w.]*)'/g;

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.js') && !path.includes(`${'locales'}/`) ? [path] : [];
  });
}

function usedKeys() {
  const keys = new Set();
  for (const file of sourceFiles(SOURCE_DIR)) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of [CALL_PATTERN, KEY_PROPERTY_PATTERN, KEY_ARRAY_PATTERN]) {
      for (const match of source.matchAll(pattern)) keys.add(match[1]);
    }
  }
  return [...keys].sort();
}

describe('translations', () => {
  it('finds the keys the interface uses', () => {
    // A guard against the collection above silently matching nothing.
    assert.ok(usedKeys().length > 100);
  });

  it('defines every used key in English', () => {
    const missing = usedKeys().filter((key) => !(key in en));
    assert.deepEqual(missing, [], `missing English copy for: ${missing.join(', ')}`);
  });

  it('defines every used key in Russian', () => {
    const missing = usedKeys().filter((key) => !(key in ru));
    assert.deepEqual(missing, [], `missing Russian copy for: ${missing.join(', ')}`);
  });

  it('keeps both dictionaries in step', () => {
    const onlyInEnglish = Object.keys(en).filter((key) => !(key in ru));
    const onlyInRussian = Object.keys(ru).filter((key) => !(key in en));
    assert.deepEqual(onlyInEnglish, [], `not translated to Russian: ${onlyInEnglish.join(', ')}`);
    assert.deepEqual(onlyInRussian, [], `not present in English: ${onlyInRussian.join(', ')}`);
  });

  it('covers every enumeration the API can return', () => {
    const expected = [
      ...TASK_STATUSES.map((status) => `task.status.${status}`),
      ...TASK_PRIORITIES.map((priority) => `task.priority.${priority}`),
      ...ROLES.map((role) => `role.${role}`),
    ];
    const missing = expected.filter((key) => !(key in en) || !(key in ru));
    assert.deepEqual(missing, [], `missing labels for: ${missing.join(', ')}`);
  });

  it('uses the same placeholders in both languages', () => {
    const placeholders = (value) => (value.match(/\{(\w+)\}/g) ?? []).sort().join(',');
    const mismatched = Object.keys(en).filter(
      (key) => key in ru && placeholders(en[key]) !== placeholders(ru[key]),
    );
    assert.deepEqual(mismatched, [], `placeholder mismatch in: ${mismatched.join(', ')}`);
  });
});
