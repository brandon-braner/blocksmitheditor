import type { BlockDefinition } from '../model/types.js';

/* ─── helpers ─── */

function initCells(rows: number, cols: number, existing?: string[][]): string[][] {
  const cells: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) row.push(existing?.[r]?.[c] ?? '');
    cells.push(row);
  }
  return cells;
}

interface RowStyle { color?: string; background?: string; }

function initRowStyles(rows: number, existing?: RowStyle[]): RowStyle[] {
  const s: RowStyle[] = [];
  for (let r = 0; r < rows; r++) s.push(existing?.[r] ?? {});
  return s;
}

function initColWidths(cols: number, existing?: number[]): number[] {
  const w: number[] = [];
  for (let c = 0; c < cols; c++) w.push(existing?.[c] ?? 0);
  return w;
}

function dispatch(
  wrapper: HTMLElement, cells: string[][], rows: number, cols: number,
  rowStyles: RowStyle[], colWidths: number[], colStyles: RowStyle[]
): void {
  wrapper.dispatchEvent(new CustomEvent('bs-table-update', {
    detail: { cells, rows, cols, rowStyles, colWidths, colStyles },
    bubbles: true, composed: true,
  }));
}

/* ─── colour palettes ─── */

const ROW_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Gray', value: '#6b7280' },
];

const BG_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Light Red', value: '#fef2f2' },
  { label: 'Light Orange', value: '#fff7ed' },
  { label: 'Light Yellow', value: '#fefce8' },
  { label: 'Light Green', value: '#f0fdf4' },
  { label: 'Light Blue', value: '#eff6ff' },
  { label: 'Light Purple', value: '#faf5ff' },
  { label: 'Light Gray', value: '#f3f4f6' },
];

/* ─── row options popup ─── */

function showRowPopup(
  anchor: HTMLElement, container: HTMLElement, currentStyle: RowStyle,
  onApply: (style: RowStyle) => void, onDelete: (() => void) | null
): void {
  container.querySelector('.bs-table-row-popup')?.remove();

  const popup = document.createElement('div');
  popup.className = 'bs-table-row-popup';
  const aR = anchor.getBoundingClientRect();
  const cR = container.getBoundingClientRect();
  popup.style.left = `${aR.left - cR.left}px`;
  popup.style.top = `${aR.bottom - cR.top + 4}px`;

  function section(label: string, palette: typeof ROW_COLORS, field: 'color' | 'background') {
    const lbl = document.createElement('div');
    lbl.className = 'bs-table-popup-label';
    lbl.textContent = label;
    popup.appendChild(lbl);
    const grid = document.createElement('div');
    grid.className = 'bs-table-popup-grid';
    for (const c of palette) {
      const sw = document.createElement('button');
      sw.className = 'bs-table-popup-swatch';
      sw.title = c.label;
      if (field === 'color') sw.style.background = c.value || '#1a1a1a';
      else if (c.value) { sw.style.background = c.value; sw.style.border = '1px solid #d1d5db'; }
      else { sw.style.background = '#fff'; sw.style.border = '1px dashed #d1d5db'; }
      if ((currentStyle[field] || '') === c.value) sw.classList.add('active');
      sw.addEventListener('click', (e) => { e.stopPropagation(); onApply({ ...currentStyle, [field]: c.value }); popup.remove(); });
      grid.appendChild(sw);
    }
    popup.appendChild(grid);
  }

  section('Text Color', ROW_COLORS, 'color');
  const spacer = document.createElement('div'); spacer.style.height = '8px'; popup.appendChild(spacer);
  section('Background', BG_COLORS, 'background');

  if (onDelete) {
    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:rgba(255,255,255,0.1);margin:10px 0 8px';
    popup.appendChild(sep);
    const delBtn = document.createElement('button');
    delBtn.className = 'bs-table-popup-delete';
    delBtn.textContent = '🗑 Delete row';
    delBtn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); popup.remove(); document.removeEventListener('mousedown', dismiss); onDelete(); });
    popup.appendChild(delBtn);
  }

  container.appendChild(popup);

  const dismiss = (e: MouseEvent) => {
    if (!popup.contains(e.target as Node)) { popup.remove(); document.removeEventListener('mousedown', dismiss); }
  };
  setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
}

/* ─── column options popup ─── */

function showColPopup(
  anchor: HTMLElement, container: HTMLElement, currentStyle: RowStyle,
  onApply: (style: RowStyle) => void, onDelete: (() => void) | null
): void {
  container.querySelector('.bs-table-row-popup')?.remove();

  const popup = document.createElement('div');
  popup.className = 'bs-table-row-popup';
  const aR = anchor.getBoundingClientRect();
  const cR = container.getBoundingClientRect();
  popup.style.left = `${aR.left - cR.left}px`;
  popup.style.top = `${aR.bottom - cR.top + 4}px`;

  function section(label: string, palette: typeof ROW_COLORS, field: 'color' | 'background') {
    const lbl = document.createElement('div');
    lbl.className = 'bs-table-popup-label';
    lbl.textContent = label;
    popup.appendChild(lbl);
    const grid = document.createElement('div');
    grid.className = 'bs-table-popup-grid';
    for (const c of palette) {
      const sw = document.createElement('button');
      sw.className = 'bs-table-popup-swatch';
      sw.title = c.label;
      if (field === 'color') sw.style.background = c.value || '#1a1a1a';
      else if (c.value) { sw.style.background = c.value; sw.style.border = '1px solid #d1d5db'; }
      else { sw.style.background = '#fff'; sw.style.border = '1px dashed #d1d5db'; }
      if ((currentStyle[field] || '') === c.value) sw.classList.add('active');
      sw.addEventListener('click', (e) => { e.stopPropagation(); onApply({ ...currentStyle, [field]: c.value }); popup.remove(); });
      grid.appendChild(sw);
    }
    popup.appendChild(grid);
  }

  section('Text Color', ROW_COLORS, 'color');
  const spacer = document.createElement('div'); spacer.style.height = '8px'; popup.appendChild(spacer);
  section('Background', BG_COLORS, 'background');

  if (onDelete) {
    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:rgba(255,255,255,0.1);margin:10px 0 8px';
    popup.appendChild(sep);
    const delBtn = document.createElement('button');
    delBtn.className = 'bs-table-popup-delete';
    delBtn.textContent = '🗑 Delete column';
    delBtn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); popup.remove(); document.removeEventListener('mousedown', dismiss); onDelete(); });
    popup.appendChild(delBtn);
  }

  container.appendChild(popup);

  const dismiss = (e: MouseEvent) => {
    if (!popup.contains(e.target as Node)) { popup.remove(); document.removeEventListener('mousedown', dismiss); }
  };
  setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
}

/* ─── array helpers ─── */

function swapRows(cells: string[][], rs: RowStyle[], a: number, b: number) {
  [cells[a], cells[b]] = [cells[b], cells[a]];
  [rs[a], rs[b]] = [rs[b], rs[a]];
}
function swapCols(cells: string[][], cw: number[], cs: RowStyle[], a: number, b: number) {
  for (const row of cells) [row[a], row[b]] = [row[b], row[a]];
  [cw[a], cw[b]] = [cw[b], cw[a]];
  [cs[a], cs[b]] = [cs[b], cs[a]];
}

/* ═══════════════════════════════════════════════════════════
   TABLE BLOCK
   ═══════════════════════════════════════════════════════════ */

export const tableBlock: BlockDefinition<'table'> = {
  type: 'table',
  displayName: 'Table',
  icon: '⊞',
  hasContent: false,
  slashMenuKeywords: ['table', 'grid', 'spreadsheet'],
  defaultProps: () => ({ rows: 3, cols: 3 }),

  render(block) {
    let { rows, cols } = block.props;
    let cells = initCells(rows, cols, block.meta?.cells as string[][] | undefined);
    let rowStyles = initRowStyles(rows, block.meta?.rowStyles as RowStyle[] | undefined);
    let colWidths = initColWidths(cols, block.meta?.colWidths as number[] | undefined);
    let colStyles = initRowStyles(cols, block.meta?.colStyles as RowStyle[] | undefined);

    const wrapper = document.createElement('div');
    wrapper.className = 'bs-table-wrapper';

    let dragType: 'row' | 'col' | null = null;
    let dragIndex = -1;

    function rebuild() {
      wrapper.innerHTML = '';
      const container = document.createElement('div');
      container.className = 'bs-table-container';

      // Prevent table-internal drags from triggering editor-level block reordering
      container.addEventListener('dragover', (e) => { if (dragType) e.stopPropagation(); });
      container.addEventListener('dragenter', (e) => { if (dragType) e.stopPropagation(); });
      container.addEventListener('drop', (e) => { if (dragType) e.stopPropagation(); });

      /* ── Table ── */
      const table = document.createElement('table');
      table.className = 'bs-table';

      const colgroup = document.createElement('colgroup');
      for (let c = 0; c < cols; c++) {
        const col = document.createElement('col');
        if (colWidths[c] > 0) col.style.width = `${colWidths[c]}px`;
        colgroup.appendChild(col);
      }
      table.appendChild(colgroup);

      const tbody = document.createElement('tbody');
      for (let r = 0; r < rows; r++) {
        const tr = document.createElement('tr');
        const rs = rowStyles[r] || {};
        if (rs.color) tr.style.color = rs.color;
        if (rs.background) tr.style.background = rs.background;

        /* Row drag events on the <tr> itself */
        tr.addEventListener('dragover', (e) => {
          if (dragType !== 'row') return;
          e.preventDefault(); e.dataTransfer!.dropEffect = 'move';
          tbody.querySelectorAll('.bs-drag-over-row').forEach((el) => el.classList.remove('bs-drag-over-row'));
          tr.classList.add('bs-drag-over-row');
        });
        tr.addEventListener('drop', (e) => {
          e.preventDefault();
          if (dragType !== 'row' || dragIndex === r) return;
          swapRows(cells, rowStyles, dragIndex, r);
          dispatch(wrapper, cells, rows, cols, rowStyles, colWidths, colStyles);
          rebuild();
        });

        for (let c = 0; c < cols; c++) {
          const td = document.createElement('td');
          td.setAttribute('contenteditable', 'true');
          td.textContent = cells[r][c];
          // Apply column styles (row styles on tr take precedence for row-level)
          const cs = colStyles[c] || {};
          if (cs.color) td.style.color = cs.color;
          if (cs.background) td.style.backgroundColor = cs.background;
          td.addEventListener('input', () => {
            cells[r][c] = td.textContent || '';
            dispatch(wrapper, cells, rows, cols, rowStyles, colWidths, colStyles);
          });
          td.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); }
            if (e.key === 'Tab') {
              e.preventDefault(); e.stopPropagation();
              let nr = r, nc = e.shiftKey ? c - 1 : c + 1;
              if (nc >= cols) { nr++; nc = 0; } else if (nc < 0) { nr--; nc = cols - 1; }
              if (nr >= 0 && nr < rows) {
                const next = tbody.querySelector(`tr:nth-child(${nr + 1}) td:nth-child(${nc + 1})`) as HTMLElement | null;
                next?.focus();
              }
            }
          });
          // Column drop target on data cells
          td.addEventListener('dragover', (e) => { if (dragType === 'col') e.preventDefault(); });
          td.addEventListener('drop', (e) => {
            if (dragType !== 'col') return;
            e.preventDefault();
            if (dragIndex === c) return;
            swapCols(cells, colWidths, colStyles, dragIndex, c);
            dispatch(wrapper, cells, rows, cols, rowStyles, colWidths, colStyles);
            rebuild();
          });
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      container.appendChild(table);

      /* ── Row handles (outside the table, on the left) ── */
      const rowHandlesContainer = document.createElement('div');
      rowHandlesContainer.className = 'bs-table-row-handles';

      // We need to position handles after the table has been added to the DOM,
      // so we'll use a small timeout to read row positions.
      // However, for initial positioning we can calculate from row count.
      for (let r = 0; r < rows; r++) {
        const handle = document.createElement('div');
        handle.className = 'bs-table-row-handle';
        handle.setAttribute('draggable', 'true');
        handle.innerHTML = '<span class="bs-table-row-handle-icon">⠿</span>';
        handle.title = 'Click for options · Drag to reorder';
        handle.dataset.row = String(r);
        const ri = r;

        handle.addEventListener('click', (e) => {
          e.stopPropagation();
          showRowPopup(handle, container, rowStyles[ri] || {}, (ns) => {
            rowStyles[ri] = ns;
            dispatch(wrapper, cells, rows, cols, rowStyles, colWidths, colStyles);
            rebuild();
          }, rows > 1 ? () => {
            cells.splice(ri, 1); rowStyles.splice(ri, 1); rows--;
            dispatch(wrapper, cells, rows, cols, rowStyles, colWidths, colStyles);
            rebuild();
          } : null);
        });
        handle.addEventListener('dragstart', (e) => {
          e.stopPropagation();
          dragType = 'row'; dragIndex = r;
          e.dataTransfer!.effectAllowed = 'move';
          const tr = tbody.children[r] as HTMLElement;
          tr?.classList.add('dragging');
        });
        handle.addEventListener('dragend', () => {
          tbody.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
          tbody.querySelectorAll('.bs-drag-over-row').forEach((el) => el.classList.remove('bs-drag-over-row'));
          rowHandlesContainer.querySelectorAll('.bs-drag-over-handle').forEach((el) => el.classList.remove('bs-drag-over-handle'));
          dragType = null;
        });
        handle.addEventListener('dragover', (e) => {
          if (dragType !== 'row') return;
          e.preventDefault(); e.dataTransfer!.dropEffect = 'move';
          rowHandlesContainer.querySelectorAll('.bs-drag-over-handle').forEach((el) => el.classList.remove('bs-drag-over-handle'));
          handle.classList.add('bs-drag-over-handle');
          // Also highlight the target row
          tbody.querySelectorAll('.bs-drag-over-row').forEach((el) => el.classList.remove('bs-drag-over-row'));
          const targetTr = tbody.children[r] as HTMLElement;
          targetTr?.classList.add('bs-drag-over-row');
        });
        handle.addEventListener('drop', (e) => {
          e.preventDefault();
          if (dragType !== 'row' || dragIndex === r) return;
          swapRows(cells, rowStyles, dragIndex, r);
          dispatch(wrapper, cells, rows, cols, rowStyles, colWidths, colStyles);
          rebuild();
        });
        rowHandlesContainer.appendChild(handle);
      }
      container.appendChild(rowHandlesContainer);

      /* ── Column handles (outside the table, on top) ── */
      const colHandlesContainer = document.createElement('div');
      colHandlesContainer.className = 'bs-table-col-handles';

      for (let c = 0; c < cols; c++) {
        const handle = document.createElement('div');
        handle.className = 'bs-table-col-handle';
        handle.setAttribute('draggable', 'true');
        handle.innerHTML = '<span class="bs-table-col-handle-icon">⋮⋮</span>';
        handle.title = 'Click for options · Drag to reorder';
        handle.dataset.col = String(c);
        const ci = c;

        handle.addEventListener('click', (e) => {
          e.stopPropagation();
          showColPopup(handle, container, colStyles[ci] || {}, (ns) => {
            colStyles[ci] = ns;
            dispatch(wrapper, cells, rows, cols, rowStyles, colWidths, colStyles);
            rebuild();
          }, cols > 1 ? () => {
            for (const row of cells) row.splice(ci, 1);
            colWidths.splice(ci, 1); colStyles.splice(ci, 1); cols--;
            dispatch(wrapper, cells, rows, cols, rowStyles, colWidths, colStyles);
            rebuild();
          } : null);
        });

        handle.addEventListener('dragstart', (e) => {
          e.stopPropagation();
          dragType = 'col'; dragIndex = c;
          e.dataTransfer!.effectAllowed = 'move';
          handle.classList.add('dragging');
        });
        handle.addEventListener('dragend', () => {
          handle.classList.remove('dragging');
          table.querySelectorAll('.bs-drag-over-col').forEach((el) => el.classList.remove('bs-drag-over-col'));
          dragType = null;
        });
        handle.addEventListener('dragover', (e) => {
          if (dragType !== 'col') return;
          e.preventDefault(); e.dataTransfer!.dropEffect = 'move';
        });
        handle.addEventListener('drop', (e) => {
          e.preventDefault();
          if (dragType !== 'col' || dragIndex === c) return;
          swapCols(cells, colWidths, colStyles, dragIndex, c);
          dispatch(wrapper, cells, rows, cols, rowStyles, colWidths, colStyles);
          rebuild();
        });

        colHandlesContainer.appendChild(handle);
      }
      container.appendChild(colHandlesContainer);

      /* ── Column resize handles (between columns, on top edge) ── */
      const resizeContainer = document.createElement('div');
      resizeContainer.className = 'bs-table-col-resizers';

      for (let c = 0; c < cols - 1; c++) {
        const resizer = document.createElement('div');
        resizer.className = 'bs-table-col-resizer';
        resizer.dataset.col = String(c);
        resizer.addEventListener('mousedown', (e) => {
          e.preventDefault(); e.stopPropagation();
          const startX = e.clientX;
          const colEl = colgroup.children[c] as HTMLElement;
          const startW = colEl.getBoundingClientRect().width;
          resizer.classList.add('active');
          const onMove = (ev: MouseEvent) => {
            const newW = Math.max(40, startW + ev.clientX - startX);
            colEl.style.width = `${newW}px`;
          };
          const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            resizer.classList.remove('active');
            colWidths[c] = (colgroup.children[c] as HTMLElement).getBoundingClientRect().width;
            dispatch(wrapper, cells, rows, cols, rowStyles, colWidths, colStyles);
            positionOverlays();
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
        resizeContainer.appendChild(resizer);
      }
      container.appendChild(resizeContainer);

      /* ── Right edge handle: add column ── */
      const rightHandle = document.createElement('div');
      rightHandle.className = 'bs-table-handle-right';
      rightHandle.innerHTML = '<span class="bs-table-handle-icon">+</span>';
      rightHandle.title = 'Add column';
      rightHandle.addEventListener('click', () => {
        cols++; cells = cells.map((row) => [...row, '']); colWidths.push(0); colStyles.push({});
        dispatch(wrapper, cells, rows, cols, rowStyles, colWidths, colStyles);
        rebuild();
      });
      container.appendChild(rightHandle);

      /* ── Bottom edge handle: add row ── */
      const bottomHandle = document.createElement('div');
      bottomHandle.className = 'bs-table-handle-bottom';
      bottomHandle.innerHTML = '<span class="bs-table-handle-icon">+</span>';
      bottomHandle.title = 'Add row';
      bottomHandle.addEventListener('click', () => {
        rows++; cells.push(new Array(cols).fill('')); rowStyles.push({});
        dispatch(wrapper, cells, rows, cols, rowStyles, colWidths, colStyles);
        rebuild();
      });
      container.appendChild(bottomHandle);

      wrapper.appendChild(container);

      /* Position the overlays after first render */
      requestAnimationFrame(positionOverlays);

      function positionOverlays() {
        const tableRect = table.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const offsetX = tableRect.left - containerRect.left;
        const offsetY = tableRect.top - containerRect.top;

        // Position row handles
        rowHandlesContainer.style.top = `${offsetY}px`;
        rowHandlesContainer.style.left = `${offsetX - 10}px`;
        rowHandlesContainer.style.height = `${tableRect.height}px`;

        const trElements = tbody.querySelectorAll('tr');
        const handleElements = rowHandlesContainer.children;
        for (let r = 0; r < trElements.length && r < handleElements.length; r++) {
          const trRect = trElements[r].getBoundingClientRect();
          const h = handleElements[r] as HTMLElement;
          h.style.height = `${trRect.height}px`;
          h.style.top = `${trRect.top - tableRect.top}px`;
        }

        // Position column handles
        colHandlesContainer.style.left = `${offsetX}px`;
        colHandlesContainer.style.top = `${offsetY - 6}px`;
        colHandlesContainer.style.width = `${tableRect.width}px`;

        const firstRow = tbody.querySelector('tr');
        if (firstRow) {
          const tdElements = firstRow.querySelectorAll('td');
          const colHandleElements = colHandlesContainer.children;
          for (let c = 0; c < tdElements.length && c < colHandleElements.length; c++) {
            const tdRect = tdElements[c].getBoundingClientRect();
            const ch = colHandleElements[c] as HTMLElement;
            ch.style.width = `${tdRect.width}px`;
            ch.style.left = `${tdRect.left - tableRect.left}px`;
          }
        }

        // Position column resizers
        resizeContainer.style.left = `${offsetX}px`;
        resizeContainer.style.top = `${offsetY}px`;
        resizeContainer.style.height = `${tableRect.height}px`;

        if (firstRow) {
          const tdElements = firstRow.querySelectorAll('td');
          const resizerElements = resizeContainer.children;
          for (let c = 0; c < resizerElements.length; c++) {
            const tdRect = tdElements[c].getBoundingClientRect();
            const rz = resizerElements[c] as HTMLElement;
            rz.style.left = `${tdRect.right - tableRect.left - 3}px`;
          }
        }
      }
    }

    rebuild();
    return wrapper;
  },

  parseContent() { return undefined; },
};
