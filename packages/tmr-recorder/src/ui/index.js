const api = typeof browser !== 'undefined' ? browser : chrome

const statusEl = document.getElementById('status')
const stepsEl = document.getElementById('steps')
const startBtn = document.getElementById('start')
const stopBtn = document.getElementById('stop')
const clearBtn = document.getElementById('clear')
const modal = document.getElementById('modal')
const startUrlInput = document.getElementById('start-url')
const cancelStartBtn = document.getElementById('cancel-start')
const confirmStartBtn = document.getElementById('confirm-start')

const renderSteps = steps => {
  if (!steps || steps.length === 0) {
    stepsEl.innerHTML = '<div class="empty">No recorded steps yet.</div>'
    return
  }
  stepsEl.innerHTML = steps
    .map((s, i) => {
      const target = Array.isArray(s.target)
        ? s.target.map(t => t[0]).join(' | ')
        : s.target
      const value = s.value ? ` = ${s.value}` : ''
      return `<div class="step">${i + 1}. ${s.command} ${target || ''}${value}</div>`
    })
    .join('')
}

let bgApi = null

const getBgApi = async () => {
  if (bgApi) return bgApi
  if (!api.runtime.getBackgroundPage) return null
  const bg = await api.runtime.getBackgroundPage()
  bgApi = bg && bg.tmrApi ? bg.tmrApi : null
  return bgApi
}

const callBg = async (method, ...args) => {
  try {
    const apiRef = await getBgApi()
    if (!apiRef || !apiRef[method]) {
      console.warn('[tmr-ui] background unavailable', { method, apiRef })
      return { ok: false, error: 'Background unavailable.' }
    }
    console.debug('[tmr-ui] calling', method, args)
    return await apiRef[method](...args)
  } catch (err) {
    console.error('[tmr-ui] call failed', method, err)
    return {
      ok: false,
      error: err && err.message ? err.message : String(err),
    }
  }
}

const refresh = async () => {
  const status = await callBg('status')
  const steps = await callBg('steps')
  if (!status || status.ok === false) {
    statusEl.textContent = 'Background unavailable'
    startBtn.disabled = false
    stopBtn.disabled = true
    return
  }
  statusEl.textContent = status.isRecording ? 'Recording' : 'Idle'
  startBtn.disabled = status.isRecording
  stopBtn.disabled = !status.isRecording
  if (steps && steps.ok !== false) {
    renderSteps(steps.steps)
  }
}

setInterval(() => {
  refresh()
}, 1000)

startBtn.addEventListener('click', async () => {
  modal.classList.add('show')
  modal.setAttribute('aria-hidden', 'false')
  startUrlInput.focus()
})

stopBtn.addEventListener('click', async () => {
  await callBg('stop')
  await refresh()
})

clearBtn.addEventListener('click', async () => {
  await callBg('clear')
  await refresh()
})

cancelStartBtn.addEventListener('click', () => {
  modal.classList.remove('show')
  modal.setAttribute('aria-hidden', 'true')
})

confirmStartBtn.addEventListener('click', async () => {
  const url = startUrlInput.value.trim()
  confirmStartBtn.disabled = true
  const result = await callBg('start', url)
  confirmStartBtn.disabled = false
  if (!result || result.ok !== true) {
    const msg = (result && result.error) || 'Failed to start recording.'
    alert(msg)
    return
  }
  modal.classList.remove('show')
  modal.setAttribute('aria-hidden', 'true')
  await refresh()
})

refresh()
