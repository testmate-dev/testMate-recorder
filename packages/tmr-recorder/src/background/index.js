// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import eio from 'engine.io-client'
import browser from 'webextension-polyfill'
import BackgroundRecorder from './recorder'
import WindowSession from './window-session'
import { select, cancelSelect } from './select'

const windowSession = new WindowSession()
const socket = eio(window.socketUrl || 'ws://localhost:4445')
const recordedSteps = []
let activeSessionId = null
let isRecording = false
let uiWindowId = null

const record = (command, target, value, insertBeforeLastCommand) => {
  window.hasRecorded = true
  const payload = {
    type: 'record',
    payload: {
      command,
      target,
      value,
      insertBeforeLastCommand,
    },
  }
  recordedSteps.push(payload.payload)
  if (socket && socket.readyState === 'open') {
    return socket.send(JSON.stringify(payload))
  }
}

const recordOpensWindow = windowHandleName => {
  const payload = {
    type: 'recordOpensWindow',
    payload: {
      windowHandleName,
    },
  }
  if (socket && socket.readyState === 'open') {
    return socket.send(JSON.stringify(payload))
  }
}

const hasRecorded = () => window.hasRecorded

window.recorder = new BackgroundRecorder(
  windowSession,
  record,
  recordOpensWindow,
  hasRecorded
)

const attach = ({ sessionId, hasRecorded = false }) => {
  window.hasRecorded = hasRecorded
  activeSessionId = sessionId
  isRecording = true
  return window.recorder.attach(sessionId)
}

const detach = () => {
  isRecording = false
  activeSessionId = null
  return window.recorder.detach()
}

const normalizeUrl = rawUrl => {
  if (!rawUrl || !rawUrl.trim()) return 'about:blank'
  const trimmed = rawUrl.trim()
  if (/^https?:\/\//i.test(trimmed) || /^about:/i.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed}`
}

const waitForTabReady = tabId =>
  new Promise(resolve => {
    let done = false
    const timeout = setTimeout(() => {
      if (done) return
      done = true
      browser.tabs.onUpdated.removeListener(listener)
      resolve()
    }, 5000)
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId) return
      if (changeInfo.status === 'complete') {
        if (done) return
        done = true
        clearTimeout(timeout)
        browser.tabs.onUpdated.removeListener(listener)
        resolve()
      }
    }
    browser.tabs.onUpdated.addListener(listener)
  })

const startRecording = async (url, sessionIdOverride) => {
  const sessionId =
    sessionIdOverride ||
    `tmr-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`
  const startUrl = normalizeUrl(url)
  const createOptions = {
    url: startUrl,
    type: 'normal',
    focused: true,
  }
  const win = await browser.windows.create(createOptions)
  const tabs = await browser.tabs.query({
    windowId: win.id,
    active: true,
  })
  const tab = tabs[0]
  if (!tab) {
    return { ok: false, error: 'No active tab found in new window.' }
  }
  await waitForTabReady(tab.id)
  window.hasRecorded = false
  activeSessionId = sessionId
  isRecording = true
  await window.recorder.attachWithTab(sessionId, tab)
  record('open', [[startUrl]], '')
  return { ok: true, sessionId }
}

const status = () => ({
  ok: true,
  isRecording,
  sessionId: activeSessionId,
  count: recordedSteps.length,
})

const steps = () => ({
  ok: true,
  steps: recordedSteps.slice(),
})

const clear = () => {
  recordedSteps.length = 0
  return { ok: true }
}

const openUiWindow = async () => {
  if (uiWindowId) {
    try {
      await browser.windows.update(uiWindowId, { focused: true })
      return
    } catch (e) {
      uiWindowId = null
    }
  }
  const win = await browser.windows.create({
    url: browser.runtime.getURL('ui.html'),
    type: 'popup',
    width: 560,
    height: 640,
  })
  uiWindowId = win.id
}

browser.browserAction.onClicked.addListener(() => {
  openUiWindow()
})

const selectElement = async (sessionId, windowName) => {
  let tab
  Object.keys(windowSession.openedTabIds[sessionId]).forEach(tabId => {
    if (windowSession.openedTabIds[sessionId][tabId] === windowName) {
      tab = tabId
    }
  })
  if (!tab) {
    throw new Error(`'${windowName}' does not exists in session '${sessionId}'`)
  }

  return await select(parseInt(tab))
}

socket.on('open', () => {
  socket.on('message', data => {
    const { type, payload } = JSON.parse(data)
    if (type === 'attach') {
      attach(payload)
    } else if (type === 'detach') {
      detach()
    } else if (type === 'select') {
      selectElement(payload.sessionId, payload.windowName)
        .then(result => {
          return socket.send(
            JSON.stringify({
              type: 'select',
              payload: {
                result,
              },
            })
          )
        })
        .catch(error => {
          return socket.send(
            JSON.stringify({
              type: 'select',
              payload: {
                error: true,
                message: error.message,
              },
            })
          )
        })
    } else if (type === 'cancelSelect') {
      cancelSelect()
    }
  })
})

browser.runtime.onMessage.addListener(message => {
  if (!message || !message.tmrRecorder) return
  if (message.tmrRecorder === 'start') {
    return startRecording(message.url, message.sessionId).catch(err => ({
      ok: false,
      error: err && err.message ? err.message : String(err),
    }))
  }
  if (message.tmrRecorder === 'stop') {
    return detach().then(() => ({ ok: true })).catch(err => ({
      ok: false,
      error: err && err.message ? err.message : String(err),
    }))
  }
  if (message.tmrRecorder === 'status') {
    return Promise.resolve(status())
  }
  if (message.tmrRecorder === 'steps') {
    return Promise.resolve(steps())
  }
  if (message.tmrRecorder === 'clear') {
    return Promise.resolve(clear())
  }
})

window.tmrApi = {
  start: startRecording,
  stop: () => detach().then(() => ({ ok: true })),
  status,
  steps,
  clear,
}
