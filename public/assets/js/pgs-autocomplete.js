/* global window, document, fetch */
(function () {
  var instanceSequence = 0;
  var instances = [];
  var activeOptionBackground = 'rgba(0,0,0,0.04)';

  function debounce(fn, wait) {
    var t;
    function debounced() {
      var args = arguments;
      window.clearTimeout(t);
      t = window.setTimeout(function () {
        fn.apply(null, args);
      }, wait);
    }
    debounced.cancel = function () {
      window.clearTimeout(t);
    };
    return debounced;
  }

  function closest(el, selector) {
    while (el && el.nodeType === 1) {
      if (el.matches(selector)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function nextInstanceId() {
    var id;
    do {
      instanceSequence += 1;
      id = 'pgs-autocomplete-' + instanceSequence;
    } while (document.getElementById(id + '-input') || document.getElementById(id + '-listbox'));
    return id;
  }

  function ensureElementId(element, suggestedId) {
    if (element.id) return element.id;
    var id = suggestedId;
    var suffix = 2;
    while (document.getElementById(id) && document.getElementById(id) !== element) {
      id = suggestedId + '-' + suffix;
      suffix += 1;
    }
    element.id = id;
    return id;
  }

  function ensureDropdown(host, instanceId) {
    var existing = host.querySelector('.pgs-autocomplete');
    var box = existing || document.createElement('div');
    if (!existing) {
      host.style.position = host.style.position || 'relative';
      box.className = 'pgs-autocomplete';
      box.style.position = 'absolute';
      box.style.left = '0';
      box.style.right = '0';
      box.style.top = '100%';
      box.style.marginTop = '6px';
      box.style.background = '#fff';
      box.style.border = '1px solid rgba(0,0,0,0.12)';
      box.style.borderRadius = '10px';
      box.style.boxShadow = '0 10px 25px rgba(0,0,0,0.10)';
      box.style.zIndex = '9999';
      box.style.overflow = 'hidden';
      box.style.display = 'none';
      host.appendChild(box);
    }
    ensureElementId(box, instanceId + '-listbox');
    box.setAttribute('role', 'listbox');
    box.setAttribute('aria-label', 'Search suggestions');
    return box;
  }

  function ensureStatus(host, instanceId) {
    var existing = host.querySelector('.pgs-autocomplete-status');
    if (existing) return existing;
    var status = document.createElement('div');
    status.className = 'pgs-autocomplete-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    ensureElementId(status, instanceId + '-status');
    status.style.position = 'absolute';
    status.style.width = '1px';
    status.style.height = '1px';
    status.style.padding = '0';
    status.style.margin = '-1px';
    status.style.overflow = 'hidden';
    status.style.clip = 'rect(0, 0, 0, 0)';
    status.style.whiteSpace = 'nowrap';
    status.style.border = '0';
    host.appendChild(status);
    return status;
  }

  function optionsFor(state) {
    return state.dropdown.querySelectorAll('a[role="option"][data-url]');
  }

  function clearActiveOption(state) {
    var options = optionsFor(state);
    for (var i = 0; i < options.length; i += 1) {
      options[i].setAttribute('aria-selected', 'false');
      options[i].style.background = 'transparent';
    }
    state.activeIndex = -1;
    state.input.removeAttribute('aria-activedescendant');
  }

  function hide(state, statusMessage) {
    clearActiveOption(state);
    state.dropdown.style.display = 'none';
    state.dropdown.removeAttribute('aria-busy');
    state.input.setAttribute('aria-expanded', 'false');
    if (typeof statusMessage === 'string') state.status.textContent = statusMessage;
  }

  function setActiveOption(state, index) {
    var options = optionsFor(state);
    if (!options.length) {
      clearActiveOption(state);
      return;
    }
    var nextIndex = (index + options.length) % options.length;
    for (var i = 0; i < options.length; i += 1) {
      var selected = i === nextIndex;
      options[i].setAttribute('aria-selected', String(selected));
      options[i].style.background = selected ? activeOptionBackground : 'transparent';
    }
    state.activeIndex = nextIndex;
    state.input.setAttribute('aria-activedescendant', options[nextIndex].id);
    if (typeof options[nextIndex].scrollIntoView === 'function') {
      options[nextIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function render(state, items) {
    state.dropdown.innerHTML = '';
    clearActiveOption(state);
    if (!items || !items.length) {
      hide(state, 'No search suggestions found.');
      return;
    }

    var list = document.createElement('div');
    list.setAttribute('role', 'presentation');
    list.style.maxHeight = '320px';
    list.style.overflowY = 'auto';
    var optionIndex = 0;

    function addGroup(title, groupItems) {
      var group = document.createElement('div');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', title);
      var h = document.createElement('div');
      h.textContent = title;
      h.setAttribute('aria-hidden', 'true');
      h.style.padding = '10px 12px';
      h.style.fontSize = '12px';
      h.style.fontWeight = '700';
      h.style.letterSpacing = '0.02em';
      h.style.color = 'rgba(0,0,0,0.55)';
      h.style.background = 'rgba(0,0,0,0.03)';
      group.appendChild(h);
      groupItems.forEach(function (item) {
        addItem(group, item);
      });
      list.appendChild(group);
    }

    function addItem(group, item) {
      var a = document.createElement('a');
      var currentIndex = optionIndex;
      optionIndex += 1;
      a.href = item.url;
      a.id = state.dropdown.id + '-option-' + (currentIndex + 1);
      a.setAttribute('data-url', item.url);
      a.setAttribute('role', 'option');
      a.setAttribute('aria-selected', 'false');
      a.tabIndex = -1;
      a.style.display = 'flex';
      a.style.alignItems = 'center';
      a.style.gap = '10px';
      a.style.padding = '10px 12px';
      a.style.textDecoration = 'none';
      a.style.color = '#111';
      a.style.cursor = 'pointer';

      var badge = document.createElement('span');
      badge.textContent = item.type === 'event' ? 'Event' : (item.type === 'course' ? 'Course' : 'Program');
      badge.style.fontSize = '11px';
      badge.style.fontWeight = '700';
      badge.style.padding = '3px 8px';
      badge.style.borderRadius = '999px';
      badge.style.background = item.type === 'event' ? 'rgba(127, 86, 217, 0.12)' : (item.type === 'course' ? 'rgba(25, 135, 84, 0.12)' : 'rgba(0, 123, 255, 0.12)');
      badge.style.color = item.type === 'event' ? '#5b21b6' : (item.type === 'course' ? '#126b38' : '#0b5ed7');

      var text = document.createElement('span');
      text.textContent = item.label;
      text.style.flex = '1';
      text.style.fontSize = '14px';

      a.appendChild(badge);
      a.appendChild(text);

      a.addEventListener('mouseenter', function () {
        a.style.background = activeOptionBackground;
      });
      a.addEventListener('mouseleave', function () {
        a.style.background = a.getAttribute('aria-selected') === 'true' ? activeOptionBackground : 'transparent';
      });

      group.appendChild(a);
    }

    var programs = items.filter(function (x) { return x.type === 'program'; });
    var courses = items.filter(function (x) { return x.type === 'course'; });
    var events = items.filter(function (x) { return x.type === 'event'; });

    if (programs.length) {
      addGroup('Programs', programs);
    }
    if (courses.length) {
      addGroup('Courses', courses);
    }
    if (events.length) {
      addGroup('Events', events);
    }

    if (!optionIndex) {
      hide(state, 'No search suggestions found.');
      return;
    }

    state.dropdown.appendChild(list);
    state.dropdown.removeAttribute('aria-busy');
    state.dropdown.style.display = 'block';
    state.input.setAttribute('aria-expanded', 'true');
    state.status.textContent = optionIndex + (optionIndex === 1 ? ' search suggestion available.' : ' search suggestions available.') + ' Use the up and down arrow keys to review.';
  }

  function initInput(input) {
    if (input.getAttribute('data-pgs-autocomplete-ready') === '1') return;
    input.setAttribute('data-pgs-autocomplete', '1');

    var endpoint = input.getAttribute('data-autocomplete-endpoint') || (window.PGS_AUTOCOMPLETE_ENDPOINT || '');
    if (!endpoint) return;

    input.setAttribute('data-pgs-autocomplete-ready', '1');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');
    if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby') && !(input.labels && input.labels.length)) {
      input.setAttribute('aria-label', 'Search programs and events');
    }

    var host = closest(input, '.search-box') || input.parentElement;
    var instanceId = input.getAttribute('data-pgs-autocomplete-instance') || nextInstanceId();
    input.setAttribute('data-pgs-autocomplete-instance', instanceId);
    ensureElementId(input, instanceId + '-input');
    var dropdown = ensureDropdown(host, instanceId);
    var status = ensureStatus(host, instanceId);
    input.setAttribute('aria-controls', dropdown.id);
    var state = {
      activeIndex: -1,
      dropdown: dropdown,
      host: host,
      input: input,
      lastQuery: '',
      queryVersion: 0,
      status: status
    };
    hide(state, '');

    var run = debounce(function (version) {
      var q = (input.value || '').trim();
      if (q.length < 2) {
        state.lastQuery = q;
        hide(state, '');
        return;
      }
      if (q === state.lastQuery && input.getAttribute('aria-expanded') === 'true') return;
      state.lastQuery = q;
      dropdown.setAttribute('aria-busy', 'true');
      status.textContent = 'Loading search suggestions.';

      var url = endpoint + (endpoint.indexOf('?') >= 0 ? '&' : '?') + 'q=' + encodeURIComponent(q) + '&limit=10';
      fetch(url, { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (version !== state.queryVersion || (input.value || '').trim() !== q) return;
          render(state, (data && data.results) ? data.results : []);
        })
        .catch(function () {
          if (version !== state.queryVersion || (input.value || '').trim() !== q) return;
          state.lastQuery = '';
          hide(state, 'Search suggestions are unavailable.');
        });
    }, 250);

    function cancelSearch(statusMessage) {
      state.queryVersion += 1;
      state.lastQuery = '';
      run.cancel();
      hide(state, statusMessage);
    }
    state.cancelSearch = cancelSearch;
    instances.push(state);

    input.addEventListener('input', function () {
      state.queryVersion += 1;
      hide(state, '');
      run(state.queryVersion);
    });
    input.addEventListener('focus', function () {
      run(state.queryVersion);
    });
    input.addEventListener('keydown', function (e) {
      var options = optionsFor(state);
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && options.length && input.getAttribute('aria-expanded') === 'true') {
        e.preventDefault();
        var nextIndex = e.key === 'ArrowDown'
          ? (state.activeIndex < 0 ? 0 : state.activeIndex + 1)
          : (state.activeIndex < 0 ? options.length - 1 : state.activeIndex - 1);
        setActiveOption(state, nextIndex);
        return;
      }
      if (e.key === 'Enter' && state.activeIndex >= 0 && options[state.activeIndex]) {
        e.preventDefault();
        var selected = options[state.activeIndex];
        cancelSearch('');
        selected.click();
        return;
      }
      if (e.key === 'Escape') {
        if (input.getAttribute('aria-expanded') === 'true' || dropdown.getAttribute('aria-busy') === 'true') e.preventDefault();
        cancelSearch('');
      }
    });
    input.addEventListener('blur', function () {
      window.setTimeout(function () {
        if (host.contains(document.activeElement)) return;
        cancelSearch('');
      }, 0);
    });

    dropdown.addEventListener('mousedown', function (e) {
      var a = closest(e.target, 'a[data-url]');
      if (!a) return;
      e.preventDefault();
      cancelSearch('');
      window.location.href = a.getAttribute('data-url');
    });

  }

  function initAll() {
    instances = instances.filter(function (state) {
      if (state.input.isConnected && state.host.isConnected) return true;
      state.cancelSearch('');
      return false;
    });
    var inputs = document.querySelectorAll('input.search-control[data-autocomplete-endpoint], input.search-control');
    for (var i = 0; i < inputs.length; i++) initInput(inputs[i]);
  }

  document.addEventListener('click', function (e) {
    instances = instances.filter(function (state) {
      if (!state.input.isConnected || !state.host.isConnected) {
        state.cancelSearch('');
        return false;
      }
      if (!state.host.contains(e.target)) state.cancelSearch('');
      return true;
    });
  });
  document.addEventListener('pgs:frontend-ready', initAll);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
