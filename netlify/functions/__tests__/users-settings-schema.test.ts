import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { updateUserSettingsSchema } from '../_shared/schemas';

describe('user settings schema', () => {
  it('accepts editable account settings only', () => {
    const result = updateUserSettingsSchema.parse({
      full_name: '  Priya Client  ',
      timezone: 'Asia/Kolkata',
      role: 'super_admin',
      email: 'attacker@example.com',
      organizationName: 'Edited Org',
    });

    assert.deepEqual(result, {
      full_name: 'Priya Client',
      timezone: 'Asia/Kolkata',
    });
  });

  it('allows clearing timezone to browser default', () => {
    const result = updateUserSettingsSchema.parse({
      timezone: null,
    });

    assert.deepEqual(result, { timezone: null });
  });

  it('rejects overlong timezone values', () => {
    assert.throws(() => updateUserSettingsSchema.parse({
      timezone: 'A'.repeat(101),
    }));
  });

  it('rejects whitespace-only names', () => {
    assert.throws(() => updateUserSettingsSchema.parse({
      full_name: '   ',
    }));
  });
});
