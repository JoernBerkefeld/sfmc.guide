/**
 * mcdev Pipeline Builder — localStorage persistence (Chunk 3b).
 *
 * Classic browser IIFE (NOT an ES module). Must load IMMEDIATELY AFTER
 * `mcdev-pipeline-core.js` and BEFORE the first step module — the step modules
 * (`step-environment-order.js`, `intake.js`, `builder.js`, …) capture persistence-owned
 * functions (`scheduleAutosave`, `createSaveForConfig`, `initPersistence`, `renderSavedList`)
 * off `mpbController` at their IIFE-body / require-time, so persistence must already be
 * installed by then.
 *
 * Reads shared core state/DOM/helpers LAZILY through the `mpbController` global at call time
 * (mirroring the step-lineage pattern): `C.state`, `C.dom`, `C.makeEl`, `C.setText`,
 * `C.render`, `C.goToStep`, `C.clampWizardStep`, `C.emptyWizardState`, `C.setWizardStep`.
 * Installs the persistence surface (`persistence`, `createSaveForConfig`, `scheduleAutosave`,
 * `initPersistence`, `renderSavedList`, `reopenSave`, `showBanner`, `clearBanner`, `cloneSave`,
 * `readSaveBlob`, `deriveConfigName`, `renameSave`, `deriveRestoreFailure`, `listSaves`,
 * `formatTimestamp`) onto `mpbController`.
 *
 * @typedef {import('./mcdev-pipeline-config-builder.js').WizardState} WizardState
 */

/**
 * @param {Window} global host window object
 */
(function (global) {
    'use strict';

    const C = global.mpbController;
    if (!C) {
        throw new Error('mcdev-pipeline-core.js must load before mcdev-pipeline-persistence.js');
    }

    const document_ = global.document;

    /**
     * localStorage key scheme. Saved configs live under `mcdevpipe::save::<id>`; the single-tab
     * editing lease for a config lives under `mcdevpipe::lock::<id>`. Ids are `crypto.randomUUID()`.
     */
    const SAVE_PREFIX = 'mcdevpipe::save::';

    const LOCK_PREFIX = 'mcdevpipe::lock::';
    const SAVE_VERSION = 1;
    const AUTOSAVE_DELAY_MS = 300;
    const LOCK_HEARTBEAT_MS = 4000;
    const LOCK_STALE_MS = 10_000;
    const STORAGE_WARNING_BYTES = 4_000_000;


    /**
     * A collision-resistant id — `crypto.randomUUID()` when available, else a random+time fallback.
     *
     * @returns {string} a fresh id
     */
    function newId() {
        if (global.crypto && typeof global.crypto.randomUUID === 'function') {
            return global.crypto.randomUUID();
        }
        return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }


    /**
     * This tab's identity for the lock lease (distinguishes our own writes from other tabs').
     */
    const TAB_ID = newId();


    /**
     * Persistence runtime state (module-scope, not part of the builder-facing `wizardState`):
     * the active save id, the debounce + heartbeat timers, the in-memory fallback store used when
     * localStorage is blocked, and whether the current config is opened read-only (another tab holds
     * the lock and the user hasn't taken over).
     */
    const persistence = {
        available: null, // null until probed; then true/false
        currentId: null, // id of the save being edited
        autosaveTimer: null,
        heartbeatTimer: null,
        memoryStore: {}, // id -> blob, used only when localStorage is unavailable
        readOnly: false, // true when another tab owns the lock and we haven't taken over
    };


    /**
     * Probe whether localStorage is usable (private mode / enterprise lockdown can throw on write).
     * Cached after the first call. When unavailable we fall back to an in-memory store and show a
     * persistent "download-only" banner so the rest of the tool keeps working.
     *
     * @returns {boolean} true when localStorage can be written and read
     */
    function storageAvailable() {
        if (persistence.available !== null) {
            return persistence.available;
        }
        persistence.available = false;
        try {
            const probe = '__mcdevpipe_probe__';
            global.localStorage.setItem(probe, '1');
            global.localStorage.removeItem(probe);
            persistence.available = true;
        } catch {
            persistence.available = false;
        }
        return persistence.available;
    }


    /**
     * True when an error looks like a storage quota overflow. Browsers disagree on the exact shape
     * (name vs. legacy numeric code 22, Firefox's 1014), so we cast a wide net.
     *
     * @param {(Error|{name?: string, code?: number, message?: string}|null)} error a caught error
     * @returns {boolean} true when it is a quota-exceeded error
     */
    function isQuotaError(error) {
        if (!error) {
            return false;
        }
        return (
            error.name === 'QuotaExceededError' ||
            error.code === 22 ||
            error.code === 1014 ||
            /quota/i.test(error.message || '')
        );
    }


    /**
     * Read a raw save blob by id (localStorage or the in-memory fallback), or null when missing/corrupt.
     *
     * @param {string} id the save id
     * @returns {(object|null)} the parsed blob, or null
     */
    function readSaveBlob(id) {
        if (!storageAvailable()) {
            return persistence.memoryStore[id] || null;
        }
        try {
            const raw = global.localStorage.getItem(SAVE_PREFIX + id);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }


    /**
     * Write a save blob by id. Returns `{ ok }` — on a quota overflow `ok` is false and the caller
     * surfaces the "storage full" banner instead of throwing.
     *
     * @param {string} id the save id
     * @param {object} blob the entry `{ id, name, version, timestamp, config, wizardState }`
     * @returns {{ok: boolean, quota: boolean}} write outcome
     */
    function writeSaveBlob(id, blob) {
        if (!storageAvailable()) {
            persistence.memoryStore[id] = blob;
            return { ok: true, quota: false };
        }
        try {
            global.localStorage.setItem(SAVE_PREFIX + id, JSON.stringify(blob));
            return { ok: true, quota: false };
        } catch (ex) {
            return { ok: false, quota: isQuotaError(ex) };
        }
    }


    /**
     * List all saved configs, newest first. Corrupt entries are skipped (never crash the intake list).
     *
     * @returns {{id: string, name: string, version: number, timestamp: number, bytes: number}[]} saves
     */
    function listSaves() {
        const saves = [];
        if (!storageAvailable()) {
            for (const [id, blob] of Object.entries(persistence.memoryStore)) {
                if (blob) {
                    saves.push({
                        id: id,
                        name: blob.name || id,
                        version: blob.version || 0,
                        timestamp: blob.timestamp || 0,
                        bytes: JSON.stringify(blob).length * 2,
                    });
                }
            }
            return saves.toSorted((a, b) => b.timestamp - a.timestamp);
        }
        for (let index = 0; index < global.localStorage.length; index++) {
            const key = global.localStorage.key(index);
            if (!key || key.indexOf(SAVE_PREFIX) !== 0) {
                continue;
            }
            try {
                const raw = global.localStorage.getItem(key) || '';
                const blob = JSON.parse(raw);
                saves.push({
                    id: blob.id || key.slice(SAVE_PREFIX.length),
                    name: blob.name || key.slice(SAVE_PREFIX.length),
                    version: blob.version || 0,
                    timestamp: blob.timestamp || 0,
                    bytes: (key.length + raw.length) * 2,
                });
            } catch {
                // Skip a corrupt entry rather than break the whole list.
            }
        }
        return saves.toSorted((a, b) => b.timestamp - a.timestamp);
    }


    /**
     * Delete a saved config (and its lock) by id, from whichever store is in use.
     *
     * @param {string} id the save id
     * @returns {void}
     */
    function deleteSave(id) {
        if (!storageAvailable()) {
            delete persistence.memoryStore[id];
            return;
        }
        try {
            global.localStorage.removeItem(SAVE_PREFIX + id);
            global.localStorage.removeItem(LOCK_PREFIX + id);
        } catch {
            // Best-effort removal.
        }
    }


    /**
     * Approximate bytes consumed by this origin's localStorage (UTF-16, so char count × 2). O(keys),
     * cheap enough to call after each autosave. Returns 0 when storage is unavailable.
     *
     * @returns {number} approximate bytes used
     */
    function storageFootprint() {
        if (!storageAvailable()) {
            return 0;
        }
        let bytes = 0;
        for (let index = 0; index < global.localStorage.length; index++) {
            const key = global.localStorage.key(index);
            if (key == null) {
                continue;
            }
            const value = global.localStorage.getItem(key) || '';
            bytes += (key.length + value.length) * 2;
        }
        return bytes;
    }


    /**
     * Derive the default config label from the FIRST credential entry: `"<credName> (<eid>)"`
     * (e.g. `cred (510004860)`). Multiple credentials is an edge case — the first entry always names
     * it. The stored name becomes authoritative once the user renames it.
     *
     * @param {object} config the parsed `.mcdevrc.json`
     * @returns {string} the derived default name
     */
    function deriveConfigName(config) {
        const credentials = (config && config.credentials) || {};
        const names = Object.keys(credentials);
        if (names.length === 0) {
            return 'Untitled pipeline';
        }
        const first = names[0];
        const eid = credentials[first] && credentials[first].eid;
        return eid == null ? first : first + ' (' + eid + ')';
    }


    /**
     * The next free ` v2` / ` v3` / … name for a clone: strip any trailing ` vN`, then scan existing
     * saves sharing that base and return base + the highest-in-use suffix incremented (min ` v2`).
     *
     * @param {string} name the source config name
     * @returns {string} a unique versioned clone name
     */
    function nextVersionName(name) {
        const base = String(name || 'Untitled pipeline').replace(/ v\d+$/, '');
        let highest = 1;
        for (const save of listSaves()) {
            if (save.name === base) {
                highest = Math.max(highest, 1);
                continue;
            }
            const match = /^(.*) v(\d+)$/.exec(save.name);
            if (match && match[1] === base) {
                highest = Math.max(highest, Number(match[2]));
            }
        }
        return base + ' v' + (highest + 1);
    }


    /**
     * Build a fresh save blob from the current app state.
     *
     * @param {string} id the save id
     * @param {string} name the config name
     * @returns {{id: string, name: string, version: number, timestamp: number, config: object, wizardState: WizardState}} the blob
     */
    function buildSaveBlob(id, name) {
        return {
            id: id,
            name: name,
            version: SAVE_VERSION,
            timestamp: Date.now(),
            config: C.state.config,
            wizardState: C.state.wizardState,
        };
    }


    /**
     * Create a new save for a freshly-accepted config and make it the active one. Called from the
     * intake success path so every accepted config is immediately persisted and resumable.
     *
     * @param {object} config the parsed, validated config
     * @returns {void}
     */
    function createSaveForConfig(config) {
        // Accepting a fresh config clears any stale cross-device "shared link not in this browser"
        // notice from a leftover `?s=`/hash deep link (no-op when it isn't showing).
        clearBanner('deeplink');
        const id = newId();
        persistence.currentId = id;
        persistence.readOnly = false;
        const blob = buildSaveBlob(id, deriveConfigName(config));
        const result = writeSaveBlob(id, blob);
        if (!result.ok && result.quota) {
            showQuotaBanner();
        }
        acquireLock(id);
    }


    /**
     * Persist the current state under the active save id (autosave target). No-op when read-only or
     * when there is no active id. On a quota overflow the "storage full" banner is shown.
     *
     * @returns {void}
     */
    function persistCurrent() {
        if (!persistence.currentId || persistence.readOnly) {
            return;
        }
        const existing = readSaveBlob(persistence.currentId);
        const name = existing && existing.name ? existing.name : deriveConfigName(C.state.config);
        const result = writeSaveBlob(persistence.currentId, buildSaveBlob(persistence.currentId, name));
        if (!result.ok && result.quota) {
            showQuotaBanner();
        }
        renderStorageGauge();
    }


    /**
     * Schedule a debounced autosave. Called on every state-changing render so a reopened config
     * resumes exactly where the user left off.
     *
     * @returns {void}
     */
    function scheduleAutosave() {
        if (!persistence.currentId || persistence.readOnly) {
            return;
        }
        if (persistence.autosaveTimer) {
            global.clearTimeout(persistence.autosaveTimer);
        }
        persistence.autosaveTimer = global.setTimeout(() => {
            persistence.autosaveTimer = null;
            persistCurrent();
        }, AUTOSAVE_DELAY_MS);
    }


    /**
     * Flush any pending autosave immediately (on tab hide / unload) so no in-flight edit is lost.
     *
     * @returns {void}
     */
    function flushAutosave() {
        if (persistence.autosaveTimer) {
            global.clearTimeout(persistence.autosaveTimer);
            persistence.autosaveTimer = null;
        }
        persistCurrent();
    }


    // ── Single-tab editing lock ────────────────────────────────────────────────

    /**
     * Read the current lock lease for a save id, or null when none/stale/corrupt.
     *
     * @param {string} id the save id
     * @returns {({tabId: string, ts: number}|null)} the live lease, or null
     */
    function readLock(id) {
        if (!storageAvailable()) {
            return null;
        }
        try {
            const raw = global.localStorage.getItem(LOCK_PREFIX + id);
            if (!raw) {
                return null;
            }
            const lock = JSON.parse(raw);
            if (!lock || Date.now() - (lock.ts || 0) > LOCK_STALE_MS) {
                return null;
            }
            return lock;
        } catch {
            return null;
        }
    }


    /**
     * Write/refresh this tab's lock lease for a save id.
     *
     * @param {string} id the save id
     * @returns {void}
     */
    function writeLock(id) {
        if (!storageAvailable()) {
            return;
        }
        try {
            global.localStorage.setItem(LOCK_PREFIX + id, JSON.stringify({ tabId: TAB_ID, ts: Date.now() }));
        } catch {
            // A lock write failing (e.g. quota) must never block editing.
        }
    }


    /**
     * Acquire (or take over) the editing lock for a save id and start the heartbeat. When another tab
     * holds a live lease we open read-only and offer a "Take over" banner rather than clobbering it.
     *
     * @param {string} id the save id
     * @returns {void}
     */
    function acquireLock(id) {
        stopHeartbeat();
        const existing = readLock(id);
        if (existing && existing.tabId !== TAB_ID) {
            persistence.readOnly = true;
            showLockedBanner(id);
            return;
        }
        persistence.readOnly = false;
        clearBanner('locked');
        writeLock(id);
        persistence.heartbeatTimer = global.setInterval(() => {
            if (persistence.currentId && !persistence.readOnly) {
                writeLock(persistence.currentId);
            }
        }, LOCK_HEARTBEAT_MS);
    }


    /**
     * Take over editing after the config was opened read-only (another tab's lease). Claims the lock,
     * clears the read-only banner, and re-renders.
     *
     * @returns {void}
     */
    function takeOverLock() {
        if (!persistence.currentId) {
            return;
        }
        persistence.readOnly = false;
        clearBanner('locked');
        acquireLock(persistence.currentId);
        C.render();
    }


    /**
     * Stop the lock heartbeat timer.
     *
     * @returns {void}
     */
    function stopHeartbeat() {
        if (!persistence.heartbeatTimer) {
        	return;
        }

        global.clearInterval(persistence.heartbeatTimer);
        persistence.heartbeatTimer = null;
    }


    /**
     * Release the active lock (on unload) so another tab can pick the config up immediately.
     *
     * @returns {void}
     */
    function releaseLock() {
        stopHeartbeat();
        if (!persistence.currentId || persistence.readOnly || !storageAvailable()) {
            return;
        }
        try {
            const existing = readLock(persistence.currentId);
            if (existing && existing.tabId === TAB_ID) {
                global.localStorage.removeItem(LOCK_PREFIX + persistence.currentId);
            }
        } catch {
            // Best-effort release.
        }
    }


    /**
     * Handle a cross-tab `storage` event. Two cases matter for the config we are editing:
     * another tab wrote a newer SAVE for it (offer Reload), or another tab claimed its LOCK
     * (we became read-only — offer Take over).
     *
     * @param {StorageEvent} event the storage event
     * @returns {void}
     */
    function onStorageEvent(event) {
        if (!event || !persistence.currentId || !event.key) {
            return;
        }
        if (event.key === SAVE_PREFIX + persistence.currentId && event.newValue && !persistence.readOnly) {
            // Another tab saved a newer version of the config we're editing — never silently clobber.
            showExternalChangeBanner(persistence.currentId);
        } else if (event.key === LOCK_PREFIX + persistence.currentId && event.newValue) {
            try {
                const lock = JSON.parse(event.newValue);
                if (lock && lock.tabId && lock.tabId !== TAB_ID) {
                    persistence.readOnly = true;
                    stopHeartbeat();
                    showLockedBanner(persistence.currentId);
                    C.render();
                }
            } catch {
                // Ignore an unparseable lock write.
            }
        }
    }


    // ── Restore / reopen ───────────────────────────────────────────────────────

    /**
     * Reopen a saved config: version-guard the blob, load it into state, acquire its lock, and jump
     * to the mode step (or output when a mode was already chosen). A version mismatch or missing
     * required field falls back to intake with a banner rather than crashing.
     *
     * @param {string} id the save id
     * @returns {void}
     */
    function reopenSave(id) {
        const blob = readSaveBlob(id);
        if (!blob || blob.version !== SAVE_VERSION || !blob.config || !blob.wizardState) {
            deriveRestoreFailure();
            return;
        }
        clearBanner('restore');
        // A newly-opened session supersedes any cross-device "shared link not in this browser"
        // notice, so drop the deeplink banner too (no-op when it isn't showing).
        clearBanner('deeplink');
        persistence.currentId = id;
        C.state.config = blob.config;
        C.state.wizardState = Object.assign(C.emptyWizardState(), blob.wizardState);
        // Restore the persisted mode so a deep link / reload lands on the right wizard steps. The
        // mode-picker view was removed, so a save that persisted 'validations' still reopens in that
        // mode; anything else (including older mode-less saves) defaults to full-pipeline mode.
        C.state.mode = C.state.wizardState.mode === 'validations' ? 'validations' : 'full';
        C.state.wizardState.mode = C.state.mode;
        acquireLock(id);
        // Land on the first wizard step the restored mode implies (the mode picker no longer exists).
        const steps = C.clampWizardStep();
        C.setWizardStep(steps.length > 0 ? steps[0].id : null);
        C.goToStep('wizard');
    }


    /**
     * Surface a non-crashing "couldn't restore" banner and stay on intake.
     *
     * @returns {void}
     */
    function deriveRestoreFailure() {
        showBanner(
            'restore',
            "Couldn't restore this saved session (it was made by a different version of this tool). " +
                'Please re-import your .mcdevrc.json to continue.',
            [],
            'danger'
        );
    }


    // ── Banners ─────────────────────────────────────────────────────────────────

    /**
     * Show (or replace) a keyed status banner in `#mpb-banners`. Keyed so each concern
     * (storage-disabled / quota / locked / external-change / restore) owns exactly one banner and
     * repeated calls update rather than stack. Built with `makeElement`/`setText` only.
     *
     * @param {string} key the banner key (dedupe id)
     * @param {string} message the banner text
     * @param {{label: string, onClick: () => void}[]} [actions] optional action buttons
     * @param {('warning'|'danger'|'')} [variant] optional visual tone
     * @returns {void}
     */
    function showBanner(key, message, actions, variant) {
        const dom = C.dom;
        if (!dom.banners) {
            return;
        }
        clearBanner(key);
        const className = variant ? 'mpb-banner mpb-banner--' + variant : 'mpb-banner';
        const banner = C.makeEl('div', {
            class: className,
            attrs: { 'data-banner': key, role: variant === 'danger' ? 'alert' : 'status' },
        });
        banner.append(C.makeEl('span', { class: 'mpb-banner-msg', text: message }));
        const actionList = actions || [];
        if (actionList.length > 0) {
            const actionsWrap = C.makeEl('div', { class: 'mpb-banner-actions' });
            for (const action of actionList) {
                const button = C.makeEl('button', {
                    type: 'button',
                    class: 'mpb-btn mpb-btn--secondary',
                    text: action.label,
                });
                button.addEventListener('click', action.onClick);
                actionsWrap.append(button);
            }
            banner.append(actionsWrap);
        }
        dom.banners.append(banner);
    }


    /**
     * Remove a keyed banner if present.
     *
     * @param {string} key the banner key
     * @returns {void}
     */
    function clearBanner(key) {
        const dom = C.dom;
        if (!dom.banners) {
            return;
        }
        const existing = dom.banners.querySelector('[data-banner="' + key + '"]');
        if (existing) {
            existing.remove();
        }
    }


    /**
     * Persistent "storage disabled" banner shown when localStorage is unavailable. Everything still
     * works, but nothing is saved — the user must download their files before closing.
     *
     * @returns {void}
     */
    function showStorageDisabledBanner() {
        showBanner(
            'storage',
            'Browser storage is disabled here, so your work won\u{2019}t be saved between visits. ' +
                'Download your files before closing this tab.',
            [],
            'warning'
        );
    }


    /**
     * "Storage full" banner (on a quota overflow) with actionable recovery advice.
     *
     * @returns {void}
     */
    function showQuotaBanner() {
        showBanner(
            'quota',
            'Browser storage is full — download your generated files, then delete old saved configs below.',
            [],
            'danger'
        );
    }


    /**
     * Read-only banner shown when the config is already open in another tab, with a "Take over" action.
     *
     * @param {string} id the save id (unused directly; take-over uses the active id)
     * @returns {void}
     */
    function showLockedBanner(id) {
        void id;
        showBanner(
            'locked',
            'This config is open in another tab, so it\u{2019}s read-only here to avoid conflicting edits.',
            [{ label: 'Take over editing', onClick: takeOverLock }],
            'warning'
        );
    }


    /**
     * Non-destructive "changed in another tab" banner with a Reload action (loads their version).
     *
     * @param {string} id the save id
     * @returns {void}
     */
    function showExternalChangeBanner(id) {
        showBanner(
            'external',
            'This config was changed in another tab. Reload to see those changes (your unsaved edits here will be replaced).',
            [
                {
                    label: 'Reload',
                    onClick: () => {
                        clearBanner('external');
                        reopenSave(id);
                    },
                },
            ],
            'warning'
        );
    }


    // ── Saved-list + gauge UI ────────────────────────────────────────────────────

    /**
     * Format a timestamp for the saved-list rows (locale date + time, or a dash when absent).
     *
     * @param {number} ts epoch ms
     * @returns {string} a human-readable date/time
     */
    function formatTimestamp(ts) {
        if (!ts) {
            return '—';
        }
        try {
            return new Date(ts).toLocaleString();
        } catch {
            return '—';
        }
    }


    /**
     * Render the multi-config saved list into `#mpb-saved-list`: each row shows the name + timestamp
     * and offers Reopen / Rename (inline) / New version (clone) / Delete. Rebuilt with
     * `makeElement`/`setText` only. Shows a designed empty state when there are no saves.
     *
     * @returns {void}
     */
    function renderSavedList() {
        const dom = C.dom;
        if (!dom.savedList) {
            return;
        }
        C.setText(dom.savedList, '');
        // Rows mount directly under `.mpb-saved-list`; the designed empty state is the SCSS
        // `.mpb-saved-list:empty::before` rule, so an empty list needs no explicit placeholder node.
        for (const save of listSaves()) {
            dom.savedList.append(savedRow(save));
        }
        renderStorageGauge();
    }


    /**
     * Build a single saved-config row (name + timestamp + the four per-row actions).
     *
     * @param {{id: string, name: string, timestamp: number}} save a saved-config summary
     * @returns {HTMLElement} the row element
     */
    function savedRow(save) {
        const row = C.makeEl('div', { class: 'mpb-saved-row', attrs: { 'data-save-id': save.id } });

        const name = C.makeEl('span', { class: 'mpb-saved-name', text: save.name });
        row.append(name);
        row.append(
            C.makeEl('span', { class: 'mpb-saved-meta', text: formatTimestamp(save.timestamp) })
        );

        const actions = C.makeEl('div', { class: 'mpb-saved-actions' });

        const reopen = C.makeEl('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: 'Reopen',
        });
        reopen.addEventListener('click', () => {
            reopenSave(save.id);
        });
        actions.append(reopen);

        const rename = C.makeEl('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: 'Rename',
        });
        rename.addEventListener('click', () => {
            startRename(row, save);
        });
        actions.append(rename);

        const clone = C.makeEl('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: 'New version',
        });
        clone.addEventListener('click', () => {
            cloneSave(save.id);
        });
        actions.append(clone);

        const remove = C.makeEl('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: 'Delete',
        });
        remove.addEventListener('click', () => {
            removeSave(save.id);
        });
        actions.append(remove);

        row.append(actions);
        return row;
    }


    /**
     * Swap a row's name label for an inline text input + Save/Cancel to rename a saved config. The
     * stored name becomes authoritative once renamed.
     *
     * @param {HTMLElement} row the row element
     * @param {{id: string, name: string}} save the saved-config summary
     * @returns {void}
     */
    function startRename(row, save) {
        const nameElement = row.querySelector('.mpb-saved-name');
        const actions = row.querySelector('.mpb-saved-actions');
        if (!nameElement || !actions) {
            return;
        }
        const input = C.makeEl('input', {
            type: 'text',
            class: 'mpb-saved-name mpb-saved-rename',
            value: save.name,
            attrs: { 'aria-label': 'New name for this saved config' },
        });
        const save_ = C.makeEl('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: 'Save',
        });
        const cancel = C.makeEl('button', {
            type: 'button',
            class: 'mpb-btn mpb-btn--secondary',
            text: 'Cancel',
        });
        const commit = () => {
            const next = input.value.trim();
            if (next) {
                renameSave(save.id, next);
            }
            renderSavedList();
        };
        save_.addEventListener('click', commit);
        cancel.addEventListener('click', renderSavedList);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                commit();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                renderSavedList();
            }
        });
        nameElement.replaceWith(input);
        C.setText(actions, '');
        actions.append(save_);
        actions.append(cancel);
        input.focus();
        input.select();
    }


    /**
     * Rename a saved config in place (name becomes authoritative). No-op when the blob is gone.
     *
     * @param {string} id the save id
     * @param {string} name the new name
     * @returns {void}
     */
    function renameSave(id, name) {
        const blob = readSaveBlob(id);
        if (!blob) {
            return;
        }
        blob.name = name;
        blob.timestamp = Date.now();
        const result = writeSaveBlob(id, blob);
        if (!result.ok && result.quota) {
            showQuotaBanner();
        }
    }


    /**
     * Deep-clone a saved config under a fresh id with the next free ` vN` name suffix.
     *
     * @param {string} id the source save id
     * @returns {(string|null)} the new clone's id, or null when the source is missing
     */
    function cloneSave(id) {
        const blob = readSaveBlob(id);
        if (!blob) {
            return null;
        }
        const cloneId = newId();
        const clonedBlob = global.structuredClone(blob);
        clonedBlob.id = cloneId;
        clonedBlob.name = nextVersionName(blob.name || deriveConfigName(blob.config));
        clonedBlob.version = SAVE_VERSION;
        clonedBlob.timestamp = Date.now();
        const result = writeSaveBlob(cloneId, clonedBlob);
        if (!result.ok && result.quota) {
            showQuotaBanner();
        }
        renderSavedList();
        return cloneId;
    }


    /**
     * Delete a saved config. If it was the active config, clear the active id (and its lock).
     *
     * @param {string} id the save id
     * @returns {void}
     */
    function removeSave(id) {
        deleteSave(id);
        if (persistence.currentId === id) {
            stopHeartbeat();
            persistence.currentId = null;
            persistence.readOnly = false;
        }
        renderSavedList();
    }


    /**
     * Render the storage-footprint gauge into `#mpb-storage-gauge`: approximate KB/MB used, with a
     * warning class once past the pressure threshold. Hidden entirely when storage is unavailable.
     *
     * @returns {void}
     */
    function renderStorageGauge() {
        const dom = C.dom;
        if (!dom.storageGauge) {
            return;
        }
        C.setText(dom.storageGauge, '');
        if (!storageAvailable()) {
            dom.storageGauge.hidden = true;
            return;
        }
        dom.storageGauge.hidden = false;
        const bytes = storageFootprint();
        const readable =
            bytes >= 1_000_000
                ? (bytes / 1_000_000).toFixed(1) + ' MB'
                : Math.max(1, Math.round(bytes / 1000)) + ' KB';
        const isNear = bytes >= STORAGE_WARNING_BYTES;
        dom.storageGauge.className = isNear ? 'mpb-storage-gauge is-warning' : 'mpb-storage-gauge';
        const label = isNear
            ? 'Browser storage used: ' + readable + ' — download your files and delete old configs to free space.'
            : 'Browser storage used: ' + readable;
        dom.storageGauge.append(C.makeEl('span', { class: 'mpb-gauge-label', text: label }));
        // A thin fill bar, capped at the warning threshold so it visibly fills as pressure rises.
        const percent = Math.min(100, Math.round((bytes / STORAGE_WARNING_BYTES) * 100));
        const bar = C.makeEl('div', { class: 'mpb-gauge-bar' });
        bar.append(
            C.makeEl('div', { class: 'mpb-gauge-fill', attrs: { style: 'width:' + percent + '%' } })
        );
        dom.storageGauge.append(bar);
    }


    /**
     * Boot the persistence layer: probe storage (banner when disabled), paint the saved list + gauge,
     * and wire the cross-tab `storage` event + exit-flush/lock-release handlers.
     *
     * @returns {void}
     */
    function initPersistence() {
        if (!storageAvailable()) {
            showStorageDisabledBanner();
        }
        // The saved list + gauge are painted by wireEvents() (the Chunk-3b marker), which runs just
        // before this in init(); re-render here only if storage is unavailable so the gauge hides.
        if (!storageAvailable()) {
            renderStorageGauge();
        }
        global.addEventListener('storage', onStorageEvent);
        document_.addEventListener('visibilitychange', () => {
            if (document_.visibilityState === 'hidden') {
                flushAutosave();
            }
        });
        global.addEventListener('beforeunload', () => {
            flushAutosave();
            releaseLock();
        });
    }

    // ── module API ──────────────────────────────────────────────────────────────────────

    // Install the persistence surface on the controller. The four "extras" (`readSaveBlob`,
    // `deriveConfigName`, `renameSave`, `deriveRestoreFailure`) plus `listSaves` / `formatTimestamp`
    // are exposed because core-retained code (the render dispatcher, hash restore, and the leftover
    // builder-header helpers) and the tests reach them off `mpbController`.
    Object.assign(C, {
        persistence: persistence,
        createSaveForConfig: createSaveForConfig,
        scheduleAutosave: scheduleAutosave,
        initPersistence: initPersistence,
        renderSavedList: renderSavedList,
        reopenSave: reopenSave,
        showBanner: showBanner,
        clearBanner: clearBanner,
        cloneSave: cloneSave,
        readSaveBlob: readSaveBlob,
        deriveConfigName: deriveConfigName,
        renameSave: renameSave,
        deriveRestoreFailure: deriveRestoreFailure,
        listSaves: listSaves,
        formatTimestamp: formatTimestamp,
        // `setCurrentId` pokes the active save id. It moved here with the `persistence` object it
        // mutates (core defined it before the object was extracted).
        setCurrentId: function setCurrentId(id) {
            persistence.currentId = id;
        },
    });

    // UMD-style footer to mirror the sibling standalone modules. Dead in Node (the package is
    // "type":"module", so module.exports is unavailable); the tests read `globalThis.mpbController`.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = C;
    }
})(typeof globalThis === 'undefined' ? new Function('return this')() : globalThis);
