/**
 * Translation of API failures into something a view can render.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ApiError, ERROR_KIND, classifyStatus, describeFailure, extractFieldErrors } from '../js/core/api-error.js';

describe('classifyStatus', () => {
  it('maps the statuses the API can return', () => {
    assert.equal(classifyStatus(0), ERROR_KIND.NETWORK);
    assert.equal(classifyStatus(401), ERROR_KIND.UNAUTHORIZED);
    assert.equal(classifyStatus(403), ERROR_KIND.FORBIDDEN);
    assert.equal(classifyStatus(404), ERROR_KIND.NOT_FOUND);
    assert.equal(classifyStatus(409), ERROR_KIND.CONFLICT);
    assert.equal(classifyStatus(422), ERROR_KIND.VALIDATION);
    assert.equal(classifyStatus(500), ERROR_KIND.SERVER);
    assert.equal(classifyStatus(503), ERROR_KIND.SERVER);
  });

  it('falls back to unknown for anything else', () => {
    assert.equal(classifyStatus(418), ERROR_KIND.UNKNOWN);
  });
});

describe('extractFieldErrors', () => {
  it('keys FastAPI validation errors by field name', () => {
    const detail = [
      { loc: ['body', 'email'], msg: 'value is not a valid email address' },
      { loc: ['body', 'password'], msg: 'String should have at least 8 characters' },
    ];
    assert.deepEqual(extractFieldErrors(detail), {
      email: 'value is not a valid email address',
      password: 'String should have at least 8 characters',
    });
  });

  it('keeps the first message when a field fails twice', () => {
    const detail = [
      { loc: ['body', 'title'], msg: 'first' },
      { loc: ['body', 'title'], msg: 'second' },
    ];
    assert.deepEqual(extractFieldErrors(detail), { title: 'first' });
  });

  it('drops the query prefix and falls back for unlocated errors', () => {
    assert.deepEqual(extractFieldErrors([{ loc: ['query', 'limit'], msg: 'too large' }]), { limit: 'too large' });
    assert.deepEqual(extractFieldErrors([{ loc: [], msg: 'broken' }]), { _: 'broken' });
  });

  it('returns nothing for a plain string detail', () => {
    assert.deepEqual(extractFieldErrors('Task not found'), {});
  });
});

describe('describeFailure', () => {
  it('keeps the server message so it can be translated', () => {
    const described = describeFailure(409, { detail: 'Email is already registered' });
    assert.equal(described.kind, ERROR_KIND.CONFLICT);
    assert.equal(described.detail, 'Email is already registered');
    assert.deepEqual(described.fieldErrors, {});
  });

  it('reports field errors for a validation failure', () => {
    const described = describeFailure(422, { detail: [{ loc: ['body', 'title'], msg: 'Field required' }] });
    assert.equal(described.kind, ERROR_KIND.VALIDATION);
    assert.equal(described.detail, null);
    assert.deepEqual(described.fieldErrors, { title: 'Field required' });
  });

  it('survives an empty or non-JSON body', () => {
    const described = describeFailure(500, null);
    assert.equal(described.kind, ERROR_KIND.SERVER);
    assert.equal(described.detail, null);
  });
});

describe('ApiError', () => {
  it('carries the status, kind, and field errors', () => {
    const error = new ApiError({
      status: 422,
      kind: ERROR_KIND.VALIDATION,
      message: 'Check the fields',
      fieldErrors: { title: 'Required' },
    });
    assert.equal(error instanceof Error, true);
    assert.equal(error.name, 'ApiError');
    assert.equal(error.status, 422);
    assert.equal(error.message, 'Check the fields');
    assert.deepEqual(error.fieldErrors, { title: 'Required' });
    assert.equal(error.needsSignIn, false);
  });

  it('signals when signing in again is the way out', () => {
    const error = new ApiError({ status: 401, kind: ERROR_KIND.UNAUTHORIZED, message: 'Expired' });
    assert.equal(error.needsSignIn, true);
  });
});
