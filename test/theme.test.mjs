import test from 'node:test';
import assert from 'node:assert/strict';
import {nextTheme,resolveTheme,validTheme} from '../dist/lib/theme.mjs';
test('theme cycles through system, light, dark, system',()=>{assert.equal(nextTheme('system'),'light');assert.equal(nextTheme('light'),'dark');assert.equal(nextTheme('dark'),'system');});
test('explicit choices override system, invalid stored values recover',()=>{assert.equal(resolveTheme('light',true),'light');assert.equal(resolveTheme('dark',false),'dark');assert.equal(resolveTheme('system',true),'dark');assert.equal(resolveTheme('system',false),'light');assert.equal(validTheme('bad'),'system');});
