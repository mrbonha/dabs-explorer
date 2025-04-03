import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import './App.css';

// API configuration - replace with your actual API Gateway URL
const API_URL = 'https://oor75zmxdb.execute-api.us-west-2.amazonaws.com/prod';
const API_KEY = ''; // Optional API key

// Fetch helper function with error handling
const fetchApi = async (endpoint, params = {}) => {
  const queryString = Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const url = `${API_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

  const headers = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
};

// Main App Component
function App() {
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div className="app">
      <header className="app-header">
        <h1>DABS Data Explorer</h1>
        <nav>
          <button
            className={view === 'dashboard' ? 'active' : ''}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={view === 'products' ? 'active' : ''}
            onClick={() => setView('products')}
          >
            Products
          </button>
          <button
            className={view === 'inventory' ? 'active' : ''}
            onClick={() => setView('inventory')}
          >
            Inventory
          </button>
          <button
            className={view === 'stores' ? 'active' : ''}
            onClick={() => setView('stores')}
          >
            Stores
          </button>
          <button
            className={view === 'trending' ? 'active' : ''}
            onClick={() => setView('trending')}
          >
            Trending
          </button>
        </nav>
      </header>

      <main>
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error">{error}</div>}

        {view === 'dashboard' && <Dashboard />}
        {view === 'products' && <ProductList />}
        {view === 'inventory' && <InventoryTracker />}
        {view === 'stores' && <StoreLocator />}
        {view === 'trending' && <TrendingItems />}
      </main>

      <footer>
        <p>DABS Data Explorer - Data updated daily</p>
      </footer>
    </div>
  );
}

// Dashboard Component
function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchApi('/stats');
        setStats(data);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!stats) return null;

  // Prepare data for category chart
  const categoryData = stats.categories?.map(cat => ({
    name: cat._id || 'Unknown',
    count: cat.count,
    avgPrice: parseFloat(cat.avgPrice).toFixed(2)
  })) || [];

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      <p>Data as of: {stats.date}</p>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Products</h3>
          <div className="stat-value">{stats.totalItems}</div>
        </div>
        <div className="stat-card">
          <h3>Total Stores</h3>
          <div className="stat-value">{stats.storeCount}</div>
        </div>
        <div className="stat-card">
          <h3>Avg Price</h3>
          <div className="stat-value">${stats.priceStats?.avgPrice?.toFixed(2) || 'N/A'}</div>
        </div>
        <div className="stat-card">
          <h3>Price Range</h3>
          <div className="stat-value">
            ${stats.priceStats?.minPrice?.toFixed(2) || 'N/A'} -
            ${stats.priceStats?.maxPrice?.toFixed(2) || 'N/A'}
          </div>
        </div>
      </div>

      <h3>Products by Category</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryData.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" name="Product Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Product List Component
function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  // Fetch categories for filter dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await fetchApi('/stats');
        if (data.categories) {
          const cats = data.categories.map(c => c._id).filter(Boolean);
          setCategories(cats);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };

    fetchCategories();
  }, []);

  // Fetch products based on filters
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params = {
          search: search || undefined,
          category: category || undefined,
          skip: page * itemsPerPage,
          limit: itemsPerPage
        };

        const data = await fetchApi('/items', params);
        setProducts(data.items || []);
        setTotalItems(data.total || 0);
      } catch (err) {
        setError('Failed to load products');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [search, category, page]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePrevPage = () => {
    if (page > 0) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages - 1) setPage(page + 1);
  };

  return (
    <div className="product-list">
      <h2>Products</h2>

      <div className="filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="category-filter">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading products...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <div className="product-count">
            Showing {products.length} of {totalItems} products
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <div key={product.sku} className="product-card">
                <div className="product-name">{product.name}</div>
                <div className="product-sku">SKU: {product.sku}</div>
                <div className="product-category">{product.displayGroup}</div>
                <div className="product-price">${product.currentPrice}</div>
                <div className="product-stock">
                  In Stock: {product.storeQty} (Warehouse: {product.warehouseQty})
                </div>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button
              onClick={handlePrevPage}
              disabled={page === 0}
            >
              Previous
            </button>
            <span>Page {page + 1} of {totalPages}</span>
            <button
              onClick={handleNextPage}
              disabled={page >= totalPages - 1}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Inventory Tracker Component
function InventoryTracker() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sku, setSku] = useState('');
  const [storeId, setStoreId] = useState('');
  const [stores, setStores] = useState([]);
  const [itemName, setItemName] = useState('');

  // Load stores for dropdown
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const data = await fetchApi('/stores');
        setStores(data.stores || []);
      } catch (err) {
        console.error('Failed to load stores:', err);
      }
    };

    fetchStores();
  }, []);

  const handleSearch = async () => {
    if (!sku && !storeId) {
      setError('Please enter a SKU or select a store');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = {
        sku: sku || undefined,
        store_id: storeId || undefined
      };

      const data = await fetchApi('/inventory', params);
      setInventory(data.inventory || []);

      // If we searched by SKU, get the item name
      if (sku && data.inventory?.length > 0) {
        const itemData = await fetchApi('/items', { search: sku });
        if (itemData.items?.length > 0) {
          setItemName(itemData.items[0].name);
        }
      } else {
        setItemName('');
      }
    } catch (err) {
      setError('Failed to load inventory data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Process inventory data for chart
  const chartData = inventory.map(inv => ({
    date: inv.record_date,
    quantity: parseInt(inv.store_qty, 10) || 0,
    storeId: inv.store_id
  }));

  return (
    <div className="inventory-tracker">
      <h2>Inventory Tracker</h2>

      <div className="inventory-search">
        <div className="search-field">
          <label>Product SKU:</label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Enter SKU..."
          />
        </div>

        <div className="search-field">
          <label>Store:</label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            <option value="">Select a store</option>
            {stores.map((store) => (
              <option key={store.store_id} value={store.store_id}>
                {store.store_name}
              </option>
            ))}
          </select>
        </div>

        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Loading...' : 'Search'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {inventory.length > 0 && (
        <div className="inventory-results">
          <h3>
            {itemName ? `Inventory for ${itemName}` :
             storeId ? `Inventory for Store #${storeId}` :
             'Inventory Results'}
          </h3>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="quantity"
                  stroke="#8884d8"
                  name="Quantity"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="inventory-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Store</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((inv, index) => (
                  <tr key={index}>
                    <td>{inv.record_date}</td>
                    <td>{inv.store_id}</td>
                    <td>{inv.store_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Store Locator Component
function StoreLocator() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const data = await fetchApi('/stores');
        setStores(data.stores || []);
      } catch (err) {
        setError('Failed to load stores');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  const filteredStores = stores.filter(store =>
    store.store_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="store-locator">
      <h2>Store Locator</h2>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search by store name or city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">Loading stores...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="store-grid">
          {filteredStores.map((store) => (
            <div
              key={store.store_id}
              className={`store-card ${selectedStore === store.store_id ? 'selected' : ''}`}
              onClick={() => setSelectedStore(store.store_id)}
            >
              <h3>{store.store_name}</h3>
              <p>{store.address}</p>
              <p>{store.city}</p>
              <p>{store.phone}</p>
              {selectedStore === store.store_id && (
                <button
                  className="view-inventory"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.hash = '#/inventory';
                    // Set global state here if you implement state management
                  }}
                >
                  View Inventory
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Trending Items Component
function TrendingItems() {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoading(true);
        const data = await fetchApi('/trending');
        setTrending(data.trending || []);
      } catch (err) {
        setError('Failed to load trending data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  if (loading) return <div className="loading">Loading trending items...</div>;
  if (error) return <div className="error">{error}</div>;

  // Separate increasing and decreasing trends
  const increasingTrends = trending.filter(item => item.change > 0);
  const decreasingTrends = trending.filter(item => item.change < 0);

  return (
    <div className="trending">
      <h2>Trending Items</h2>

      <div className="trend-sections">
        <div className="trend-section">
          <h3>Increasing Inventory</h3>
          {increasingTrends.length === 0 ? (
            <p>No increasing trends found</p>
          ) : (
            <div className="trend-cards">
              {increasingTrends.map((item) => (
                <div key={item.sku} className="trend-card increasing">
                  <div className="trend-name">{item.name}</div>
                  <div className="trend-category">{item.displayGroup}</div>
                  <div className="trend-price">${item.price}</div>
                  <div className="trend-change positive">
                    +{item.change} (+{item.changePercent}%)
                  </div>
                  <div className="trend-qty">
                    {item.previousQty} → {item.currentQty}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="trend-section">
          <h3>Decreasing Inventory</h3>
          {decreasingTrends.length === 0 ? (
            <p>No decreasing trends found</p>
          ) : (
            <div className="trend-cards">
              {decreasingTrends.map((item) => (
                <div key={item.sku} className="trend-card decreasing">
                  <div className="trend-name">{item.name}</div>
                  <div className="trend-category">{item.displayGroup}</div>
                  <div className="trend-price">${item.price}</div>
                  <div className="trend-change negative">
                    {item.change} ({item.changePercent}%)
                  </div>
                  <div className="trend-qty">
                    {item.previousQty} → {item.currentQty}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;