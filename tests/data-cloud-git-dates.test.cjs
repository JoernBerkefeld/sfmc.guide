'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const folder = 'next/data-cloud-cli';
const ruby = `
module Jekyll
  module Hooks
    def self.register(*args, &block); $hook = block; end
  end
end
require File.join(ARGV.shift, '_plugins/data_cloud_git_dates')
source = ARGV.shift
ENV['PATH'] = '' if ENV['TEST_NO_GIT'] == '1'
Page = Struct.new(:path, :data)
Site = Struct.new(:source, :pages)
pages = ARGV.map { |path| Page.new(path, {}) }
$hook.call(Site.new(source, pages))
require 'json'
puts JSON.generate(pages.map(&:data))
`;
const run = (source, pages, env = process.env) =>
  JSON.parse(execFileSync('ruby', ['-e', ruby, root, source, ...pages], { encoding: 'utf8', env }));

test('each scoped page receives its own latest commit timestamp', () => {
  const pages = fs.readdirSync(path.join(root, folder)).filter((name) => name.endsWith('.md'));
  assert.equal(pages.length, 15);
  const paths = pages.map((name) => `${folder}/${name}`);
  const results = run(root, [...paths, 'next/index.md']);
  paths.forEach((file, i) => {
    const raw = execFileSync('git', ['-C', root, 'log', '-1', '--format=%cI', '--', file], {
      encoding: 'utf8',
    }).trim();
    assert.ok(raw, file);
    assert.equal(results[i].data_cloud_git_date, new Date(raw).toISOString().replace('.000Z', 'Z'), file);
    assert.equal(results[i].data_cloud_git_date_scoped, true);
  });
  assert.deepEqual(results.at(-1), {});
});

test('missing file history or git does not fabricate a date', () => {
  const file = `${folder}/missing.md`;
  assert.equal(run(root, [file])[0].data_cloud_git_date, null);
  assert.equal(run(root, [`${folder}/index.md`], { ...process.env, TEST_NO_GIT: '1' })[0].data_cloud_git_date, null);
});

test('layout distinguishes committed edits from retained evidence and deployment fetches history', () => {
  const layout = fs.readFileSync(path.join(root, '_layouts/page.html'), 'utf8');
  assert.match(layout, /Latest committed page edit/);
  assert.match(layout, /Prior documentation record/);
  assert.match(layout, /neither date establishes when live verification occurred/);
  assert.match(layout, /Git history not available/);
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/jekyll.yml'), 'utf8');
  assert.match(workflow, /actions\/checkout@v4\s+with:\s+fetch-depth: 0/);
});
