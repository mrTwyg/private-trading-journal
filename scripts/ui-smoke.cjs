/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs")
const path = require("node:path")
const WebSocket = require("ws")

const port = Number(process.env.JOURNAL_CDP_PORT || 9336)
const screenshotPath = process.argv[2] || path.join(process.cwd(), "ui-revamp-smoke.png")

async function run() {
  const [target] = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json())
  if (!target?.webSocketDebuggerUrl) throw new Error("Trading Journal debug target was not found")
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject) })
  let id = 0
  const pending = new Map()
  socket.on("message", (raw) => {
    const message = JSON.parse(raw)
    if (!message.id || !pending.has(message.id)) return
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id
    pending.set(requestId, { resolve, reject })
    socket.send(JSON.stringify({ id: requestId, method, params }))
  })
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }

  await send("Page.enable")
  const shell = await evaluate(`({
    titlebar: !!document.querySelector('.app-titlebar'),
    sidebar: !!document.querySelector('.app-sidebar'),
    controls: [...document.querySelectorAll('[data-slot="select-trigger"]')].length,
    title: document.title,
    text: document.body.innerText.slice(0, 180)
  })`)
  if (!shell.titlebar || !shell.sidebar) throw new Error("The redesigned application shell did not render")

  const shellCapture = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
  const shellScreenshotPath = screenshotPath.replace(/\.png$/i, "-shell.png")
  fs.writeFileSync(shellScreenshotPath, Buffer.from(shellCapture.data, "base64"))

  await evaluate(`[...document.querySelectorAll('button')].find((button) => button.textContent.includes('Log trade')).click()`)
  await new Promise((resolve) => setTimeout(resolve, 250))
  const modal = await evaluate(`({
    open: !!document.querySelector('[data-slot="dialog-content"]'),
    datePicker: !!document.querySelector('.date-time-field'),
    instrument: !!document.querySelector('#symbol'),
    stickyFooter: !!document.querySelector('[data-slot="dialog-footer"]')
  })`)
  if (!modal.open || !modal.datePicker || !modal.instrument || !modal.stickyFooter) throw new Error("The redesigned trade modal is incomplete")

  await evaluate(`document.querySelector('#symbol').click()`)
  await new Promise((resolve) => setTimeout(resolve, 180))
  const options = await evaluate(`[...document.querySelectorAll('[role="option"]')].map((item) => item.textContent.trim())`)
  for (const instrument of ["NQ", "ES", "MNQ", "MES"]) if (!options.includes(instrument)) throw new Error(`Missing instrument ${instrument}`)

  const capture = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
  fs.writeFileSync(screenshotPath, Buffer.from(capture.data, "base64"))
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" })
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" })
  await evaluate(`document.querySelector('.date-control button').click()`)
  await new Promise((resolve) => setTimeout(resolve, 180))
  const calendarOpen = await evaluate(`!!document.querySelector('[role="grid"]')`)
  if (!calendarOpen) throw new Error("Calendar popover did not open")
  console.log(JSON.stringify({ shell, modal, options, calendarOpen, screenshotPath, shellScreenshotPath }, null, 2))
  socket.close()
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
