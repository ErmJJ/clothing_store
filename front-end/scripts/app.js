/* app.js
   Versión corregida: al hacer click en los botones de reportes dentro del offcanvas (collapse/hamburger)
   ahora el offcanvas se cierra automaticamente (mismo comportamiento que las colecciones).
   - Archivo completo, con comentarios en español.
   - Solo se modificó la parte de binding de botones de reportes para cerrar el offcanvas móvil.
*/

(() => {
  // ---------- CONFIG ----------
  const API_BASE = 'http://127.0.0.1:5000/clothing/api/v1/';

  const COLLECTIONS = {
    brands:    { title: 'Marcas',    endpoint: 'brands',   icon: 'bi-shop', relFor: {} },
    products:  { title: 'Productos', endpoint: 'products', icon: 'bi-bag',  relFor: { brand_id: 'brands' } },
    users:     { title: 'Usuarios',  endpoint: 'users',    icon: 'bi-person', relFor: {} },
    sales:     { title: 'Ventas',    endpoint: 'sales',    icon: 'bi-cart', relFor: { user_id: 'users', product_id: 'products' } },
    reviews:   { title: 'Reseñas',   endpoint: 'reviews',  icon: 'bi-star', relFor: { user_id: 'users', product_id: 'products' } }
  };

  const HEADER_ICONS = {
    _id: 'bi-hash', name: 'bi-tag', country: 'bi-geo-alt', founded: 'bi-calendar-event',
    brand_id: 'bi-building', category: 'bi-grid', price: 'bi-currency-dollar', stock: 'bi-stack',
    username: 'bi-person-badge', email: 'bi-envelope', password: 'bi-key',
    user_id: 'bi-person-check', product_id: 'bi-box-seam', quantity: 'bi-123', date: 'bi-calendar',
    rating: 'bi-star-fill', comment: 'bi-chat-left-text'
  };

  // ---------- ESTADO ----------
  let currentCollection = 'brands';
  let rawData = [];
  let visibleColumns = [];
  let currentPage = 1;
  let pageSize = 5;
  const pageSizes = [5, 10, 25, 50];

  const relatedCache = {};

  // DOM refs
  const tableHead = document.getElementById('tableHead');
  const tableBody = document.getElementById('tableBody');
  const collectionTitle = document.getElementById('collectionTitle');
  const collectionSubtitle = document.getElementById('collectionSubtitle');
  const liveSearch = document.getElementById('liveSearch');
  const toastContainer = document.getElementById('toastContainer');
  const paginationContainer = document.getElementById('pagination');
  const fullLoading = document.getElementById('fullLoading');
  const pageSizeSelectFooter = document.getElementById('pageSizeSelectFooter');
  const apiFullDisplay = document.getElementById('apiFullDisplay');
  const noColsMessage = document.getElementById('noColsMessage');

  // Bootstrap modals/offcanvas
  const formModal = new bootstrap.Modal(document.getElementById('formModal'));
  const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
  const filtersModalEl = document.getElementById('filtersModal');
  const filtersModal = new bootstrap.Modal(filtersModalEl);

  let isEditing = false;
  let editingId = null;
  let activeReportId = null;

  // ---------- UTIL ----------
  const joinUrl = (base, path='') => {
    if (!path) return base;
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) path = path.slice(1);
    return base.endsWith('/') ? base + path : base + '/' + path;
  };

  function showFullLoading(show=true) {
    if (!fullLoading) return;
    fullLoading.classList.toggle('d-none', !show);
  }

  function showToast(msg, type='info', delay=3000) {
    const el = document.createElement('div');
    el.className = `toast align-items-center text-bg-${type} border-0 shadow-sm mb-2`;
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    toastContainer.appendChild(el);
    const bs = new bootstrap.Toast(el, { delay });
    bs.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  }

  async function apiFetch(pathOrUrl, opts={}) {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : joinUrl(API_BASE, pathOrUrl);
    showFullLoading(true);
    try {
      const res = await fetch(url, opts);
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();
      if (!res.ok) {
        const msg = (data && data.error) ? data.error : (typeof data === 'string' ? data : JSON.stringify(data));
        throw new Error(msg);
      }
      return data;
    } catch (err) {
      showToast('Error de conexión: ' + (err.message || ''), 'danger', 4500);
      throw err;
    } finally {
      showFullLoading(false);
    }
  }

  function normalize(row) {
    if (!row || typeof row !== 'object') return row;
    const r = { ...row };
    if (r._id && typeof r._id === 'object') {
      if (r._id.$oid) r._id = r._id.$oid;
      else if (r._id.$numberInt) r._id = Number(r._id.$numberInt);
      else if (r._id.$numberLong) r._id = Number(r._id.$numberLong);
      else { try { r._id = JSON.stringify(r._id); } catch { r._id = String(r._id); } }
    }
    Object.keys(r).forEach(k => {
      const v = r[k];
      if (v && typeof v === 'object' && (v.$numberInt || v.$numberLong || v.$oid)) {
        if (v.$numberInt) r[k] = Number(v.$numberInt);
        else if (v.$numberLong) r[k] = Number(v.$numberLong);
        else if (v.$oid) r[k] = v.$oid;
      }
    });
    return r;
  }

  function titleCase(s){ return s.replace(/_/g,' ').split(' ').map(x => x.charAt(0).toUpperCase() + x.slice(1)).join(' '); }
  function prettyCol(col){ if (!col) return ''; if (col === '_id' || col === 'id') return 'ID'; return titleCase(col); }

  const columnsVisibilityKey = k => `cs_cols_${k}`;
  function loadColumnsFromStorage(key, defaultCols) {
    try {
      const raw = localStorage.getItem(columnsVisibilityKey(key));
      if (!raw) return defaultCols.slice();
      const parsed = JSON.parse(raw);
      return defaultCols.filter(c => parsed.includes(c));
    } catch { return defaultCols.slice(); }
  }
  function saveColumnsToStorage(key, cols) {
    try { localStorage.setItem(columnsVisibilityKey(key), JSON.stringify(cols)); } catch (e) { console.error('Error saving cols', e); }
  }

  // ---------- CRUD ----------
  async function list(endpoint){ return apiFetch(`/${endpoint}`); }
  async function getById(endpoint, id){ return apiFetch(`/${endpoint}?id=${encodeURIComponent(id)}`); }
  async function create(endpoint, payload){ return apiFetch(`/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
  async function update(endpoint, id, payload){ return apiFetch(`/${endpoint}?id=${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
  async function remove(endpoint, id){ return apiFetch(`/${endpoint}?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); }

  // ---------- TABLE RENDER ----------
  function buildColumnsFromData(data) {
    if (!data || !data.length) return [];
    const keys = new Set();
    data.forEach(d => Object.keys(d).forEach(k => keys.add(k)));
    const preferred = {
      brands: ['_id','name','country','founded'],
      products: ['_id','name','brand_id','category','price','stock'],
      users: ['_id','username','email','password','country'],
      sales: ['_id','user_id','product_id','quantity','date'],
      reviews: ['_id','user_id','product_id','rating','comment']
    }[currentCollection] || [];
    const cols = [];
    preferred.forEach(p => { if (keys.has(p)) { cols.push(p); keys.delete(p); }});
    Array.from(keys).sort().forEach(k => cols.push(k));
    return cols;
  }

  function renderTable(data) {
    rawData = (Array.isArray(data) ? data : (data ? [data] : [])).map(normalize);
    const defaultCols = buildColumnsFromData(rawData);
    visibleColumns = loadColumnsFromStorage(currentCollection, defaultCols);
    if (!visibleColumns || visibleColumns.length === 0) visibleColumns = defaultCols.slice();

    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (!visibleColumns.length) {
      document.getElementById('dataTable').classList.add('d-none');
      if (noColsMessage) noColsMessage.classList.remove('d-none');
      updateRowsInfo(0,0, rawData.length);
      buildColumnsControls();
      return;
    } else {
      document.getElementById('dataTable').classList.remove('d-none');
      if (noColsMessage) noColsMessage.classList.add('d-none');
    }

    const tr = document.createElement('tr');
    visibleColumns.forEach(col => {
      const th = document.createElement('th');
      const iconHtml = HEADER_ICONS[col] ? `<i class="bi ${HEADER_ICONS[col]}" aria-hidden="true"></i>` : '';
      th.innerHTML = `<div class="d-flex align-items-center justify-content-start"><span>${prettyCol(col)}</span><span class="ms-2">${iconHtml}</span></div>`;
      tr.appendChild(th);
    });

    const thAction = document.createElement('th');
    thAction.className = 'text-end';
    thAction.textContent = 'Acciones';
    tr.appendChild(thAction);
    tableHead.appendChild(tr);

    currentPage = 1;
    applyFilterAndRenderRows();
    buildColumnsControls();
    if (apiFullDisplay) apiFullDisplay.textContent = API_BASE;
    showToast(`Colección "${COLLECTIONS[currentCollection].title}" cargada — ${rawData.length} registros`, 'info', 900);
  }

  function resolveRelatedLabel(col, id) {
    if (!id) return '';
    const relFor = COLLECTIONS[currentCollection].relFor || {};
    const relCollection = relFor[col];
    if (!relCollection) return String(id);
    const opts = relatedCache[relCollection] || [];
    const found = opts.find(o => String(o.value) === String(id));
    return found ? `${found.label}` : String(id);
  }

  function applyFilterAndRenderRows(filters = null) {
    const q = (liveSearch.value || '').trim().toLowerCase();

    let filtered = rawData.filter(row => {
      const matchesSearch = !q || visibleColumns.some(col => {
        const v = row[col];
        if (v === undefined || v === null) return false;
        return String(v).toLowerCase().includes(q);
      });
      return matchesSearch;
    });

    if (filters) {
      filtered = filtered.filter(r => {
        return Object.entries(filters).every(([col, condition]) => {
          if (condition === null || condition === '' || (typeof condition === 'object' && !condition.min && !condition.max)) return true;
          const val = r[col];
          if (val === undefined || val === null) return false;
          if (typeof condition === 'object' && (condition.min !== undefined || condition.max !== undefined)) {
            const num = Number(val) || 0;
            if (condition.min !== undefined && condition.min !== '') {
              if (num < Number(condition.min)) return false;
            }
            if (condition.max !== undefined && condition.max !== '') {
              if (num > Number(condition.max)) return false;
            }
            return true;
          }
          return String(val).toLowerCase().includes(String(condition).toLowerCase());
        });
      });
    }

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const pageRows = filtered.slice(start, start + pageSize);

    tableBody.innerHTML = '';
    pageRows.forEach(row => {
      const tr = document.createElement('tr');
      visibleColumns.forEach(col => {
        const td = document.createElement('td');
        if (col === '_id') {
          td.textContent = row._id ?? '';
        } else if (/_id$/.test(col) && row[col]) {
          td.textContent = resolveRelatedLabel(col, row[col]);
        } else {
          let v = row[col];
          if (Array.isArray(v)) v = v.join(', ');
          td.textContent = (v === undefined || v === null) ? '' : v;
        }
        tr.appendChild(td);
      });

      const tdA = document.createElement('td');
      tdA.className = 'text-end';
      tdA.innerHTML = `
        <div class="btn-group" role="group" aria-label="Acciones">
          <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${row._id}" title="Editar"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${row._id}" title="Eliminar"><i class="bi bi-trash"></i></button>
        </div>`;
      tr.appendChild(tdA);
      tableBody.appendChild(tr);
    });

    renderPagination(totalItems, totalPages);
    updateRowsInfo(start + (pageRows.length ? 1 : 0), start + pageRows.length, totalItems);
  }

  function updateRowsInfo(from, to, total) {
    const rowsInfo = document.getElementById('rowsInfo');
    if (!rowsInfo) return;
    if (total === 0) rowsInfo.textContent = `0 registros`;
    else rowsInfo.textContent = `Mostrando ${from}-${to} de ${total} registros (página ${currentPage})`;
  }

  // ---------- PAGINACIÓN ----------
  function renderPagination(totalItems, totalPages) {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';

    const ul = document.createElement('ul');
    ul.className = 'pagination pagination-sm mb-0';

    const prev = document.createElement('li');
    prev.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prev.innerHTML = `<button class="page-link" aria-label="Anterior"><i class="bi bi-chevron-left"></i></button>`;
    prev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; applyFilterAndRenderRows(activeFilters); }});
    ul.appendChild(prev);

    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons/2));
    let endPage = startPage + maxButtons - 1;
    if (endPage > totalPages) { endPage = totalPages; startPage = Math.max(1, endPage - maxButtons + 1); }

    if (startPage > 1) {
      ul.appendChild(createPageButton(1));
      if (startPage > 2) ul.appendChild(createEllipsis());
    }

    for (let p = startPage; p <= endPage; p++) ul.appendChild(createPageButton(p));

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) ul.appendChild(createEllipsis());
      ul.appendChild(createPageButton(totalPages));
    }

    const next = document.createElement('li');
    next.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    next.innerHTML = `<button class="page-link" aria-label="Siguiente"><i class="bi bi-chevron-right"></i></button>`;
    next.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; applyFilterAndRenderRows(activeFilters); }});
    ul.appendChild(next);

    paginationContainer.appendChild(ul);

    if (pageSizeSelectFooter) {
      pageSizeSelectFooter.innerHTML = pageSizes.map(sz => `<option value="${sz}" ${sz === pageSize ? 'selected' : ''}>${sz}</option>`).join('');
      pageSizeSelectFooter.onchange = (e) => { pageSize = Number(e.target.value) || 5; currentPage = 1; applyFilterAndRenderRows(activeFilters); };
    }
  }

  function createPageButton(n) {
    const li = document.createElement('li');
    li.className = `page-item ${n === currentPage ? 'active' : ''}`;
    li.innerHTML = `<button class="page-link">${n}</button>`;
    li.addEventListener('click', () => { if (n === currentPage) return; currentPage = n; applyFilterAndRenderRows(activeFilters); });
    return li;
  }

  function createEllipsis() {
    const li = document.createElement('li');
    li.className = 'page-item disabled';
    li.innerHTML = `<span class="page-link">…</span>`;
    return li;
  }

  // ---------- COLUMN CONTROLS ----------
  function buildColumnsControls() {
    const columnsList = document.getElementById('columnsList');
    columnsList.innerHTML = '';
    const defaultCols = buildColumnsFromData(rawData);
    const fallback = {
      brands: ['_id','name','country','founded'],
      products: ['_id','name','brand_id','category','price','stock'],
      users: ['_id','username','email','password','country'],
      sales: ['_id','user_id','product_id','quantity','date'],
      reviews: ['_id','user_id','product_id','rating','comment']
    }[currentCollection] || [];
    const cols = defaultCols.length ? defaultCols : fallback;
    cols.forEach(col => {
      const id = `col-${col}`;
      const checked = visibleColumns.includes(col);
      const div = document.createElement('div');
      div.className = 'form-check form-switch mb-2';
      div.innerHTML = `<input class="form-check-input" type="checkbox" id="${id}" data-col="${col}" ${checked ? 'checked' : ''}>
        <label class="form-check-label" for="${id}">${prettyCol(col)}</label>`;
      columnsList.appendChild(div);
    });

    columnsList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const col = e.target.dataset.col;
        if (e.target.checked) {
          if (!visibleColumns.includes(col)) visibleColumns.push(col);
        } else {
          visibleColumns = visibleColumns.filter(c => c !== col);
        }
        saveColumnsToStorage(currentCollection, visibleColumns);
        currentPage = 1;
        renderTable(rawData);
      });
    });
  }

  // ---------- RELACIONES ----------
  async function fetchRelated(rel) {
    if (relatedCache[rel]) return relatedCache[rel];
    try {
      const listData = await list(rel);
      const arr = Array.isArray(listData) ? listData : (listData ? [listData] : []);
      const mapped = arr.map(it => {
        const n = normalize(it);
        const value = n._id ?? n.id ?? '';
        // Mejor lógica para elegir el label representativo
        let label = '';
        if (n.name) label = n.name;
        else if (n.title) label = n.title;
        else if (n.username) label = n.username;
        else if (n.email) label = n.email;
        else if (n.country) label = n.country;
        else if (n.category) label = n.category;
        else if (n.brand) label = n.brand;
        else if (n.product) label = n.product;
        else label = String(value);
        return { value, label };
      });
      relatedCache[rel] = mapped;
      return mapped;
    } catch (err) {
      showToast(`Error cargando ${rel}: ${err.message}`, 'warning', 3000);
      relatedCache[rel] = [];
      return [];
    }
  }

  // ---------- FORM DINÁMICO ----------
  async function makeFormFields(sample = {}) {
    const form = document.getElementById('entityForm');
    form.innerHTML = '';
    const presets = {
      brands: ['name','country','founded'],
      products: ['name','brand_id','category','price','stock'],
      users: ['username','email','password','country'],
      sales: ['user_id','product_id','quantity','date'],
      reviews: ['user_id','product_id','rating','comment']
    }[currentCollection] || [];

    const keys = new Set();
    if (presets) presets.forEach(k => keys.add(k));
    Object.keys(sample || {}).forEach(k => keys.add(k));
    const fields = Array.from(keys).filter(k => k !== '_id');

    const relRequests = [];
    fields.forEach(f => {
      if (/_id$/.test(f)) {
        const relCol = COLLECTIONS[currentCollection].relFor[f] || f.replace(/_id$/, '') + 's';
        relRequests.push({ field: f, rel: relCol });
      }
    });

    const relData = {};
    await Promise.all(relRequests.map(async r => { relData[r.field] = await fetchRelated(r.rel); }));

    // Ejemplos para placeholders
    const examplePlaceholders = {
      name: 'Ej: Nike',
      country: 'Ej: Estados Unidos',
      founded: 'Ej: 1964',
      category: 'Ej: Camisetas',
      price: 'Ej: 99.99',
      stock: 'Ej: 100',
      username: 'Ej: juanperez',
      email: 'Ej: usuario@email.com',
      password: 'Ej: 123456',
      quantity: 'Ej: 2',
      rating: 'Ej: 4.5',
      comment: 'Ej: Muy buen producto',
      date: 'Ej: 2025-08-27'
    };
    for (const key of fields) {
      const val = sample[key] ?? '';
      const id = `field-${key}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'col-12 col-md-6 mb-3';
      let placeholder = '';
      if (!isEditing) {
        placeholder = examplePlaceholders[key] || `Ejemplo`;
      } else {
        placeholder = val ? String(val) : (examplePlaceholders[key] || 'Ejemplo');
      }

      if (/_id$/.test(key)) {
        const options = relData[key] || [];
        const opts = [`<option value="">-- Seleccione ${prettyCol(key)} --</option>`]
          .concat(options.map(o => `<option value="${o.value}">${o.label}</option>`))
          .join('');
        wrapper.innerHTML = `
          <label for="${id}" class="form-label small text-muted">${prettyCol(key)}</label>
          <select id="${id}" name="${key}" class="form-select form-select-sm">${opts}</select>`;
        form.appendChild(wrapper);
        if (val) setTimeout(() => { const select = wrapper.querySelector('select'); if (select) select.value = String(val); }, 0);
        continue;
      }

      // Inputs: en crear, value vacío y placeholder ejemplo; en editar, value vacío y placeholder con valor actual
      let inputValue = '';
      if (isEditing) inputValue = '';

      if (key === 'date') {
        wrapper.innerHTML = `
          <label for="${id}" class="form-label small text-muted">${prettyCol(key)}</label>
          <input type="date" id="${id}" name="${key}" class="form-control form-control-sm" value="${inputValue}" placeholder="${placeholder}">`;
      } else if (["price","stock","quantity","rating","founded"].includes(key)) {
        wrapper.innerHTML = `
          <label for="${id}" class="form-label small text-muted">${prettyCol(key)}</label>
          <input type="number" id="${id}" name="${key}" class="form-control form-control-sm" value="${inputValue}" placeholder="${placeholder}" step="${key === 'rating' ? '0.1' : '1'}">`;
      } else if (key === 'comment') {
        wrapper.innerHTML = `
          <label for="${id}" class="form-label small text-muted">${prettyCol(key)}</label>
          <textarea id="${id}" name="${key}" class="form-control form-control-sm" rows="2" placeholder="${placeholder}">${inputValue}</textarea>`;
      } else if (key === 'password') {
        wrapper.innerHTML = `
          <label for="${id}" class="form-label small text-muted">${prettyCol(key)}</label>
          <input type="text" id="${id}" name="${key}" class="form-control form-control-sm" value="${inputValue}" placeholder="${placeholder}">
          <div class="form-text">Texto plano — solo en entornos de prueba.</div>`;
      } else {
        wrapper.innerHTML = `
          <label for="${id}" class="form-label small text-muted">${prettyCol(key)}</label>
          <input type="text" id="${id}" name="${key}" class="form-control form-control-sm" value="${inputValue}" placeholder="${placeholder}">`;
      }
      form.appendChild(wrapper);
    }
  }

  // ---------- MODALES / CRUD ----------
  async function openCreateModal() {
    isEditing = false; editingId = null;
    document.getElementById('formModalTitle').textContent = `Crear ${COLLECTIONS[currentCollection].title}`;
    const sample = rawData[0] || {};
    await makeFormFields(sample);
    formModal.show();
  }

  async function onEditClickedId(id) {
    let row = rawData.find(r => String(r._id) === String(id));
    if (!row) {
      try {
        const fetched = await getById(COLLECTIONS[currentCollection].endpoint, id);
        row = normalize(fetched);
      } catch (err) {
        showToast('Registro no encontrado', 'warning');
        return;
      }
    }
    isEditing = true; editingId = id;
    document.getElementById('formModalTitle').textContent = `Editar ${COLLECTIONS[currentCollection].title}`;
    await makeFormFields(row);
    formModal.show();
  }

  function onDeleteClickedId(id) {
    document.getElementById('confirmMessage').textContent = `¿Seguro que desea eliminar el elemento con id = ${id}? Esta acción no se puede deshacer.`;
    const confirmBtnOld = document.getElementById('confirmDeleteBtn');
    const confirmBtn = confirmBtnOld.cloneNode(true);
    confirmBtnOld.parentNode.replaceChild(confirmBtn, confirmBtnOld);
    confirmBtn.addEventListener('click', async () => {
      try {
        await remove(COLLECTIONS[currentCollection].endpoint, id);
        showToast('Eliminado correctamente', 'success', 1500);
        confirmModal.hide();
        await loadCollection(currentCollection);
      } catch (err) {
        showToast('Error eliminando: ' + (err.message || ''), 'danger', 4000);
      }
    });
    confirmModal.show();
  }

  async function onFormSubmit() {
    const form = document.getElementById('entityForm');
    const fd = new FormData(form);
    const payload = {};
    for (const [k, v] of fd.entries()) {
      if (['price','stock','quantity','rating','founded'].includes(k)) payload[k] = v === '' ? 0 : Number(v);
      else payload[k] = v;
    }
    try {
      let created = null;
      if (!isEditing) {
        created = await create(COLLECTIONS[currentCollection].endpoint, payload);
        showToast('Creado con éxito', 'success', 1200);
      } else {
        await update(COLLECTIONS[currentCollection].endpoint, editingId, payload);
        showToast('Actualizado con éxito', 'success', 1200);
      }
      formModal.hide();
      await loadCollection(currentCollection);
      // Si se creó una entidad relacional, limpiar el cache y actualizar selects
      if (!isEditing && created && ['brands','users','products'].includes(currentCollection)) {
        Object.keys(COLLECTIONS).forEach(col => {
          Object.values(COLLECTIONS[col].relFor || {}).forEach(rel => {
            if (rel === currentCollection) relatedCache[rel] = undefined;
          });
        });
      }
    } catch (err) {
      showToast('Error guardando: ' + (err.message || ''), 'danger', 4500);
    }
  }

  // ---------- REPORTS: marcado y utilidades ----------
  function clearReportMarks() {
    ['report_brands_sales','report_products_stock','report_top_brands','report_top_users','report_product_ratings',
     'report_brands_sales_m','report_products_stock_m','report_top_brands_m','report_top_users_m','report_product_ratings_m'].forEach(key => {
       const btn = document.getElementById(key);
       if (!btn) return;
       btn.classList.remove('btn-primary');
       btn.classList.add('btn-outline-primary');
     });
    activeReportId = null;
  }

  function markReportButton(id) {
    clearReportMarks();
    if (!id) return;
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.remove('btn-outline-primary');
    btn.classList.add('btn-primary');
    activeReportId = id;
  }

  async function loadReport_brands_sales(){ collectionTitle.textContent = 'Reporte: Marcas con ventas'; collectionSubtitle.textContent = 'Marcas con ventas'; markReportButton('report_brands_sales'); try { const data = await apiFetch('/reports/brands-with-sales'); renderTable(data); } catch(err){ showToast('Error cargando reporte', 'danger', 3000); } }
  async function loadReport_products_stock(){ collectionTitle.textContent = 'Reporte: Prendas vendidas y stock'; collectionSubtitle.textContent = 'Prendas vendidas & stock'; markReportButton('report_products_stock'); try { const data = await apiFetch('/reports/products-stock'); renderTable(data); } catch(err){ showToast('Error cargando reporte', 'danger', 3000); } }
  async function loadReport_top_brands(){ collectionTitle.textContent = 'Reporte: Top 5 marcas'; collectionSubtitle.textContent = 'Top 5 marcas'; markReportButton('report_top_brands'); try { const data = await apiFetch('/reports/top-brands'); renderTable(data); } catch(err){ showToast('Error cargando reporte', 'danger', 3000); } }
  async function loadReport_top_users(){ collectionTitle.textContent = 'Reporte: Usuarios con más compras'; collectionSubtitle.textContent = 'Usuarios con más compras'; markReportButton('report_top_users'); try { const data = await apiFetch('/reports/top-users'); renderTable(data); } catch(err){ showToast('Error cargando reporte', 'danger', 3000); } }
  async function loadReport_product_ratings(){ collectionTitle.textContent = 'Reporte: Promedio calif. por producto'; collectionSubtitle.textContent = 'Promedio calif. por producto'; markReportButton('report_product_ratings'); try { const data = await apiFetch('/reports/product-ratings'); renderTable(data); } catch(err){ showToast('Error cargando reporte', 'danger', 3000); } }

  // ---------- EXPORT CSV ----------
  function exportVisibleToCSV(filename = `${currentCollection}.csv`) {
    const headers = visibleColumns.slice();
    const rows = [headers];
    const q = (liveSearch.value || '').trim().toLowerCase();
    const filtered = rawData.filter(row => !q || visibleColumns.some(col => (row[col] || '').toString().toLowerCase().includes(q)));
    filtered.forEach(r => {
      const row = headers.map(h => {
        const v = r[h];
        if (v === undefined || v === null) return '';
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v).replace(/"/g, '""').replace(/\n/g, ' ');
      });
      rows.push(row);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast('Exportado CSV', 'success', 1200);
  }

  // ---------- DEBOUNCE ----------
  function debounce(fn, wait=220) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), wait); };
  }
  const onSearch = debounce(() => { currentPage = 1; applyFilterAndRenderRows(activeFilters); });

  // ---------- COLLECTIONS PANEL ----------
  async function renderCollectionsPanel() {
    const container = document.getElementById('collectionsRadios');
    const containerOff = document.getElementById('collectionsRadiosOffcanvas');
    if (container) container.innerHTML = '';
    if (containerOff) containerOff.innerHTML = '';

    const keys = Object.keys(COLLECTIONS);
    const counts = await Promise.all(keys.map(async k => {
      try {
        const l = await list(COLLECTIONS[k].endpoint);
        const arr = Array.isArray(l) ? l : (l ? [l] : []);
        return arr.length;
      } catch (err) { console.error('Error counting', k, err); return 0; }
    }));

    function createCollectionItem(k, cnt) {
      const meta = COLLECTIONS[k];
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
      item.innerHTML = `<div><span class="me-2"><i class="bi ${meta.icon}"></i></span>${meta.title}</div><span class="badge bg-light text-muted">${cnt}</span>`;
      item.addEventListener('click', async () => {
        clearReportMarks();
        markCollectionActive(k);
        currentCollection = k;
        await loadCollection(k);
        // si vino desde el offcanvas (mobile), cerrarlo
        const off = bootstrap.Offcanvas.getInstance(document.getElementById('panelOffcanvas'));
        if (off) off.hide();
      });
      return item;
    }

    keys.forEach((k, i) => {
      const cnt = counts[i] ?? 0;
      const desktopItem = createCollectionItem(k, cnt);
      const mobileItem = createCollectionItem(k, cnt);
      if (container) container.appendChild(desktopItem);
      if (containerOff) containerOff.appendChild(mobileItem);
    });

    // BIND de buttons de reportes: ahora cerramos el offcanvas cuando se hace click en la versión móvil
    [
      ['report_brands_sales','report_brands_sales_m', loadReport_brands_sales],
      ['report_products_stock','report_products_stock_m', loadReport_products_stock],
      ['report_top_brands','report_top_brands_m', loadReport_top_brands],
      ['report_top_users','report_top_users_m', loadReport_top_users],
      ['report_product_ratings','report_product_ratings_m', loadReport_product_ratings]
    ].forEach(([idD,idM,fn]) => {
      const btnD = document.getElementById(idD);
      const btnM = document.getElementById(idM);

      // desktop: comportamiento previo (no cerrar offcanvas porque no está abierto)
      if (btnD) btnD.onclick = () => { fn(); markReportButton(idD); markCollectionActive(null); };

      // mobile (offcanvas): además de ejecutar el reporte, marcamos y cerramos el offcanvas
      if (btnM) btnM.onclick = () => {
        fn();
        markReportButton(idM);
        markCollectionActive(null);
        // Cerrar panelOffcanvas si está abierto (comportamiento pedido)
        const off = bootstrap.Offcanvas.getInstance(document.getElementById('panelOffcanvas'));
        if (off) off.hide();
      };
    });
  }

  // Marcar visualmente la colección activa
  function markCollectionActive(collectionKey) {
    document.querySelectorAll('#collectionsRadios .list-group-item, #collectionsRadiosOffcanvas .list-group-item').forEach(el => {
      el.classList.remove('active');
    });
    if (!collectionKey) return;
    const containers = [document.getElementById('collectionsRadios'), document.getElementById('collectionsRadiosOffcanvas')];
    containers.forEach(container => {
      if (!container) return;
      Array.from(container.children).forEach(btn => {
        if (!btn) return;
        if (btn.textContent && btn.textContent.trim().startsWith(COLLECTIONS[collectionKey].title)) {
          btn.classList.add('active');
        }
      });
    });
  }

  // ---------- LOAD COLLECTION ----------
  async function loadCollection(key) {
    currentCollection = key;
    const meta = COLLECTIONS[key];
    collectionTitle.textContent = meta.title;
    collectionSubtitle.textContent = `${meta.title} (Panel de administración)`;
    try {
      const data = await list(meta.endpoint);
      clearReportMarks();
      markCollectionActive(key);
      renderTable(data);
    } catch (err) {
      console.error(err);
      showToast('Error cargando colección: ' + (err.message || ''), 'danger', 4000);
      renderTable([]);
    }
  }

  // ---------- FILTERS ----------
  let activeFilters = null;
  function detectFieldType(col) {
    if (/date$/i.test(col)) return 'date';
    if (/(price|stock|quantity|rating|founded|amount|total)/i.test(col)) return 'number';
    return 'text';
  }

  function openFiltersModal() {
    const form = document.getElementById('filtersForm');
    form.innerHTML = '';
    visibleColumns.forEach(col => {
      const type = detectFieldType(col);
      const id = `filter-${col}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'col-12 mb-2';
      if (type === 'number') {
        wrapper.innerHTML = `
          <label class="form-label small text-muted">${prettyCol(col)} (min / max)</label>
          <div class="d-flex gap-2">
            <input id="${id}-min" type="number" class="form-control form-control-sm" placeholder="min">
            <input id="${id}-max" type="number" class="form-control form-control-sm" placeholder="max">
          </div>`;
      } else if (type === 'date') {
        wrapper.innerHTML = `
          <label class="form-label small text-muted">${prettyCol(col)} (desde / hasta)</label>
          <div class="d-flex gap-2">
            <input id="${id}-min" type="date" class="form-control form-control-sm">
            <input id="${id}-max" type="date" class="form-control form-control-sm">
          </div>`;
      } else {
        wrapper.innerHTML = `
          <label class="form-label small text-muted">${prettyCol(col)}</label>
          <input id="${id}" type="text" class="form-control form-control-sm" placeholder="Contiene...">`;
      }
      form.appendChild(wrapper);
    });

    document.getElementById('applyFilters').onclick = () => {
      const filters = {};
      visibleColumns.forEach(col => {
        const type = detectFieldType(col);
        const id = `filter-${col}`;
        if (type === 'number' || type === 'date') {
          const minEl = document.getElementById(`${id}-min`);
          const maxEl = document.getElementById(`${id}-max`);
          filters[col] = { min: minEl.value, max: maxEl.value };
        } else {
          const el = document.getElementById(id);
          filters[col] = el.value;
        }
      });
      activeFilters = filters;
      currentPage = 1;
      applyFilterAndRenderRows(activeFilters);
      filtersModal.hide();
    };

    document.getElementById('clearFilters').onclick = () => {
      activeFilters = null;
      document.getElementById('filtersForm').querySelectorAll('input').forEach(i => i.value = '');
      applyFilterAndRenderRows(activeFilters);
    };

    filtersModal.show();
  }

  // ---------- EVENTS BIND ----------
  function bindEvents() {
    document.getElementById('btnCreate').addEventListener('click', openCreateModal);
    document.getElementById('btnExport').addEventListener('click', () => exportVisibleToCSV());
    document.getElementById('formSubmit').addEventListener('click', onFormSubmit);
    document.getElementById('clearSearch').addEventListener('click', () => { liveSearch.value = ''; currentPage = 1; applyFilterAndRenderRows(activeFilters); });
    liveSearch.addEventListener('input', onSearch);
    document.getElementById('btnFilters').addEventListener('click', openFiltersModal);

    const showAllCols = document.getElementById('showAllCols');
    const hideAllCols = document.getElementById('hideAllCols');
    if (showAllCols) showAllCols.addEventListener('click', () => {
      const all = buildColumnsFromData(rawData);
      visibleColumns = (all.length ? all : ['_id','name']).slice();
      saveColumnsToStorage(currentCollection, visibleColumns);
      currentPage = 1;
      renderTable(rawData);
    });
    if (hideAllCols) hideAllCols.addEventListener('click', () => {
      visibleColumns = [];
      saveColumnsToStorage(currentCollection, visibleColumns);
      currentPage = 1;
      renderTable(rawData);
    });

    tableBody.addEventListener('click', (ev) => {
      const editBtn = ev.target.closest('.btn-edit');
      if (editBtn) { onEditClickedId(editBtn.dataset.id); return; }
      const delBtn = ev.target.closest('.btn-delete');
      if (delBtn) { onDeleteClickedId(delBtn.dataset.id); return; }
    });

    document.getElementById('entityForm').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('formSubmit').click();
      }
    });
  }

  // ---------- INIT ----------
  document.addEventListener('DOMContentLoaded', async () => {
    if (apiFullDisplay) apiFullDisplay.textContent = API_BASE;

    await renderCollectionsPanel();
    await loadCollection(currentCollection);
    bindEvents();

    Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]')).forEach(el => new bootstrap.Tooltip(el));
  });
})();