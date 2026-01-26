(function () {
  const STORAGE_KEY = 'Task-Board-Standalone';
  let state = {};

  const el = id => document.getElementById(id);
  const board = el('board');

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { try { state = JSON.parse(raw); return; } catch (e) { } }
    state = { 'To Do': [], 'Doing': [], 'Done': [] };
  }

  function getPrimaryColor(colorClass) {
    switch (colorClass) {
      case 'c-red': return '#ef4444';
      case 'c-green': return '#22c55e';
      case 'c-blue': return '#3b82f6';
      case 'c-yellow': return '#f59e0b';
      default: return 'rgba(2, 6, 23, 0.2)';
    }
  }

  function getGradient(colorClass) {
    switch (colorClass) {
      case 'c-red': return 'linear-gradient(180deg, #fee2e2, #fecaca)';
      case 'c-green': return 'linear-gradient(180deg, #dcfce7, #bbf7d0)';
      case 'c-blue': return 'linear-gradient(180deg, #e0f2fe, #bae6fd)';
      case 'c-yellow': return 'linear-gradient(180deg, #fef3c7, #fde68a)';
      default: return '#fff';
    }
  }

  function render() {
    board.innerHTML = '';
    const colKeys = Object.keys(state);

    colKeys.forEach((colName, index) => {
      const column = document.createElement('div');
      column.className = 'column';
      column.dataset.col = colName;
      column.dataset.index = index;

      column.setAttribute('draggable', 'true');
      column.addEventListener('dragstart', onColumnDragStart);
      column.addEventListener('dragover', onColumnDragOver);
      column.addEventListener('drop', onColumnDrop);

      const title = document.createElement('div');
      title.className = 'col-title';

      const span = document.createElement('span');
      span.textContent = colName;
      span.style.cursor = 'pointer';

      span.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const input = document.createElement('input');
        input.type = 'text';
        input.value = colName;
        input.style.width = '80%';
        span.replaceWith(input);
        input.focus();

        const finishRename = () => {
          const newName = input.value.trim();
          if (newName && newName !== colName) {
            if (state[newName]) {
              alert('A column with that name already exists.');
              render();
            } else {
              const newState = {};
              Object.keys(state).forEach(key => {
                if (key === colName) newState[newName] = state[colName];
                else newState[key] = state[key];
              });
              state = newState;
              save();
              render();
            }
          } else { render(); }
        };
        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
      });

      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.className = 'btn-small';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm(`Delete column "${colName}"?`)) return;
        delete state[colName];
        render();
        save();
      });

      title.appendChild(span); title.appendChild(delBtn);
      column.appendChild(title);

      const cardsDiv = document.createElement('div');
      cardsDiv.className = 'cards';
      state[colName].forEach(task => {
        const card = document.createElement('div');
        card.className = `card fade-in ${task.color}`;
        card.dataset.id = task.id;
        const textSpan = document.createElement('span');
        textSpan.textContent = task.text;

        textSpan.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const input = document.createElement('input');
          input.type = 'text';
          input.value = task.text;
          textSpan.replaceWith(input);
          input.focus();
          input.addEventListener('blur', () => {
            task.text = input.value.trim() || task.text;
            render();
            save();
          });
          input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
        });

        const meta = document.createElement('div');
        const del = document.createElement('button'); del.textContent = '✕'; del.className = 'btn-small';
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          state[colName] = state[colName].filter(t => t.id !== task.id);
          render(); save();
        });
        meta.appendChild(del);
        card.appendChild(textSpan);
        card.appendChild(meta);

        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', onCardDragStart);
        card.addEventListener('dragend', onCardDragEnd);
        cardsDiv.appendChild(card);
      });

      column.appendChild(cardsDiv);
      column.addEventListener('dragover', e => {
        if (draggedCard) {
          e.preventDefault();
          column.classList.add('drop-target');
        }
      });
      column.addEventListener('dragleave', () => column.classList.remove('drop-target'));
      column.addEventListener('drop', onCardDrop);

      board.appendChild(column);
    });
    save();
  }

  let draggedCard = null;
  function onCardDragStart(e) {
    e.stopPropagation();
    const taskId = this.dataset.id;
    const fromCol = findTaskColumn(taskId);
    const task = state[fromCol].find(t => String(t.id) === String(taskId));
    draggedCard = { id: taskId, from: fromCol, color: task.color };
    document.body.style.setProperty('--drag-color', getPrimaryColor(task.color));
    this.classList.add('dragging');
  }
  function onCardDragEnd() {
    this.classList.remove('dragging');
    draggedCard = null;
    document.querySelectorAll('.column').forEach(c => c.classList.remove('drop-target'));
    document.body.style.removeProperty('--drag-color');
  }
  function onCardDrop(e) {
    if (!draggedCard) return;
    e.preventDefault(); e.stopPropagation();
    const to = this.dataset.col, from = draggedCard.from;
    if (from === to) return;
    const task = state[from].find(t => String(t.id) === String(draggedCard.id));
    state[from] = state[from].filter(t => String(t.id) !== String(draggedCard.id));
    state[to].push(task);
    render();
  }
  function findTaskColumn(id) {
    for (const col in state) { if (state[col].some(t => String(t.id) === id)) return col; } return null;
  }

  let draggedColIndex = null;
  function onColumnDragStart(e) {
    if (e.target.className !== 'column') return;
    draggedColIndex = this.dataset.index;
    this.classList.add('dragging-column');
  }
  function onColumnDragOver(e) {
    if (draggedColIndex === null) return;
    e.preventDefault();
  }
  function onColumnDrop(e) {
    if (draggedColIndex === null) return;
    const targetIndex = this.dataset.index;
    if (draggedColIndex === targetIndex) return;

    const keys = Object.keys(state);
    const movedKey = keys.splice(draggedColIndex, 1)[0];
    keys.splice(targetIndex, 0, movedKey);

    const newState = {};
    keys.forEach(k => newState[k] = state[k]);
    state = newState;
    draggedColIndex = null;
    render();
  }

  el('addBtn').addEventListener('click', () => {
    const t = el('taskInput').value.trim(); if (!t) return;
    const firstCol = Object.keys(state)[0];
    if (!firstCol) return alert('Add a column first');
    state[firstCol].push({ id: Date.now(), text: t, color: el('colorSelect').value });
    el('taskInput').value = '';
    render();
  });

  el('addColBtn').addEventListener('click', () => {
    const name = el('colInput').value.trim();
    if (!name || state[name]) return;
    state[name] = [];
    el('colInput').value = '';
    render();
  });

el('exportBtn').addEventListener('click', () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const datePart = now.toISOString().split('T')[0];
    const timePart = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileName = `Tasks-${datePart}_${timePart}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    
    URL.revokeObjectURL(url);
  });

  el('importBtn').addEventListener('click', () => el('fileInput').click());
  el('fileInput').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { state = JSON.parse(r.result); render(); } catch { alert('Invalid file'); } };
    r.readAsText(f);
  });

  el('resetBtn').addEventListener('click', () => {
    if (confirm('Reset board?')) { state = { 'To Do': [], 'Doing': [], 'Done': [] }; render(); }
  });

  const updateInputColors = () => {
    const grad = getGradient(el('colorSelect').value);
    el('colorSelect').style.background = grad;
    el('taskInput').style.background = grad;
  };
  el('colorSelect').addEventListener('change', updateInputColors);

  load(); render();
  updateInputColors();
})();