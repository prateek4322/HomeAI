import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

import {
  getProducts,
  getDashboardSummary,
  createProduct,
  updateProduct,
  removeProduct,
  askHomeAI,
  lookupProductByBarcode,
} from './api.js';

import { useAuth } from './context/AuthContext.jsx';
import AuthPage from './components/AuthPage.jsx';

import {
  Home, Package, ScanLine, CalendarDays, Bot, Layers,
  Bell, Settings, Leaf, Search, Sun,
  Moon, ChevronDown, ChevronLeft, ChevronRight, ArrowRight,
  Plus, Camera, Clock3, AlertCircle, Grid2X2, MapPin,
  Zap, CheckCircle2, Menu, X, Send,Trash2,AlertTriangle,
  Sparkles, MoreVertical,
} from 'lucide-react';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

import './styles.css';

const initialProducts = [
  {
    id: 1,
    name: 'Milk',
    brand: 'Amul',
    qty: '500 ml',
    place: 'Kitchen',
    days: 2,
    category: 'Dairy',
    emoji: '🥛',
  },
  {
    id: 2,
    name: 'Bread',
    brand: 'Modern',
    qty: '1 pack',
    place: 'Kitchen',
    days: 3,
    category: 'Food',
    emoji: '🍞',
  },
  {
    id: 3,
    name: 'Yogurt',
    brand: 'Mother Dairy',
    qty: '200 g',
    place: 'Fridge',
    days: 5,
    category: 'Dairy',
    emoji: '🥣',
  },
  {
    id: 4,
    name: 'Tomatoes',
    brand: 'Fresh',
    qty: '1 kg',
    place: 'Vegetable Rack',
    days: 6,
    category: 'Fruits & Vegetables',
    emoji: '🍅',
  },
  {
    id: 5,
    name: 'Eggs',
    brand: 'Farm Fresh',
    qty: '12 pcs',
    place: 'Fridge',
    days: 6,
    category: 'Food',
    emoji: '🥚',
  },
];

const navItems = [
  [Home, 'Dashboard'],
  [Package, 'Inventory'],
  [ScanLine, 'Scan Product'],
  [CalendarDays, 'Expiry Calendar'],
  [Bot, 'AI Assistant'],
  [Layers, 'Categories'],
  [Bell, 'Reminders'],
  [Settings, 'Settings'],
];

const suggestions = [
  'Which products expire this week?',
  'What should I use first?',
  'Suggest a meal with my items',
  'Show low stock items',
  'Help me reduce food waste',
];

const getDefaultExpiryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatExpiryDate = (value) => {
  if (!value) return 'Expiry date not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid expiry date';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};


// Calculate expiry days using the date-only value from the database.
// Parsing YYYY-MM-DD manually avoids timezone shifts caused by new Date(string).
const getProductDaysLeft = (product) => {
  const expiryValue = product?.expiryDate;

  if (expiryValue) {
    const match = String(expiryValue).match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      const expiryUTC = Date.UTC(Number(year), Number(month) - 1, Number(day));
      const now = new Date();
      const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      return Math.round((expiryUTC - todayUTC) / 86400000);
    }

    const parsed = new Date(expiryValue);
    if (!Number.isNaN(parsed.getTime())) {
      const now = new Date();
      const expiryUTC = Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      return Math.round((expiryUTC - todayUTC) / 86400000);
    }
  }

  const fallback = Number(product?.daysLeft ?? product?.days);
  return Number.isFinite(fallback) ? fallback : null;
};

function Dashboard() {
  const { user, logout } = useAuth();
  const [active, setActive] = useState('Dashboard');
  const [pageView, setPageView] = useState('dashboard');
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [expiryFilter, setExpiryFilter] = useState('');
  const [products, setProducts] = useState([]);
  const [apiStatus, setApiStatus] = useState('connecting');
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const [query, setQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  const [modal, setModal] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [dark] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [welcomeWordIndex, setWelcomeWordIndex] = useState(0);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const welcomeWords = ['Organize', 'Track', 'Save Food', 'Reduce Waste', 'Stay Smart'];
  // Rotate the welcome keyword automatically and refresh the date at midnight.
  useEffect(() => {
    const wordTimer = window.setInterval(() => {
      setWelcomeWordIndex((index) => (index + 1) % welcomeWords.length);
    }, 2200);
    const dateTimer = window.setInterval(() => setCurrentDate(new Date()), 60_000);
    return () => {
      window.clearInterval(wordTimer);
      window.clearInterval(dateTimer);
    };
  }, []);
  const [month, setMonth] = useState(new Date().getMonth());
  const [chatLoading, setChatLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );
  const [notificationMessage, setNotificationMessage] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(() => {
    try {
      return localStorage.getItem('homeai-reminders-enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const [newProduct, setNewProduct] = useState({
    name: '',
    brand: '',
    qty: '',
    place: 'Kitchen',
    expiryDate: '',
    category: 'Food',
    emoji: '📦',
    barcode: '',
    imageUrl: '',
  });

  // Fetch the logged-in user's products from PostgreSQL
  useEffect(() => {
    getProducts()
      .then((data) => {
        setProducts(data);
        setApiStatus('connected');
      })
      .catch((error) => {
        console.error('Product fetch error:', error);
        setApiStatus('offline');
      });
  }, []);

  // Fetch the logged-in user's dashboard statistics
  const refreshDashboardSummary = async () => {
    setSummaryLoading(true);
    setSummaryError('');

    try {
      const summary = await getDashboardSummary();
      setDashboardSummary(summary);
    } catch (error) {
      console.error('Dashboard summary error:', error);
      setSummaryError(error.message || 'Could not load dashboard statistics.');
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboardSummary();
  }, []);

  // Typing shows suggestions only. Inventory is filtered only after selection/submission.
  const getSearchableText = (product) => [
    product.name, product.brand, product.category, product.barcode,
    product.place, product.location,
  ].filter(Boolean).join(' ');

  const searchSuggestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return products.filter((product) =>
      getSearchableText(product).toLowerCase().includes(term)
    );
  }, [products, query]);

  const filtered = useMemo(() => {
    if (!appliedSearchQuery.trim()) return products;
    if (selectedSuggestionId !== null) {
      return products.filter((product) => String(product.id) === String(selectedSuggestionId));
    }
    const term = appliedSearchQuery.trim().toLowerCase();
    return products.filter((product) =>
      getSearchableText(product).toLowerCase().includes(term)
    );
  }, [products, appliedSearchQuery, selectedSuggestionId]);

  const expiryOverview = useMemo(() => {
    const withExpiry = products
      .map((product) => ({
        ...product,
        calculatedDaysLeft: getProductDaysLeft(product),
      }))
      .filter((product) => product.calculatedDaysLeft !== null);

    const expiredItems = withExpiry
      .filter((product) => product.calculatedDaysLeft < 0)
      .sort((a, b) => a.calculatedDaysLeft - b.calculatedDaysLeft);

    const dueTodayItems = withExpiry
      .filter((product) => product.calculatedDaysLeft === 0);

    const expiringSoonItems = withExpiry
      .filter((product) => product.calculatedDaysLeft > 0 && product.calculatedDaysLeft <= 7)
      .sort((a, b) => a.calculatedDaysLeft - b.calculatedDaysLeft);

    return {
      expiredItems,
      dueTodayItems,
      expiringSoonItems,
      alerts: [...expiredItems, ...dueTodayItems, ...expiringSoonItems],
    };
  }, [products]);

  // Default expiry list: nearest expiry date first, including expired items.
  const expirySortedProducts = [...products]
    .map((product) => ({
      ...product,
      calculatedDaysLeft: getProductDaysLeft(product),
    }))
    .sort((a, b) => {
      const aDays = a.calculatedDaysLeft;
      const bDays = b.calculatedDaysLeft;
      if (aDays === null && bDays === null) {
        const dateB = new Date(b.createdAt || 0).getTime();
        const dateA = new Date(a.createdAt || 0).getTime();
        return dateB - dateA || Number(b.id || 0) - Number(a.id || 0);
      }
      if (aDays === null) return 1;
      if (bDays === null) return -1;
      return aDays - bDays;
    });

  const expiring = expiryOverview.expiringSoonItems;
  const expired = expiryOverview.expiredItems;

  // Latest added products appear first in the full inventory.
  const latestInventory = [...filtered].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA || Number(b.id || 0) - Number(a.id || 0);
  });

  const searchedExpiryProducts = filtered
    .map((product) => ({
      ...product,
      calculatedDaysLeft: getProductDaysLeft(product),
    }))
    .filter((product) => product.calculatedDaysLeft !== null);

  const visibleProducts = expiryFilter === 'expired'
    ? searchedExpiryProducts
        .filter((product) => product.calculatedDaysLeft < 0)
        .sort((a, b) => a.calculatedDaysLeft - b.calculatedDaysLeft)
    : expiryFilter === 'today'
      ? searchedExpiryProducts.filter((product) => product.calculatedDaysLeft === 0)
      : expiryFilter === 'week'
        ? searchedExpiryProducts
            .filter((product) => product.calculatedDaysLeft >= 0 && product.calculatedDaysLeft <= 7)
            .sort((a, b) => a.calculatedDaysLeft - b.calculatedDaysLeft)
        : expiryFilter === 'categories'
          ? [...latestInventory].sort((a, b) =>
              String(a.category || 'Other').localeCompare(String(b.category || 'Other'))
              || (getProductDaysLeft(a) ?? Number.MAX_SAFE_INTEGER)
                - (getProductDaysLeft(b) ?? Number.MAX_SAFE_INTEGER))
          : expiryFilter === 'all'
            ? [...searchedExpiryProducts].sort((a, b) => {
                const aDays = a.calculatedDaysLeft;
                const bDays = b.calculatedDaysLeft;
                if (aDays === null) return 1;
                if (bDays === null) return -1;
                return aDays - bDays;
              })
            : latestInventory;

  const scrollToInventory = () => {
    window.setTimeout(() => {
      document.getElementById('inventory-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const goToExpiryDetails = (filter = 'all') => {
    setQuery('');
    setAppliedSearchQuery('');
    setExpiryFilter(filter);
    scrollToInventory();
  };

  const applySearch = (term = query, productId = null) => {
    const cleanTerm = term.trim();
    setQuery(cleanTerm);
    setAppliedSearchQuery(cleanTerm);
    setSelectedSuggestionId(productId);
    setExpiryFilter('');
    setActive('Inventory');
    setSearchFocused(false);
    scrollToInventory();
  };

  const submitSearch = () => applySearch(query);

  const enableExpiryNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      setNotificationMessage('This browser does not support notifications.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setNotificationMessage('Browser notifications are enabled.');
      } else if (permission === 'denied') {
        setNotificationMessage('Notifications are blocked. Allow them in browser site settings.');
      } else {
        setNotificationMessage('Notification permission was not granted.');
      }
    } catch (error) {
      console.error('Notification permission error:', error);
      setNotificationMessage('Could not enable browser notifications.');
    }
  };

  // Send one consolidated reminder per user per day while HomeAI is open.
  useEffect(() => {
    if (!reminderEnabled || notificationPermission !== 'granted' || products.length === 0) return;
    if (typeof Notification === 'undefined') return;

    const { expiredItems, dueTodayItems, expiringSoonItems } = expiryOverview;
    const total = expiredItems.length + dueTodayItems.length + expiringSoonItems.length;
    if (!total) return;

    const todayKey = new Date().toLocaleDateString('en-CA');
    const userKey = user?.id || user?.email || 'homeai-user';
    const storageKey = `homeai-expiry-notification:${userKey}:${todayKey}`;

    try {
      if (localStorage.getItem(storageKey)) return;
      const parts = [];
      if (expiredItems.length) parts.push(`${expiredItems.length} expired`);
      if (dueTodayItems.length) parts.push(`${dueTodayItems.length} expiring today`);
      if (expiringSoonItems.length) parts.push(`${expiringSoonItems.length} due within 7 days`);

      new Notification('HomeAI expiry reminder', {
        body: parts.join(' · '),
        tag: `homeai-expiry-${userKey}-${todayKey}`,
        icon: '/favicon.ico',
      });
      localStorage.setItem(storageKey, 'sent');
      setNotificationMessage('Today’s expiry reminder has been sent.');
    } catch (error) {
      console.error('Expiry notification error:', error);
      setNotificationMessage('Could not send the expiry notification.');
    }
  }, [reminderEnabled, notificationPermission, products, expiryOverview, user?.id, user?.email]);

  // Build the inventory chart from this user's actual products.
  const categoryColors = [
    '#09e7a1',
    '#ffcc24',
    '#328cff',
    '#a66bff',
    '#ff719c',
    '#9baab4',
    '#ff8a4c',
    '#55c7d9',
  ];

  const pieData = useMemo(() => {
    const counts = products.reduce((result, product) => {
      const category = (product.category || 'Others').trim() || 'Others';
      result[category] = (result[category] || 0) + 1;
      return result;
    }, {});

    return Object.entries(counts)
      .map(([name, value], index) => ({
        name,
        value,
        color: categoryColors[index % categoryColors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  // Inventory health and waste-risk figures are derived only from saved products.
  const inventoryHealth = useMemo(() => {
    const total = products.length;
    const withExpiry = products.map((product) => ({
      ...product,
      calculatedDaysLeft: getProductDaysLeft(product),
    }));
    const expiredItems = withExpiry.filter((product) => product.calculatedDaysLeft !== null && product.calculatedDaysLeft < 0);
    const expiringItems = withExpiry
      .filter((product) => product.calculatedDaysLeft !== null && product.calculatedDaysLeft >= 0 && product.calculatedDaysLeft <= 7)
      .sort((a, b) => a.calculatedDaysLeft - b.calculatedDaysLeft);
    const safeItems = withExpiry.filter((product) => product.calculatedDaysLeft === null || product.calculatedDaysLeft > 7);
    const attentionItems = [...expiredItems, ...expiringItems].sort((a, b) => a.calculatedDaysLeft - b.calculatedDaysLeft);
    const riskCount = expiredItems.length + expiringItems.length;
    const riskPercent = total ? Math.round((riskCount / total) * 100) : 0;

    return {
      total,
      categoryCount: pieData.length,
      expiredItems,
      expiringItems,
      safeItems,
      attentionItems,
      riskCount,
      riskPercent,
      healthyPercent: total ? Math.round((safeItems.length / total) * 100) : 0,
    };
  }, [products, pieData]);

  // AI Assistant: provide saved inventory and recent chat as context.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, chatLoading]);

  const askAI = async (text) => {
    const q = String(text ?? chatInput).trim();
    if (!q || chatLoading) return;

    const recentHistory = messages.slice(-8).map((message) => ({
      role: message.from === 'you' ? 'User' : 'HomeAI',
      text: message.text,
    }));

    const inventoryContext = products.length
      ? products.map((product, index) => {
          const daysLeft = getProductDaysLeft(product);
          return [
            `${index + 1}. ${product.name || 'Unnamed product'}`,
            `Brand: ${product.brand || 'Not specified'}`,
            `Quantity: ${product.qty || product.quantity || 'Not specified'}`,
            `Category: ${product.category || 'Other'}`,
            `Location: ${product.place || product.location || 'Not specified'}`,
            `Expiry date: ${product.expiryDate ? formatExpiryDate(product.expiryDate) : 'Not set'}`,
            `Days left: ${daysLeft ?? 'Unknown'}`,
          ].join(' | ');
        }).join('\n')
      : 'The user inventory is currently empty.';

    const conversationContext = recentHistory.length
      ? recentHistory.map((message) => `${message.role}: ${message.text}`).join('\n')
      : 'No previous conversation.';

    const contextualPrompt = [
      'You are HomeAI, a practical smart-home inventory assistant.',
      'Answer clearly and concisely. Use the saved inventory data when relevant.',
      'Never invent products, quantities, expiry dates, or user details.',
      'If the available data is insufficient, say so clearly.',
      'For meal suggestions, prioritize items expiring soon. Remind the user to check food condition and package guidance before consumption.',
      `SAVED INVENTORY (${products.length} products):\n${inventoryContext}`,
      `RECENT CONVERSATION:\n${conversationContext}`,
      `NEW USER QUESTION:\n${q}`,
    ].join('\n\n');

    setMessages((prev) => [...prev, { from: 'you', text: q }]);
    setChatInput('');
    setActive('AI Assistant');
    setChatLoading(true);

    try {
      const data = await askHomeAI(contextualPrompt);
      setMessages((prev) => [
        ...prev,
        {
          from: 'ai',
          text: data?.reply || 'I could not generate a response. Please try again.',
        },
      ]);
    } catch (error) {
      console.error('AI Assistant Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          from: 'ai',
          text: error.message || 'HomeAI could not connect to the AI service. Check the backend connection and try again.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const clearAIChat = () => {
    if (!chatLoading) setMessages([]);
  };

  // Look up scanned barcode using the Open Food Facts public API
  const handleBarcodeDetected = async (barcode) => {
    const cleanBarcode = String(barcode || "").trim();

    // Immediately replace the camera view with a lookup/loading screen.
    setModal("lookup");
    setNewProduct((prev) => ({
      ...prev,
      barcode: cleanBarcode,
      imageUrl: '',
      expiryDate: "",
    }));

    try {
      console.log("SCANNED BARCODE:", cleanBarcode);
      const result = await lookupProductByBarcode(cleanBarcode);
      console.log("PRODUCT LOOKUP RESULT:", result);

      if (!result.found || !result.product) {
        setNewProduct((prev) => ({
          ...prev,
          barcode: cleanBarcode,
          imageUrl: '',
          expiryDate: "",
        }));
        setModal("add");
        return;
      }

      const product = result.product;
      const categoryText = (product.category || "").toLowerCase();

      let category = "Food";
      let emoji = "📦";

      if (/dairy|milk|cheese|yogurt/.test(categoryText)) {
        category = "Dairy";
        emoji = "🥛";
      } else if (/fruit|vegetable/.test(categoryText)) {
        category = "Fruits & Vegetables";
        emoji = "🍎";
      } else if (/beverage|drink|juice|water/.test(categoryText)) {
        category = "Beverages";
        emoji = "🥤";
      } else if (/personal care|cosmetic|hygiene/.test(categoryText)) {
        category = "Personal Care";
        emoji = "🧴";
      }

      setNewProduct((prev) => ({
        ...prev,
        name: product.name || "",
        brand: product.brand || "",
        qty: product.quantity || "",
        category,
        emoji,
        barcode: cleanBarcode,
        imageUrl: product.image || product.imageUrl || '',
        // Expiry is batch-specific and must be selected by the user.
        expiryDate: "",
      }));

      setModal("add");
      console.log("PRODUCT AUTOFILL SUCCESS");
      console.log("PRODUCT SOURCE:", product.source);
    } catch (error) {
      console.error("PRODUCT LOOKUP ERROR:", error);
      setNewProduct((prev) => ({
        ...prev,
        barcode: cleanBarcode,
        imageUrl: '',
        expiryDate: "",
      }));
        setModal("add");
      alert(error.message || "Product lookup failed. Please enter the details manually.");
    }
  };

  // Add product to PostgreSQL
  const addProduct = async (e) => {
    e.preventDefault();

    if (!newProduct.name.trim()) return;

    const payload = {
      ...newProduct,
      expiryDate: newProduct.expiryDate,
    };

    try {
      const saved = await createProduct(payload);

      setProducts((prev) => [saved, ...prev]);
      setApiStatus('connected');
      refreshDashboardSummary();
      setNewProduct({
        name: '',
        brand: '',
        qty: '',
        place: 'Kitchen',
        expiryDate: '',
        category: 'Food',
        emoji: '📦',
        barcode: '',
        imageUrl: '',
      });

      setModal('');
    } catch (error) {
      console.error('Add product error:', error);
      alert(error.message || 'Product could not be saved. Please check backend connection.');
      if (!error.message?.includes('already registered')) {
        setApiStatus('offline');
      }
    }
  };

  // Open product editor with the selected product's current values
  const openEditProduct = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name || '',
      brand: product.brand || '',
      qty: product.qty || product.quantity || '',
      place: product.place || product.location || 'Kitchen',
      expiryDate: product.expiryDate
        ? new Date(product.expiryDate).toISOString().slice(0, 10)
        : getDefaultExpiryDate(),
      category: product.category || 'Food',
      emoji: product.emoji || '📦',
      barcode: product.barcode || '',
      imageUrl: product.imageUrl || product.image || '',
    });
    setModal('edit');
  };

  // Update product in PostgreSQL
  const saveProductUpdate = async (e) => {
    e.preventDefault();
    if (!editingProduct || !editForm?.name.trim()) return;
    try {
      const updated = await updateProduct(editingProduct.id, editForm);
      setProducts((prev) =>
        prev.map((item) => item.id === editingProduct.id ? updated : item)
      );
      setModal('');
      setEditingProduct(null);
      setEditForm(null);
      await refreshDashboardSummary();
    } catch (error) {
      console.error('Update product error:', error);
      alert(error.message || 'Product could not be updated.');
    }
  };

  // Delete product from PostgreSQL
  const deleteProduct = async (id) => {
    try {
      await removeProduct(id);
      setProducts((prev) => prev.filter((product) => product.id !== id));
      refreshDashboardSummary();
    } catch (error) {
      console.error('Delete product error:', error);
      alert('Product could not be deleted.');
    }
  };

  const openWorkspacePage = (page) => {
    setActive(page);
    setPageView(page === 'Reminders' ? 'reminders' : page === 'Settings' ? 'settings' : 'dashboard');
    setMobileNav(false);
    setExpiryFilter('');
    window.setTimeout(() => {
      const main = document.querySelector('.main');
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    }, 40);
  };

  const handleDeleteAccount = async () => {
    setDeleteAccountLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('homeai_token');
      const response = await fetch(`${apiBase}/auth/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || (response.status === 404
          ? 'Delete-account API is not implemented on the backend yet.'
          : 'Account could not be deleted.'));
      }
      setShowDeleteAccountModal(false);
      await logout();
    } catch (error) {
      console.error('Delete account error:', error);
      alert(error.message || 'Account could not be deleted.');
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  return (
    <div className={`app ${dark ? 'dark' : 'light'}`} id="dashboard-top">
      <style>{`
        html, body, #root { min-height: 100%; height: 100%; overflow: hidden; }
        .app { height: 100dvh; min-height: 0; overflow: hidden; }
        .main { min-height: 0; height: 100%; overflow-y: auto !important; overflow-x: hidden; overscroll-behavior-y: contain; scrollbar-gutter: stable; }
        .main > * { min-width: 0; }
        .modal-backdrop { position: fixed; inset: 0; overflow-y: auto !important; display: flex; align-items: flex-start !important; justify-content: center; padding: 20px 12px; overscroll-behavior: contain; }
        .modal { max-height: calc(100dvh - 40px) !important; overflow-y: auto !important; overscroll-behavior: contain; scrollbar-gutter: stable; }
        .barcode-scanner { max-height: none; min-height: 0; overflow: visible; }
        .add-form { max-height: none; overflow: visible; }
        .modal-backdrop .modal { width: min(100%, 620px); }
        .main, .modal { scrollbar-width: thin; }
        .workspace-page { width: 100%; max-width: 1240px; margin: 0 auto; animation: workspacePageIn .28s ease both; }
        @keyframes workspacePageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .workspace-page-heading { margin-bottom: 24px; }
        .back-page-button { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(9,231,161,.22); color: #a9c9bc; background: rgba(9,231,161,.055); border-radius: 10px; padding: 9px 13px; margin-bottom: 24px; cursor: pointer; font-size: 12px; font-weight: 700; }
        .back-page-button:hover { color: #09e7a1; border-color: rgba(9,231,161,.5); }
        .workspace-page-heading h1 { margin: 7px 0 5px; font-size: clamp(27px,4vw,38px); letter-spacing: -.04em; color: #effff8; }
        .workspace-page-heading p { margin: 0; color: #91aa9f; font-size: 13px; }
        .reminder-summary-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 13px; margin-bottom: 18px; }
        .reminder-summary-card { min-height: 116px; padding: 18px; border: 1px solid rgba(255,255,255,.075); border-radius: 17px; background: linear-gradient(145deg,rgba(12,43,35,.96),rgba(7,27,24,.98)); box-shadow: 0 12px 30px rgba(0,0,0,.14); }
        .reminder-summary-card span,.reminder-summary-card small { display:block; color:#9bb8aa; font-size:12px; }
        .reminder-summary-card strong { display:block; font-size:30px; line-height:1.35; margin:5px 0; color:#effff8; }
        .reminder-summary-card.expired { border-color:rgba(255,103,103,.25); } .reminder-summary-card.expired strong { color:#ff8585; }
        .reminder-summary-card.today { border-color:rgba(255,204,36,.25); } .reminder-summary-card.today strong { color:#ffcc24; }
        .reminder-summary-card.soon { border-color:rgba(9,231,161,.25); } .reminder-summary-card.soon strong { color:#09e7a1; }
        .reminders-control-card { display:flex; justify-content:space-between; align-items:center; gap:18px; flex-wrap:wrap; padding:19px 21px; border:1px solid rgba(9,231,161,.2); border-radius:17px; background:radial-gradient(circle at 100% 0%,rgba(9,231,161,.11),transparent 38%),linear-gradient(130deg,#0b3027,#081e1a); }
        .reminders-control-card h3,.reminders-list-heading h2 { margin:5px 0; color:#effff8; }
        .reminders-control-card p { margin:0; color:#91aa9f; font-size:12px; }
        .reminders-control-actions { display:flex; align-items:center; gap:15px; flex-wrap:wrap; }
        .premium-toggle { display:flex; align-items:center; gap:8px; color:#c5ddd1; font-size:12px; font-weight:700; cursor:pointer; }
        .premium-toggle input { accent-color:#09e7a1; width:16px; height:16px; }
        .reminders-list-heading { display:flex; justify-content:space-between; align-items:end; gap:12px; margin:28px 2px 14px; }
        .reminders-list-heading > span { color:#9bb8aa; font-size:12px; }
        .premium-reminder-list { display:grid; gap:12px; }
        .premium-reminder-card { display:flex; align-items:center; gap:16px; padding:15px; border:1px solid rgba(255,255,255,.08); border-radius:17px; background:linear-gradient(110deg,rgba(12,42,35,.96),rgba(7,27,24,.98)); box-shadow:0 10px 28px rgba(0,0,0,.13); transition:transform .2s,border-color .2s; }
        .premium-reminder-card:hover { transform:translateY(-2px); border-color:rgba(9,231,161,.3); }
        .premium-reminder-card.is-expired { border-left:3px solid #ff7777; } .premium-reminder-card.is-today { border-left:3px solid #ffcc24; } .premium-reminder-card.is-soon { border-left:3px solid #09e7a1; }
        .reminder-product-visual { flex:0 0 76px; width:76px; height:76px; display:grid; place-items:center; overflow:hidden; border-radius:14px; background:rgba(255,255,255,.055); border:1px solid rgba(255,255,255,.07); }
        .reminder-product-visual img { width:100%; height:100%; object-fit:cover; } .reminder-product-visual span { font-size:34px; }
        .reminder-product-info { flex:1; min-width:180px; }
        .reminder-product-title-row { display:flex; align-items:center; flex-wrap:wrap; gap:9px; }
        .reminder-product-title-row h3 { margin:0; color:#effff8; font-size:15px; }
        .reminder-status-pill { border-radius:99px; padding:5px 9px; font-size:10px; font-weight:800; color:#d7fff0; background:rgba(9,231,161,.12); }
        .is-expired .reminder-status-pill { color:#ffaaaa; background:rgba(255,103,103,.13); } .is-today .reminder-status-pill { color:#ffdf78; background:rgba(255,204,36,.13); }
        .reminder-product-info > p { margin:5px 0 9px; color:#9bb8aa; font-size:12px; } .reminder-product-info > p span { color:#526d61; padding:0 4px; }
        .reminder-product-details { display:flex; flex-wrap:wrap; gap:7px 15px; color:#a9c4b8; font-size:11px; } .reminder-product-details span { display:inline-flex; align-items:center; gap:5px; }
        .reminder-edit-button { display:inline-flex; align-items:center; gap:7px; white-space:nowrap; border:1px solid rgba(9,231,161,.22); border-radius:10px; padding:9px 11px; background:rgba(9,231,161,.07); color:#09e7a1; font-size:11px; font-weight:800; cursor:pointer; }
        .reminders-empty-state { text-align:center; padding:48px 18px; border:1px dashed rgba(9,231,161,.22); border-radius:18px; background:rgba(9,231,161,.025); }
        .reminders-empty-state > div { color:#09e7a1; } .reminders-empty-state h3 { color:#effff8; margin:12px 0 5px; } .reminders-empty-state p { color:#91aa9f; font-size:12px; margin:0 0 16px; }
        .settings-layout-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:15px; }
        .settings-profile-card,.settings-detail-card,.settings-danger-card { padding:21px; border:1px solid rgba(255,255,255,.08); border-radius:17px; background:linear-gradient(145deg,rgba(12,43,35,.96),rgba(7,27,24,.98)); }
        .settings-profile-card { display:flex; align-items:center; gap:15px; flex-wrap:wrap; }
        .settings-profile-avatar { width:58px; height:58px; display:grid; place-items:center; border-radius:18px; background:linear-gradient(135deg,#09e7a1,#b6ef54); color:#05251d; font-size:25px; font-weight:900; }
        .settings-profile-card h2 { margin:4px 0; color:#effff8; font-size:20px; } .settings-profile-card p { margin:0; color:#9bb8aa; font-size:12px; overflow-wrap:anywhere; }
        .account-active-badge { margin-left:auto; color:#09e7a1; background:rgba(9,231,161,.1); border-radius:99px; padding:6px 9px; font-size:10px; font-weight:800; }
        .settings-detail-card h3,.settings-danger-card h3 { margin:7px 0; color:#effff8; }
        .settings-detail-row { display:flex; justify-content:space-between; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.07); font-size:12px; }
        .settings-detail-row:last-of-type { margin-bottom:12px; } .settings-detail-row span { color:#91aa9f; } .settings-detail-row strong { color:#eafff5; text-align:right; overflow-wrap:anywhere; }
        .settings-notification-card > p,.settings-danger-card p { color:#91aa9f; font-size:12px; line-height:1.6; }
        .settings-reminder-toggle { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:14px 0; margin:8px 0; border-bottom:1px solid rgba(255,255,255,.07); }
        .settings-reminder-toggle strong,.settings-reminder-toggle small { display:block; } .settings-reminder-toggle strong { color:#eafff5; font-size:12px; } .settings-reminder-toggle small { color:#91aa9f; font-size:10px; margin-top:4px; } .settings-reminder-toggle input { width:17px; height:17px; accent-color:#09e7a1; }
        .settings-danger-card { grid-column:1/-1; display:flex; justify-content:space-between; align-items:center; gap:20px; flex-wrap:wrap; border-color:rgba(255,103,103,.2); background:linear-gradient(120deg,rgba(49,20,22,.52),rgba(9,28,24,.98)); }
        .settings-danger-card p { max-width:650px; margin-bottom:0; } .settings-danger-actions { display:flex; gap:10px; flex-wrap:wrap; }
        .delete-account-button { border:1px solid rgba(255,103,103,.35); border-radius:10px; padding:10px 14px; color:#ff9999; background:rgba(255,103,103,.1); font-size:12px; font-weight:800; cursor:pointer; } .delete-account-button:hover { background:rgba(255,103,103,.18); } .delete-account-button:disabled { opacity:.55; cursor:wait; }
        @media (max-width:850px) { .reminder-summary-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .settings-layout-grid { grid-template-columns:1fr; } }
        @media (max-width:560px) { .premium-reminder-card { align-items:flex-start; flex-wrap:wrap; } .reminder-product-visual { flex-basis:62px; width:62px; height:62px; } .reminder-edit-button { margin-left:78px; } .reminders-control-actions { width:100%; justify-content:space-between; } .settings-danger-actions { width:100%; } }
        /* Dashboard navigation, cards and responsive layout */
        #inventory-section, #expiry-monitor-section, #expiry-calendar-section,
        #ai-assistant-section, #analytics-section, #recipes-section, #settings-section {
          scroll-margin-top: 22px;
        }
        .expiry-alert-panel {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 100% 0%, rgba(9,231,161,.09), transparent 34%),
            linear-gradient(145deg, rgba(8,35,29,.98), rgba(5,24,21,.98)) !important;
          border: 1px solid rgba(9,231,161,.24) !important;
          box-shadow: 0 18px 48px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.035);
        }
        .expiry-alert-panel button {
          min-height: 76px;
          backdrop-filter: blur(8px);
        }
        .expiry-alert-panel button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(0,0,0,.16);
        }
        .expiry-alert-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 14px 16px;
          border-radius: 13px;
          background: linear-gradient(110deg, rgba(255,255,255,.055), rgba(255,255,255,.025));
          border: 1px solid rgba(255,255,255,.075);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.025);
          transition: border-color .18s ease, transform .18s ease, background .18s ease;
        }
        .expiry-alert-item:hover {
          border-color: rgba(9,231,161,.3);
          background: rgba(9,231,161,.055);
          transform: translateY(-1px);
        }
        .expiry-alert-item .expiry-alert-product-name {
          display: block;
          font-size: 14px;
          font-weight: 800;
          color: var(--text, #eafff5);
        }
        .expiry-alert-item .expiry-alert-product-meta {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: var(--muted, #9bb8aa);
        }
        .expiry-alert-item .expiry-alert-status {
          font-size: 11px;
          font-weight: 800;
          padding: 8px 11px;
          border-radius: 9px;
          white-space: nowrap;
        }
        .search {
          position: relative; z-index: 40; min-width: 0;
          border: 1px solid rgba(9,231,161,.34) !important;
          border-radius: 18px !important;
          background: linear-gradient(115deg, rgba(8,38,32,.98), rgba(5,29,25,.98)) !important;
          box-shadow: 0 8px 28px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.045);
          transition: border-color .2s ease, box-shadow .2s ease;
        }
        .search:focus-within {
          border-color: rgba(9,231,161,.78) !important;
          box-shadow: 0 0 0 3px rgba(9,231,161,.09), 0 12px 32px rgba(0,0,0,.22);
        }
        .search > input {
          min-width: 0; color: #effff8 !important;
          caret-color: #09e7a1;
        }
        .search > input::placeholder { color: #89a99c !important; }
        .search > button {
          flex: 0 0 48px; width: 48px; height: 48px;
          display: grid; place-items: center; margin: 4px;
          border-radius: 13px !important;
          background: linear-gradient(135deg, #08d99a, #08b985) !important;
          color: #03271d !important;
          box-shadow: 0 5px 16px rgba(9,231,161,.18);
        }
        .search-suggestions {
          position: absolute; top: calc(100% + 12px); left: 0; right: 0;
          z-index: 120; padding: 10px 12px; border-radius: 16px;
          background: linear-gradient(145deg, #0b2b24, #071e19);
          border: 1px solid rgba(9,231,161,.32);
          box-shadow: 0 22px 55px rgba(0,0,0,.48), inset 0 1px 0 rgba(255,255,255,.045);
          max-height: min(310px, 55vh); overflow-y: auto;
          scrollbar-width: thin; scrollbar-color: rgba(9,231,161,.4) transparent;
        }
        .search-suggestion {
          appearance: none !important; -webkit-appearance: none !important;
          display: flex !important; position: relative; width: 100%; min-height: 48px;
          align-items: center; justify-content: flex-start; gap: 12px;
          padding: 10px 54px 10px 20px !important; margin: 2px 0 !important;
          border: 1px solid transparent !important; border-radius: 11px !important;
          background: transparent !important; color: #eafff5 !important;
          text-align: left; cursor: pointer;
          box-shadow: none !important; transform: none !important;
          transition: background .16s ease, border-color .16s ease;
        }
        .search-suggestion:hover, .search-suggestion:focus-visible {
          outline: none; background: rgba(9,231,161,.09) !important;
          border-color: rgba(9,231,161,.18) !important;
        }
        .search-suggestion-line {
          min-width: 0; width: 100%; flex: 1 1 auto;
          display: flex !important; align-items: baseline; gap: 12px;
          overflow: hidden; white-space: nowrap; text-align: left;
          visibility: visible !important; opacity: 1 !important;
        }
        .search-suggestion-line strong {
          display: block !important; position: static !important;
          flex: 0 1 auto; min-width: 0; max-width: 62%;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          font-size: 13px !important; line-height: 1.4 !important;
          color: #f2fff9 !important; font-weight: 750 !important;
          visibility: visible !important; opacity: 1 !important;
          background: transparent !important; padding: 0 !important;
          margin: 0 !important; transform: none !important;
        }
        .search-suggestion-line span {
          display: block !important; position: static !important;
          flex: 0 1 auto; min-width: 0; max-width: 38%;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          color: #9bb8aa !important; font-size: 12px !important;
          line-height: 1.4 !important; visibility: visible !important;
          opacity: 1 !important; background: transparent !important;
          padding: 0 !important; margin: 0 !important;
        }
        .search-suggestion > svg {
          position: absolute !important; right: 13px; top: 50%;
          transform: translateY(-50%) !important;
          flex: 0 0 28px; width: 28px; height: 28px;
          padding: 6px; box-sizing: border-box; border-radius: 8px;
          color: #09e7a1 !important; background: rgba(9,231,161,.10);
          margin: 0 !important;
        }
        .search-no-match { padding: 15px 11px; color: #b5c9c0; font-size: 12px; }
        .inventory-no-results {
          padding: 30px 18px; text-align: center; border-radius: 14px;
          border: 1px dashed rgba(9,231,161,.25);
          background: rgba(9,231,161,.035); color: #b5c9c0;
        }
        .inventory-no-results strong { display: block; color: #effff7; margin-bottom: 6px; }
        .search-shortcut-icon {
          width: 34px; height: 34px; display: grid; place-items: center;
          flex: 0 0 34px; border-radius: 10px;
          color: #b7d8cd; background: rgba(9,231,161,.10);
          border: 1px solid rgba(9,231,161,.20);
        }
        .welcome-banner {
          position: relative; isolation: isolate; overflow: hidden;
          border: 1px solid rgba(9,231,161,.42) !important;
          border-radius: 24px !important;
          background:
            linear-gradient(90deg, rgba(2,35,28,.96) 0%, rgba(3,47,37,.84) 48%, rgba(3,35,30,.62) 100%),
            url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85')
              center 48% / cover no-repeat !important;
          box-shadow: 0 22px 60px rgba(0,0,0,.28),
            0 0 28px rgba(9,231,161,.07),
            inset 0 1px 0 rgba(255,255,255,.10);
        }
        .welcome-banner::before {
          content: ""; position: absolute; z-index: -1; inset: 0;
          background:
            radial-gradient(circle at 78% 18%, rgba(9,231,161,.22), transparent 34%),
            linear-gradient(110deg, rgba(3,35,28,.22), transparent 58%);
          pointer-events: none;
        }
        .welcome-banner::after {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(110deg, transparent 28%, rgba(255,255,255,.08), transparent 72%);
          opacity: .7;
        }
        .welcome-copy, .welcome-note, .sun-glow {
          position: relative; z-index: 1;
        }

        .welcome-row {
          align-items: stretch !important;
          gap: 14px !important;
        }
        .welcome-row .welcome-banner {
          min-height: 150px;
          display: flex;
          align-items: center;
        }
        .welcome-row .date-widget {
          min-height: 150px;
          box-sizing: border-box;
        }
        .welcome-note { margin-left: auto; padding-right: 12px; }
        @media (max-width: 900px) {
          .welcome-row .date-widget { min-height: 118px; }
          .welcome-row .welcome-banner { min-height: 150px; }
        }
        @media (max-width: 640px) {
          .welcome-row .welcome-banner { min-height: 170px; }
          .welcome-row .date-widget { min-height: 120px; }
        }
        .welcome-copy h1 { letter-spacing: -.045em; }
        .welcome-copy p { line-height: 1.65; }
        .welcome-rotating-word {
          display: inline-block; color: #08e6a0;
          text-shadow: 0 0 22px rgba(8,230,160,.35);
          animation: welcomeWordIn .45s ease both;
        }
        @keyframes welcomeWordIn {
          from { opacity: .25; transform: translateY(7px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .date-widget {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 6px; min-width: 190px;
          padding: 14px 18px; border: 1px solid rgba(255,220,75,.48);
          border-radius: 22px;
          background:
            radial-gradient(circle at 50% 0%, rgba(255,236,125,.30), transparent 58%),
            linear-gradient(145deg, #554400, #927300 55%, #bd9700) !important;
          color: #fff9d7;
          box-shadow: 0 18px 45px rgba(0,0,0,.24),
            0 0 24px rgba(255,204,36,.10),
            inset 0 1px 0 rgba(255,255,255,.22);
        }
        .date-widget > svg {
          width: 30px; height: 30px; filter: drop-shadow(0 0 9px rgba(255,226,76,.35));
        }
        .date-widget > svg { color: #ffe34f; }
        .date-widget-copy { display: flex; align-items: baseline; gap: 8px; }
        .date-widget-copy strong { font-size: 32px; line-height: 1; font-weight: 850; letter-spacing: -.04em; }
        .date-widget-copy span { font-size: 12px; font-weight: 750; }
        .date-widget small { font-size: 13px; font-weight: 700; opacity: .95; }
        .sidebar { display: flex; flex-direction: column; min-height: 0; }
        .sidebar nav, .sidebar .nav, .sidebar .sidebar-links {
          min-height: 0; overflow-y: auto; overscroll-behavior: contain;
          scrollbar-width: thin; scrollbar-color: rgba(9,231,161,.35) transparent;
        }
        .sidebar nav::-webkit-scrollbar, .sidebar .nav::-webkit-scrollbar,
        .sidebar .sidebar-links::-webkit-scrollbar { width: 5px; }
        .sidebar nav::-webkit-scrollbar-thumb, .sidebar .nav::-webkit-scrollbar-thumb,
        .sidebar .sidebar-links::-webkit-scrollbar-thumb {
          background: rgba(9,231,161,.35); border-radius: 10px;
        }
        @media (max-width: 900px) {
          .welcome-row { grid-template-columns: minmax(0, 1fr) !important; }
          .date-widget { min-width: 0; min-height: 145px; }
        }
        @media (max-width: 640px) {
          .topbar { flex-wrap: wrap; }
          .search { flex: 1 1 100%; width: 100%; order: 2; }
          .welcome-banner { min-height: 190px; padding: 20px !important; }
          .welcome-copy h1 { font-size: clamp(23px, 7vw, 32px) !important; }
          .welcome-copy p { font-size: 13px !important; }
          .welcome-note { display: none !important; }
          .date-widget { width: 100%; box-sizing: border-box; }
          .user .plan, .user .logout-button { display: none; }
        }
        .inventory-main-section {
          margin-top: 18px;
          padding: 22px;
          border-radius: 20px;
          border: 1px solid rgba(9,231,161,.22);
          background: radial-gradient(circle at 100% 0%, rgba(9,231,161,.075), transparent 32%),
            linear-gradient(145deg, rgba(8,35,29,.96), rgba(5,24,21,.98));
          box-shadow: 0 18px 48px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.035);
        }
        .inventory-section-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; margin-bottom: 18px;
        }
        .inventory-header-actions, .inventory-empty-actions {
          display: flex; align-items: center; justify-content: flex-end;
          gap: 9px; flex-wrap: wrap;
        }
        .inventory-empty-state {
          min-height: 210px; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 10px;
          padding: 24px; text-align: center;
          border: 1px dashed rgba(9,231,161,.25); border-radius: 16px;
          background: rgba(9,231,161,.035); color: var(--muted, #9bb8aa);
        }
        .inventory-empty-state > svg { color: #09e7a1; }
        .inventory-empty-state strong { color: var(--text, #eafff5); font-size: 16px; }
        .inventory-empty-state span { font-size: 12px; line-height: 1.6; }
        .inventory-product-grid { align-items: stretch; }
        .products-section .product-grid { align-items: stretch; }
        .products-section .product-card { min-width: 0; }
        @media (max-width: 900px) {
          .dashboard-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .right-column { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 16px; }
          .center-column, .right-column { min-width: 0; }
        }
        .stats .stat-card { border: 0; font: inherit; }
        .stats .stat-card:focus-visible,
        .expiry-alert-panel button:focus-visible {
          outline: 3px solid rgba(9,231,161,.75);
          outline-offset: 3px;
        }
        @media (hover: hover) and (pointer: fine) {
          .stats .stat-card:hover { transform: translateY(-3px); filter: brightness(1.08); }
          .expiry-alert-panel button:hover { filter: brightness(1.12); }
        }
        @media (max-width: 640px) {
          .content { padding: 14px !important; }
          .stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; }
          .expiry-alert-panel { padding: 14px !important; }
          .inventory-main-section { padding: 14px; }
          .inventory-section-head { align-items: flex-start; flex-direction: column; }
          .inventory-header-actions { width: 100%; justify-content: flex-start; }
          .inventory-header-actions button { flex: 1 1 auto; }
          .products-section .product-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .section-head { align-items: flex-start; gap: 10px; }
          .topbar { gap: 8px; }
          .search { min-width: 0; }
        }
        /* Final dashboard polish */
        .search .search-shortcut-icon { display: none !important; }
        .search > button {
          display: grid !important; place-items: center;
          width: 4opx; height: 35px; flex: 0 0 46px;
          margin-left: 8px; border: 0 !important; border-radius: 12px !important;
          background: #09e7a1 !important; color: #05251d !important;
          box-shadow: 0 5px 18px rgba(9,231,161,.18);
        }
        .search > button:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .logout-button {
          background: #09e7a1 !important; color: #05251d !important;
          border: 1px solid rgba(9,231,161,.55) !important;
          font-weight: 800 !important; opacity: 1 !important;
          box-shadow: 0 5px 18px rgba(9,231,161,.14);border-radius: 10px
        }
        .logout-button:hover { background: #20f5b2 !important; color: #05251d !important; }
        .date-widget {
          min-width: 0 !important; width: 100%; min-height: 138px;
          box-sizing: border-box; padding: 12px 16px !important;
          gap: 5px !important; border-radius: 20px;
        }
        .date-widget > svg { width: 29px; height: 29px; }
        .date-widget-copy { gap: 7px; }
        .date-widget-copy strong { font-size: 31px; }
        .date-widget-copy span { font-size: 12px; }
        .date-widget small { font-size: 12px; }
        .lower-grid { margin-top: 28px !important; padding-top: 8px; }
        .lower-grid > .panel { min-width: 0; margin-top: 4px; }
        .inventory-panel, .calendar-panel {
          padding-top: 24px !important;
          box-sizing: border-box;
        }
        .lower-grid .panel-head { margin-top: 2px; }
        @media (max-width: 900px) {
          .date-widget { min-height: 120px; }
          .lower-grid { margin-top: 22px !important; }
        }
        .date-picker-field { position: relative; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
        .date-picker-label { display: block; }
        .date-picker-control { position: relative; width: 100%; }
        .date-picker-control .date-picker-display { padding-right: 48px; }
        .date-picker-open-button {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          z-index: 6; display: grid; place-items: center; width: 32px; height: 32px;
          border: 0; border-radius: 8px; background: rgba(9,231,161,.12);
          color: #09e7a1; cursor: pointer;
        }
        .date-picker-display { width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 10px; cursor: pointer; pointer-events: none; }
        .date-picker-native {
          position: absolute; left: 0; right: 42px; bottom: 0; top: 0;
          display: block; width: calc(100% - 42px); height: 100%; margin: 0;
          opacity: 0; cursor: pointer; z-index: 5;
          color: transparent; background: transparent;
        }
        .date-picker-native::-webkit-calendar-picker-indicator { cursor: pointer; }
        .date-picker-field:focus-within .date-picker-display { outline: 2px solid rgba(9,231,161,.55); }
        @media (max-width: 640px) {
          .modal-backdrop { padding: 10px 8px; }
          .modal { max-height: calc(100dvh - 20px) !important; }
          .main { -webkit-overflow-scrolling: touch; }
        }
      `}</style>
      <aside className={`sidebar ${mobileNav ? 'show' : ''}`}>
        <div className="brand">
          <div className="brand-icon">
            <Home size={30} strokeWidth={3} />
          </div>

          <div>
            <strong>
              Home<span>AI</span>
            </strong>
            <small>Smart Home, Zero Waste</small>
          </div>

          <button
            className="close-nav"
            onClick={() => setMobileNav(false)}
          >
            <X />
          </button>
        </div>

        <nav>
          {navItems.map(([Icon, label]) => (
            <button
              key={label}
              className={`nav-item ${
                active === label ? 'selected' : ''
              }`}
              onClick={() => {
                if (label === 'Scan Product') {
                  setActive(label);
                  setMobileNav(false);
                  setPageView('dashboard');
                  setModal('scan');
                  return;
                }
                if (label === 'Reminders' || label === 'Settings' || label === 'Dashboard') {
                  openWorkspacePage(label);
                  return;
                }
                setActive(label);
                setPageView('dashboard');
                setMobileNav(false);
                setExpiryFilter('');
                const targets = {
                  Inventory: 'inventory-section',
                  'Expiry Calendar': 'expiry-calendar-section',
                  'AI Assistant': 'ai-assistant-section',
                  Categories: 'analytics-section',
                };
                window.setTimeout(() => {
                  document.getElementById(targets[label] || 'dashboard-top')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu icon-btn"
            onClick={() => setMobileNav(true)}
          >
            <Menu />
          </button>

          <button className="collapse icon-btn">
            <ChevronLeft />
          </button>

          <div className="search">
            <Search size={18} />
            <input
              type="search"
              value={query}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 140)}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                setSelectedSuggestionId(null);
                if (!value.trim()) {
                  setAppliedSearchQuery('');
                  setExpiryFilter('');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSearch();
                if (e.key === 'Escape') {
                  setQuery('');
                  setSearchFocused(false);
                }
              }}
              placeholder="Search products, brands, categories, barcode..."
              aria-label="Search inventory"
              aria-autocomplete="list"
              aria-expanded={searchFocused && Boolean(query.trim())}
            />
            <button
              type="button"
              onClick={submitSearch}
              aria-label="Show search results"
              title="Search inventory"
            >
              <Search size={18} />
            </button>
            {searchFocused && query.trim() && (
              <div
                role="listbox"
                aria-label="Matching products"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  left: 0,
                  right: 0,
                  zIndex: 9999,
                  boxSizing: 'border-box',
                  padding: '8px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: '1px solid rgba(9,231,161,.35)',
                  borderRadius: 14,
                  background: '#08251f',
                  boxShadow: '0 18px 42px rgba(0,0,0,.48)',
                }}
              >
                {searchSuggestions.length > 0 ? (
                  searchSuggestions.slice(0, 5).map((product, index) => {
                    const productName = String(
                      product.name ??
                      product.productName ??
                      product.title ??
                      product.itemName ??
                      product.label ??
                      'Unnamed product'
                    );
                    const brandName = String(product.brand ?? product.brands ?? '').trim();

                    return (
                      <button
                        type="button"
                        role="option"
                        aria-selected="false"
                        key={product.id ?? `${productName}-${index}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applySearch(
                          [productName, brandName].filter(Boolean).join(' '),
                          product.id
                        )}
                        style={{
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          position: 'relative',
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) 28px',
                          alignItems: 'center',
                          columnGap: 12,
                          width: '100%',
                          minHeight: 48,
                          boxSizing: 'border-box',
                          margin: '2px 0',
                          padding: '9px 12px 9px 16px',
                          border: '1px solid transparent',
                          borderRadius: 10,
                          background: 'transparent',
                          color: '#f2fff9',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.background = 'rgba(9,231,161,.10)';
                          event.currentTarget.style.borderColor = 'rgba(9,231,161,.20)';
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.background = 'transparent';
                          event.currentTarget.style.borderColor = 'transparent';
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 12,
                            minWidth: 0,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            visibility: 'visible',
                          }}
                        >
                          <div
                            style={{
                              display: 'block',
                              minWidth: 0,
                              maxWidth: brandName ? '65%' : '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: '#f2fff9',
                              fontSize: 13,
                              lineHeight: '20px',
                              fontWeight: 700,
                              visibility: 'visible',
                            }}
                          >
                            {productName}
                          </div>
                          {brandName && (
                            <div
                              style={{
                                display: 'block',
                                minWidth: 0,
                                maxWidth: '35%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: '#9bb8aa',
                                fontSize: 12,
                                lineHeight: '20px',
                                fontWeight: 500,
                                visibility: 'visible',
                              }}
                            >
                              {brandName}
                            </div>
                          )}
                        </div>
                        <div
                          aria-hidden="true"
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            color: '#09e7a1',
                            background: 'rgba(9,231,161,.12)',
                            fontSize: 20,
                            lineHeight: 1,
                          }}
                        >
                          →
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div style={{
                    padding: '14px 16px',
                    color: '#b5c9c0',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}>
                    No matching result found
                  </div>
                )}
              </div>
            )}
          </div>



          <div className="top-actions">
            <button
              className="icon-btn notification"
              onClick={() => openWorkspacePage('Reminders')}
              title="Notifications and reminders"
            >
              <Bell />
              <i />
            </button>

            <div className="user">
              <div className="avatar">
                {(user?.name || 'U').trim().charAt(0).toUpperCase()}
              </div>
              <b>{user?.name || 'HomeAI User'}</b>
          
              <button
                type="button"
                className="logout-button"
                onClick={logout}
                title="Logout"
              >
                Logout
              </button>
            </div>

          </div>
        </header>

        {pageView === 'reminders' && (
          <section className="workspace-page reminders-page" aria-label="Reminders" style={{ padding: '26px clamp(16px, 3vw, 34px) 42px' }}>
            <div className="workspace-page-heading">
              <button type="button" className="back-page-button" onClick={() => openWorkspacePage('Dashboard')}><ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Dashboard</button>
              <span className="eyebrow">HOMEAI SMART ALERTS</span>
              <h1>Expiry Reminders</h1>
              <p>Live expiry tracking for the products saved in your inventory.</p>
            </div>
            <div className="reminder-summary-grid">
              <div className="reminder-summary-card expired"><span>Expired</span><strong>{expiryOverview.expiredItems.length}</strong><small>Past expiry date</small></div>
              <div className="reminder-summary-card today"><span>Expires today</span><strong>{expiryOverview.dueTodayItems.length}</strong><small>Needs attention today</small></div>
              <div className="reminder-summary-card soon"><span>Next 7 days</span><strong>{expiryOverview.expiringSoonItems.length}</strong><small>Upcoming expiry</small></div>
              <div className="reminder-summary-card total"><span>Total alerts</span><strong>{expiryOverview.alerts.length}</strong><small>Across your inventory</small></div>
            </div>
            <div className="reminders-control-card">
              <div><span className="eyebrow">NOTIFICATION CONTROL</span><h3>Daily expiry reminders</h3><p>Allow HomeAI to show a daily browser notification while the app is open.</p></div>
              <div className="reminders-control-actions">
                <label className="premium-toggle"><input type="checkbox" checked={reminderEnabled} onChange={(event) => { const enabled = event.target.checked; setReminderEnabled(enabled); localStorage.setItem('homeai-reminders-enabled', String(enabled)); setNotificationMessage(enabled ? 'Daily reminders are enabled.' : 'Daily reminders are paused.'); }} /><span></span>{reminderEnabled ? 'On' : 'Paused'}</label>
                <button type="button" className="primary small" onClick={enableExpiryNotifications}><Bell size={15} /> {notificationPermission === 'granted' ? 'Permission enabled' : 'Enable notifications'}</button>
              </div>
            </div>
            {notificationMessage && <p className="muted" role="status" style={{ margin: '12px 2px' }}>{notificationMessage}</p>}
            <div className="reminders-list-heading"><div><span className="eyebrow">PERSONALIZED INVENTORY ALERTS</span><h2>Products needing attention</h2></div><span>{expiryOverview.alerts.length} alert(s)</span></div>
            {expiryOverview.alerts.length ? (
              <div className="premium-reminder-list">
                {expiryOverview.alerts.map((product) => {
                  const days = product.calculatedDaysLeft;
                  const isExpired = days < 0;
                  const isToday = days === 0;
                  const status = isExpired ? `${Math.abs(days)} day(s) overdue` : isToday ? 'Expires today' : `Expires in ${days} day(s)`;
                  const image = product.imageUrl || product.image || product.productImage || '';
                  return <article className={`premium-reminder-card ${isExpired ? 'is-expired' : isToday ? 'is-today' : 'is-soon'}`} key={product.id}>
                    <div className="reminder-product-visual">{image ? <img src={image} alt={product.name || 'Product'} onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <span>{product.emoji || '📦'}</span>}</div>
                    <div className="reminder-product-info"><div className="reminder-product-title-row"><h3>{product.name || 'Unnamed product'}</h3><span className="reminder-status-pill">{status}</span></div>
                      <p>{product.brand || 'Brand not set'} <span>·</span> {product.category || 'Other'}</p>
                      <div className="reminder-product-details"><span><Package size={13} /> {product.qty || product.quantity || 'Quantity not set'}</span><span><MapPin size={13} /> {product.place || product.location || 'Location not set'}</span><span><CalendarDays size={13} /> {formatExpiryDate(product.expiryDate)}</span></div>
                    </div>
                    <button type="button" className="reminder-edit-button" onClick={() => openEditProduct(product)}>View / Edit <ArrowRight size={14} /></button>
                  </article>;
                })}
              </div>
            ) : <div className="reminders-empty-state"><div><CheckCircle2 size={34} /></div><h3>All clear for now</h3><p>Add expiry dates to your inventory and HomeAI will show personalized reminders here.</p><button type="button" className="primary small" onClick={() => { openWorkspacePage('Dashboard'); window.setTimeout(() => setModal('add'), 120); }}><Plus size={15} /> Add product</button></div>}
          </section>
        )}

        {pageView === 'settings' && (
          <section className="workspace-page settings-page" aria-label="Settings" style={{ padding: '26px clamp(16px, 3vw, 34px) 42px' }}>
            <div className="workspace-page-heading">
              <button type="button" className="back-page-button" onClick={() => openWorkspacePage('Dashboard')}><ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back to Dashboard</button>
              <span className="eyebrow">HOMEAI ACCOUNT</span><h1>Settings</h1><p>Manage your profile, preferences and account security.</p>
            </div>
            <div className="settings-layout-grid">
              <article className="settings-profile-card"><div className="settings-profile-avatar">{(user?.name || user?.email || 'U').trim().charAt(0).toUpperCase()}</div><div><span className="eyebrow">YOUR PROFILE</span><h2>{user?.name || 'HomeAI User'}</h2><p>{user?.email || 'Email not available'}</p></div><span className="account-active-badge">Active account</span></article>
              <article className="settings-detail-card"><span className="eyebrow">ACCOUNT DETAILS</span><div className="settings-detail-row"><span>Full name</span><strong>{user?.name || 'Not available'}</strong></div><div className="settings-detail-row"><span>Email address</span><strong>{user?.email || 'Not available'}</strong></div><div className="settings-detail-row"><span>Account ID</span><strong>{user?.id || 'Not provided'}</strong></div><div className="settings-detail-row"><span>Inventory items</span><strong>{products.length}</strong></div></article>
              <article className="settings-detail-card settings-notification-card"><span className="eyebrow">PREFERENCES</span><h3>Notifications</h3><p>Choose whether HomeAI can send expiry alerts in this browser.</p><label className="settings-reminder-toggle"><span><strong>Daily expiry reminders</strong><small>Daily summary for expired and upcoming products</small></span><input type="checkbox" checked={reminderEnabled} onChange={(event) => { const enabled = event.target.checked; setReminderEnabled(enabled); localStorage.setItem('homeai-reminders-enabled', String(enabled)); }} /></label><div className="settings-detail-row"><span>Browser permission</span><strong className={`permission-${notificationPermission}`}>{notificationPermission}</strong></div><button type="button" className="primary small" onClick={enableExpiryNotifications}><Bell size={15} /> Manage browser permission</button></article>
              <article className="settings-danger-card"><div><span className="eyebrow">ACCOUNT ACTIONS</span><h3>Sign out or delete account</h3><p>Logging out keeps your data safe. Deleting your account is permanent and removes your account and associated inventory.</p></div><div className="settings-danger-actions"><button type="button" className="logout-button" onClick={logout}>Logout</button><button type="button" className="delete-account-button" onClick={() => setShowDeleteAccountModal(true)} disabled={deleteAccountLoading}>{deleteAccountLoading ? 'Deleting...' : 'Delete Account'}</button></div></article>
            </div>
          </section>
        )}

        <div className="content" style={{ display: pageView === 'dashboard' ? 'block' : 'none' }}>
          <section className="welcome-row">
            <div className="welcome-banner">
              <div className="sun-glow">☀</div>

              <div className="welcome-copy">
                <h1>
                  Welcome, <em>{user?.name || 'HomeAI User'}!</em> <span>👋</span>
                </h1>

                <p>
                  Your home, smarter every day. <strong className="welcome-rotating-word">{welcomeWords[welcomeWordIndex]}</strong> with HomeAI.
                </p>
              </div>

              <div className="welcome-note">
                <Sparkles size={25} />
                <span>
                  A smarter
                  <br />
                  way to manage
                  <br />
                  your home
                </span>
              </div>
            </div>

            <div className="weather date-widget">
              <CalendarDays size={42} />
              <div className="date-widget-copy">
                <strong>{currentDate.toLocaleDateString('en-IN', { day: '2-digit' })}</strong>
                <span>{currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
              </div>
              <small>{currentDate.toLocaleDateString('en-IN', { weekday: 'long' })}</small>
            </div>
          </section>

          <div className="dashboard-grid">
            <div className="center-column">
              {active !== 'Dashboard' && (
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">
                      HOMEAI WORKSPACE
                    </span>
                    <h2>{active}</h2>
                  </div>

                  <button
                    className="primary small"
                    onClick={() => setModal('add')}
                  >
                    <Plus size={16} /> Add Product
                  </button>
                </div>
              )}

              <section className="stats" aria-label="Inventory summary">
                <Stat
                  color="green"
                  icon={<Package />}
                  label="Total Items"
                  value={summaryLoading ? '…' : (dashboardSummary?.totalItems ?? products.length)}
                  note="View all products"
                  onClick={() => goToExpiryDetails('all')}
                />
                <Stat
                  color="yellow"
                  icon={<Clock3 />}
                  label="Expiring Soon"
                  value={summaryLoading ? '…' : (expiryOverview.dueTodayItems.length + expiryOverview.expiringSoonItems.length)}
                  note="Today and next 7 days"
                  onClick={() => goToExpiryDetails('week')}
                />
                <Stat
                  color="red"
                  icon={<AlertCircle />}
                  label="Expired Items"
                  value={summaryLoading ? '…' : (dashboardSummary?.expiredItems ?? expired.length)}
                  note="View expired products"
                  onClick={() => goToExpiryDetails('expired')}
                />
                <Stat
                  color="blue"
                  icon={<Grid2X2 />}
                  label="Categories"
                  value={summaryLoading ? '…' : (dashboardSummary?.categories ?? new Set(products.map((p) => p.category)).size)}
                  note="Browse products by category"
                  onClick={() => goToExpiryDetails('categories')}
                />
              </section>

              {summaryError && (
                <div className="dashboard-summary-error" role="status">
                  Statistics could not refresh: {summaryError}
                </div>
              )}


              <section className="scan-banner">
                <div className="scan-icon">
                  <ScanLine size={44} />
                </div>

                <div className="scan-copy">
                  <h2>Scan a Product</h2>

                  <p>
                    Add items instantly using barcode, QR code
                    <br />
                    or product label with AI.
                  </p>

                  <button
                    className="primary scan-button"
                    onClick={() => setModal('scan')}
                  >
                    <Camera size={19} /> Start Scanning
                  </button>
                </div>

                <div className="scan-visual">
                  <div className="phone">
                    <div className="phone-screen">
                      <ScanLine size={65} />
                      <span>Scanning product...</span>
                    </div>
                  </div>

                  <div className="floating-pack">
                    🥛
                    <small>
                      Milk
                      <br />
                      Amul 500 ml
                    </small>
                    <CheckCircle2 />
                  </div>
                </div>

                <div className="scan-steps">
                  <div><ScanLine /> Scan Barcode / QR</div>
                  <div><Sparkles /> AI Extract Expiry Date</div>
                  <div><Package /> Auto Fill Product Info</div>
                  <div><CheckCircle2 /> Add to Inventory</div>
                </div>
              </section>

              <section className="products-section inventory-main-section" id="inventory-section">
                <div className="section-head inventory-section-head">
                  <div>
                    <span className="eyebrow">HOME INVENTORY</span>
                    <h3 style={{ marginTop: 5 }}>
                      {expiryFilter === 'expired' ? 'Expired Products'
                        : expiryFilter === 'today' ? 'Products Expiring Today'
                        : expiryFilter === 'week' ? 'Expiring Soon'
                        : expiryFilter === 'categories' ? 'Products by Category'
                        : 'Your Inventory'}
                    </h3>
                    <p className="muted" style={{ margin: '5px 0 0', fontSize: 12 }}>
                      {expiryFilter === 'expired'
                        ? 'Products past their expiry date.'
                        : expiryFilter === 'today'
                          ? 'Products that expire today.'
                          : expiryFilter === 'week'
                            ? 'Products expiring today or within the next 7 days, earliest first.'
                            : expiryFilter === 'categories'
                              ? 'Products organized by category.'
                              : appliedSearchQuery
                        ? `${visibleProducts.length} matching product(s) found.`
                        : 'Recently added products appear first.'}
                    </p>
                  </div>
                  <div className="inventory-header-actions">
                    {expiryFilter && (
                      <button type="button" className="primary small"
                        onClick={() => setExpiryFilter('')}>
                        Clear filter
                      </button>
                    )}
                    <button type="button" className="primary small"
                      onClick={() => setModal('add')}>
                      <Plus size={16} /> Add Product
                    </button>
                  </div>
                </div>

                {summaryLoading && products.length === 0 ? (
                  <p className="muted">Loading your inventory...</p>
                ) : visibleProducts.length === 0 && appliedSearchQuery ? (
                  <div className="inventory-no-results">
                    <strong>No matching result found</strong>
                    <span>No inventory product matches “{appliedSearchQuery}”. Try another search.</span>
                  </div>
                ) : visibleProducts.length === 0 ? (
                  <div className="inventory-empty-state">
                    <Package size={30} />
                    <strong>
                      {expiryFilter === 'expired' ? 'No expired products'
                        : expiryFilter === 'week' ? 'Nothing expiring soon'
                        : expiryFilter === 'today' ? 'Nothing expires today'
                        : 'Your inventory is empty'}
                    </strong>
                    <span>
                      {expiryFilter
                        ? 'Try another filter or view all products.'
                        : 'Add a product manually or scan its barcode to get started.'}
                    </span>
                    <div className="inventory-empty-actions">
                      {expiryFilter && (
                        <button type="button" className="primary small"
                          onClick={() => setExpiryFilter('')}>
                          View all products
                        </button>
                      )}
                      <button type="button" className="primary small"
                        onClick={() => setModal('add')}>
                        <Plus size={15} /> Add Product
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="product-grid inventory-product-grid">
                    {visibleProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onEdit={() => openEditProduct(product)}
                        onDelete={() => deleteProduct(product.id)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="lower-grid">
                <div className="panel inventory-panel homeai-inventory-premium" id="analytics-section">
                  <style>{`
                    .homeai-inventory-premium { position:relative; overflow:hidden; border:1px solid rgba(9,231,161,.22)!important; background:radial-gradient(circle at 8% 0%,rgba(9,231,161,.12),transparent 42%),linear-gradient(145deg,#0b2b24,#071d19)!important; box-shadow:0 16px 40px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.04); }
                    .homeai-inventory-premium .panel-head { position:relative; z-index:1; }
                    .homeai-inventory-premium .panel-head h3 { display:flex; align-items:center; gap:10px; }
                    .homeai-inventory-premium .panel-head h3 span { color:#ffcc24; font-size:19px; }
                    .homeai-inventory-premium .overview-badges { display:flex; gap:8px; flex-wrap:wrap; margin:2px 0 18px; }
                    .homeai-inventory-premium .overview-badge { padding:7px 10px; border-radius:999px; background:rgba(255,255,255,.045); border:1px solid rgba(255,255,255,.07); color:#b6ccc5; font-size:11px; }
                    .homeai-inventory-premium .overview-badge b { color:#f1faf6; margin-right:4px; }
                    .homeai-inventory-premium .chart-wrap { gap:22px; align-items:center; }
                    .homeai-inventory-premium .donut { width:168px; height:168px; flex:0 0 168px; filter:drop-shadow(0 8px 18px rgba(0,0,0,.2)); }
                    .homeai-inventory-premium .donut-center b { font-size:27px; }
                    .homeai-inventory-premium .donut-center span { font-size:11px; color:#a9c1b9; }
                    .homeai-inventory-premium .legend { flex:1; min-width:0; gap:11px; }
                    .homeai-inventory-premium .legend > div { display:grid; grid-template-columns:9px minmax(0,1fr) auto; gap:9px; align-items:center; font-size:12px; }
                    .homeai-inventory-premium .legend > div i { width:8px; height:8px; border-radius:50%; box-shadow:0 0 10px currentColor; }
                    .homeai-inventory-premium .legend > div span { color:#c5d8d1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
                    .homeai-inventory-premium .legend > div b { color:#f4fbf8; }
                    .homeai-inventory-premium .overview-empty { padding:28px 12px; text-align:center; color:#a9c1b9; font-size:13px; }
                    @media(max-width:650px){ .homeai-inventory-premium .chart-wrap{gap:12px}.homeai-inventory-premium .donut{width:140px;height:140px;flex-basis:140px} }
                  `}</style>
                  <div className="panel-head">
                    <h3><span>◉</span> Inventory Overview</h3>
                    <span className="overview-badge">Live inventory</span>
                  </div>
                  <div className="overview-badges">
                    <span className="overview-badge"><b>{inventoryHealth.total}</b> total items</span>
                    <span className="overview-badge"><b>{inventoryHealth.categoryCount}</b> categories</span>
                    <span className="overview-badge"><b>{inventoryHealth.riskCount}</b> need attention</span>
                  </div>
                  {products.length === 0 ? (
                    <div className="overview-empty">Your inventory insights will appear here after you add products.</div>
                  ) : (
                    <div className="chart-wrap">
                      <div className="donut">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={3} stroke="none">
                              {pieData.map((d, i) => <Cell key={d.name || i} fill={d.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background:'#09251f', border:'1px solid rgba(9,231,161,.25)', borderRadius:10, color:'#effaf5' }} itemStyle={{ color:'#effaf5' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="donut-center"><b>{inventoryHealth.total}</b><span>Total Items</span></div>
                      </div>
                      <div className="legend">
                        {pieData.map((d) => (
                          <div key={d.name}>
                            <i style={{ background:d.color, color:d.color }} />
                            <span>{d.name}</span>
                            <b>{d.value} · {Math.round((d.value / inventoryHealth.total) * 100)}%</b>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="panel calendar-panel" id="expiry-calendar-section">
                  <div className="panel-head">
                    <h3>
                      <CalendarDays /> Expiry Calendar
                    </h3>

                    <div className="month-switch">
                      <button
                        onClick={() => setMonth((m) => m - 1)}
                      >
                        <ChevronLeft size={14} />
                      </button>

                      <b>
                        {new Date(new Date().getFullYear(), month, 1).toLocaleString(
                          'en-US',
                          { month: 'long' }
                        )}{' '}
                        {new Date().getFullYear() + Math.floor(month / 12)}
                      </b>

                      <button
                        onClick={() => setMonth((m) => m + 1)}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  <Calendar month={month} products={products} />

                  <div className="calendar-legend">
                    <span><i className="red-dot" /> Expired</span>
                    <span><i className="yellow-dot" /> Expiring Soon</span>
                    <span><i className="green-dot" /> Normal</span>
                  </div>
                </div>

                <div className="panel waste-panel homeai-waste-premium">
                  <style>{`
                    .homeai-waste-premium { position:relative; isolation:isolate; overflow:hidden; border:1px solid rgba(9,231,161,.25)!important; background:radial-gradient(ellipse at 92% 0%,rgba(9,231,161,.14),transparent 38%),radial-gradient(ellipse at 0% 100%,rgba(255,204,36,.07),transparent 42%),linear-gradient(145deg,#0b3027 0%,#071d19 72%)!important; box-shadow:0 20px 52px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.06); }
                    .homeai-waste-premium:before { content:'';position:absolute;inset:0;pointer-events:none;opacity:.35;background:linear-gradient(115deg,transparent 20%,rgba(255,255,255,.035) 48%,transparent 75%); }
                    .homeai-waste-premium .panel-head,.homeai-waste-premium .waste-summary,.homeai-waste-premium .waste-stats,.homeai-waste-premium .use-first-head,.homeai-waste-premium .use-first-list,.homeai-waste-premium .waste-empty { position:relative;z-index:1; }
                    .homeai-waste-premium .panel-head h3 { display:flex;align-items:center;gap:9px; }
                    .homeai-waste-premium .panel-head h3 svg { color:#ffcc24;filter:drop-shadow(0 0 8px rgba(255,204,36,.24)); }
                    .homeai-waste-premium .waste-summary { display:grid;grid-template-columns:112px minmax(0,1fr);gap:18px;align-items:center;margin:16px 0 20px; }
                    .homeai-waste-premium .waste-ring { width:108px;height:108px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#09e7a1 var(--health),rgba(255,255,255,.09) 0);position:relative;box-shadow:0 0 24px rgba(9,231,161,.12);transition:background .35s ease; }
                    .homeai-waste-premium .waste-ring:before { content:'';position:absolute;inset:9px;border-radius:50%;background:#09251f;border:1px solid rgba(255,255,255,.06); }
                    .homeai-waste-premium .waste-ring strong { position:relative;z-index:1;font-size:23px;color:#f2fbf7; }
                    .homeai-waste-premium .waste-copy p { margin:0 0 5px;color:#b8cec6;font-size:12px; }
                    .homeai-waste-premium .waste-copy strong { display:block;font-size:clamp(18px,2vw,23px);line-height:1.2;color:#09e7a1; }
                    .homeai-waste-premium .waste-copy span { display:block;margin-top:7px;color:#a9c1b9;font-size:11px;line-height:1.55; }
                    .homeai-waste-premium .waste-stats { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:18px; }
                    .homeai-waste-premium .waste-stat { min-width:0;padding:13px;border-radius:14px;background:linear-gradient(145deg,rgba(3,25,20,.72),rgba(5,35,28,.58));border:1px solid rgba(9,231,161,.16);transition:transform .2s ease,border-color .2s ease,background .2s ease; }
                    .homeai-waste-premium .waste-stat:hover { transform:translateY(-2px);border-color:rgba(9,231,161,.38);background:rgba(9,231,161,.07); }
                    .homeai-waste-premium .waste-stat span { display:block;color:#a9c1b9;font-size:10px;margin-bottom:7px; }
                    .homeai-waste-premium .waste-stat b { display:block;color:#f3fbf7;font-size:21px; }
                    .homeai-waste-premium .waste-stat small { display:block;color:#8da79e;font-size:10px;margin-top:4px; }
                    .homeai-waste-premium .use-first-head { display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 10px;color:#eaf7f1;font-size:12px;font-weight:750; }
                    .homeai-waste-premium .use-first-head span { color:#ffcc24;font-size:9px;font-weight:800;letter-spacing:.07em; }
                    .homeai-waste-premium .use-first-list { display:grid;gap:8px; }
                    .homeai-waste-premium .use-first-item { display:flex;align-items:center;gap:11px;padding:10px;border-radius:13px;background:linear-gradient(110deg,rgba(255,255,255,.055),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.065);min-width:0;transition:transform .2s ease,border-color .2s ease,background .2s ease; }
                    .homeai-waste-premium .use-first-item:hover { transform:translateY(-2px);border-color:rgba(9,231,161,.3);background:rgba(9,231,161,.055); }
                    .homeai-waste-premium .use-first-image { width:42px;height:42px;flex:0 0 42px;position:relative;display:grid;place-items:center;overflow:hidden;border-radius:11px;background:linear-gradient(145deg,rgba(9,231,161,.13),rgba(255,204,36,.09));border:1px solid rgba(255,255,255,.07); }
                    .homeai-waste-premium .use-first-image img { position:absolute;inset:0;width:100%;height:100%;object-fit:cover; }
                    .homeai-waste-premium .use-first-fallback { display:grid;place-items:center;font-size:21px;line-height:1; }
                    .homeai-waste-premium .use-first-name { flex:1;min-width:0; }
                    .homeai-waste-premium .use-first-name b { display:block;color:#eaf7f1;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
                    .homeai-waste-premium .use-first-name small { display:block;color:#91aaa1;font-size:10px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
                    .homeai-waste-premium .expiry-pill { flex:0 0 auto;padding:6px 8px;border-radius:8px;font-size:9px;font-weight:800;background:rgba(255,204,36,.13);color:#ffcc24;white-space:nowrap; }
                    .homeai-waste-premium .expiry-pill.danger { background:rgba(255,91,91,.14);color:#ff8585; }
                    .homeai-waste-premium .waste-empty { padding:15px;border:1px dashed rgba(9,231,161,.22);border-radius:12px;color:#a9c1b9;font-size:11px;line-height:1.6;background:rgba(9,231,161,.035); }
                    @media(max-width:650px){.homeai-waste-premium .waste-stats{grid-template-columns:1fr}.homeai-waste-premium .waste-summary{grid-template-columns:88px minmax(0,1fr);gap:12px}.homeai-waste-premium .waste-ring{width:86px;height:86px}.homeai-waste-premium .use-first-item{gap:8px;padding:8px}.homeai-waste-premium .use-first-image{width:38px;height:38px;flex-basis:38px}.homeai-waste-premium .expiry-pill{font-size:8px;padding:5px 6px}}
                  `}</style>
                  <div className="panel-head"><h3><Leaf /> Waste Reduction</h3></div>
                  <div className="waste-summary">
                    <div className="waste-ring" style={{ '--health': `${inventoryHealth.healthyPercent}%` }}>
                      <strong>{inventoryHealth.healthyPercent}%</strong>
                    </div>
                    <div className="waste-copy">
                      <p>Inventory freshness</p>
                      <strong>{inventoryHealth.total === 0 ? 'No inventory yet' : inventoryHealth.riskCount === 0 ? 'Looking good' : `${inventoryHealth.riskCount} item${inventoryHealth.riskCount === 1 ? '' : 's'} need action`}</strong>
                      <span>{inventoryHealth.total === 0 ? 'Add products with expiry dates to start tracking freshness and reducing household waste.' : inventoryHealth.riskCount === 0 ? 'No expired or soon-to-expire items found in your saved inventory.' : 'Prioritize these products to reduce the chance of food waste.'}</span>
                    </div>
                  </div>
                  <div className="waste-stats">
                    <div className="waste-stat"><span>Expired</span><b>{inventoryHealth.expiredItems.length}</b><small>past expiry date</small></div>
                    <div className="waste-stat"><span>Expiring soon</span><b>{inventoryHealth.expiringItems.length}</b><small>within 7 days</small></div>
                    <div className="waste-stat"><span>Fresh / safe</span><b>{inventoryHealth.safeItems.length}</b><small>over 7 days or no date</small></div>
                  </div>
                  <div className="use-first-head">Use these first <span>LIVE · SORTED BY EXPIRY</span></div>
                  {inventoryHealth.attentionItems.length ? (
                    <div className="use-first-list">
                      {inventoryHealth.attentionItems.slice(0, 4).map((product) => {
                        const productImage = product.imageUrl || product.image || '';
                        return (
                          <div className="use-first-item" key={product.id}>
                            <div className="use-first-image">
                              <span className="use-first-fallback">{product.emoji || '📦'}</span>
                              {productImage && <img src={productImage} alt={product.name || 'Product'} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
                            </div>
                            <div className="use-first-name"><b>{product.name || 'Unnamed item'}</b><small>{product.qty || product.quantity || 'Quantity not set'} · {product.place || product.location || 'Location not set'}</small></div>
                            <span className={`expiry-pill ${product.calculatedDaysLeft < 0 ? 'danger' : ''}`}>
                              {product.calculatedDaysLeft < 0 ? `${Math.abs(product.calculatedDaysLeft)}d overdue` : product.calculatedDaysLeft === 0 ? 'Expires today' : `${product.calculatedDaysLeft}d left`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="waste-empty">{products.length ? 'No products need urgent attention. Your inventory is currently looking fresh. Keep expiry dates updated for accurate insights.' : 'Your waste-reduction insights will appear here once you add products to your inventory.'}</div>
                  )}
                </div>
              </section>
            </div>

            <aside className="right-column">
              <section className="assistant panel homeai-assistant" id="ai-assistant-section">
                <style>{`
                  .homeai-assistant {
                    display: flex; flex-direction: column; min-height: 510px;
                    overflow: hidden; position: relative;
                    border: 1px solid rgba(9,231,161,.24) !important;
                    background:
                      radial-gradient(circle at 100% 0%, rgba(9,231,161,.12), transparent 35%),
                      linear-gradient(150deg, #0b2b24, #071d19) !important;
                    box-shadow: 0 18px 48px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.045);
                  }
                  .homeai-assistant .assistant-head {
                    display: flex; align-items: center; gap: 12px;
                    padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,.07);
                  }
                  .homeai-assistant .assistant-head > div:nth-child(2) { min-width: 0; flex: 1; }
                  .homeai-assistant .assistant-head p { margin-top: 4px; }
                  .homeai-ai-status {
                    display: inline-flex; align-items: center; gap: 6px;
                    margin-top: 5px; color: #09e7a1; font-size: 10px; font-weight: 700;
                  }
                  .homeai-ai-status i {
                    width: 7px; height: 7px; border-radius: 50%;
                    background: #09e7a1; box-shadow: 0 0 10px rgba(9,231,161,.75);
                  }
                  .homeai-chat-clear {
                    display: grid; place-items: center; width: 32px; height: 32px;
                    border: 1px solid rgba(255,255,255,.10); border-radius: 9px;
                    background: rgba(255,255,255,.045); color: #a9c6ba; cursor: pointer;
                  }
                  .homeai-chat-clear:disabled { opacity: .35; cursor: not-allowed; }
                  .homeai-chat-welcome {
                    display: flex; gap: 10px; align-items: flex-start;
                    margin: 16px 0 12px; padding: 13px;
                    border: 1px solid rgba(9,231,161,.18); border-radius: 13px;
                    background: rgba(9,231,161,.055);
                  }
                  .homeai-chat-welcome-icon {
                    display: grid; place-items: center; flex: 0 0 30px;
                    width: 30px; height: 30px; border-radius: 9px;
                    color: #06271d; background: #09e7a1;
                  }
                  .homeai-chat-welcome strong { display: block; color: #effff8; font-size: 12px; }
                  .homeai-chat-welcome p { margin: 5px 0 0; color: #a9c6ba; font-size: 11px; line-height: 1.55; }
                  .homeai-assistant .suggestions {
                    display: grid; grid-template-columns: 1fr; gap: 7px; margin: 12px 0;
                  }
                  .homeai-assistant .suggestions button {
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 8px; min-height: 38px; padding: 9px 11px;
                    border: 1px solid rgba(9,231,161,.13); border-radius: 10px;
                    background: rgba(255,255,255,.035); color: #cfe6dc;
                    text-align: left; font-size: 11px; cursor: pointer; transition: .18s ease;
                  }
                  .homeai-assistant .suggestions button:hover:not(:disabled) {
                    border-color: rgba(9,231,161,.42); background: rgba(9,231,161,.09);
                    color: #fff; transform: translateX(2px);
                  }
                  .homeai-assistant .suggestions button:disabled { opacity: .45; cursor: not-allowed; }
                  .homeai-assistant .suggestions button svg { flex: 0 0 auto; color: #09e7a1; }
                  .homeai-chat-history {
                    display: grid; gap: 11px; max-height: 330px; min-height: 110px;
                    overflow-y: auto; padding: 12px 5px 12px 0;
                    scrollbar-width: thin; scrollbar-color: rgba(9,231,161,.35) transparent;
                  }
                  .homeai-chat-message { display: flex; flex-direction: column; max-width: 94%; gap: 4px; }
                  .homeai-chat-message.you { justify-self: end; align-items: flex-end; }
                  .homeai-chat-message.ai { justify-self: start; align-items: flex-start; }
                  .homeai-chat-label {
                    color: #8eaea0; font-size: 9px; font-weight: 800;
                    letter-spacing: .08em; text-transform: uppercase;
                  }
                  .homeai-chat-bubble {
                    padding: 10px 12px; border-radius: 12px; color: #eafff5;
                    font-size: 11px; line-height: 1.65; white-space: pre-wrap;
                    overflow-wrap: anywhere; border: 1px solid rgba(255,255,255,.07);
                    background: rgba(255,255,255,.055);
                  }
                  .homeai-chat-message.you .homeai-chat-bubble {
                    border-color: rgba(9,231,161,.22); background: rgba(9,231,161,.12);
                    border-bottom-right-radius: 4px;
                  }
                  .homeai-chat-message.ai .homeai-chat-bubble { border-bottom-left-radius: 4px; }
                  .homeai-typing { display: inline-flex; align-items: center; gap: 5px; }
                  .homeai-typing i {
                    width: 5px; height: 5px; border-radius: 50%; background: #09e7a1;
                    animation: homeaiTyping 1s infinite ease-in-out;
                  }
                  .homeai-typing i:nth-child(2) { animation-delay: .15s; }
                  .homeai-typing i:nth-child(3) { animation-delay: .3s; }
                  @keyframes homeaiTyping {
                    0%, 60%, 100% { opacity: .3; transform: translateY(0); }
                    30% { opacity: 1; transform: translateY(-4px); }
                  }
                  .homeai-assistant .chat-input {
                    display: flex; align-items: center; gap: 8px; margin-top: auto;
                    padding: 6px; border: 1px solid rgba(9,231,161,.28);
                    border-radius: 13px; background: rgba(2,18,15,.72);
                    box-shadow: 0 8px 22px rgba(0,0,0,.16);
                  }
                  .homeai-assistant .chat-input input {
                    min-width: 0; flex: 1; border: 0 !important; outline: 0 !important;
                    background: transparent !important; color: #effff8 !important;
                    box-shadow: none !important; font-size: 11px;
                  }
                  .homeai-assistant .chat-input input::placeholder { color: #78998b; }
                  .homeai-assistant .chat-input button {
                    display: grid; place-items: center; flex: 0 0 36px;
                    width: 36px; height: 36px; border: 0; border-radius: 10px;
                    background: #09e7a1; color: #03271d; cursor: pointer;
                  }
                  .homeai-assistant .chat-input button:disabled { opacity: .4; cursor: not-allowed; }
                  @media (max-width: 900px) {
                    .homeai-assistant { min-height: 0; }
                    .homeai-chat-history { max-height: 420px; }
                  }
                `}</style>

                <div className="assistant-head">
                  <div className="bot-icon"><Bot size={30} /></div>
                  <div>
                    <h3>HomeAI Assistant</h3>
                    <p>Your inventory-aware home companion</p>
                    <span className="homeai-ai-status"><i /> Ready to help</span>
                  </div>
                  <button
                    type="button"
                    className="homeai-chat-clear"
                    onClick={clearAIChat}
                    disabled={chatLoading || messages.length === 0}
                    title="Clear conversation"
                    aria-label="Clear conversation"
                  >
                    <X size={16} />
                  </button>
                </div>

                {messages.length === 0 && (
                  <div className="homeai-chat-welcome">
                    <div className="homeai-chat-welcome-icon"><Sparkles size={17} /></div>
                    <div>
                      <strong>Hi {user?.name?.split(' ')[0] || 'there'}! What can I help with?</strong>
                      <p>I can check expiry dates, suggest meals from your saved items, organize your inventory and help reduce household waste.</p>
                    </div>
                  </div>
                )}

                <div className="suggestions" aria-label="Suggested questions">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => askAI(suggestion)}
                      disabled={chatLoading}
                    >
                      <span>{suggestion}</span><ArrowRight size={15} />
                    </button>
                  ))}
                </div>

                {messages.length > 0 && (
                  <div className="homeai-chat-history" aria-live="polite" aria-label="Chat messages">
                    {messages.map((message, index) => (
                      <div className={`homeai-chat-message ${message.from}`} key={`${message.from}-${index}`}>
                        <span className="homeai-chat-label">{message.from === 'you' ? 'You' : 'HomeAI'}</span>
                        <div className="homeai-chat-bubble">{message.text}</div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="homeai-chat-message ai">
                        <span className="homeai-chat-label">HomeAI</span>
                        <div className="homeai-chat-bubble homeai-typing" aria-label="HomeAI is typing">
                          <i /><i /><i />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}

                <form className="chat-input" onSubmit={(event) => {
                  event.preventDefault();
                  askAI();
                }}>
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Ask about your products or expiry dates..."
                    aria-label="Message HomeAI Assistant"
                    maxLength={1000}
                  />
                  <button type="submit" disabled={chatLoading || !chatInput.trim()} aria-label="Send message">
                    <Send size={17} />
                  </button>
                </form>
              </section>

              <section className="quick-actions panel" id="recipes-section">
                <h3><Zap /> Quick Actions</h3>

                <div className="quick-grid">
                  <button
                    className="quick-add"
                    onClick={() => setModal('add')}
                  >
                    <Plus /> Add Product
                  </button>

                  <button
                    className="quick-scan"
                    onClick={() => setModal('scan')}
                  >
                    <ScanLine /> Scan Product
                  </button>

                  <button
                    className="quick-calendar"
                    onClick={() => {
                      setActive('Expiry Calendar');
                      document.getElementById('expiry-calendar-section')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    <CalendarDays /> View Calendar
                  </button>

                  <button
                    className="quick-recipes"
                    onClick={() => {
                      setActive('Inventory');
                      document.getElementById('inventory-section')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    <Package /> Inventory
                  </button>
                </div>
              </section>
            </aside>
          </div>

          <section className="panel expiry-alert-panel" id="expiry-monitor-section" style={{ display: 'none', marginTop: 24, padding: 22, scrollMarginTop: 22 }}>
            <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <span className="eyebrow">SMART NOTIFICATIONS</span>
                <h3 style={{ marginTop: 6 }}>Reminders & Expiry Alerts</h3>
                <p className="muted" style={{ marginTop: 5, fontSize: 12 }}>Products that need your attention, based on saved expiry dates.</p>
              </div>
              <button type="button" className="primary small" onClick={enableExpiryNotifications}>
                <Bell size={15} /> {notificationPermission === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 12, margin: '18px 0' }}>
              <div className="waste-stat"><span>Expired</span><b style={{ color: '#ff7777' }}>{expiryOverview.expiredItems.length}</b><small>Past expiry date</small></div>
              <div className="waste-stat"><span>Expires today</span><b style={{ color: '#ffcc24' }}>{expiryOverview.dueTodayItems.length}</b><small>Use or check today</small></div>
              <div className="waste-stat"><span>Next 7 days</span><b style={{ color: '#09e7a1' }}>{expiryOverview.expiringSoonItems.length}</b><small>Coming up soon</small></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <strong>Upcoming reminders</strong>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 12, color: 'var(--muted, #9bb8aa)' }}>
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    setReminderEnabled(enabled);
                    localStorage.setItem('homeai-reminders-enabled', String(enabled));
                    setNotificationMessage(enabled ? 'Expiry reminders are enabled.' : 'Expiry reminders are paused.');
                  }}
                />
                Daily browser reminders
              </label>
            </div>

            {notificationMessage && <p role="status" className="muted" style={{ fontSize: 12, marginBottom: 12 }}>{notificationMessage}</p>}
            {expiryOverview.alerts.length ? (
              <div style={{ display: 'grid', gap: 9 }}>
                {expiryOverview.alerts.map((product) => {
                  const days = getProductDaysLeft(product);
                  const status = days < 0 ? `${Math.abs(days)} day(s) overdue` : days === 0 ? 'Expires today' : `Expires in ${days} day(s)`;
                  return (
                    <div className="expiry-alert-item" key={product.id}>
                      <div>
                        <span className="expiry-alert-product-name">{product.emoji || '📦'} {product.name || 'Unnamed product'}</span>
                        <span className="expiry-alert-product-meta">{product.brand || 'No brand'} · {product.category || 'Other'} · {product.place || product.location || 'Location not set'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="expiry-alert-status" style={{ color: days < 0 ? '#ff8585' : days === 0 ? '#ffcc24' : '#09e7a1', background: days < 0 ? 'rgba(255,91,91,.13)' : days === 0 ? 'rgba(255,204,36,.13)' : 'rgba(9,231,161,.12)' }}>{status}</span>
                        <button type="button" className="icon-btn" title="Edit product" onClick={() => openEditProduct(product)}><MoreVertical size={16} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="inventory-empty-state" style={{ minHeight: 120 }}>
                <CheckCircle2 size={28} />
                <strong>No expiry alerts right now</strong>
                <span>Products expiring today or within the next 7 days will appear here.</span>
              </div>
            )}
          </section>

          <section className="panel" id="settings-section" style={{ display: 'none', marginTop: 20, padding: 22, scrollMarginTop: 22, border: '1px solid rgba(9,231,161,.22)' }}>
            <div className="panel-head">
              <span className="eyebrow">ACCOUNT PREFERENCES</span>
              <h3 style={{ marginTop: 6 }}>Settings</h3>
              <p className="muted" style={{ marginTop: 5, fontSize: 12 }}>Manage your HomeAI profile and notification preferences.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 18 }}>
              <div className="expiry-alert-item" style={{ display: 'block' }}>
                <span className="eyebrow">PROFILE</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                  <div className="avatar" style={{ width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'rgba(9,231,161,.15)', color: '#09e7a1', fontWeight: 800, fontSize: 20 }}>
                    {(user?.name || user?.email || 'U').trim().charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', color: 'var(--text, #effff8)' }}>{user?.name || 'HomeAI User'}</strong>
                    <span className="expiry-alert-product-meta">{user?.email || 'Email not available'}</span>
                  </div>
                </div>
              </div>

              <div className="expiry-alert-item" style={{ display: 'block' }}>
                <span className="eyebrow">NOTIFICATIONS</span>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14, color: 'var(--text, #effff8)', fontSize: 13 }}>
                  <span>Daily expiry reminders</span>
                  <input type="checkbox" checked={reminderEnabled} onChange={(event) => {
                    const enabled = event.target.checked;
                    setReminderEnabled(enabled);
                    localStorage.setItem('homeai-reminders-enabled', String(enabled));
                    setNotificationMessage(enabled ? 'Expiry reminders are enabled.' : 'Expiry reminders are paused.');
                  }} />
                </label>
                <p className="expiry-alert-product-meta" style={{ marginTop: 9 }}>Browser permission: {notificationPermission}</p>
                <button type="button" className="primary small" style={{ marginTop: 12 }} onClick={enableExpiryNotifications}>Manage browser permission</button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.08)' }}>
              <div>
                <strong>Sign out of HomeAI</strong>
                <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>You can sign in again anytime with your account.</p>
              </div>
              <button type="button" className="logout-button" onClick={logout}>Logout</button>
            </div>
          </section>
        </div>
      </main>

      {showDeleteAccountModal && (
        <div
          role="presentation"
          onClick={() => !deleteAccountLoading && setShowDeleteAccountModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000, display: 'grid',
            placeItems: 'center', padding: 20,
            background: 'rgba(0, 8, 6, .78)', backdropFilter: 'blur(9px)',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(100%, 440px)', padding: 26, borderRadius: 22,
              border: '1px solid rgba(255,103,103,.3)',
              background: 'linear-gradient(145deg,#14251f,#091510)',
              boxShadow: '0 28px 90px rgba(0,0,0,.55)',
            }}
          >
            <div style={{
              width: 52, height: 52, display: 'grid', placeItems: 'center',
              borderRadius: 16, color: '#ff8585',
              background: 'rgba(255,103,103,.12)',
              border: '1px solid rgba(255,103,103,.22)', marginBottom: 18,
            }}>
              <AlertTriangle size={25} />
            </div>
            <span className="eyebrow" style={{ color: '#ff8585' }}>PERMANENT ACTION</span>
            <h2 id="delete-account-title" style={{ color: '#f4fff9', fontSize: 23, margin: '8px 0' }}>
              Delete your account?
            </h2>
            <p style={{ color: '#a8bdb2', fontSize: 13, lineHeight: 1.7, margin: '0 0 16px' }}>
              This will permanently delete your HomeAI account and all saved inventory.
              You will not be able to recover this data.
            </p>
            <div style={{
              display: 'flex', gap: 10, padding: 12, borderRadius: 12,
              background: 'rgba(255,103,103,.07)', color: '#ffb0b0',
              fontSize: 11, lineHeight: 1.5, marginBottom: 22,
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>This action cannot be undone.</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="logout-button"
                disabled={deleteAccountLoading}
                onClick={() => setShowDeleteAccountModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-account-button"
                disabled={deleteAccountLoading}
                onClick={handleDeleteAccount}
                style={{ minWidth: 132, padding: '11px 15px' }}
              >
                {deleteAccountLoading ? 'Deleting...' : 'Yes, delete account'}
              </button>
            </div>
          </section>
        </div>
      )}

      {mobileNav && (
        <div
          className="backdrop"
          onClick={() => setMobileNav(false)}
        />
      )}

      {modal && (
        <div
          className="modal-backdrop"
          onClick={() => setModal('')}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setModal('')}
            >
              <X />
            </button>

            {modal === 'lookup' ? (
              <div className="barcode-lookup-loading" role="status" aria-live="polite"
                style={{ minHeight: 280, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14 }}>
                <style>{`
                  @keyframes homeaiLookupSpin {
                    to { transform: rotate(360deg); }
                  }
                  .homeai-lookup-spinner {
                    width: 54px; height: 54px; border-radius: 50%;
                    border: 4px solid rgba(9,231,161,.18);
                    border-top-color: #09e7a1;
                    animation: homeaiLookupSpin .8s linear infinite;
                  }
                `}</style>
                <div className="homeai-lookup-spinner" />
                <h2 style={{ margin: 0 }}>Barcode detected!</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Fetching product details...
                </p>
                <small className="muted">Please wait while HomeAI checks product databases.</small>
              </div>
            ) : modal === 'add' ? (
              <>
                <span className="eyebrow">
                  INVENTORY MANAGEMENT
                </span>

                <h2>Add a product</h2>
                <p className="muted">
                  Keep track of what’s in your home.
                </p>

                {newProduct.imageUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14,
                    margin: '14px 0', padding: 12, borderRadius: 12,
                    background: 'rgba(9,231,161,.07)',
                    border: '1px solid rgba(9,231,161,.2)' }}>
                    <img src={newProduct.imageUrl} alt="Product preview"
                      onError={(event) => { event.currentTarget.style.display = 'none'; }}
                      style={{ width: 84, height: 84, objectFit: 'contain',
                        borderRadius: 9, background: 'rgba(255,255,255,.07)', padding: 5 }} />
                    <div>
                      <b style={{ display: 'block' }}>Product image found</b>
                      <small className="muted">Image will be saved with product details.</small>
                    </div>
                  </div>
                )}

                <form className="add-form" onSubmit={addProduct}>
                  <label>
                    Product name
                    <input
                      required
                      value={newProduct.name}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g. Orange juice"
                    />
                  </label>

                  <label>
                    Brand
                    <input
                      value={newProduct.brand}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          brand: e.target.value,
                        })
                      }
                      placeholder="Brand name"
                    />
                  </label>

                  <div className="form-row">
                    <label>
                      Quantity
                      <input
                        value={newProduct.qty}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            qty: e.target.value,
                          })
                        }
                        placeholder="e.g. 1 litre"
                      />
                    </label>

                    <DatePickerField
                      label="Expiry date"
                      value={newProduct.expiryDate}
                      required
                      onChange={(value) => setNewProduct((prev) => ({ ...prev, expiryDate: value }))}
                    />
                  </div>

                  <div className="form-row">
                    <label>
                      Category
                      <select
                        value={newProduct.category}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            category: e.target.value,
                          })
                        }
                      >
                        <option>Food</option>
                        <option>Dairy</option>
                        <option>Fruits & Vegetables</option>
                        <option>Beverages</option>
                        <option>Personal Care</option>
                      </select>
                    </label>

                    <label>
                      Storage location
                      <select
                        value={newProduct.place}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            place: e.target.value,
                          })
                        }
                      >
                        <option>Kitchen</option>
                        <option>Fridge</option>
                        <option>Freezer</option>
                        <option>Vegetable Rack</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    Product image URL (optional)
                    <input
                      type="url"
                      value={newProduct.imageUrl || ''}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, imageUrl: e.target.value })
                      }
                      placeholder="Image is filled automatically after barcode scan"
                    />
                  </label>

                  <label>
                    Barcode (optional)
                    <input
                      value={newProduct.barcode}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          barcode: e.target.value,
                        })
                      }
                      placeholder="Scanned barcode"
                    />
                  </label>

                  <button className="primary full" type="submit">
                    Save to Inventory <ArrowRight size={16} />
                  </button>
                </form>
              </>
            ) : modal === 'edit' && editForm ? (
              <>
                <span className="eyebrow">INVENTORY MANAGEMENT</span>
                <h2>Edit product</h2>
                <p className="muted">Update product information and expiry date.</p>
                <form className="add-form" onSubmit={saveProductUpdate}>
                  <label>Product name
                    <input required value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </label>
                  <label>Brand
                    <input value={editForm.brand}
                      onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })} />
                  </label>
                  <div className="form-row">
                    <label>Quantity
                      <input value={editForm.qty}
                        onChange={(e) => setEditForm({ ...editForm, qty: e.target.value })} />
                    </label>
                    <DatePickerField
                      label="Expiry date"
                      value={editForm.expiryDate}
                      required
                      onChange={(value) => setEditForm({ ...editForm, expiryDate: value })}
                    />
                  </div>
                  <div className="form-row">
                    <label>Category
                      <select value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                        <option>Food</option><option>Dairy</option>
                        <option>Fruits & Vegetables</option><option>Beverages</option>
                        <option>Personal Care</option>
                      </select>
                    </label>
                    <label>Storage location
                      <select value={editForm.place}
                        onChange={(e) => setEditForm({ ...editForm, place: e.target.value })}>
                        <option>Kitchen</option><option>Fridge</option>
                        <option>Freezer</option><option>Vegetable Rack</option>
                        <option>Refrigerator</option>
                      </select>
                    </label>
                  </div>
                  <label>Product image URL (optional)
                    <input
                      type="url"
                      value={editForm.imageUrl || ''}
                      onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                      placeholder="https://example.com/product-image.jpg"
                    />
                  </label>
                  <label>Barcode (optional)
                    <input
                      value={editForm.barcode || ''}
                      onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                      placeholder="Enter or scan barcode"
                    />
                  </label>
                  <button className="primary full" type="submit">
                    Update Product <CheckCircle2 size={16} />
                  </button>
                </form>
              </>
            ) : modal === 'scan' ? (
              <BarcodeScanner
                onDetected={handleBarcodeDetected}
                onClose={() => setModal('')}
              />
            ) : (
              <>
                <h2>HomeAI Premium</h2>

                <p className="muted">
                  Unlock more inventory capacity and advanced AI insights.
                </p>

                <button
                  className="primary full"
                  onClick={() => setModal('')}
                >
                  Got it
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


function DatePickerField({ label, value, onChange, required = false }) {
  const inputRef = useRef(null);
  const formattedValue = value
    ? (() => {
        const [year, month, day] = value.split('-');
        return `${day}-${month}-${year}`;
      })()
    : '';

  const openCalendar = (event) => {
    event?.preventDefault?.();
    const input = inputRef.current;
    if (!input) return;

    // showPicker works in Chromium-based browsers when called from a user click.
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
    } catch (error) {
      console.warn('Native date picker could not be opened with showPicker:', error);
    }

    // Fallback: focus and click the real date input.
    input.focus();
    input.click();
  };

  return (
    <div className="date-picker-field">
      <span className="date-picker-label">{label}</span>
      <div className="date-picker-control">
        <input
          className="date-picker-display"
          type="text"
          value={formattedValue}
          placeholder="dd-mm-yyyy"
          readOnly
          aria-label={`${label}, format day-month-year`}
        />
        <input
          ref={inputRef}
          className="date-picker-native"
          type="date"
          value={value || ''}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          onClick={openCalendar}
          aria-label={`Choose ${label.toLowerCase()}`}
        />
        <button
          className="date-picker-open-button"
          type="button"
          onClick={openCalendar}
          aria-label={`Open ${label.toLowerCase()} calendar`}
        >
          <CalendarDays size={18} />
        </button>
      </div>
    </div>
  );
}

function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const streamRef = useRef(null);
  const detectedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const mountedRef = useRef(false);

  const [scannerStatus, setScannerStatus] = useState('Starting camera...');
  const [scannerError, setScannerError] = useState('');
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let cancelled = false;
    mountedRef.current = true;
    detectedRef.current = false;
    setScannerError('');
    setTorchSupported(false);
    setTorchOn(false);
    setScannerStatus('Requesting camera access...');

    // Use ZXing's supported constructor signature and scan all supported formats.
    // The second argument is the delay between unsuccessful decode attempts (ms).
    const reader = new BrowserMultiFormatReader(undefined, 250);

    const stopActiveCamera = () => {
      try {
        controlsRef.current?.stop();
      } catch (error) {
        console.warn('Scanner stop warning:', error);
      }
      controlsRef.current = null;

      const stream = streamRef.current || videoRef.current?.srcObject;
      if (stream?.getTracks) {
        stream.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const startScanner = async () => {
      try {
        stopActiveCamera();

        const constraints = {
          audio: false,
          video: {
            ...(selectedDeviceId
              ? { deviceId: { exact: selectedDeviceId } }
              : { facingMode: { ideal: 'environment' } }),
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          return;
        }

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();

        // Request continuous autofocus where the camera supports it.
        const videoTrack = stream.getVideoTracks()[0];
        try {
          const cameraCapabilities = videoTrack?.getCapabilities?.();
          if (cameraCapabilities?.focusMode?.includes('continuous')) {
            await videoTrack.applyConstraints({
              advanced: [{ focusMode: 'continuous' }],
            });
          }
        } catch (focusError) {
          console.warn('Continuous autofocus unavailable:', focusError);
        }

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        // Start ZXing on the already-open stream. This avoids opening a second camera.
        const controls = await reader.decodeFromStream(
          stream,
          video,
          (result) => {
            if (!result || detectedRef.current || cancelled) return;

            detectedRef.current = true;
            const scannedValue = result.getText();
            setScannerStatus('Barcode detected. Looking up product...');
            if (navigator.vibrate) navigator.vibrate(100);

            try {
              controlsRef.current?.stop();
            } catch (error) {
              console.warn('Could not stop scanner after detection:', error);
            }

            stream.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            if (videoRef.current) videoRef.current.srcObject = null;

            onDetectedRef.current?.(scannedValue);
          }
        );

        if (cancelled) {
          controls?.stop();
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        controlsRef.current = controls;

        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;

        const videoInputs = devices.filter((device) => device.kind === 'videoinput');
        setCameraDevices(videoInputs);

        const track = stream.getVideoTracks()[0];
        const capabilities = track?.getCapabilities?.();
        setTorchSupported(Boolean(capabilities?.torch));
        setScannerStatus('Camera active. Align a barcode or QR code inside the frame.');
      } catch (error) {
        console.error('Barcode camera error:', error);
        if (cancelled) return;

        let message = 'Could not start the camera. Check permissions and try again.';
        if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
          message = 'Camera permission denied. Allow camera access in your browser settings.';
        } else if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
          message = 'No camera was found on this device.';
        } else if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
          message = 'Camera is already being used by another application.';
        } else if (error?.name === 'OverconstrainedError') {
          message = 'Selected camera is unavailable. Choose another camera.';
        } else if (!window.isSecureContext) {
          message = 'Camera access requires HTTPS or localhost.';
        }
        setScannerError(message);
        setScannerStatus('Camera unavailable');
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      stopActiveCamera();
    };
  }, [selectedDeviceId]);

  const handleTorch = async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track || !torchSupported) return;

    try {
      const nextState = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: nextState }] });
      setTorchOn(nextState);
      setScannerError('');
    } catch (error) {
      console.error('Torch error:', error);
      setScannerError('Flashlight could not be changed on this camera.');
    }
  };

  const handleCameraChange = (event) => {
    const nextDeviceId = event.target.value;
    if (!nextDeviceId || nextDeviceId === selectedDeviceId) return;
    setIsSwitchingCamera(true);
    setTorchOn(false);
    setTorchSupported(false);
    setScannerStatus('Switching camera...');
    setSelectedDeviceId(nextDeviceId);
    window.setTimeout(() => setIsSwitchingCamera(false), 900);
  };

  return (
    <div className="barcode-scanner">
      <div className="modal-scan-icon">
        <ScanLine size={42} />
      </div>

      <h2>Smart Product Scanner</h2>
      <p className="muted">
        Scan product barcodes or QR codes. Keep the code steady, inside the frame,
        and well lit.
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '12px 0' }}>
        {cameraDevices.length > 1 && (
          <select
            aria-label="Choose camera"
            value={selectedDeviceId}
            onChange={handleCameraChange}
            disabled={isSwitchingCamera}
            style={{ flex: 1, minWidth: 0, padding: 10, borderRadius: 8 }}
          >
            <option value="" disabled>Select camera</option>
            {cameraDevices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={handleTorch}
          disabled={!torchSupported}
          title={torchSupported ? 'Toggle flashlight' : 'Flashlight unavailable'}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid rgba(9,231,161,.35)',
            background: torchOn ? '#09e7a1' : '#12352d',
            color: torchOn ? '#06231a' : '#f5fff9',
            cursor: torchSupported ? 'pointer' : 'not-allowed',
            opacity: torchSupported ? 1 : 0.55,
          }}
        >
          {torchOn ? 'Flash On' : 'Flash'}
        </button>
      </div>

      <div style={{
        position: 'relative', overflow: 'hidden', width: '100%', minHeight: 240,
        borderRadius: 14, background: '#061713', border: '1px solid rgba(9,231,161,.35)',
      }}>
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          style={{ display: 'block', width: '100%', minHeight: 240, objectFit: 'cover' }}
        />

        <div style={{
          position: 'absolute', left: '8%', right: '8%', top: '35%', height: '30%',
          border: '2px solid #09e7a1', borderRadius: 10,
          boxShadow: '0 0 0 999px rgba(0,0,0,.22)', pointerEvents: 'none',
        }} />

        <span style={{
          position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center',
          color: '#fff', fontSize: 11, textShadow: '0 1px 4px #000',
        }}>
          Barcode / QR scanning enabled
        </span>
      </div>

      <p role="status" style={{
        margin: '12px 0', color: scannerError ? '#ff7777' : '#09e7a1', fontSize: 13,
      }}>
        {scannerError || scannerStatus}
      </p>

      <p className="muted" style={{ fontSize: 11 }}>
        Supports common retail barcodes and QR codes. Flashlight availability depends
        on your camera and browser.
      </p>

      <button type="button" className="primary full" onClick={onClose}>
        Close Scanner
      </button>
    </div>
  );
}

function Stat({ color, icon, label, value, note, onClick }) {
  return (
    <button
      type="button"
      className={`stat-card ${color}`}
      onClick={onClick}
      aria-label={`${label}: ${value}. ${note}. Open related products.`}
      style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <span>{label}</span>
        <b>{value}</b>
        <small>{note}</small>
      </div>
      <div className="stat-bars" aria-hidden="true">
        <i /><i /><i /><i />
      </div>
    </button>
  );
}

function ProductCard({ product: p, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const productImage = p.imageUrl || p.image || '';
  const daysLeft = Number.isFinite(Number(p.daysLeft))
    ? Number(p.daysLeft)
    : Number(p.days);
  const statusColor = daysLeft < 0 ? '#ff6b6b' : daysLeft <= 7 ? '#ffcc24' : '#09e7a1';

  return (
    <div className="product-card" style={{ position: 'relative' }}>
      <div className="product-menu" style={{ position: 'absolute', top: 10, right: 10, zIndex: 5 }}>
        <button type="button" title="Product options" aria-label={`Options for ${p.name}`}
          onClick={() => setMenuOpen((open) => !open)}>
          <MoreVertical size={17} />
        </button>
        {menuOpen && (
          <div style={{ position: 'absolute', top: '100%', right: 0, minWidth: 135,
            padding: 6, borderRadius: 10, background: '#102b25',
            border: '1px solid rgba(9,231,161,.28)', boxShadow: '0 12px 30px rgba(0,0,0,.35)',
            display: 'grid', gap: 4 }}>
            <button type="button" onClick={() => { setMenuOpen(false); onEdit(); }}
              style={{ width: '100%', padding: '9px 10px', border: 0, borderRadius: 7,
                background: 'transparent', color: '#f5fff9', textAlign: 'left', cursor: 'pointer' }}>
              Edit product
            </button>
            <button type="button" onClick={() => { setMenuOpen(false); onDelete(); }}
              style={{ width: '100%', padding: '9px 10px', border: 0, borderRadius: 7,
                background: 'rgba(255,80,80,.10)', color: '#ff7777', textAlign: 'left', cursor: 'pointer' }}>
              Delete product
            </button>
          </div>
        )}
      </div>

      <div className="product-main">
        {productImage && !imageFailed ? (
          <img
            src={productImage}
            alt={p.name ? `${p.name} product` : 'Product'}
            loading="lazy"
            onError={() => setImageFailed(true)}
            style={{
              width: 76,
              height: 76,
              flex: '0 0 76px',
              objectFit: 'contain',
              borderRadius: 12,
              padding: 5,
              background: 'rgba(255,255,255,.06)',
            }}
          />
        ) : (
          <div className="product-emoji">{p.emoji || '📦'}</div>
        )}
        <div className="product-info">
          <b>{p.name}</b>
          <span>{p.brand || 'Brand not specified'}</span>
          <strong style={{ display: 'inline-flex', width: 'fit-content', maxWidth: '100%',
            height: 'auto', minHeight: 0, alignItems: 'center', padding: '6px 10px',
            marginTop: 8, borderRadius: 8, background: `${statusColor}22`,
            color: statusColor, fontSize: 12, lineHeight: 1.35, fontWeight: 800,
            whiteSpace: 'normal' }}>
            {!p.expiryDate && !Number.isFinite(daysLeft)
              ? 'Expiry date not set'
              : daysLeft < 0
                ? `${Math.abs(daysLeft)} day(s) overdue`
                : daysLeft === 0 ? 'Expires today' : `${daysLeft} day(s) left`}
          </strong>
          <small className="product-expiry-date" style={{ display: 'block', marginTop: 5 }}>
            Expires: {p.expiryDate ? formatExpiryDate(p.expiryDate) : 'Expiry date not set'}
          </small>
        </div>
      </div>
      <div className="product-meta">
        <span><Package size={14} />{p.qty || p.quantity || '1 unit'}</span>
        <span><MapPin size={14} />{p.place || p.location || 'Kitchen'}</span>
      </div>
    </div>
  );
}

function Calendar({ month, products = [] }) {
  const today = new Date();
  const year = today.getFullYear() + Math.floor(month / 12);
  const normalizedMonth = ((month % 12) + 12) % 12;
  const first = new Date(year, normalizedMonth, 1).getDay();
  const days = new Date(year, normalizedMonth + 1, 0).getDate();
  const [selectedDay, setSelectedDay] = useState(null);

  // Build calendar events from the products fetched for the signed-in user.
  // `days` is mapped from the database's `daysLeft` field in src/api.js.
  const expiryByDay = useMemo(() => {
    const grouped = {};

    products.forEach((product) => {
      const daysLeft = getProductDaysLeft(product);

      if (daysLeft === null) return;

      const expiryDate = product.expiryDate
        ? new Date(product.expiryDate)
        : new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() + daysLeft
          );

      if (Number.isNaN(expiryDate.getTime())) return;

      if (
        expiryDate.getFullYear() !== year ||
        expiryDate.getMonth() !== normalizedMonth
      ) {
        return;
      }

      const calendarDaysLeft = Math.ceil(
        (new Date(year, normalizedMonth, expiryDate.getDate()).getTime() -
          new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const day = expiryDate.getDate();
      const status =
        calendarDaysLeft < 0
          ? 'expired-day'
          : calendarDaysLeft <= 7
            ? 'soon-day'
            : 'normal-day';

      if (!grouped[day]) {
        grouped[day] = { status, items: [] };
      }

      grouped[day].items.push({
        id: product.id,
        name: product.name || 'Unnamed product',
        brand: product.brand || 'Brand not specified',
        category: product.category || 'Other',
        quantity: product.qty || product.quantity || 'Not specified',
        location: product.place || product.location || 'Not specified',
        daysLeft: calendarDaysLeft,
        status,
      });

      const priority = {
        'expired-day': 3,
        'soon-day': 2,
        'normal-day': 1,
      };

      if (priority[status] > priority[grouped[day].status]) {
        grouped[day].status = status;
      }
    });

    return grouped;
  }, [products, year, normalizedMonth]);

  const selectedItems = selectedDay ? expiryByDay[selectedDay]?.items || [] : [];

  const formatExpiryDate = (day) =>
    new Date(year, normalizedMonth, day).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return (
    <div className="calendar">
      <style>{`
        .calendar .days .calendar-date {
          position: relative;
          cursor: default;
          outline-offset: 2px;
        }

        .calendar .days .calendar-date.has-expiry {
          cursor: pointer;
        }

        .calendar .days .calendar-date.selected-date {
          outline: 2px solid #f5fff9;
          outline-offset: 2px;
        }

        .calendar .expiry-details-panel {
          margin-top: 14px;
          padding: 13px;
          border: 1px solid rgba(9, 231, 161, 0.28);
          border-radius: 12px;
          background: rgba(3, 25, 19, 0.96);
          color: #f5fff9;
          text-align: left;
        }

        .calendar .expiry-details-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          color: #09e7a1;
          font-size: 13px;
          font-weight: 800;
        }

        .calendar .expiry-details-heading small {
          color: #9bb8aa;
          font-size: 11px;
          font-weight: 500;
        }

        .calendar .expiry-product-list {
          display: grid;
          gap: 8px;
        }

        .calendar .expiry-product-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          padding: 10px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .calendar .expiry-product-name {
          display: block;
          color: #f5fff9;
          font-size: 12px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .calendar .expiry-product-meta {
          display: block;
          margin-top: 4px;
          color: #9bb8aa;
          font-size: 10px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .calendar .expiry-product-status {
          max-width: 125px;
          padding: 6px 8px;
          border-radius: 7px;
          background: rgba(255, 204, 36, 0.14);
          color: #ffcc24;
          font-size: 10px;
          font-weight: 800;
          text-align: center;
        }

        .calendar .expiry-product-status.expired {
          background: rgba(255, 80, 80, 0.15);
          color: #ff7777;
        }

        .calendar .expiry-product-status.normal {
          background: rgba(9, 231, 161, 0.13);
          color: #09e7a1;
        }

        .calendar .expiry-empty {
          color: #9bb8aa;
          font-size: 11px;
          line-height: 1.5;
        }

        .calendar .expiry-close {
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 7px;
          padding: 4px 8px;
          background: transparent;
          color: #d9eee4;
          cursor: pointer;
          font-size: 11px;
        }

        @media (max-width: 480px) {
          .calendar .expiry-product-item {
            grid-template-columns: 1fr;
          }

          .calendar .expiry-product-status {
            justify-self: start;
          }
        }
      `}</style>

      <div className="weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="days">
        {Array.from({ length: first }, (_, i) => (
          <i key={`e${i}`} />
        ))}

        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const expiry = expiryByDay[day];
          const hasItems = Boolean(expiry?.items?.length);

          return (
            <span
              key={day}
              role={hasItems ? 'button' : undefined}
              tabIndex={hasItems ? 0 : undefined}
              className={`calendar-date ${expiry?.status || ''} ${
                hasItems ? 'has-expiry' : ''
              } ${selectedDay === day ? 'selected-date' : ''}`}
              aria-label={
                hasItems
                  ? `${formatExpiryDate(day)}, ${expiry.items.length} product(s). Select to view details.`
                  : String(day)
              }
              onMouseEnter={() => {
                if (hasItems) setSelectedDay(day);
              }}
              onFocus={() => {
                if (hasItems) setSelectedDay(day);
              }}
              onClick={() => {
                if (hasItems) {
                  setSelectedDay((current) => (current === day ? null : day));
                }
              }}
              onKeyDown={(event) => {
                if (hasItems && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  setSelectedDay((current) => (current === day ? null : day));
                }
              }}
            >
              {day}
            </span>
          );
        })}
      </div>

      {selectedDay && (
        <section className="expiry-details-panel" aria-live="polite">
          <div className="expiry-details-heading">
            <div>
              Product details
              <small style={{ display: 'block', marginTop: 3 }}>
                {formatExpiryDate(selectedDay)}
              </small>
            </div>

            <button
              type="button"
              className="expiry-close"
              onClick={() => setSelectedDay(null)}
            >
              Close
            </button>
          </div>

          {selectedItems.length > 0 ? (
            <div className="expiry-product-list">
              {selectedItems.map((item, index) => {
                const statusClass =
                  item.daysLeft < 0
                    ? 'expired'
                    : item.daysLeft <= 7
                      ? ''
                      : 'normal';

                const statusText =
                  item.daysLeft < 0
                    ? `${Math.abs(item.daysLeft)} day(s) overdue`
                    : item.daysLeft === 0
                      ? 'Expires today'
                      : `${item.daysLeft} day(s) left`;

                return (
                  <div
                    className="expiry-product-item"
                    key={item.id ?? `${item.name}-${index}`}
                  >
                    <div>
                      <span className="expiry-product-name">{item.name}</span>
                      <span className="expiry-product-meta">
                        {item.brand} · {item.category}
                        <br />
                        Qty: {item.quantity} · Location: {item.location}
                      </span>
                    </div>

                    <span className={`expiry-product-status ${statusClass}`}>
                      {statusText}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="expiry-empty">
              No product expiry is recorded for this date.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <span>Loading HomeAI...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <Dashboard />;
}

export default App;