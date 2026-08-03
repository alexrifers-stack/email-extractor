require("dotenv").config()

const express      = require("express")
const { ImapFlow } = require("imapflow")
const { simpleParser } = require("mailparser")
const path         = require("path")

const app = express()

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

function cleanHeaders(email, options) {
    options = options || {}
    const removeHeaders = [
        'Delivered-To', 'ARC-Seal', 'ARC-Message-Signature',
        'ARC-Authentication-Results', 'Return-Path',
        'Received-SPF', 'Authentication-Results',
        'DKIM-Signature', 'Sender', 'X-Received',
        'X-Google-Smtp-Source'
    ]
    const domain = options.domain || "[RDNS]"
    const eid = options.eid || "[EID]"
    // Unfold continuation lines so every header is on one line
    email = unfoldHeaders(email)
    const lines = email.split(/\r?\n/)
    var cleaned = []
    var skip = false
    var inHeaders = true
    var ccExists = false
    for (var i = 0; i < lines.length; i++) {
        if (/^Cc:/i.test(lines[i])) ccExists = true
    }
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i]
        // Blank line = end of headers; pass everything after through unchanged
        if (inHeaders && line.trim() === "") {
            inHeaders = false
            cleaned.push(line)
            continue
        }
        if (!inHeaders) { cleaned.push(line); continue }
        if (removeHeaders.some(function(h) { return line.toLowerCase().startsWith(h.toLowerCase() + ":") })) { skip = true; continue }
        if (skip) { if (/^\s/.test(line)) continue; skip = false }
        if (/^Date:/i.test(line)) { cleaned.push(options.replaceDate ? "Date: [DATE]" : line); continue }
        if (/^Received:/i.test(line)) { if (!options.keepReceived) continue }
        if (/^Reply-To:/i.test(line)) { if (!options.keepReplyTo) continue }
        if (/^Message-ID:/i.test(line)) {
            var match = line.match(/<([^>]+)>/)
            if (match) {
                var msg = match[1]
                if (msg.includes("@")) msg = msg.replace("@", eid + "@")
                cleaned.push("Message-ID: <" + msg + ">"); continue
            }
        }
        if (/^From:/i.test(line)) {
            var angleMatch = line.match(/<([^@>]+)@([^>]+)>/)
            if (angleMatch) { var local = angleMatch[1]; line = line.replace(/<([^@>]+)@([^>]+)>/, "<" + local + "@" + domain + ">") }
            else {
                var emailMatch = line.match(/([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+)/)
                if (emailMatch) { var local2 = emailMatch[1]; line = line.replace(/([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+)/, local2 + "@" + domain) }
            }
            if (options.addFromID) line = line.replace(/^From:/i, 'From:[ID]')
            cleaned.push(line)
            if (options.addSender) cleaned.push("Sender: noreply@[RDNS]")
            continue
        }
        if (/^To:/i.test(line)) {
            if (options.replaceTo) {
                cleaned.push("To: [*to]")
                if (options.addCc && !ccExists) { cleaned.push("Cc: [*to]"); ccExists = true }
            } else { cleaned.push(line) }
            continue
        }
        if (/^Cc:/i.test(line)) { if (options.addCc) { cleaned.push("Cc: [*to]"); continue } }
        if (/^Subject:/i.test(line)) {
            if (options.addSubjectID) line = line.replace(/^Subject:/i, 'Subject:[ID]')
            cleaned.push(line); continue
        }
        cleaned.push(line)
    }
    return cleaned.join("\n")
}

function cleanHeadersOnly(email, options) {
    options = options || {}
    const removeHeaders = [
        'Delivered-To', 'ARC-Seal', 'ARC-Message-Signature',
        'ARC-Authentication-Results', 'Return-Path',
        'Received-SPF', 'Authentication-Results',
        'DKIM-Signature', 'Sender', 'X-Received',
        'X-Google-Smtp-Source'
    ]
    const P_FRNAME    = options.P_FRNAME    || "[P_FRNAME]"
    const LAN6        = options.LAN6        || "[6LAN]"
    const P_RPATH     = options.P_RPATH     || "[P_RPATH]"
    const SUBJECT_VAL = options.SUBJECT_VAL || "[S]"
    const BOUNDARY    = options.BOUNDARY    || "[BND]"
    // Unfold continuation lines so every header is on one line
    email = unfoldHeaders(email)
    const lines = email.split(/\r?\n/)
    var cleaned = []
    var skip = false
    var inHeaders = true
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i]
        if (inHeaders && line.trim() === "") { inHeaders = false; break }
        if (removeHeaders.some(function(h) { return line.toLowerCase().startsWith(h.toLowerCase() + ":") })) { skip = true; continue }
        if (skip) { if (/^\s/.test(line)) continue; skip = false }
        if (/^Date:/i.test(line)) { cleaned.push("Date: [DATE]"); continue }
        if (/^Message-ID:/i.test(line)) {
            var match = line.match(/<([^@>]+)@([^>]+)>/)
            if (match) { cleaned.push("Message-ID: <" + match[1] + "[EID]@" + match[2] + ">") }
            continue
        }
        if (/^From:/i.test(line)) {
            cleaned.push("From: " + P_FRNAME + " <noreply." + LAN6 + "@" + P_RPATH + ">")
            if (options.addSender1) cleaned.push("Sender: noreply." + LAN6 + "@" + P_RPATH)
            continue
        }
        if (/^Subject:/i.test(line)) { cleaned.push("Subject: " + SUBJECT_VAL); continue }
        if (/^To:/i.test(line)) { cleaned.push("To: <[*to]>"); cleaned.push("Cc: [*to]"); continue }
        if (/^Content-Type:/i.test(line)) { cleaned.push("Content-Type: multipart/related;boundary=\"" + BOUNDARY + "\";type=\"multipart/alternative\""); continue }
        cleaned.push(line)
    }
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

async function runExtraction(req, res) {
    try {
        const { email, password, label, start, limit, mode } = req.body
        const client = new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true, auth: { user: email, pass: password } })
        await client.connect()
        var lock = await client.getMailboxLock(label)
        var startNum = parseInt(start)
        var limitNum = parseInt(limit)
        var results = []
        var uids = await client.search({ all: true })
        uids.reverse()
        var selected = uids.slice(startNum - 1, startNum - 1 + limitNum)
        if (selected.length === 0) throw new Error("Start range too big")
        for (var i = 0; i < selected.length; i++) {
            var uid = selected[i]
            var msg = await client.fetchOne(uid, { source: true })
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
                results.push(cleanHeaders(raw, {
                    domain: req.body.domain, eid: req.body.eid,
                    replaceDate:  req.body.replaceDate  === 'on',
                    replaceTo:    req.body.replaceTo    === 'on',
                    keepReceived: req.body.keepReceived === 'on',
                    keepReplyTo:  req.body.keepReplyTo  === 'on',
                    addCc:        req.body.addCc        === 'on',
                    addSender:    req.body.addSender    === 'on',
                    addFromID:    req.body.addFromID    === 'on',
                    addSubjectID: req.body.addSubjectID === 'on'
                }))
            } else if (mode === "headersonly") {
                results.push(cleanHeadersOnly(raw, {
                    P_FRNAME: req.body.P_FRNAME, LAN6: req.body.LAN6,
                    P_RPATH: req.body.P_RPATH, SUBJECT_VAL: req.body.SUBJECT_VAL,
                    BOUNDARY: req.body.BOUNDARY, addSender1: req.body.addSender1
                }))
            } else if (mode === "bodyonly") {
                var body = await getRawBody(raw)
                if (body && body.trim()) results.push(body.trim())
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
    res.render("karimrach", { labels: [], error: null, email: "", password: "" })
})

// Connect to IMAP and list folders
app.post("/connect", async function(req, res) {
    const { email, password } = req.body
    try {
        const client = new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true, auth: { user: email, pass: password } })
        await client.connect()
        var boxes = await client.list()
        var labels = []
        for (var i = 0; i < boxes.length; i++) {
            var box = boxes[i]
            try {
                var mailbox = await client.mailboxOpen(box.path)
                labels.push({ name: box.path, count: mailbox.exists || 0 })
            } catch (err) {
                labels.push({ name: box.path, count: 0 })
            }
        }
        await client.logout()
        res.render("karimrach", { labels, error: null, email, password })
    } catch (err) {
        res.render("karimrach", { labels: [], error: "Connection Failed", email, password })
    }
})

// Extract emails
app.post("/extract", function(req, res) {
    runExtraction(req, res)
})


// Logout — just redirect home
app.get("/logout", function(req, res) {
    res.redirect("/")
})

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, function() { console.log("🔥 CMH9 Extractor running on port " + PORT) })
