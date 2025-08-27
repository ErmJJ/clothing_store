(() => {
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

  // State
  let currentCollection = 'brands';
  let rawData = [];
  let visibleColumns = [];
  let currentPage = 1;
  let pageSize = 5;
  const pageSizes = [5, 10, 25, 50];
  const relatedCache = {};
  const columnsVisibilityKey = k => `cs_cols_${k}`;

  // DOM refs
  const tableHead = document.getElementById('tableHead');
  const tableBody = document.getElementById('tableBody');
  const collectionTitle = document.getElementById('collectionTitle');
  const collectionSubtitle = document.getElementById('collectionSubtitle');
  const liveSearch = document.getElementById('liveSearch');
  const clearSearchBtn = document.getElementById('clearSearch');
  const columnsList = document.getElementById('columnsList');
  const toastContainer = document.getElementById('toastContainer');
  const paginationContainer = document.getElementById('pagination');
  const fullLoading = document.getElementById('fullLoading');

  // modals
  const formModal = new bootstrap.Modal(document.getElementById('formModal'));
  const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));

  let isEditing = false;
  let editingId = null;

  // UTIL
  const joinUrl = (base, path='') => {
    if (path.startsWith('/')) path = path.slice(1);
    return base.endsWith('/') ? base + path : base + '/' + path;
  };

  function showFullLoading(show=true) { if (!fullLoading) return; fullLoading.classList.toggle('d-none', !show); }
  function showToast(msg, type='info', delay=3000) {
    const el = document.createElement('div');
    el.className = `toast align-items-center text-bg-light border-0 shadow-sm mb-2`;
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
    } finally { showFullLoading(false); }
  }

  function titleCase(s){ return s.replace(/_/g,' ').split(' ').map(x=> x.charAt(0).toUpperCase()+x.slice(1)).join(' '); }
  function prettyCol(col){ if (col===' _id' || col==='id') return 'ID'; if (col==='_id') return 'ID'; return titleCase(col); }

  // Persistence columns
  function loadColumnsFromStorage(key, defaultCols) {
    try {
      const raw = localStorage.getItem(columnsVisibilityKey(key));
      if (!raw) return defaultCols.slice();
      const parsed = JSON.parse(raw);
      return defaultCols.filter(c => parsed.includes(c));
    } catch { return defaultCols.slice(); }
  }
  function saveColumnsToStorage(key, cols) {
    try { localStorage.setItem(columnsVisibilityKey(key), JSON.stringify(cols)); } catch {}
  }

  // Data normalize
  function normalize(row) {
    const r = { ...row };
    if (r._id && typeof r._id === 'object') {
      if (r._id.$oid) r._id = r._id.$oid; else r._id = String(r._id);
    }
    return r;
  }

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

  // CRUD wrappers
  async function list(endpoint){ return apiFetch(`/${endpoint}`); }
  async function getById(endpoint, id){ return apiFetch(`/${endpoint}?id=${encodeURIComponent(id)}`); }
  async function create(endpoint, payload){ return apiFetch(`/${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }); }
  async function update(endpoint,id,payload){ return apiFetch(`/${endpoint}?id=${encodeURIComponent(id)}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }); }
  async function remove(endpoint,id){ return apiFetch(`/${endpoint}?id=${encodeURIComponent(id)}`, { method:'DELETE' }); }

  // RENDER TABLE & PAGINATION
  function renderTable(data) {
    rawData = (Array.isArray(data) ? data : (data ? [data] : [])).map(normalize);
    const defaultCols = buildColumnsFromData(rawData);
    visibleColumns = loadColumnsFromStorage(currentCollection, defaultCols);
    if (!visibleColumns || visibleColumns.length===0) visibleColumns = defaultCols.slice();

    tableHead.innerHTML = ''; tableBody.innerHTML = '';

    // Header
    const tr = document.createElement('tr');
    const colMax = {};
    visibleColumns.forEach(col=>{
      let max = prettyCol(col).length;
      rawData.forEach(r=>{ const v = r[col]===undefined||r[col]===null? '':String(r[col]); if (v.length>max) max = v.length; });
      colMax[col]=max;
    });

    visibleColumns.forEach(col=>{
      const th = document.createElement('th'); th.className='align-middle';
      const approx = Math.min(Math.max(colMax[col]*8, 80), 420);
      th.style.width = approx + 'px';
      const icon = HEADER_ICONS[col] ? `<i class="bi ${HEADER_ICONS[col]} me-2"></i>` : '';
      th.innerHTML = `<div class="d-flex align-items-center"><span class="col-icon">${icon}</span><span>${prettyCol(col)}</span></div>`;
      tr.appendChild(th);
    });

    const thAction = document.createElement('th'); thAction.className='text-end action-col'; thAction.textContent='Acciones';
    tr.appendChild(thAction);
    tableHead.appendChild(tr);

    currentPage = 1;
    applyFilterAndRenderRows();
    buildColumnsControls();
    showToast(`Colección "${COLLECTIONS[currentCollection].title}" cargada — ${rawData.length} registros`, 'info', 1200);
  }

  function applyFilterAndRenderRows(){
    const q = (liveSearch.value || '').trim().toLowerCase();
    const filtered = rawData.filter(row => {
      if (!q) return true;
      return visibleColumns.some(col => {
        const v = row[col]; if (v===undefined || v===null) return false;
        return String(v).toLowerCase().includes(q);
      });
    });

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const pageRows = filtered.slice(start, start + pageSize);

    tableBody.innerHTML = '';
    pageRows.forEach(row => {
      const tr = document.createElement('tr');
      visibleColumns.forEach(col=>{
        const td = document.createElement('td');
        let v = row[col];
        if ((col==='brand_id' || col==='product_id' || col==='user_id') && v) {
          td.innerHTML = `<span class="small text-muted">${prettyCol(col.split('_')[0])}:</span> ${v}`;
        } else {
          if (Array.isArray(v)) v = v.join(', ');
          td.textContent = (v===undefined || v===null) ? '' : v;
        }
        tr.appendChild(td);
      });

      const tdA = document.createElement('td'); tdA.className='text-end action-col';
      tdA.innerHTML = `
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${row._id}" title="Editar"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${row._id}" title="Eliminar"><i class="bi bi-trash"></i></button>
        </div>`;
      tr.appendChild(tdA);
      tableBody.appendChild(tr);
    });

    // bind actions
    tableBody.querySelectorAll('.btn-edit').forEach(b=>b.addEventListener('click', onEditClicked));
    tableBody.querySelectorAll('.btn-delete').forEach(b=>b.addEventListener('click', onDeleteClicked));

    renderPagination(totalItems, totalPages);
    updateRowsInfo(filtered.length);
  }

  function updateRowsInfo(filteredCount){
    const rowsInfo = document.getElementById('rowsInfo');
    if (!rowsInfo) return;
    const from = (filteredCount === 0) ? 0 : ((currentPage - 1) * pageSize + 1);
    const to = Math.min(filteredCount, currentPage * pageSize);
    rowsInfo.textContent = `${from}-${to} de ${filteredCount} registros (página ${currentPage})`;
  }

  function renderPagination(totalItems, totalPages){
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';
    const nav = document.createElement('nav'); nav.className='d-flex align-items-center gap-3';

    // page size selector
    const ps = document.createElement('div'); ps.className='d-flex align-items-center gap-2';
    ps.innerHTML = `<label class="small muted mb-0">Filas:</label>
      <select id="pageSizeSelect" class="form-select form-select-sm" style="width:88px;">
        ${pageSizes.map(sz => `<option value="${sz}" ${sz===pageSize ? 'selected' : ''}>${sz}</option>`).join('')}
      </select>`;
    nav.appendChild(ps);

    if (totalPages <= 1) {
      const info = document.createElement('div'); info.className='small muted'; info.textContent = `${totalItems} registros`;
      nav.appendChild(info);
    } else {
      const ul = document.createElement('ul'); ul.className='pagination pagination-sm mb-0';

      const prev = document.createElement('li'); prev.className = `page-item ${currentPage===1 ? 'disabled' : ''}`;
      prev.innerHTML = `<button class="page-link" aria-label="Anterior">&laquo;</button>`;
      prev.addEventListener('click', () => { if (currentPage>1) { currentPage--; applyFilterAndRenderRows(); }});
      ul.appendChild(prev);

      const maxButtons = 7;
      let startPage = Math.max(1, currentPage - Math.floor(maxButtons/2));
      let endPage = startPage + maxButtons - 1;
      if (endPage > totalPages) { endPage = totalPages; startPage = Math.max(1, endPage - maxButtons + 1); }

      if (startPage > 1) { ul.appendChild(createPageButton(1)); if (startPage > 2) ul.appendChild(createEllipsis()); }

      for (let p = startPage; p <= endPage; p++) ul.appendChild(createPageButton(p));

      if (endPage < totalPages) { if (endPage < totalPages - 1) ul.appendChild(createEllipsis()); ul.appendChild(createPageButton(totalPages)); }

      const next = document.createElement('li'); next.className = `page-item ${currentPage===totalPages ? 'disabled' : ''}`;
      next.innerHTML = `<button class="page-link" aria-label="Siguiente">&raquo;</button>`;
      next.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; applyFilterAndRenderRows(); }});
      ul.appendChild(next);

      nav.appendChild(ul);
    }

    paginationContainer.appendChild(nav);

    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) pageSizeSelect.addEventListener('change', (e)=>{ pageSize = Number(e.target.value)||5; currentPage=1; applyFilterAndRenderRows(); });
  }

  function createPageButton(n){
    const li = document.createElement('li'); li.className = `page-item ${n===currentPage ? 'active' : ''}`;
    li.innerHTML = `<button class="page-link">${n}</button>`;
    li.addEventListener('click', ()=>{ if (n===currentPage) return; currentPage = n; applyFilterAndRenderRows(); });
    return li;
  }
  function createEllipsis(){ const li = document.createElement('li'); li.className='page-item disabled'; li.innerHTML=`<span class="page-link">…</span>`; return li; }

  // COLUMNS controls
  function buildColumnsControls(){
    columnsList.innerHTML = '';
    const defaultCols = buildColumnsFromData(rawData);
    const fallback = { brands:['_id','name','country','founded'], products:['_id','name','brand_id','category','price','stock'], users:['_id','username','email','password','country'], sales:['_id','user_id','product_id','quantity','date'], reviews:['_id','user_id','product_id','rating','comment'] }[currentCollection] || [];
    const cols = defaultCols.length ? defaultCols : fallback;
    cols.forEach(col=>{
      const id = `col-${col}`;
      const checked = visibleColumns.includes(col);
      const div = document.createElement('div'); div.className='form-check form-switch mb-2';
      div.innerHTML = `<input class="form-check-input" type="checkbox" id="${id}" data-col="${col}" ${checked?'checked':''}><label class="form-check-label" for="${id}">${prettyCol(col)}</label>`;
      columnsList.appendChild(div);
    });

    columnsList.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
      cb.addEventListener('change', (e)=>{
        const col = e.target.dataset.col;
        if (e.target.checked) { if (!visibleColumns.includes(col)) visibleColumns.push(col); }
        else visibleColumns = visibleColumns.filter(c=>c!==col);
        saveColumnsToStorage(currentCollection, visibleColumns);
        currentPage = 1;
        renderTable(rawData);
      });
    });
  }

  // RELATED selects for forms
  async function fetchRelated(rel) {
    if (relatedCache[rel]) return relatedCache[rel];
    try {
      const list = await list(rel);
      const arr = Array.isArray(list) ? list : (list ? [list] : []);
      const mapped = arr.map(it => ({ value: it._id || it.id || '', label: it.name || it.username || it.email || String(it._id).slice(0,8) }));
      relatedCache[rel] = mapped;
      return mapped;
    } catch { relatedCache[rel] = []; return []; }
  }

  async function makeFormFields(sample = {}) {
    const form = document.getElementById('entityForm'); form.innerHTML = '';
    const presets = { brands:['name','country','founded'], products:['name','brand_id','category','price','stock'], users:['username','email','password','country'], sales:['user_id','product_id','quantity','date'], reviews:['user_id','product_id','rating','comment'] }[currentCollection] || [];
    const keys = new Set(); if (presets) presets.forEach(k=>keys.add(k)); Object.keys(sample||{}).forEach(k=>keys.add(k));
    const fields = Array.from(keys).filter(k=>k !== '_id');

    // collect relation needs
    const relRequests = [];
    fields.forEach(f => { if (/_id$/.test(f)) { const relCol = COLLECTIONS[currentCollection].relFor[f] || f.replace(/_id$/,'')+'s'; relRequests.push({ field: f, rel: relCol }); }});
    const relData = {};
    await Promise.all(relRequests.map(async r => { relData[r.field] = await fetchRelated(r.rel); }));

    for (const key of fields) {
      const val = sample[key] ?? '';
      const id = `field-${key}`;
      const wrapper = document.createElement('div'); wrapper.className='col-12 col-md-6';
      const placeholder = `Ingrese ${prettyCol(key)}`;

      if (/_id$/.test(key)) {
        const options = relData[key] || [];
        const opts = [`<option value="">-- Seleccione ${prettyCol(key)} --</option>`].concat(options.map(o=> `<option value="${o.value}">${o.label}</option>`)).join('');
        wrapper.innerHTML = `<label class="form-label small text-muted">${prettyCol(key)}</label><select id="${id}" name="${key}" class="form-select form-select-sm">${opts}</select>`;
        form.appendChild(wrapper);
        if (val) wrapper.querySelector('select').value = String(val);
        continue;
      }

      if (key === 'date') {
        wrapper.innerHTML = `<label class="form-label small text-muted">${prettyCol(key)}</label><input type="date" id="${id}" name="${key}" class="form-control form-control-sm" value="${val?val.split('T')[0]:''}" placeholder="${placeholder}">`;
      } else if (['price','stock','quantity','rating','founded'].includes(key)) {
        wrapper.innerHTML = `<label class="form-label small text-muted">${prettyCol(key)}</label><input type="number" id="${id}" name="${key}" class="form-control form-control-sm" value="${val}" placeholder="${placeholder}">`;
      } else if (key === 'comment') {
        wrapper.innerHTML = `<label class="form-label small text-muted">${prettyCol(key)}</label><textarea id="${id}" name="${key}" class="form-control form-control-sm" rows="2" placeholder="${placeholder}">${val}</textarea>`;
      } else if (key === 'password') {
        wrapper.innerHTML = `<label class="form-label small text-muted">${prettyCol(key)}</label><input type="text" id="${id}" name="${key}" class="form-control form-control-sm" value="${val}" placeholder="${placeholder}"><div class="form-text">Texto plano — práctica únicamente.</div>`;
      } else {
        wrapper.innerHTML = `<label class="form-label small text-muted">${prettyCol(key)}</label><input type="text" id="${id}" name="${key}" class="form-control form-control-sm" value="${val}" placeholder="${placeholder}">`;
      }
      form.appendChild(wrapper);
    }
  }

  // MODALS: create / edit / delete
  async function openCreateModal(){
    isEditing = false; editingId = null;
    document.getElementById('formModalTitle').textContent = `Crear ${COLLECTIONS[currentCollection].title}`;
    const sample = rawData[0] || {};
    await makeFormFields(sample);
    formModal.show();
  }

  async function onEditClicked(e){
    const id = e.currentTarget.dataset.id;
    let row = rawData.find(r=>String(r._id)===String(id));
    if (!row) {
      try { row = await getById(COLLECTIONS[currentCollection].endpoint, id); }
      catch (err) { showToast('Registro no encontrado', 'warning'); return; }
    }
    isEditing = true; editingId = id;
    document.getElementById('formModalTitle').textContent = `Editar ${COLLECTIONS[currentCollection].title}`;
    await makeFormFields(row);
    formModal.show();
  }

  function onDeleteClicked(e){
    const id = e.currentTarget.dataset.id;
    document.getElementById('confirmMessage').textContent = `¿Seguro que desea eliminar el elemento con id = ${id}? Esta acción no se puede deshacer.`;
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.onclick = async () => {
      try {
        await remove(COLLECTIONS[currentCollection].endpoint, id);
        showToast('Eliminado correctamente', 'success', 1500);
        confirmModal.hide();
        await loadCollection(currentCollection);
      } catch (err) { showToast('Error eliminando: ' + (err.message||''), 'danger', 4000); }
    };
    confirmModal.show();
  }

  async function onFormSubmit(){
    const form = document.getElementById('entityForm');
    const fd = new FormData(form); const payload = {};
    for (const [k,v] of fd.entries()) {
      if (['price','stock','quantity','rating','founded'].includes(k)) payload[k] = Number(v || 0);
      else payload[k] = v;
    }
    try {
      if (!isEditing) { await create(COLLECTIONS[currentCollection].endpoint, payload); showToast('Creado con éxito', 'success', 1400); }
      else { await update(COLLECTIONS[currentCollection].endpoint, editingId, payload); showToast('Actualizado con éxito', 'success', 1400); }
      formModal.hide();
      await loadCollection(currentCollection);
    } catch (err) { showToast('Error guardando: ' + (err.message || ''), 'danger', 4500); }
  }

  // Reports (do NOT change active collection)
  async function loadReport_brands_sales(){ collectionTitle.textContent='Reporte: Marcas con ventas'; collectionSubtitle.textContent='Marcas que han tenido al menos una venta'; try { const data = await apiFetch('/reports/brands-with-sales'); renderTable(data); } catch(err){ showToast('Error cargando reporte','danger',3000); } }
  async function loadReport_products_stock(){ collectionTitle.textContent='Reporte: Prendas vendidas y stock'; collectionSubtitle.textContent='Cantidad vendida por producto y stock restante'; try { const data = await apiFetch('/reports/products-stock'); renderTable(data); } catch(err){ showToast('Error cargando reporte','danger',3000); } }
  async function loadReport_top_brands(){ collectionTitle.textContent='Reporte: Top 5 marcas'; collectionSubtitle.textContent='Marcas más vendidas (Top 5)'; try { const data = await apiFetch('/reports/top-brands'); renderTable(data); } catch(err){ showToast('Error cargando reporte','danger',3000); } }
  async function loadReport_top_users(){ collectionTitle.textContent='Reporte: Usuarios con más compras'; collectionSubtitle.textContent='Usuarios ordenados por número de compras'; try { const data = await apiFetch('/reports/top-users'); renderTable(data); } catch(err){ showToast('Error cargando reporte','danger',3000); } }
  async function loadReport_product_ratings(){ collectionTitle.textContent='Reporte: Promedio calif. por producto'; collectionSubtitle.textContent='Productos y su calificación media'; try { const data = await apiFetch('/reports/product-ratings'); renderTable(data); } catch(err){ showToast('Error cargando reporte','danger',3000); } }

  // CSV export
  function exportVisibleToCSV(filename = `${currentCollection}.csv`) {
    const headers = visibleColumns.slice();
    const rows = [headers];
    const q = (liveSearch.value||'').trim().toLowerCase();
    const filtered = rawData.filter(row => !q || visibleColumns.some(col => (row[col]||'').toString().toLowerCase().includes(q)));
    filtered.forEach(r => {
      const row = headers.map(h => {
        const v = r[h];
        if (v===undefined||v===null) return '';
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v).replace(/"/g,'""').replace(/\n/g,' ');
      });
      rows.push(row);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast('Exportado CSV', 'success', 1200);
  }

  // Debounce
  function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a), wait); }; }
  const onSearch = debounce(()=>{ currentPage=1; applyFilterAndRenderRows(); }, 220);

  // Collections panel: visual nav with counts
  async function renderCollectionsPanel(){
    const container = document.getElementById('collectionsRadios'); container.innerHTML='';
    const title = document.createElement('div'); title.className='cs-group-title'; title.textContent='Colecciones'; container.appendChild(title);
    const nav = document.createElement('div'); nav.className='cs-nav'; container.appendChild(nav);

    const keys = Object.keys(COLLECTIONS);
    const counts = await Promise.all(keys.map(async k=>{ try{ const l = await list(COLLECTIONS[k].endpoint); const arr = Array.isArray(l)?l:(l? [l]:[]); return arr.length; } catch { return 0; }}));

keys.forEach((k,i)=>{
  const meta = COLLECTIONS[k];
  const cnt = counts[i] ?? 0;
  const isActive = k === currentCollection;
  
  const item = document.createElement('div'); 
  item.className = `cs-nav-item ${isActive ? 'active' : ''}`;
  item.tabIndex = 0; 
  item.dataset.collection = k;
  
  item.innerHTML = `
    <div class="cs-icon-wrapper">
      <div class="cs-icon"><i class="bi ${meta.icon}"></i></div>
    </div>
    <div class="cs-content">
      <div class="cs-title">${meta.title}</div>
      <div class="cs-sub">${cnt} registros encontrados</div>
    </div>
    <div class="cs-right">
      <div class="cs-badge">${cnt}</div>
      <div class="cs-arrow"><i class="bi bi-chevron-right"></i></div>
    </div>
  `;
  
  item.addEventListener('click', async () => { 
    document.querySelectorAll('.cs-nav-item').forEach(n => n.classList.remove('active')); 
    item.classList.add('active'); 
    currentCollection = k; 
    await loadCollection(k); 
  });
  
  item.addEventListener('keydown', (ev) => { 
    if (ev.key === 'Enter' || ev.key === ' ') { 
      ev.preventDefault(); 
      item.click(); 
    }
  });
  
  nav.appendChild(item);
});

    // small divider + keep report buttons visible (already in DOM)
    const divider = document.createElement('hr');divider.className = 'cs-divider';container.appendChild(divider);
    const rptTitle = document.createElement('div'); rptTitle.className='cs-group-title'; rptTitle.textContent='Reportes'; container.appendChild(rptTitle);

    // Ensure original report buttons remain visible and accessible; no hide.
    // Add tiny press animation
    ['report_brands_sales','report_products_stock','report_top_brands','report_top_users','report_product_ratings'].forEach(id=>{
      const btn = document.getElementById(id);
      if (btn) {
        btn.style.display = 'inline-flex';
        btn.addEventListener('click', ()=>{ btn.classList.add('pressed'); setTimeout(()=>btn.classList.remove('pressed'), 300); });
      }
    });
  }

  // Load collection
  async function loadCollection(key){
    currentCollection = key;
    const meta = COLLECTIONS[key];
    collectionTitle.textContent = meta.title;
    collectionSubtitle.textContent = `Panel de administración`;
    try {
      const data = await list(meta.endpoint);
      renderTable(data);
    } catch(err) { console.error(err); showToast('Error cargando colección: ' + (err.message||''), 'danger', 4000); renderTable([]); }
  }

  // Events binding
  document.getElementById('btnCreate').addEventListener('click', openCreateModal);
  document.getElementById('btnExport').addEventListener('click', () => exportVisibleToCSV());
  document.getElementById('formSubmit').addEventListener('click', onFormSubmit);
  document.getElementById('clearSearch').addEventListener('click', ()=>{ liveSearch.value=''; currentPage=1; applyFilterAndRenderRows(); });
  liveSearch.addEventListener('input', onSearch);
  document.getElementById('showAllCols')?.addEventListener('click', ()=>{ const all = buildColumnsFromData(rawData); visibleColumns = (all.length?all:['_id','name']).slice(); saveColumnsToStorage(currentCollection, visibleColumns); currentPage=1; renderTable(rawData); });
  document.getElementById('hideAllCols')?.addEventListener('click', ()=>{ visibleColumns=[]; saveColumnsToStorage(currentCollection, visibleColumns); currentPage=1; renderTable(rawData); });

  // Reports hooks
  document.getElementById('report_brands_sales').addEventListener('click', loadReport_brands_sales);
  document.getElementById('report_products_stock').addEventListener('click', loadReport_products_stock);
  document.getElementById('report_top_brands').addEventListener('click', loadReport_top_brands);
  document.getElementById('report_top_users').addEventListener('click', loadReport_top_users);
  document.getElementById('report_product_ratings').addEventListener('click', loadReport_product_ratings);

  // Form submit via Enter in modal (accessibility)
  document.getElementById('entityForm').addEventListener('keydown', (e)=>{ if (e.key==='Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); document.getElementById('formSubmit').click(); }});

  // Panel toggle for mobile
  document.querySelector('.panel-toggle')?.addEventListener('click', () => {
    document.querySelector('.cs-panel')?.classList.toggle('active');
  });

  // Close panel when clicking outside on mobile
  document.addEventListener('click', (e) => {
    const panel = document.querySelector('.cs-panel');
    const toggleBtn = document.querySelector('.panel-toggle');
    
    if (window.innerWidth < 992 && 
        panel.classList.contains('active') && 
        !panel.contains(e.target) && 
        !toggleBtn.contains(e.target)) {
      panel.classList.remove('active');
    }
  });

  // Init
  document.addEventListener('DOMContentLoaded', async ()=>{
    await renderCollectionsPanel();
    await loadCollection(currentCollection);
    // tooltips (if any)
    Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]')).forEach(el => new bootstrap.Tooltip(el));
  });

})();