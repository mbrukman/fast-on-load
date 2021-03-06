const tracking = new WeakMap()
const clz = 'onload-' + Math.random().toString(36).slice(2)
const windows = new WeakSet()

module.exports = onload
function onload (node, onload, offload) {
  node.classList.add(clz)

  if (!tracking.has(node)) {
    tracking.set(node, new Set())
    if (!windows.has(this)) create(this)
  }
  const set = tracking.get(node)

  set.add([onload || noop, offload || noop, 2])
  return node
}

onload.delete = function (node, onload = noop, offload = noop) {
  const set = tracking.get(node)
  if (!set) return false
  for (const ls of set) {
    if (ls[0] === onload && ls[1] === offload) {
      set.delete(ls)
      return true
    }
  }
  return false
}

function noop () { }

function create (window) {
  windows.add(window)

  const document = window.document
  const observer = new window.MutationObserver(onchange)

  const isConnected = 'isConnected' in window.Node.prototype
    ? node => node.isConnected
    : node => document.documentElement.contains(node)

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  })

  function callAll (nodes, idx, target) {
    for (let i = 0; i < nodes.length; i++) {
      if (!nodes[i].classList) continue
      if (nodes[i].classList.contains(clz)) call(nodes[i], idx, target)
      const els = nodes[i].getElementsByClassName(clz)
      for (let j = 0; j < els.length; j++) call(els[j], idx, target)
    }
  }

  // State Enum
  // 0: mounted
  // 1: unmounted
  // 2: undefined
  function call (node, state, target) {
    const set = tracking.get(node)
    if (!set) return
    for (const ls of set) {
      if (ls[2] === state) continue
      if (state === 0 && isConnected(node)) {
        ls[2] = 0
        ls[0](node, target)
      } else if (state === 1 && !isConnected(node)) {
        ls[2] = 1
        ls[1](node, target)
      }
    }
  }

  function onchange (mutations) {
    for (let i = 0; i < mutations.length; i++) {
      const { addedNodes, removedNodes, target } = mutations[i]
      callAll(removedNodes, 1, target)
      callAll(addedNodes, 0, target)
    }
  }
}
