/* global window, document, fetch */
(function () {
  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments;
      window.clearTimeout(t);
      t = window.setTimeout(function () {
        fn.apply(null, args);
      }, wait);
    };
  }

  function closest(el, selector) {
    while (el && el.nodeType === 1) {
      if (el.matches(selector)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function ensureDropdown(host) {
    var existing = host.querySelector('.pgs-autocomplete');
    if (existing) return existing;

    host.style.position = host.style.position || 'relative';
    var box = document.createElement('div');
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
    return box;
  }

  function render(dropdown, items) {
    dropdown.innerHTML = '';
    if (!items || !items.length) {
      dropdown.style.display = 'none';
      return;
    }

    var list = document.createElement('div');
    list.style.maxHeight = '320px';
    list.style.overflowY = 'auto';

    function addGroup(title) {
      var h = document.createElement('div');
      h.textContent = title;
      h.style.padding = '10px 12px';
      h.style.fontSize = '12px';
      h.style.fontWeight = '700';
      h.style.letterSpacing = '0.02em';
      h.style.color = 'rgba(0,0,0,0.55)';
      h.style.background = 'rgba(0,0,0,0.03)';
      list.appendChild(h);
    }

    function addItem(item) {
      var a = document.createElement('a');
      a.href = item.url;
      a.setAttribute('data-url', item.url);
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
        a.style.background = 'rgba(0,0,0,0.04)';
      });
      a.addEventListener('mouseleave', function () {
        a.style.background = 'transparent';
      });

      list.appendChild(a);
    }

    var programs = items.filter(function (x) { return x.type === 'program'; });
    var courses = items.filter(function (x) { return x.type === 'course'; });
    var events = items.filter(function (x) { return x.type === 'event'; });

    if (programs.length) {
      addGroup('Programs');
      programs.forEach(addItem);
    }
    if (courses.length) {
      addGroup('Courses');
      courses.forEach(addItem);
    }
    if (events.length) {
      addGroup('Events');
      events.forEach(addItem);
    }

    dropdown.appendChild(list);
    dropdown.style.display = 'block';
  }

  function initInput(input) {
    if (input.getAttribute('data-pgs-autocomplete') === '1') return;
    input.setAttribute('data-pgs-autocomplete', '1');

    var endpoint = input.getAttribute('data-autocomplete-endpoint') || (window.PGS_AUTOCOMPLETE_ENDPOINT || '');
    if (!endpoint) return;

    input.setAttribute('autocomplete', 'off');

    var host = closest(input, '.search-box') || input.parentElement;
    var dropdown = ensureDropdown(host);
    var lastQuery = '';

    var run = debounce(function () {
      var q = (input.value || '').trim();
      if (q.length < 2) {
        dropdown.style.display = 'none';
        lastQuery = q;
        return;
      }
      if (q === lastQuery) return;
      lastQuery = q;

      var url = endpoint + (endpoint.indexOf('?') >= 0 ? '&' : '?') + 'q=' + encodeURIComponent(q) + '&limit=10';
      fetch(url, { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          render(dropdown, (data && data.results) ? data.results : []);
        })
        .catch(function () {
          dropdown.style.display = 'none';
        });
    }, 250);

    input.addEventListener('input', run);
    input.addEventListener('focus', run);

    dropdown.addEventListener('mousedown', function (e) {
      var a = closest(e.target, 'a[data-url]');
      if (!a) return;
      e.preventDefault();
      window.location.href = a.getAttribute('data-url');
    });

    document.addEventListener('click', function (e) {
      if (host.contains(e.target)) return;
      dropdown.style.display = 'none';
    });
  }

  function initAll() {
    var inputs = document.querySelectorAll('input.search-control[data-autocomplete-endpoint], input.search-control');
    for (var i = 0; i < inputs.length; i++) initInput(inputs[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
