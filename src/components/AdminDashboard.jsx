import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ShieldCheck, LayoutDashboard, Users, Package, Search,
  RefreshCw, Shield, UserRound, Trash2, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, Clock3, Boxes, X, Crown, Pencil, Save,
} from 'lucide-react';
import './admin-dashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('homeai_token');
}

async function adminRequest(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error('Your session has expired. Please sign in again.');

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

const number = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

export default function AdminDashboard({ onBack }) {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [userPagination, setUserPagination] = useState(null);
  const [productPagination, setProductPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', brand: '', category: 'Food', quantity: '', location: 'Kitchen', expiryDate: '' });
  const [savingProduct, setSavingProduct] = useState(false);
  const [productPendingDelete, setProductPendingDelete] = useState(null);

  const loadOverview = useCallback(async () => {
    const data = await adminRequest('/admin/dashboard');
    setStats(data.stats || {});
    setRecentUsers(data.recentUsers || []);
  }, []);

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(userPage),
      limit: '10',
      search: userSearch.trim(),
    });
    const data = await adminRequest(`/admin/users?${params.toString()}`);
    setUsers(data.users || []);
    setUserPagination(data.pagination || null);
  }, [userPage, userSearch]);

  const loadProducts = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(productPage),
      limit: '10',
      search: productSearch.trim(),
    });
    const data = await adminRequest(`/admin/products?${params.toString()}`);
    setProducts(data.products || []);
    setProductPagination(data.pagination || null);
  }, [productPage, productSearch]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError('');
    setAccessDenied(false);
    try {
      await loadOverview();
    } catch (err) {
      if (err.status === 403 || err.status === 401) setAccessDenied(true);
      setError(err.message || 'Could not load admin dashboard.');
    } finally {
      setLoading(false);
    }
  }, [loadOverview]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  useEffect(() => {
    if (tab !== 'users' || accessDenied) return;
    let active = true;
    setTableLoading(true);
    loadUsers()
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setTableLoading(false); });
    return () => { active = false; };
  }, [tab, loadUsers, accessDenied]);

  useEffect(() => {
    if (tab !== 'products' || accessDenied) return;
    let active = true;
    setTableLoading(true);
    loadProducts()
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setTableLoading(false); });
    return () => { active = false; };
  }, [tab, loadProducts, accessDenied]);

  const changeRole = async (target) => {
    const nextRole = target.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const message = nextRole === 'ADMIN'
      ? `Give ADMIN access to ${target.email}?`
      : `Remove ADMIN access from ${target.email}?`;
    if (!window.confirm(message)) return;

    setBusyId(target.id);
    setError('');
    setNotice('');
    try {
      await adminRequest(`/admin/users/${target.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole }),
      });
      setNotice(`Role updated to ${nextRole}.`);
      await loadUsers();
      await loadOverview();
    } catch (err) {
      setError(err.message || 'Could not update role.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (target) => {
    if (!window.confirm(`Permanently delete ${target.name || target.email} and their saved products?`)) return;
    setBusyId(target.id);
    setError('');
    setNotice('');
    try {
      await adminRequest(`/admin/users/${target.id}`, { method: 'DELETE' });
      setNotice('User and associated products deleted.');
      await loadUsers();
      await loadOverview();
    } catch (err) {
      setError(err.message || 'Could not delete user.');
    } finally {
      setBusyId(null);
    }
  };

  const openProductEditor = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name || '',
      brand: product.brand || '',
      category: product.category || 'Food',
      quantity: product.quantity || '',
      location: product.location || 'Kitchen',
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().slice(0, 10) : '',
    });
    setError('');
    setNotice('');
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    if (!editingProduct || !editForm.name.trim()) return;
    setSavingProduct(true);
    setError('');
    setNotice('');
    try {
      const data = await adminRequest(`/admin/products/${editingProduct.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...editForm,
          expiryDate: editForm.expiryDate || null,
        }),
      });
      setProducts((current) => current.map((item) => item.id === editingProduct.id ? (data.product || { ...item, ...editForm, quantity: editForm.quantity, location: editForm.location, expiryDate: editForm.expiryDate || null }) : item));
      setEditingProduct(null);
      setNotice('Product updated successfully.');
      await loadOverview();
    } catch (err) {
      setError(err.message || 'Could not update product.');
    } finally {
      setSavingProduct(false);
    }
  };

  const deleteProduct = async (product) => {
    setProductPendingDelete(product);
  };

  const confirmDeleteProduct = async () => {
    const product = productPendingDelete;
    if (!product) return;
    setBusyId(product.id);
    setError('');
    setNotice('');
    try {
      await adminRequest(`/admin/products/${product.id}`, { method: 'DELETE' });
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setNotice('Product deleted successfully.');
      setProductPendingDelete(null);
      await loadOverview();
      if (products.length === 1 && productPage > 1) setProductPage((page) => page - 1);
      else await loadProducts();
    } catch (err) {
      setError(err.message || 'Could not delete product.');
    } finally {
      setBusyId(null);
    }
  };

  const goBackHome = () => {
    // Hard navigation guarantees the app returns to the HomeAI root route.
    window.location.assign('/');
  };

  const cards = useMemo(() => [
    { label: 'Total users', value: stats?.totalUsers, icon: Users, tone: 'mint', note: 'Registered accounts' },
    { label: 'Inventory items', value: stats?.totalProducts, icon: Boxes, tone: 'gold', note: 'Across all accounts' },
    { label: 'New today', value: stats?.newUsersToday, icon: UserRound, tone: 'blue', note: 'Accounts created today' },
    { label: 'Administrators', value: stats?.totalAdmins, icon: ShieldCheck, tone: 'violet', note: 'Privileged accounts' },
  ], [stats]);

  if (loading) {
    return <div className="ha-loading"><span className="ha-spinner" />Loading secure admin workspace…</div>;
  }

  if (accessDenied) {
    return (
      <main className="ha-admin-shell">
        <section className="ha-denied-card">
          <div className="ha-brand-mark"><Shield size={24} /></div>
          <span className="ha-kicker">HOMEAI SECURITY</span>
          <h1>Admin access required</h1>
          <p>This account does not have administrator permission, or its session is no longer valid. Admin access is verified by the server.</p>
          <button className="ha-primary-button" onClick={goBackHome}><ArrowLeft size={16} /> Return to HomeAI</button>
        </section>
      </main>
    );
  }

  return (
    <main className="ha-admin-shell">
      <div className="ha-admin-layout">
        <aside className="ha-admin-sidebar">
          <div className="ha-admin-brand">
            <div className="ha-brand-mark"><ShieldCheck size={22} /></div>
            <div><strong>Home<span>AI</span></strong><small>CONTROL CENTER</small></div>
          </div>
          <div className="ha-side-label">WORKSPACE</div>
          <button className={`ha-side-link ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}><LayoutDashboard size={18} /> Overview</button>
          <button className={`ha-side-link ${tab === 'users' ? 'active' : ''}`} onClick={() => { setTab('users'); setUserPage(1); }}><Users size={18} /> User management</button>
          <button className={`ha-side-link ${tab === 'products' ? 'active' : ''}`} onClick={() => { setTab('products'); setProductPage(1); }}><Package size={18} /> All products</button>
          <div className="ha-sidebar-bottom">
            <div className="ha-secure-note"><ShieldCheck size={16} /><span>Protected workspace<br /><b>Role verified by API</b></span></div>
            <button className="ha-back-link" onClick={goBackHome}><ArrowLeft size={16} /> Back to HomeAI</button>
          </div>
        </aside>

        <section className="ha-admin-main">
          <header className="ha-admin-topbar">
            <div className="ha-mobile-brand"><div className="ha-brand-mark"><ShieldCheck size={19} /></div><strong>HomeAI Admin</strong></div>
            <div className="ha-breadcrumb">HomeAI <span>/</span> <b>Admin Console</b></div>
            <div className="ha-top-actions">
              <span className="ha-live-pill"><i /> SECURE SESSION</span>
              <button className="ha-refresh-button" onClick={refreshAll} title="Refresh dashboard"><RefreshCw size={16} /> Refresh</button>
            </div>
          </header>

          <div className="ha-admin-content">
            <div className="ha-page-heading">
              <div><span className="ha-kicker">ADMINISTRATION / {tab.toUpperCase()}</span><h1>{tab === 'overview' ? 'Command center' : tab === 'users' ? 'User management' : 'Product inventory'}</h1><p>{tab === 'overview' ? 'A live snapshot of your HomeAI platform.' : tab === 'users' ? 'Review accounts and manage platform access.' : 'Browse inventory records across all users.'}</p></div>
              <div className="ha-date-chip"><Clock3 size={15} /> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>

            {error && <div className="ha-alert error"><AlertTriangle size={17} />{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={15} /></button></div>}
            {notice && <div className="ha-alert success"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}

            {tab === 'overview' && (
              <>
                <div className="ha-stat-grid">
                  {cards.map(({ label, value, icon: Icon, tone, note }) => (
                    <article className="ha-stat-card" key={label}>
                      <div className={`ha-stat-icon ${tone}`}><Icon size={20} /></div>
                      <span>{label}</span><strong>{number(value)}</strong><small>{note}</small>
                    </article>
                  ))}
                </div>

                <div className="ha-risk-grid">
                  <article className="ha-risk-card danger"><div className="ha-risk-icon"><AlertTriangle size={18} /></div><div><span>Expired products</span><strong>{number(stats?.expiredProducts)}</strong><small>Past their expiry date</small></div></article>
                  <article className="ha-risk-card warning"><div className="ha-risk-icon"><Clock3 size={18} /></div><div><span>Expiring soon</span><strong>{number(stats?.expiringSoonProducts)}</strong><small>Within the next 7 days</small></div></article>
                </div>

                <section className="ha-panel">
                  <div className="ha-panel-heading"><div><span className="ha-kicker">LATEST ACTIVITY</span><h2>Recently joined users</h2></div><button className="ha-text-button" onClick={() => setTab('users')}>View all <ArrowLeft size={14} /></button></div>
                  {recentUsers.length ? (
                    <div className="ha-table-wrap"><table className="ha-table"><thead><tr><th>USER</th><th>EMAIL</th><th>ROLE</th><th>JOINED</th></tr></thead><tbody>
                      {recentUsers.map((person) => <tr key={person.id}><td><div className="ha-user-cell"><span className="ha-avatar">{(person.name || person.email || 'U').charAt(0).toUpperCase()}</span><b>{person.name || 'Unnamed user'}</b></div></td><td>{person.email}</td><td><span className={`ha-role ${person.role === 'ADMIN' ? 'admin' : ''}`}>{person.role}</span></td><td>{new Date(person.createdAt).toLocaleDateString('en-IN')}</td></tr>)}
                    </tbody></table></div>
                  ) : <div className="ha-empty">No user records found yet.</div>}
                </section>
              </>
            )}

            {tab === 'users' && (
              <section className="ha-panel">
                <div className="ha-panel-heading"><div><span className="ha-kicker">ACCOUNT DIRECTORY</span><h2>All registered users</h2></div><span className="ha-result-count">{number(userPagination?.total)} accounts</span></div>
                <div className="ha-toolbar"><label className="ha-search"><Search size={17} /><input value={userSearch} placeholder="Search name or email…" onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }} /></label></div>
                {tableLoading ? <div className="ha-empty">Loading users…</div> : users.length ? (
                  <div className="ha-table-wrap"><table className="ha-table"><thead><tr><th>USER</th><th>EMAIL</th><th>PRODUCTS</th><th>ROLE</th><th>JOINED</th><th>ACTIONS</th></tr></thead><tbody>
                    {users.map((person) => <tr key={person.id}>
                      <td><div className="ha-user-cell"><span className="ha-avatar">{(person.name || person.email || 'U').charAt(0).toUpperCase()}</span><b>{person.name || 'Unnamed user'}</b></div></td>
                      <td>{person.email}</td><td>{number(person.productCount)}</td>
                      <td><span className={`ha-role ${person.role === 'ADMIN' ? 'admin' : ''}`}>{person.role}</span></td>
                      <td>{new Date(person.createdAt).toLocaleDateString('en-IN')}</td>
                      <td><div className="ha-row-actions">
                        <button disabled={busyId === person.id} className="ha-action-button" onClick={() => changeRole(person)} title={person.role === 'ADMIN' ? 'Demote to user' : 'Promote to admin'}>{person.role === 'ADMIN' ? <UserRound size={15} /> : <Crown size={15} />}{person.role === 'ADMIN' ? 'Demote' : 'Make admin'}</button>
                        <button disabled={busyId === person.id} className="ha-icon-danger" onClick={() => deleteUser(person)} title="Delete user"><Trash2 size={16} /></button>
                      </div></td>
                    </tr>)}
                  </tbody></table></div>
                ) : <div className="ha-empty">No users match this search.</div>}
                <div className="ha-pagination"><span>Page {userPagination?.page || 1} of {Math.max(userPagination?.totalPages || 1, 1)}</span><div><button disabled={!userPagination || userPage <= 1} onClick={() => setUserPage((p) => p - 1)}><ChevronLeft size={16} /> Previous</button><button disabled={!userPagination || userPage >= userPagination.totalPages} onClick={() => setUserPage((p) => p + 1)}>Next <ChevronRight size={16} /></button></div></div>
              </section>
            )}

            {tab === 'products' && (
              <section className="ha-panel">
                <div className="ha-panel-heading"><div><span className="ha-kicker">GLOBAL INVENTORY</span><h2>All saved products</h2></div><span className="ha-result-count">{number(productPagination?.total)} products</span></div>
                <div className="ha-toolbar"><label className="ha-search"><Search size={17} /><input value={productSearch} placeholder="Search product, brand or category…" onChange={(e) => { setProductSearch(e.target.value); setProductPage(1); }} /></label></div>
                {tableLoading ? <div className="ha-empty">Loading products…</div> : products.length ? (
                  <div className="ha-table-wrap"><table className="ha-table"><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>QUANTITY</th><th>LOCATION</th><th>OWNER</th><th>EXPIRY</th><th>ACTIONS</th></tr></thead><tbody>
                    {products.map((product) => <tr key={product.id}><td><b>{product.name}</b>{product.brand && <small className="ha-subcell">{product.brand}</small>}</td><td>{product.category || 'Other'}</td><td>{product.quantity || '—'}</td><td>{product.location || '—'}</td><td>{product.user?.name || product.user?.email || 'Unknown'}</td><td>{product.expiryDate ? new Date(product.expiryDate).toLocaleDateString('en-IN') : 'Not set'}</td><td><div className="ha-row-actions"><button className="ha-action-button" disabled={busyId === product.id} onClick={() => openProductEditor(product)} title="Edit product"><Pencil size={14} /> Edit</button><button className="ha-icon-danger" disabled={busyId === product.id} onClick={() => deleteProduct(product)} title="Delete product"><Trash2 size={15} /></button></div></td></tr>)}
                  </tbody></table></div>
                ) : <div className="ha-empty">No products found.</div>}
                <div className="ha-pagination"><span>Page {productPagination?.page || 1} of {Math.max(productPagination?.totalPages || 1, 1)}</span><div><button disabled={!productPagination || productPage <= 1} onClick={() => setProductPage((p) => p - 1)}><ChevronLeft size={16} /> Previous</button><button disabled={!productPagination || productPage >= productPagination.totalPages} onClick={() => setProductPage((p) => p + 1)}>Next <ChevronRight size={16} /></button></div></div>
              </section>
            )}

            {editingProduct && (
              <div className="ha-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingProduct) setEditingProduct(null); }}>
                <section className="ha-edit-modal" role="dialog" aria-modal="true" aria-labelledby="ha-edit-title">
                  <div className="ha-edit-modal-head"><div><span className="ha-kicker">GLOBAL INVENTORY</span><h2 id="ha-edit-title">Edit product</h2><p>Update this saved inventory record.</p></div><button type="button" className="ha-modal-close" onClick={() => setEditingProduct(null)} disabled={savingProduct} aria-label="Close"><X size={18} /></button></div>
                  <form onSubmit={saveProduct}>
                    <div className="ha-edit-grid">
                      <label>Product name<input required value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} /></label>
                      <label>Brand<input value={editForm.brand} onChange={(e) => setEditForm((f) => ({ ...f, brand: e.target.value }))} /></label>
                      <label>Category<input value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} /></label>
                      <label>Quantity<input value={editForm.quantity} onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))} /></label>
                      <label>Location<input value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} /></label>
                      <label>Expiry date<input type="date" value={editForm.expiryDate} onChange={(e) => setEditForm((f) => ({ ...f, expiryDate: e.target.value }))} /></label>
                    </div>
                    <div className="ha-edit-modal-actions"><button type="button" className="ha-cancel-button" onClick={() => setEditingProduct(null)} disabled={savingProduct}>Cancel</button><button type="submit" className="ha-primary-button" disabled={savingProduct}><Save size={15} /> {savingProduct ? 'Saving…' : 'Save changes'}</button></div>
                  </form>
                </section>
              </div>
            )}

            <footer className="ha-admin-footer"><span>HomeAI Admin Console</span><span><ShieldCheck size={13} /> Protected by server-side role verification</span></footer>
          </div>
        </section>
      </div>

      {productPendingDelete && (
        <div
          className="ha-confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && busyId !== productPendingDelete.id) setProductPendingDelete(null);
          }}
        >
          <section className="ha-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="ha-delete-title" aria-describedby="ha-delete-description">
            <div className="ha-confirm-icon"><Trash2 size={23} /></div>
            <span className="ha-kicker">PERMANENT ACTION</span>
            <h2 id="ha-delete-title">Delete this product?</h2>
            <p id="ha-delete-description">You are about to permanently remove this item from the HomeAI inventory. This action cannot be undone.</p>
            <div className="ha-confirm-product">
              <div className="ha-confirm-product-icon"><Package size={19} /></div>
              <div><strong>{productPendingDelete.name || `Product #${productPendingDelete.id}`}</strong><small>{productPendingDelete.brand || productPendingDelete.category || 'Inventory item'}{productPendingDelete.user?.name ? ` · Owned by ${productPendingDelete.user.name}` : ''}</small></div>
            </div>
            <div className="ha-confirm-warning"><AlertTriangle size={15} /><span>The product record will be deleted from the database.</span></div>
            <div className="ha-confirm-actions">
              <button type="button" className="ha-cancel-button" disabled={busyId === productPendingDelete.id} onClick={() => setProductPendingDelete(null)}>Keep product</button>
              <button type="button" className="ha-delete-confirm-button" disabled={busyId === productPendingDelete.id} onClick={confirmDeleteProduct}>
                {busyId === productPendingDelete.id ? <><span className="ha-delete-spinner" /> Deleting…</> : <><Trash2 size={15} /> Delete permanently</>}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
