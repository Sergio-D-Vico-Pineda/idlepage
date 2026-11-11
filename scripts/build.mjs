#!/usr/bin/env node
/**
 * Build pipeline for the idle page.
 *
 *   node scripts/build.mjs           one-off build
 *   node scripts/build.mjs --watch   rebuild whenever a source file changes
 *
 * It does three things:
 *   1. Renders the PWA icons (and favicon.ico) from icons/icon.svg.
 *   2. Compiles Tailwind into css/tailwind.css.
 *   3. Rewrites the ?v=<hash> cache busters in index.html and the
 *      VERSION/ASSETS block in sw.js, so a content change is enough to
 *      invalidate both the HTTP cache and the service worker cache.
 */
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import resvg from '@resvg/resvg-js';

const { Resvg } = resvg;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const abs = (file) => path.join(ROOT, file);

const TAILWIND_CLI = 'node_modules/@tailwindcss/cli/dist/index.mjs';
const TAILWIND_IN = 'src/tailwind.css';
const TAILWIND_OUT = 'css/tailwind.css';

const ICON_SVG = 'icons/icon.svg';
const PNG_ICONS = [
    { file: 'icons/icon-192.png', size: 192, scale: 1 },
    { file: 'icons/icon-512.png', size: 512, scale: 1 },
    { file: 'icons/icon-maskable-512.png', size: 512, scale: 0.72 },
    { file: 'icons/apple-touch-icon.png', size: 180, scale: 1 }
];
const ICO_SIZES = [16, 32, 48];

// Everything the service worker precaches. Entries that appear in index.html
// with a ?v= hash get the same hash here.
const PRECACHE = [
    './',
    './index.html',
    './css/tailwind.css',
    './css/style.css',
    './js/calendar.js',
    './js/clock.js',
    './fonts/Inter.woff2',
    './fonts/sf-ui-display-medium.woff',
    './fonts/sf-ui-display-semibold.woff',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png',
    './icons/favicon.ico',
    './manifest.webmanifest'
];

// Files that end up in dist/. Keep this in sync with PRECACHE.
const PUBLISH = [
    'index.html',
    'manifest.webmanifest',
    'sw.js',
    'css/tailwind.css',
    'css/style.css',
    'js/calendar.js',
    'js/clock.js',
    'fonts/Inter.woff2',
    'fonts/sf-ui-display-medium.woff',
    'fonts/sf-ui-display-semibold.woff',
    'icons/icon.svg',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/icon-maskable-512.png',
    'icons/apple-touch-icon.png',
    'icons/favicon.ico'
];

const VERSION_REF = /"\.\/([\w./-]+)\?v=[^"]*"/g;

const hash = (buffer) => createHash('sha1').update(buffer).digest('hex').slice(0, 8);

async function read(file) {
    return readFile(abs(file));
}

async function writeIfChanged(file, data) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    try {
        const current = await read(file);
        if (current.equals(buffer)) return false;
    } catch {
        // Missing file: fall through and write it.
    }
    await writeFile(abs(file), buffer);
    return true;
}

/* --- 1. Icons ---------------------------------------------------------- */

// Puts the artwork on a black canvas with padding, for the maskable icon.
function paddedSvg(svg, scale) {
    const inner = svg.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    const offset = (512 * (1 - scale)) / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
        `<g transform="translate(${offset} ${offset}) scale(${scale})">${inner}</g></svg>`;
}

function renderPng(svg, size, scale) {
    const source = scale === 1 ? svg : paddedSvg(svg, scale);
    return new Resvg(source, {
        fitTo: { mode: 'width', value: size },
        background: '#000000'
    }).render().asPng();
}

// ICO container with PNG-compressed entries (supported everywhere that matters).
function buildIco(images) {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(images.length, 4);

    const entries = [];
    const payloads = [];
    let offset = header.length + images.length * 16;

    for (const { size, data } of images) {
        const entry = Buffer.alloc(16);
        entry.writeUInt8(size >= 256 ? 0 : size, 0);
        entry.writeUInt8(size >= 256 ? 0 : size, 1);
        entry.writeUInt8(0, 2);
        entry.writeUInt8(0, 3);
        entry.writeUInt16LE(1, 4);
        entry.writeUInt16LE(32, 6);
        entry.writeUInt32LE(data.length, 8);
        entry.writeUInt32LE(offset, 12);
        offset += data.length;
        entries.push(entry);
        payloads.push(data);
    }

    return Buffer.concat([header, ...entries, ...payloads]);
}

async function buildIcons() {
    const svg = await read(ICON_SVG).then((buffer) => buffer.toString('utf8'));
    const changed = [];

    for (const { file, size, scale } of PNG_ICONS) {
        if (await writeIfChanged(file, renderPng(svg, size, scale))) changed.push(file);
    }

    const ico = buildIco(ICO_SIZES.map((size) => ({ size, data: renderPng(svg, size, 1) })));
    if (await writeIfChanged('icons/favicon.ico', ico)) changed.push('icons/favicon.ico');

    return changed;
}

/* --- 2. Tailwind ------------------------------------------------------- */

function runTailwind() {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [
            TAILWIND_CLI,
            '-i', TAILWIND_IN,
            '-o', TAILWIND_OUT,
            '--minify'
        ], { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] });

        let stderr = '';
        child.stderr.on('data', (chunk) => { stderr += chunk; });
        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Tailwind exited with code ${code}\n${stderr}`));
        });
    });
}

/* --- 3. Cache busters + service worker version ------------------------- */

async function hashReferences(html) {
    const files = new Set([...html.matchAll(VERSION_REF)].map((match) => match[1]));
    const hashes = new Map();
    for (const file of files) hashes.set(file, hash(await read(file)));
    return hashes;
}

async function updateIndex() {
    const html = await read('index.html').then((buffer) => buffer.toString('utf8'));
    const hashes = await hashReferences(html);
    const updated = html.replace(VERSION_REF, (match, file) => `"./${file}?v=${hashes.get(file)}"`);
    return { changed: await writeIfChanged('index.html', updated), hashes };
}

async function updateServiceWorker(hashes) {
    const assets = PRECACHE.map((entry) => {
        const file = entry.replace('./', '');
        return hashes.has(file) ? `./${file}?v=${hashes.get(file)}` : entry;
    });

    // The version covers every precached byte, so any edit invalidates the cache.
    const fingerprint = [];
    for (const entry of assets) {
        const file = entry.replace('./', '').split('?')[0];
        if (!file) continue;
        fingerprint.push(`${file}:${hash(await read(file))}`);
    }
    const version = hash(Buffer.from(fingerprint.join('\n')));

    let source = await read('sw.js').then((buffer) => buffer.toString('utf8'));
    source = source.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
    source = source.replace(
        /const ASSETS = \[[\s\S]*?\n\];/,
        `const ASSETS = [\n${assets.map((entry) => `    '${entry}',`).join('\n')}\n];`
    );

    return { changed: await writeIfChanged('sw.js', source), version };
}

/* --- 4. Publish -------------------------------------------------------- */

async function publish() {
    await rm(abs('dist'), { recursive: true, force: true });
    await mkdir(abs('dist'), { recursive: true });

    for (const file of PUBLISH) {
        const destination = abs(path.join('dist', file));
        await mkdir(path.dirname(destination), { recursive: true });
        await cp(abs(file), destination);
    }
}

/* --- Build ------------------------------------------------------------- */

async function build() {
    const started = Date.now();

    await runTailwind();
    const icons = await buildIcons();
    const index = await updateIndex();
    const worker = await updateServiceWorker(index.hashes);

    await publish();

    const changed = [
        ...icons,
        ...(index.changed ? ['index.html'] : []),
        ...(worker.changed ? ['sw.js'] : [])
    ];

    console.log(
        `build ${new Date().toLocaleTimeString()} · sw v${worker.version} · ` +
        (changed.length ? `updated ${changed.join(', ')}` : 'no cache-busting changes') +
        ` · dist/ refreshed · ${Date.now() - started}ms`
    );
}

/* --- Entry point ------------------------------------------------------- */

const watchMode = process.argv.includes('--watch');

try {
    await build();
} catch (error) {
    console.error(`build failed: ${error.message}`);
    if (!watchMode) process.exit(1);
}

if (watchMode) {
    const targets = ['index.html', 'manifest.webmanifest', 'css/style.css', 'js', 'src', 'fonts', 'icons'];
    let timer = null;
    let busy = false;

    const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            if (busy) return;
            busy = true;
            try {
                await build();
            } catch (error) {
                console.error(`build failed: ${error.message}`);
            }
            busy = false;
        }, 150);
    };

    for (const target of targets) {
        try {
            watch(abs(target), { recursive: true }, schedule).on('error', () => { });
        } catch {
            // A missing optional directory is not fatal.
        }
    }

    console.log('watching for changes (ctrl+c to stop)');
}
