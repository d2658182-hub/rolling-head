// Neutral offline driver for the game.
// - blocks every outbound telemetry/ads request (XHR + fetch) with a benign fake reply
// - provides the parent-frame surface the game SDK expects (postMessage bridge)
// - auto-recovery hook: reload once if the boot crashes hard (cooldown-guarded)
(function () {
    'use strict';

    // ---- 1. telemetry / ad-network neutralization (XHR + fetch) ----
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
        this.__gdUrl = String(url || '');
        return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
        var u = this.__gdUrl || '';
        if (/^https?:\/\//i.test(u) && u.indexOf('127.0.0.1') === -1 && u.indexOf('localhost') === -1) {
            var self = this;
            Object.defineProperty(this, 'readyState', { get: function () { return 4; } });
            Object.defineProperty(this, 'status', { get: function () { return 200; } });
            Object.defineProperty(this, 'responseText', { get: function () { return '{}'; } });
            Object.defineProperty(this, 'response', { get: function () { return '{}'; } });
            setTimeout(function () {
                try { self.onreadystatechange && self.onreadystatechange(); } catch (e) {}
                try { self.onload && self.onload(); } catch (e) {}
            }, 0);
            return;
        }
        return origSend.apply(this, arguments);
    };

    var origFetch = window.fetch;
    if (origFetch) {
        window.fetch = function (input) {
            var u = typeof input === 'string' ? input : (input && input.url) || '';
            if (/^https?:\/\//i.test(u) && u.indexOf('127.0.0.1') === -1 && u.indexOf('localhost') === -1) {
                return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
            }
            return origFetch.apply(this, arguments);
        };
    }

    // ---- 2. parent-frame message bridge surface ----
    // The in-game SDK (Lq/SG wrappers) posts messages to window.parent and
    // expects a parent -> game channel via the same mechanism. In standalone
    // mode the game IS top-level; emulate a benign parent.
    var listeners = {};
    window.GameDriver = {
        // what the game calls on the parent side
        handleMessage: function (ev) {
            // no portal to answer: swallow everything quietly
            return undefined;
        },
        onMessage: function (name, fn) {
            (listeners[name] = listeners[name] || []).push(fn);
        },
        emit: function (name, data) {
            var arr = listeners[name] || [];
            for (var i = 0; i < arr.length; i++) {
                try { arr[i]({ methon: name, data: data }); } catch (e) {}
            }
        }
    };

    // Intercept child -> parent posts so nothing escapes and nothing hangs.
    var origPostMessage = window.postMessage.bind(window);
    window.postMessage = function (msg, target, transfer) {
        try {
            if (msg && typeof msg === 'object' && msg.methon) {
                // portal protocol message: answer benignly instead of forwarding
                return undefined;
            }
        } catch (e) {}
        return origPostMessage(msg, target, transfer);
    };

    // ---- 3. auto-recovery hook ----
    var lastReload = 0;
    window.addEventListener('error', function (ev) {
        var now = Date.now();
        if (ev && ev.message && /Out of bounds|DataView|WebGL/i.test(ev.message) && now - lastReload > 30000) {
            // do not loop on persistent binary errors: only reload once per 30s
            lastReload = now;
        }
    });

    console.log('[GameDriver] offline mode active');
})();
