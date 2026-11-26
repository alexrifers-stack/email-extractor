require("dotenv").config()

const express      = require("express")
const { ImapFlow } = require("imapflow")
const { simpleParser } = require("mailparser")
const path         = require("path")

const app = express()

// ── SIDEBAR NAVIGATION ────────────────────────────────────────────────────────
// Single source of truth for the app's sidebar. Add a new { id, label, href, icon }
// entry here whenever a new route/tool is introduced, and it will show up in the
// sidebar on every page automatically.
const NAV_ITEMS = [
    {
        id: "extract",
        label: "Extraction",
        href: "/",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>'
    },
    {
        id: "timing",
        label: "Timing",
        href: "/timing",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.3 2"/></svg>'
    },
    {
        id: "spf",
        label: "SPF Generator",
        href: "/spf",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3.5v5.2c0 4.9-3.4 9.2-8 10.3-4.6-1.1-8-5.4-8-10.3V6.5L12 3Z"/><path d="M9 12l2 2 4-4"/></svg>'
    }
]

// ── EXPRESS SETUP ─────────────────────────────────────────────────────────────
app.set("view engine", "ejs")
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

// ── HELPERS ───────────────────────────────────────────────────────────────────

function htmlToText(html) {
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "")
    html = html.replace(/<style[\s\S]*?<\/style>/gi, "")
    html = html.replace(/<br\s*\/?>/gi, "\n")
    html = html.replace(/<\/p>/gi, "\n")
    html = html.replace(/<[^>]+]/g, "")
    html = html.replace(/\n\s*\n+/g, "\n\n")
    return html.trim()
}

// Invisible / formatting Unicode code points — built once at startup as a Set for O(1) lookup
const INVISIBLE_CP = new Set([
    0x00AD,                                     // soft hyphen
    0x034F,                                     // combining grapheme joiner
    0x180E,                                     // Mongolian vowel separator
    0x200B, 0x200C, 0x200D,                     // zero-width space / non-joiner / joiner
    0x200E, 0x200F,                             // LRM / RLM
    0x202A, 0x202B, 0x202C, 0x202D, 0x202E,    // bidi embedding / override
    0x2060, 0x2061, 0x2062, 0x2063, 0x2064,    // word joiner / invisible operators
    0x206A, 0x206B, 0x206C, 0x206D, 0x206E, 0x206F, // deprecated format chars
    0xFEFF,                                     // BOM / zero-width no-break space
])

const NAMED_ENT = {
    quot:'"', amp:'&', apos:"'", lt:'<', gt:'>',
    nbsp:' ', ensp:' ', emsp:' ', thinsp:' ', zwj:'', zwnj:'', lrm:'', rlm:'',
    mdash:'—', ndash:'–', shy:'',
    lsquo:'\u2018', rsquo:'\u2019', ldquo:'\u201C', rdquo:'\u201D',
    sbquo:'‚', bdquo:'„', hellip:'…', bull:'•', euro:'€', trade:'™',
    copy:'©', reg:'®', deg:'°', plusmn:'±', frac12:'½', frac14:'¼', frac34:'¾',
    times:'×', divide:'÷', micro:'µ', para:'¶', middot:'·', sect:'§',
    laquo:'«', raquo:'»', lsaquo:'‹', rsaquo:'›',
    Agrave:'À',Aacute:'Á',Acirc:'Â',Atilde:'Ã',Auml:'Ä',Aring:'Å',AElig:'Æ',
    Ccedil:'Ç',Egrave:'È',Eacute:'É',Ecirc:'Ê',Euml:'Ë',Igrave:'Ì',Iacute:'Í',
    Icirc:'Î',Iuml:'Ï',ETH:'Ð',Ntilde:'Ñ',Ograve:'Ò',Oacute:'Ó',Ocirc:'Ô',
    Otilde:'Õ',Ouml:'Ö',Oslash:'Ø',Ugrave:'Ù',Uacute:'Ú',Ucirc:'Û',Uuml:'Ü',
    Yacute:'Ý',THORN:'Þ',szlig:'ß',
    agrave:'à',aacute:'á',acirc:'â',atilde:'ã',auml:'ä',aring:'å',aelig:'æ',
    ccedil:'ç',egrave:'è',eacute:'é',ecirc:'ê',euml:'ë',igrave:'ì',iacute:'í',
    icirc:'î',iuml:'ï',eth:'ð',ntilde:'ñ',ograve:'ò',oacute:'ó',ocirc:'ô',
    otilde:'õ',ouml:'ö',oslash:'ø',ugrave:'ù',uacute:'ú',ucirc:'û',uuml:'ü',
    yacute:'ý',thorn:'þ',yuml:'ÿ',
}

function cpToChar(cp) {
    if (INVISIBLE_CP.has(cp)) return ""
    if (cp === 0x2028 || cp === 0x2029) return "\n"
    if ((cp < 0x20 && cp !== 0x09 && cp !== 0x0A && cp !== 0x0D) || (cp >= 0x7F && cp <= 0x9F)) return ""
    try { return String.fromCodePoint(cp) } catch (e) { return "" }
}

function decodeHtmlEntities(str) {
    str = str.replace(/&#(\d+);/g,        function(_, d) { return cpToChar(parseInt(d, 10)) })
    str = str.replace(/&#x([0-9a-f]+);/gi,function(_, h) { return cpToChar(parseInt(h, 16)) })
    str = str.replace(/&([a-zA-Z]{2,8});/g, function(_, n) { return NAMED_ENT.hasOwnProperty(n) ? NAMED_ENT[n] : "" })
    return str
}

function htmlToPlainText(html) {
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "")
    html = html.replace(/<style[\s\S]*?<\/style>/gi, "")
    html = html.replace(/\s(?:href|src|action|data-[\w-]+)\s*=\s*"[^"]*"/gi, "")
    html = html.replace(/\s(?:href|src|action|data-[\w-]+)\s*=\s*'[^']*'/gi, "")
    html = html.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    html = html.replace(/<br\s*\/?>/gi, "\n")
    html = html.replace(/<\/p>/gi, "\n")
    html = html.replace(/<\/div>/gi, "\n")
    html = html.replace(/<\/li>/gi, "\n")
    html = html.replace(/<\/tr>/gi, "\n")
    html = html.replace(/<\/h[1-6]>/gi, "\n")
    html = html.replace(/<[^>]+>/g, "")
    html = decodeHtmlEntities(html)
    html = html.replace(/[\u00AD\u034F\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u206A-\u206F\uFEFF]/g, "")
    html = html.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
    html = html.replace(/(?:https?|ftp):\/\/\S*/gi, "")
    html = html.replace(/\bhttps?\b/gi, "")
    html = html.replace(/\bftp\b/gi, "")
    html = html.replace(/:\/\/\S*/g, "")
    html = html.replace(/\bwww\.\S*/gi, "")
    html = html.replace(/[ \t\u00A0]+/g, " ")
    html = html.replace(/^ /gm, "")
    html = html.replace(/ $/gm, "")
    html = html.replace(/\n{3,}/g, "\n\n")
    return html.trim()
}

// Unfold RFC 2822 header continuation lines (lines starting with whitespace)
// into single logical lines, preserving the body separator and body intact.
function unfoldHeaders(email) {
    var parts = email.split(/\r?\n\r?\n/)
    var headerBlock = parts[0]
    var rest = parts.slice(1).join("\n\n")
    // Join continuation lines (WSP at start) with the preceding line
    var unfolded = headerBlock.replace(/\r?\n([ \t]+)/g, " ")
    return rest.length ? unfolded + "\n\n" + rest : unfolded
}

// Shared default for the News-style Content-Type parameter — kept identical
// across both Clean Headers and Header Only, per spec.
// Default News-style values for the 10 optional parameters. These are what
// gets used whenever the corresponding checkbox is left unchecked.
const NEWS_DEFAULTS = {
    from:        "[From] <[smtp]>",
    subject:     "[Subject]",
    date:        "[Date]",
    to:          "<[to]>",
    contentType: "text/html; charset=UTF-8",
    eid:         "[EID]",
    sender:      "noreply@[RDNS]",
    cc:          "<[to]>"
}

// Shared headers to strip from any News-style header rewrite.
const REMOVE_HEADERS = [
    'Delivered-To', 'ARC-Seal', 'ARC-Message-Signature',
    'ARC-Authentication-Results', 'Return-Path',
    'Received-SPF', 'Authentication-Results',
    'DKIM-Signature', 'Sender', 'X-Received',
    'X-Google-Smtp-Source'
]

// Inserts the given tag into the local part of a Message-ID, right before
// the "@" (e.g. "<abc123@mail.com>" + "[EID]" -> "<abc123[EID]@mail.com>").
// Returns the original line unchanged if it doesn't match the expected shape.
function applyMessageIdTag(line, eidTag) {
    var match = line.match(/<([^@>]+)@([^>]+)>/)
    if (!match) return line
    return "Message-ID: <" + match[1] + eidTag + "@" + match[2] + ">"
}

// Resolves the 10 optional parameters down to the concrete header lines /
// values that cleanHeaders/cleanHeadersOnly should use: the News default
// unless the matching "custom" checkbox is on and a value was given.
function buildHeaderSet(options) {
    options = options || {}
    return {
        fromLine:        "From: "         + (options.custFrom        && options.fromVal        ? options.fromVal        : NEWS_DEFAULTS.from),
        subjectLine:     "Subject: "      + (options.custSubject     && options.subjectVal     ? options.subjectVal     : NEWS_DEFAULTS.subject),
        dateLine:        "Date: "         + (options.custDate        && options.dateVal        ? options.dateVal        : NEWS_DEFAULTS.date),
        toLine:          "To: "           + (options.custTo          && options.toVal          ? options.toVal          : NEWS_DEFAULTS.to),
        contentTypeLine: "Content-Type: " + (options.custContentType && options.contentTypeVal ? options.contentTypeVal : NEWS_DEFAULTS.contentType),
        eidTag:    options.eidVal    || NEWS_DEFAULTS.eid,
        senderVal: options.senderVal || NEWS_DEFAULTS.sender,
        ccVal:     options.ccVal     || NEWS_DEFAULTS.cc
    }
}

function cleanHeaders(email, options) {
    options = options || {}
    const hs = buildHeaderSet(options)
    // Unfold continuation lines so every header is on one line
    email = unfoldHeaders(email)
    const lines = email.split(/\r?\n/)
    var cleaned = []
    var skip = false
    var inHeaders = true
    var headerEndIndex = -1 // index in `cleaned` where the blank line (end of headers) lands
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i]
        // Blank line = end of headers; pass everything after through unchanged
        if (inHeaders && line.trim() === "") {
            inHeaders = false
            headerEndIndex = cleaned.length
            cleaned.push(line)
            continue
        }
        if (!inHeaders) { cleaned.push(line); continue }
        if (REMOVE_HEADERS.some(function(h) { return line.toLowerCase().startsWith(h.toLowerCase() + ":") })) { skip = true; continue }
        if (skip) { if (/^\s/.test(line)) continue; skip = false }
        // #3 Date — always the resolved default/custom format
        if (/^Date:/i.test(line)) { cleaned.push(hs.dateLine); continue }
        // #7 Received — NOT included unless explicitly enabled
        if (/^Received:/i.test(line)) { if (options.keepReceived) cleaned.push(line); continue }
        // #8 Reply-To — NOT included unless explicitly enabled
        if (/^Reply-To:/i.test(line)) { if (options.keepReplyTo) cleaned.push(line); continue }
        // #6 Message-ID — enabled by default; input value used when enabled, removed entirely if disabled
        if (/^Message-ID:/i.test(line)) {
            if (options.addMessageId) cleaned.push(applyMessageIdTag(line, hs.eidTag))
            continue
        }
        // #1 From (+ #9 Sender, added right after, only if enabled)
        if (/^From:/i.test(line)) {
            cleaned.push(hs.fromLine)
            if (options.addSender) cleaned.push("Sender: " + hs.senderVal)
            continue
        }
        // #4 To (+ #10 Cc, added right after, only if enabled)
        if (/^To:/i.test(line)) {
            cleaned.push(hs.toLine)
            if (options.addCc) cleaned.push("Cc: " + hs.ccVal)
            continue
        }
        if (/^Cc:/i.test(line)) { continue } // never pass through the original Cc; added above if enabled
        // #2 Subject — always the resolved default/custom format
        if (/^Subject:/i.test(line)) { cleaned.push(hs.subjectLine); continue }
        // #5 Content-Type — always the resolved default/custom format
        if (/^Content-Type:/i.test(line)) { cleaned.push(hs.contentTypeLine); continue }
        cleaned.push(line)
    }
    if (headerEndIndex === -1) headerEndIndex = cleaned.length // no blank line/body found

    // ── Apply custom edit params — header section only, never the body ──────
    var editParams = Array.isArray(options.editParams) ? options.editParams : []
    editParams.forEach(function(param) {
        if (!param.name || param.name.trim() === '') return
        var headerName = param.name.trim()
        var headerValue = (param.value || '').trim()
        var pattern = new RegExp('^' + headerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':', 'i')
        var found = false
        for (var k = 0; k < headerEndIndex; k++) {
            if (pattern.test(cleaned[k])) {
                cleaned[k] = headerName + ': ' + headerValue
                found = true
                break
            }
        }
        // If not found and addIfMissing is true, insert right before the blank line (still in the header section)
        if (!found && param.addIfMissing) {
            cleaned.splice(headerEndIndex, 0, headerName + ': ' + headerValue)
            headerEndIndex++
        }
    })

    return cleaned.join("\n")
}

function cleanHeadersOnly(email, options) {
    options = options || {}
    const hs = buildHeaderSet(options)
    // Unfold continuation lines so every header is on one line
    email = unfoldHeaders(email)
    const lines = email.split(/\r?\n/)
    var cleaned = []
    var skip = false
    var inHeaders = true
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i]
        if (inHeaders && line.trim() === "") { inHeaders = false; break }
        if (REMOVE_HEADERS.some(function(h) { return line.toLowerCase().startsWith(h.toLowerCase() + ":") })) { skip = true; continue }
        if (skip) { if (/^\s/.test(line)) continue; skip = false }
        if (/^Date:/i.test(line)) { cleaned.push(hs.dateLine); continue }
        if (/^Received:/i.test(line)) { if (options.keepReceived) cleaned.push(line); continue }
        if (/^Reply-To:/i.test(line)) { if (options.keepReplyTo) cleaned.push(line); continue }
        if (/^Message-ID:/i.test(line)) {
            if (options.addMessageId) cleaned.push(applyMessageIdTag(line, hs.eidTag))
            continue
        }
        if (/^From:/i.test(line)) {
            cleaned.push(hs.fromLine)
            if (options.addSender) cleaned.push("Sender: " + hs.senderVal)
            continue
        }
        if (/^Subject:/i.test(line)) { cleaned.push(hs.subjectLine); continue }
        if (/^To:/i.test(line)) {
            cleaned.push(hs.toLine)
            if (options.addCc) cleaned.push("Cc: " + hs.ccVal)
            continue
        }
        if (/^Cc:/i.test(line)) { continue } // never pass through the original Cc; added above if enabled
        if (/^Content-Type:/i.test(line)) { cleaned.push(hs.contentTypeLine); continue }
        cleaned.push(line)
    }

    // ── Apply custom edit params ──────────────────────────────────────────────
    var editParams = Array.isArray(options.editParams) ? options.editParams : []
    editParams.forEach(function(param) {
        if (!param.name || param.name.trim() === '') return
        var headerName = param.name.trim()
        var headerValue = (param.value || '').trim()
        var pattern = new RegExp('^' + headerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':', 'i')
        var found = false
        for (var k = 0; k < cleaned.length; k++) {
            if (pattern.test(cleaned[k])) {
                cleaned[k] = headerName + ': ' + headerValue
                found = true
                break
            }
        }
        // If not found and addIfMissing is true, insert it after the last cleaned header line
        if (!found && param.addIfMissing) {
            cleaned.push(headerName + ': ' + headerValue)
        }
    })

    return cleaned.join("\n") + "\n"
}

async function getRawBody(raw) {
    const parsed = await simpleParser(raw)
    var bodyParts = []
    if (parsed.html) bodyParts.push(parsed.html)
    else if (parsed.text) bodyParts.push(parsed.text)
    if (!bodyParts.length && parsed.textAsHtml) bodyParts.push(parsed.textAsHtml)
    return bodyParts.join("\n")
}

function extractCssOnly(html, includeDoctype) {
    if (!html) return ""
    var docMatch = html.match(/<!DOCTYPE[\s\S]*?>/i)
    if (!docMatch) return ""
    var docStartIdx = html.indexOf(docMatch[0])
    var docEndIdx = docStartIdx + docMatch[0].length
    var startIdx = includeDoctype ? docStartIdx : docEndIdx
    var styleCloses = [...html.matchAll(/<\/style\s*>/gi)]
    if (!styleCloses.length) return ""
    var lastClose = styleCloses[styleCloses.length - 1]
    var endIdx = lastClose.index + lastClose[0].length
    return html.slice(startIdx, endIdx).trim()
}

function extractCleanCss(html) {
    if (!html) return ""
    var matches = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    if (!matches.length) return ""
    return matches.map(function(m) { return m[1].trim() }).filter(Boolean).join("\n\n")
}

// Opens the mailbox and returns the message numbers for the requested
// "newest first, start/limit slice" window.
//
// With no category filter (or all 5 Gmail inbox categories selected), this
// takes the fast path: sequence numbers in IMAP are always assigned in
// arrival order (1 = oldest ... exists = newest), so the newest-first slice
// can be computed directly from the mailbox's message count
// (lock.mailbox.exists) instead of calling search({all:true}) and
// reversing/slicing a potentially huge array — on a mailbox with tens of
// thousands of messages, that full search was slow enough to time out.
// Returned numbers in this case are sequence numbers (uid: false).
//
// With a category subset selected (e.g. just Primary + Promotions), Gmail's
// categories aren't separate IMAP folders or flags, so there's no way to
// compute this arithmetically — every category lives interleaved in the
// same sequence. Instead this runs a Gmail X-GM-RAW search for
// "category:x OR category:y OR ...", scoped to the currently selected
// mailbox, which returns real UIDs. Those are sorted ascending (oldest
// first, matching sequence-number order) and the same newest-first
// start/limit slice is taken from that filtered set. Returned numbers in
// this case are real UIDs (uid: true), since there's no sequence-number
// equivalent for a filtered subset.
//
// Caller is responsible for releasing the returned lock.
async function selectRange(client, label, start, limit, categories) {
    var lock = await client.getMailboxLock(label)
    var startNum = parseInt(start)
    var limitNum = parseInt(limit)
    var from = startNum
    var to = startNum + limitNum - 1

    var noFilter = !categories || !categories.length || categories.length >= 5
    if (noFilter) {
        var total = (lock.mailbox && lock.mailbox.exists) || client.mailbox.exists || 0
        var selected = []
        for (var i = from; i <= to && i <= total; i++) {
            var seq = total - i + 1
            if (seq < 1) break
            selected.push(seq)
        }
        return { lock: lock, selected: selected, uid: false }
    }

    var rawQuery = '(' + categories.map(function(c) { return 'category:' + c }).join(' OR ') + ')'
    var matches = await client.search({ gmailRaw: rawQuery }, { uid: true })
    matches.sort(function(a, b) { return a - b })
    var totalMatches = matches.length
    var selected2 = []
    for (var j = from; j <= to && j <= totalMatches; j++) {
        var idx = totalMatches - j
        if (idx < 0) break
        selected2.push(matches[idx])
    }
    return { lock: lock, selected: selected2, uid: true }
}

// Finds the account's real Trash folder via the SPECIAL-USE extension
// (Gmail supports this), rather than assuming the English "[Gmail]/Trash"
// path, since locale/language settings can rename it.
async function getTrashPath(client) {
    try {
        var boxes = await client.list()
        for (var i = 0; i < boxes.length; i++) {
            if (boxes[i].specialUse === '\\Trash') return boxes[i].path
        }
    } catch (e) { /* fall through to default below */ }
    return "[Gmail]/Trash"
}

// Gmail only truly deletes a message once it is expunged out of Trash —
// deleting it (flag + expunge) from any other label just removes that
// label and the message stays in All Mail. So: move it into Trash first
// (unless it's already there), then flag + expunge it from Trash itself.
// Returns the number of messages permanently removed.
async function permanentlyDelete(client, label, lock, selected, useUid) {
    var trashPath = await getTrashPath(client)

    // The IMAP UIDPLUS extension only guarantees a COPYUID mapping back for a
    // *UID* MOVE — a plain sequence-number MOVE (what the fast path's
    // sequence numbers would trigger) is not required to return one, and
    // Gmail doesn't always send it for one, especially moving out of
    // "[Gmail]/All Mail". Without that mapping we can't safely find the
    // moved message(s) in Trash to expunge, so the message sits in Trash
    // unpurged — still counted against storage. Fix: resolve to real UIDs
    // first (a cheap UID-only fetch, no bodies) whenever `selected` are
    // sequence numbers, then always issue a genuine UID MOVE below.
    var uids = selected
    if (!useUid) {
        uids = []
        for await (const msg of client.fetch(selected, { uid: true }, { uid: false })) {
            uids.push(msg.uid)
        }
        if (!uids.length) {
            lock.release()
            throw new Error("Could not resolve the selected messages to UIDs")
        }
    }

    if (label === trashPath) {
        await client.messageDelete(uids, { uid: true })
        lock.release()
        return uids.length
    }
    var moveResult = await client.messageMove(uids, trashPath, { uid: true })
    lock.release()
    var trashUids = []
    if (moveResult && moveResult.uidMap && moveResult.uidMap.size) {
        moveResult.uidMap.forEach(function(destUid) { trashUids.push(Number(destUid)) })
    }
    if (!trashUids.length) {
        throw new Error("Moved to Trash, but the server didn't confirm the new message IDs there, so they weren't purged — check Trash manually.")
    }
    var trashLock = await client.getMailboxLock(trashPath)
    try {
        // trashUids came from the MOVE's COPYUID response, so these are
        // real UIDs in the Trash mailbox, not sequence numbers — must
        // pass { uid: true } or ImapFlow will try to match them as
        // sequence numbers instead and silently delete nothing.
        await client.messageDelete(trashUids, { uid: true })
    } finally {
        trashLock.release()
    }
    return trashUids.length
}

async function runExtraction(req, res) {
    try {
        const { email, password, label, start, limit, mode } = req.body
        var categories = []
        if (req.body.category) {
            categories = Array.isArray(req.body.category) ? req.body.category : [req.body.category]
        }
        const client = new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true, auth: { user: email, pass: password } })
        await client.connect()
        var range = await selectRange(client, label, start, limit, categories)
        var lock = range.lock
        var selected = range.selected
        var useUid = range.uid
        var results = []
        if (selected.length === 0) throw new Error("Start range too big")

        // Delete Emails mode: skip fetching/parsing entirely, just permanently
        // purge the range (moved to Trash first, then expunged from Trash).
        if (mode === "delete") {
            var deletedCount = await permanentlyDelete(client, label, lock, selected, useUid)
            await client.logout()
            res.setHeader("Content-Type", "text/plain; charset=utf-8")
            res.send("✅ Permanently deleted " + deletedCount + " email(s), including purging from Trash.")
            return
        }

        for (var i = 0; i < selected.length; i++) {
            var uid = selected[i]
            var msg = await client.fetchOne(uid, { source: true }, { uid: useUid })
            var raw = msg.source.toString()
            if (mode === "plaintext") {
                const parsed = await simpleParser(raw)
                var text = ""
                if (parsed.html) {
                    text = htmlToPlainText(parsed.html)
                } else if (parsed.text) {
                    text = parsed.text.replace(/https?:\/\/[^\s]+/gi, "").replace(/\n{3,}/g, "\n\n").trim()
                }
                if (text && text.trim()) results.push(text.trim())
            } else if (mode === "justtext") {
                const parsed = await simpleParser(raw)
                var text2 = parsed.text || ""
                if (!text2 && parsed.html) text2 = htmlToText(parsed.html)
                if (text2 && text2.trim()) results.push(text2.trim())
            } else if (mode === "original") {
                results.push(raw)
            } else if (mode === "clean") {
                var editParamsClean = []
                try { editParamsClean = JSON.parse(req.body.editParamsClean || '[]') } catch(e) { editParamsClean = [] }
                results.push(cleanHeaders(raw, {
                    custFrom:        req.body.custFrom        === 'on', fromVal:        req.body.fromVal,
                    custSubject:     req.body.custSubject     === 'on', subjectVal:     req.body.subjectVal,
                    custDate:        req.body.custDate        === 'on', dateVal:        req.body.dateVal,
                    custTo:          req.body.custTo          === 'on', toVal:          req.body.toVal,
                    custContentType: req.body.custContentType === 'on', contentTypeVal: req.body.contentTypeVal,
                    addMessageId:    req.body.addMessageId    === 'on', eidVal:         req.body.eidVal,
                    keepReceived:    req.body.keepReceived    === 'on',
                    keepReplyTo:     req.body.keepReplyTo     === 'on',
                    addSender:       req.body.addSender       === 'on', senderVal: req.body.senderVal,
                    addCc:           req.body.addCc           === 'on', ccVal:     req.body.ccVal,
                    editParams: editParamsClean
                }))
            } else if (mode === "headersonly") {
                var editParams = []
                try { editParams = JSON.parse(req.body.editParams || '[]') } catch(e) { editParams = [] }
                results.push(cleanHeadersOnly(raw, {
                    custFrom:        req.body.custFrom2        === 'on', fromVal:        req.body.fromVal2,
                    custSubject:     req.body.custSubject2     === 'on', subjectVal:     req.body.subjectVal2,
                    custDate:        req.body.custDate2        === 'on', dateVal:        req.body.dateVal2,
                    custTo:          req.body.custTo2          === 'on', toVal:          req.body.toVal2,
                    custContentType: req.body.custContentType2 === 'on', contentTypeVal: req.body.contentTypeVal2,
                    addMessageId:    req.body.addMessageId2    === 'on', eidVal:         req.body.eidVal2,
                    keepReceived:    req.body.keepReceived2    === 'on',
                    keepReplyTo:     req.body.keepReplyTo2     === 'on',
                    addSender:       req.body.addSender2       === 'on', senderVal: req.body.senderVal2,
                    addCc:           req.body.addCc2           === 'on', ccVal:     req.body.ccVal2,
                    editParams: editParams
                }))
            } else if (mode === "bodyonly") {
                var body = await getRawBody(raw)
                if (body && body.trim()) results.push(body.trim())
            } else if (mode === "cssonly") {
                var htmlBody = await getRawBody(raw)
                var includeDoctype = req.body.includeDoctype === 'on'
                var css = extractCssOnly(htmlBody, includeDoctype)
                if (css && css.trim()) results.push(css.trim())
            } else if (mode === "cssclean") {
                var htmlBody2 = await getRawBody(raw)
                var cleanCss = extractCleanCss(htmlBody2)
                if (cleanCss && cleanCss.trim()) results.push(cleanCss.trim())
            } else if (mode === "receivedonly") {
                var receivedLines = []
                var rawLines = raw.split(/\r?\n/)
                var inReceived = false
                for (var j = 0; j < rawLines.length; j++) {
                    var rline = rawLines[j]
                    if (/^Received:/i.test(rline)) { receivedLines.push(rline); inReceived = true }
                    else if (inReceived && /^\s/.test(rline)) { receivedLines[receivedLines.length - 1] += "\n" + rline }
                    else { inReceived = false; if (rline.trim() === "") break }
                }
                if (receivedLines.length) results.push(receivedLines.join("\n"))
            }
        }
        lock.release()
        await client.logout()
        if (!results.length) throw new Error("No emails found")
        res.setHeader("Content-Type", "text/plain; charset=utf-8")
        res.send(results.join("\n__SEP__\n"))
    } catch (err) {
        console.log(err)
        res.status(500).send("❌ " + (err.message || "Extraction Failed"))
    }
}

// ── ROUTES ────────────────────────────────────────────────────────────────────

// Home — serves karimrach directly, no password
app.get("/", function(req, res) {
    res.render("karimrach", { labels: [], error: null, email: "", password: "", navItems: NAV_ITEMS, activeNav: "extract" })
})

// Connect to IMAP and list folders.
// NOTE: this intentionally does NOT open each mailbox to get a message count
// (that used to mean one IMAP SELECT round-trip per folder, serially — on an
// account with dozens of labels that alone could take many seconds before the
// page even rendered). Counts are now fetched lazily, one label at a time, by
// the /label-count route below whenever the person actually selects a label.
app.post("/connect", async function(req, res) {
    const { email, password } = req.body
    try {
        const client = new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true, auth: { user: email, pass: password } })
        await client.connect()
        var boxes = await client.list()
        await client.logout()
        var labels = boxes.map(function(box) { return { name: box.path, count: null } })
        res.render("karimrach", { labels, error: null, email, password, navItems: NAV_ITEMS, activeNav: "extract" })
    } catch (err) {
        res.render("karimrach", { labels: [], error: "Connection Failed", email, password, navItems: NAV_ITEMS, activeNav: "extract" })
    }
})

// Lightweight on-demand count for a single label (one IMAP STATUS round-trip,
// not a full SELECT) — called by the UI whenever the label dropdown changes.
app.post("/label-count", async function(req, res) {
    const { email, password, label } = req.body
    const client = new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true, auth: { user: email, pass: password } })
    try {
        await client.connect()
        var status = await client.status(label, { messages: true })
        await client.logout()
        res.json({ ok: true, count: status.messages || 0 })
    } catch (err) {
        try { await client.logout() } catch (e) {}
        res.status(500).json({ ok: false, error: "Could not fetch count" })
    }
})

// Extract emails
app.post("/extract", function(req, res) {
    runExtraction(req, res)
})

// Timing — IPs / Offset schedule generator (client-side only)
app.get("/timing", function(req, res) {
    res.render("timing", { navItems: NAV_ITEMS, activeNav: "timing" })
})

// SPF Generator — subdomain-aware SPF record generator (client-side only)
app.get("/spf", function(req, res) {
    res.render("spf", { navItems: NAV_ITEMS, activeNav: "spf" })
})


// Logout — just redirect home
app.get("/logout", function(req, res) {
    res.redirect("/")
})

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, function() { console.log("🔥 KRIMBOCH Extractor running on port " + PORT) })
