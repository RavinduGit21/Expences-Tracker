import React, { useEffect, useMemo, useState } from 'react';

const sriLankanBanks = [
  { id: 'hnb', name: 'Hatton National Bank', shortName: 'HNB', color: '#f59e0b', accent: '#111827' },
  { id: 'combank', name: 'Commercial Bank of Ceylon', shortName: 'COM', color: '#facc15', accent: '#0f3b7a' },
  { id: 'sampath', name: 'Sampath Bank', shortName: 'SAM', color: '#dc2626', accent: '#facc15' },
  { id: 'peoples', name: "People's Bank", shortName: 'PB', color: '#7c2d12', accent: '#facc15' },
  { id: 'boc', name: 'Bank of Ceylon', shortName: 'BOC', color: '#f97316', accent: '#1e3a8a' },
  { id: 'ntb', name: 'Nations Trust Bank / Amex', shortName: 'NTB', color: '#2563eb', accent: '#ef4444' },
  { id: 'dfcc', name: 'DFCC Bank', shortName: 'DFCC', color: '#16a34a', accent: '#dc2626' },
  { id: 'seylan', name: 'Seylan Bank', shortName: 'SEY', color: '#0f766e', accent: '#facc15' },
  { id: 'ndb', name: 'NDB Bank', shortName: 'NDB', color: '#1e40af', accent: '#facc15' },
  { id: 'panasia', name: 'Pan Asia Banking Corporation', shortName: 'PAN', color: '#7c3aed', accent: '#f97316' }
];

const fallbackData = {
  settings: {
    onboarded: false,
    currency: 'LKR',
    monthlyBudget: 0,
    salary: 0,
    categories: ['Fuel', 'Meals', 'Groceries', 'Bills', 'Transport', 'Shopping', 'Health', 'Other'],
    cards: [
      { id: 'card_cash', name: 'Cash', bankId: 'cash', logoText: 'CASH', color: '#334155', accent: '#94a3b8', openingBalance: 0, limit: 0 }
    ]
  },
  expenses: [],
  incomes: []
};

const quickCategories = ['Fuel', 'Meals', 'Groceries', 'Bills'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

function money(value, currency = 'LKR') {
  const amount = Number(value || 0);
  if (currency === 'LKR') {
    return 'Rs ' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function monthName(month) {
  const [year, rawMonth] = month.split('-').map(Number);
  return new Date(year, rawMonth - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function sameMonth(date, month) {
  return String(date || '').startsWith(month);
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeData(data) {
  const rawSettings = data?.settings || {};
  const rawCards = rawSettings.cards?.length ? rawSettings.cards : fallbackData.settings.cards;
  const cards = rawCards.map((card, index) => {
    const bank = sriLankanBanks.find((item) => item.id === card.bankId);
    return {
      bankId: card.bankId || 'custom',
      logoText: card.logoText || bank?.shortName || card.name?.slice(0, 4)?.toUpperCase() || 'CARD',
      color: card.color || bank?.color || fallbackData.settings.cards[index]?.color || '#2563eb',
      accent: card.accent || bank?.accent || '#ffffff',
      openingBalance: Number(card.openingBalance || card.balance || 0),
      limit: Number(card.limit || 0),
      ...card
    };
  });
  return {
    ...fallbackData,
    ...data,
    settings: {
      ...fallbackData.settings,
      ...rawSettings,
      categories: rawSettings.categories?.length ? rawSettings.categories : fallbackData.settings.categories,
      cards
    },
    expenses: Array.isArray(data?.expenses) ? data.expenses : [],
    incomes: Array.isArray(data?.incomes) ? data.incomes : []
  };
}

export default function App() {
  const [data, setData] = useState(fallbackData);
  const [loaded, setLoaded] = useState(false);
  const [month, setMonth] = useState(thisMonth());
  const [search, setSearch] = useState('');
  const [cardFilter, setCardFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [entry, setEntry] = useState({
    amount: '',
    date: today(),
    category: 'Fuel',
    cardId: 'card_cash',
    note: '',
    type: 'expense'
  });
  const [editingId, setEditingId] = useState(null);
  const [newCard, setNewCard] = useState({ name: '', limit: '', openingBalance: '', color: '#0f766e' });
  const [newCategory, setNewCategory] = useState('');
  const [dataPath, setDataPath] = useState('');
  const [updateState, setUpdateState] = useState({ status: 'idle' });
  const [setupCards, setSetupCards] = useState(() => [
    { selected: true, bankId: 'cash', name: 'Cash', logoText: 'CASH', color: '#334155', accent: '#94a3b8', openingBalance: '' }
  ]);

  const { settings, expenses, incomes } = data;

  useEffect(() => {
    async function load() {
      let stored = null;
      if (window.expenseStore) {
        stored = await window.expenseStore.load();
        setDataPath(await window.expenseStore.path());
      } else {
        stored = JSON.parse(localStorage.getItem('card_expense_tracker') || 'null');
      }
      setData(normalizeData(stored));
      setLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!window.appUpdates?.onStatus) return undefined;
    return window.appUpdates.onStatus((payload) => setUpdateState(payload));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const normalized = normalizeData(data);
    if (window.expenseStore) {
      window.expenseStore.save(normalized);
    } else {
      localStorage.setItem('card_expense_tracker', JSON.stringify(normalized));
    }
  }, [data, loaded]);

  useEffect(() => {
    if (!settings.cards.length) return;
    if (!settings.cards.some((card) => card.id === entry.cardId)) {
      setEntry((current) => ({ ...current, cardId: settings.cards[0].id }));
    }
  }, [settings.cards, entry.cardId]);

  const monthExpenses = useMemo(() => expenses.filter((item) => sameMonth(item.date, month)), [expenses, month]);
  const monthIncomes = useMemo(() => incomes.filter((item) => sameMonth(item.date, month)), [incomes, month]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const combined = [
      ...monthExpenses.map((item) => ({ ...item, type: 'expense' })),
      ...monthIncomes.map((item) => ({ ...item, type: 'income' }))
    ];
    return combined
      .filter((item) => cardFilter === 'all' || item.cardId === cardFilter)
      .filter((item) => item.type === 'income' || categoryFilter === 'all' || item.category === categoryFilter)
      .filter((item) => {
        if (!query) return true;
        return [item.note, item.category, item.type, findCard(settings.cards, item.cardId)?.name].join(' ').toLowerCase().includes(query);
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [monthExpenses, monthIncomes, cardFilter, categoryFilter, search, settings.cards]);

  const totals = useMemo(() => {
    const spent = monthExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const income = monthIncomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const byCard = settings.cards.map((card) => ({
      ...card,
      total: monthExpenses.filter((item) => item.cardId === card.id).reduce((sum, item) => sum + Number(item.amount || 0), 0),
      income: monthIncomes.filter((item) => item.cardId === card.id).reduce((sum, item) => sum + Number(item.amount || 0), 0),
      lifetimeExpense: expenses.filter((item) => item.cardId === card.id).reduce((sum, item) => sum + Number(item.amount || 0), 0),
      lifetimeIncome: incomes.filter((item) => item.cardId === card.id).reduce((sum, item) => sum + Number(item.amount || 0), 0)
    }));
    byCard.forEach((card) => {
      card.balance = Number(card.openingBalance || 0) + card.lifetimeIncome - card.lifetimeExpense;
    });
    const byCategory = settings.categories.map((category) => ({
      category,
      total: monthExpenses.filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.amount || 0), 0)
    })).filter((item) => item.total > 0);
    const cardBalance = byCard.reduce((sum, card) => sum + card.balance, 0);
    return { spent, income, balance: cardBalance, byCard, byCategory };
  }, [monthExpenses, monthIncomes, expenses, incomes, settings]);

  function updateData(updater) {
    setData((current) => normalizeData(typeof updater === 'function' ? updater(current) : updater));
  }

  function submitEntry(event) {
    event.preventDefault();
    const amount = Number(entry.amount);
    if (!amount || amount <= 0) return;
    const item = {
      id: editingId || uid(entry.type === 'income' ? 'inc' : 'exp'),
      amount,
      date: entry.date || today(),
      category: entry.category || 'Other',
      cardId: entry.cardId,
      note: entry.note.trim()
    };
    updateData((current) => {
      let nextExpenses = current.expenses;
      let nextIncomes = current.incomes;

      if (editingId) {
        nextExpenses = nextExpenses.filter(i => i.id !== editingId);
        nextIncomes = nextIncomes.filter(i => i.id !== editingId);
      }

      if (entry.type === 'expense') {
        nextExpenses = [item, ...nextExpenses].sort((a, b) => b.date.localeCompare(a.date));
      } else {
        nextIncomes = [item, ...nextIncomes].sort((a, b) => b.date.localeCompare(a.date));
      }

      return {
        ...current,
        expenses: nextExpenses,
        incomes: nextIncomes
      };
    });
    setEntry((current) => ({ ...current, amount: '', note: '', type: 'expense' }));
    setEditingId(null);
  }

  function editTransaction(item) {
    setEditingId(item.id);
    setEntry({
      amount: String(item.amount),
      date: item.date,
      category: item.category,
      cardId: item.cardId,
      note: item.note,
      type: item.type
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setEntry((current) => ({ ...current, amount: '', note: '', type: 'expense' }));
  }

  function deleteTransaction(type, id) {
    updateData((current) => ({
      ...current,
      expenses: type === 'expense' ? current.expenses.filter((item) => item.id !== id) : current.expenses,
      incomes: type === 'income' ? current.incomes.filter((item) => item.id !== id) : current.incomes
    }));
  }

  function duplicateTransaction(item) {
    const { type, ...copy } = item;
    updateData((current) => ({
      ...current,
      expenses: type === 'expense' ? [{ ...copy, id: uid('exp'), date: today() }, ...current.expenses] : current.expenses,
      incomes: type === 'income' ? [{ ...copy, id: uid('inc'), date: today() }, ...current.incomes] : current.incomes
    }));
  }

  function addCard() {
    if (!newCard.name.trim()) return;
    updateData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        cards: [...current.settings.cards, {
          id: uid('card'),
          bankId: 'custom',
          logoText: newCard.name.trim().slice(0, 4).toUpperCase(),
          name: newCard.name.trim(),
          color: newCard.color,
          accent: '#ffffff',
          openingBalance: Number(newCard.openingBalance || 0),
          limit: Number(newCard.limit || 0)
        }]
      }
    }));
    setNewCard({ name: '', limit: '', openingBalance: '', color: '#0f766e' });
  }

  function removeCard(id) {
    if (settings.cards.length <= 1) return;
    updateData((current) => ({
      ...current,
      settings: { ...current.settings, cards: current.settings.cards.filter((card) => card.id !== id) },
      expenses: current.expenses.map((item) => item.cardId === id ? { ...item, cardId: current.settings.cards.find((card) => card.id !== id)?.id } : item),
      incomes: current.incomes.map((item) => item.cardId === id ? { ...item, cardId: current.settings.cards.find((card) => card.id !== id)?.id } : item)
    }));
    if (entry.cardId === id) {
      setEntry((current) => ({ ...current, cardId: settings.cards.find((card) => card.id !== id)?.id || current.cardId }));
    }
  }

  function toggleSetupBank(bank) {
    setSetupCards((current) => {
      const exists = current.some((item) => item.bankId === bank.id);
      if (exists) return current.filter((item) => item.bankId !== bank.id);
      return [...current, {
        selected: true,
        bankId: bank.id,
        name: bank.name,
        logoText: bank.shortName,
        color: bank.color,
        accent: bank.accent,
        openingBalance: ''
      }];
    });
  }

  function updateSetupBalance(bankId, value) {
    setSetupCards((current) => current.map((item) => item.bankId === bankId ? { ...item, openingBalance: value } : item));
  }

  function updateSetupName(bankId, value) {
    setSetupCards((current) => current.map((item) => item.bankId === bankId ? { ...item, name: value } : item));
  }

  function removeSetupCard(bankId) {
    setSetupCards((current) => current.length <= 1 ? current : current.filter((item) => item.bankId !== bankId));
  }

  function finishSetup() {
    const cards = setupCards.map((item) => ({
      id: uid('card'),
      bankId: item.bankId,
      logoText: item.logoText,
      name: item.name,
      color: item.color,
      accent: item.accent,
      openingBalance: Number(item.openingBalance || 0),
      limit: 0
    }));
    const finalCards = cards.length ? cards : fallbackData.settings.cards;
    updateData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        onboarded: true,
        cards: finalCards
      }
    }));
    setEntry((current) => ({ ...current, cardId: finalCards[0].id }));
  }

  function addCategory() {
    const name = newCategory.trim();
    if (!name || settings.categories.includes(name)) return;
    updateData((current) => ({ ...current, settings: { ...current.settings, categories: [...current.settings.categories, name] } }));
    setNewCategory('');
  }

  function exportCsv() {
    const rows = [
      ['Date', 'Type', 'Card', 'Category', 'Note', 'Amount'],
      ...filteredTransactions.map((item) => [item.date, item.type, findCard(settings.cards, item.cardId)?.name || '', item.category || '', item.note, item.amount]),
      [],
      ['Month expense total', '', '', '', '', totals.spent]
    ];
    const content = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const payload = {
      content,
      defaultName: `expenses-${month}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    };
    if (window.expenseStore) window.expenseStore.exportFile(payload);
    else downloadBrowserFile(payload.defaultName, content, 'text/csv');
  }

  function exportBackup() {
    const content = JSON.stringify(normalizeData(data), null, 2);
    const payload = {
      content,
      defaultName: `expense-backup-${today()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    };
    if (window.expenseStore) window.expenseStore.exportFile(payload);
    else downloadBrowserFile(payload.defaultName, content, 'application/json');
  }

  async function checkUpdates() {
    if (!window.appUpdates) {
      setUpdateState({ status: 'disabled', message: 'Updates work only in the desktop app.' });
      return;
    }
    setUpdateState({ status: 'checking' });
    await window.appUpdates.check();
  }

  async function downloadUpdate() {
    if (!window.appUpdates) return;
    setUpdateState({ status: 'downloading', percent: 0 });
    await window.appUpdates.download();
  }

  function installUpdate() {
    window.appUpdates?.install();
  }

  if (!loaded) return <div className="loading">Loading your tracker...</div>;

  if (!settings.onboarded) {
    return (
      <Onboarding
        setupCards={setupCards}
        banks={sriLankanBanks}
        currency={settings.currency}
        onToggleBank={toggleSetupBank}
        onUpdateBalance={updateSetupBalance}
        onUpdateName={updateSetupName}
        onRemoveCard={removeSetupCard}
        onCurrencyChange={(currency) => updateData((current) => ({ ...current, settings: { ...current.settings, currency: currency.toUpperCase() } }))}
        onFinish={finishSetup}
      />
    );
  }

  const budgetUsed = settings.monthlyBudget ? Math.min(100, (totals.spent / Number(settings.monthlyBudget)) * 100) : 0;
  const largestCard = Math.max(1, ...totals.byCard.map((card) => Math.max(card.total, Math.abs(card.balance))));
  const largestCategory = Math.max(1, ...totals.byCategory.map((item) => item.total));

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Offline Windows desktop tracker</p>
          <h1>Card Expense Tracker</h1>
        </div>
        <div className="topbar-actions">
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Report month" />
          <UpdateControl state={updateState} onCheck={checkUpdates} onDownload={downloadUpdate} onInstall={installUpdate} />
          <button type="button" onClick={exportCsv}>Export CSV</button>
          <button type="button" onClick={exportBackup}>Backup</button>
        </div>
      </header>

      <main className="dashboard">
        <section className="entry-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">{editingId ? 'Edit entry' : 'Fast entry'}</p>
              <h2>{editingId ? 'Update transaction' : 'Add expense'}</h2>
            </div>
            <div className="segmented">
              <button type="button" className={entry.type === 'expense' ? 'active' : ''} onClick={() => setEntry({ ...entry, type: 'expense' })}>Expense</button>
              <button type="button" className={entry.type === 'income' ? 'active' : ''} onClick={() => setEntry({ ...entry, type: 'income' })}>Income</button>
            </div>
          </div>

          <form className="expense-form" onSubmit={submitEntry}>
            <label className="amount-field">
              <span>Amount</span>
              <input autoFocus inputMode="decimal" value={entry.amount} onChange={(event) => setEntry({ ...entry, amount: event.target.value })} placeholder="0.00" />
            </label>
            <label>
              <span>Card</span>
              <select value={entry.cardId} onChange={(event) => setEntry({ ...entry, cardId: event.target.value })}>
                {settings.cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
              </select>
            </label>
            <label>
              <span>Date</span>
              <input type="date" value={entry.date} onChange={(event) => setEntry({ ...entry, date: event.target.value })} />
            </label>
            <label>
              <span>Category</span>
              <select value={entry.category} onChange={(event) => setEntry({ ...entry, category: event.target.value })}>
                {settings.categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="note-field">
              <span>Note</span>
              <input value={entry.note} onChange={(event) => setEntry({ ...entry, note: event.target.value })} placeholder="Short note, merchant, or reason" />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="primary-action" type="submit" style={{ flex: 1 }}>{editingId ? 'Save changes' : 'Add transaction'}</button>
              {editingId && <button type="button" onClick={cancelEdit} style={{ flex: 1 }}>Cancel</button>}
            </div>
          </form>

          <div className="quick-row">
            {quickCategories.map((category) => (
              <button key={category} type="button" onClick={() => setEntry({ ...entry, category, note: category })}>{category}</button>
            ))}
          </div>
        </section>

        <section className="metrics">
          <Metric label={`${monthName(month)} spent`} value={money(totals.spent, settings.currency)} tone="danger" />
          <Metric label={`${monthName(month)} income`} value={money(totals.income, settings.currency)} tone="good" />
          <Metric label="Total card balance" value={money(totals.balance, settings.currency)} tone={totals.balance >= 0 ? 'good' : 'danger'} />
        </section>

        <section className="content-grid">
          <div className="main-column">
            <div className="panel">
              <div className="section-title">
                <div>
                  <p className="eyebrow">Cards</p>
                  <h2>Card balances</h2>
                </div>
                <select value={cardFilter} onChange={(event) => setCardFilter(event.target.value)}>
                  <option value="all">All cards</option>
                  {settings.cards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
                </select>
              </div>
              <div className="card-bars">
                {totals.byCard.map((card) => (
                  <div className="bar-row" key={card.id}>
                    <div className="bar-label">
                      <BankMark card={card} />
                      <span>{card.name}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(Math.max(card.total, Math.abs(card.balance)) / largestCard) * 100}%`, background: card.color }} />
                    </div>
                    <strong>{money(card.balance, settings.currency)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel transactions-panel">
              <div className="section-title">
                <div>
                  <p className="eyebrow">History</p>
                  <h2>Transactions</h2>
                </div>
                <div className="filters">
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
                  <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                    <option value="all">All categories</option>
                    {settings.categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
              </div>

              <div className="transaction-list">
                {filteredTransactions.length === 0 ? (
                  <div className="empty-state">No transactions found for this view.</div>
                ) : filteredTransactions.map((item) => {
                  const card = findCard(settings.cards, item.cardId);
                  return (
                    <div className="transaction-row" key={item.id}>
                      <div className="date-chip">{item.date.slice(5)}</div>
                      <div className="transaction-main">
                        <strong>{item.note || item.category}</strong>
                        <span>{item.type === 'income' ? 'Income' : item.category} / {card?.name || 'Card'}</span>
                      </div>
                      <div className={`transaction-amount ${item.type === 'income' ? 'income' : ''}`}>{item.type === 'income' ? '+' : '-'} {money(item.amount, settings.currency)}</div>
                      <button type="button" onClick={() => editTransaction(item)}>Edit</button>
                      <button type="button" onClick={() => duplicateTransaction(item)}>Repeat</button>
                      <button type="button" className="danger-link" onClick={() => deleteTransaction(item.type, item.id)}>Delete</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="side-column">
            <div className="panel">
              <div className="section-title compact">
                <h2>Budget</h2>
              </div>
              <label>
                <span>Monthly budget</span>
                <input type="number" value={settings.monthlyBudget} onChange={(event) => updateData((current) => ({ ...current, settings: { ...current.settings, monthlyBudget: Number(event.target.value || 0) } }))} />
              </label>
              <label>
                <span>Monthly salary</span>
                <input type="number" value={settings.salary} onChange={(event) => updateData((current) => ({ ...current, settings: { ...current.settings, salary: Number(event.target.value || 0) } }))} />
              </label>
              <label>
                <span>Currency</span>
                <input value={settings.currency} onChange={(event) => updateData((current) => ({ ...current, settings: { ...current.settings, currency: event.target.value.toUpperCase() } }))} />
              </label>
              <div className="budget-meter">
                <span style={{ width: `${budgetUsed}%` }} />
              </div>
              <p className="muted">{settings.monthlyBudget ? `${budgetUsed.toFixed(0)}% of monthly budget used` : 'Set a budget to track monthly progress.'}</p>
            </div>

            <div className="panel">
              <div className="section-title compact">
                <h2>Categories</h2>
              </div>
              <div className="category-bars">
                {totals.byCategory.length === 0 ? <p className="muted">No category spending yet.</p> : totals.byCategory.map((item) => (
                  <div key={item.category}>
                    <div className="bar-label">
                      <span>{item.category}</span>
                      <strong>{money(item.total, settings.currency)}</strong>
                    </div>
                    <div className="bar-track"><div className="bar-fill neutral" style={{ width: `${(item.total / largestCategory) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
              <div className="inline-add">
                <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="New category" />
                <button type="button" onClick={addCategory}>Add</button>
              </div>
            </div>

            <div className="panel">
              <div className="section-title compact">
                <h2>Manage cards</h2>
              </div>
              <div className="card-editor">
                {settings.cards.map((card) => (
                  <div className="card-edit-row" key={card.id}>
                    <BankMark card={card} />
                    <input value={card.name} onChange={(event) => updateData((current) => ({
                      ...current,
                      settings: { ...current.settings, cards: current.settings.cards.map((item) => item.id === card.id ? { ...item, name: event.target.value } : item) }
                    }))} />
                    <input type="number" value={card.openingBalance || 0} onChange={(event) => updateData((current) => ({
                      ...current,
                      settings: { ...current.settings, cards: current.settings.cards.map((item) => item.id === card.id ? { ...item, openingBalance: Number(event.target.value || 0) } : item) }
                    }))} />
                    <button type="button" onClick={() => removeCard(card.id)}>Remove</button>
                  </div>
                ))}
              </div>
              <div className="inline-add stacked">
                <input value={newCard.name} onChange={(event) => setNewCard({ ...newCard, name: event.target.value })} placeholder="Card name" />
                <input type="number" value={newCard.openingBalance} onChange={(event) => setNewCard({ ...newCard, openingBalance: event.target.value })} placeholder="Opening balance" />
                <input type="number" value={newCard.limit} onChange={(event) => setNewCard({ ...newCard, limit: event.target.value })} placeholder="Optional limit" />
                <button type="button" onClick={addCard}>Add card</button>
              </div>
            </div>
          </aside>
        </section>
      </main>
      <footer>{dataPath ? `Data file: ${dataPath}` : 'Browser preview mode'}</footer>
    </div>
  );
}

function Onboarding({ setupCards, banks, currency, onToggleBank, onUpdateBalance, onUpdateName, onRemoveCard, onCurrencyChange, onFinish }) {
  const selectedIds = new Set(setupCards.map((card) => card.bankId));
  return (
    <div className="onboarding-shell">
      <section className="onboarding-card">
        <div className="intro-panel">
          <p className="eyebrow">Welcome</p>
          <h1>Set up your card tracker</h1>
          <p>Choose the cards or accounts you use every day, enter the current available balance for each one, and the app will keep balances updated as you add income and expenses.</p>
          <div className="intro-points">
            <span>Offline data storage</span>
            <span>Card-level balances</span>
            <span>Monthly reports</span>
          </div>
          <label>
            <span>Currency</span>
            <input value={currency} onChange={(event) => onCurrencyChange(event.target.value)} />
          </label>
        </div>

        <div className="setup-panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">Sri Lankan cards</p>
              <h2>Select your banks</h2>
            </div>
            <strong>{setupCards.length} selected</strong>
          </div>
          <div className="bank-grid">
            {banks.map((bank) => {
              const selected = selectedIds.has(bank.id);
              return (
                <button className={`bank-tile ${selected ? 'selected' : ''}`} type="button" key={bank.id} onClick={() => onToggleBank(bank)}>
                  <BankMark card={{ logoText: bank.shortName, color: bank.color, accent: bank.accent }} />
                  <span>{bank.name}</span>
                </button>
              );
            })}
          </div>

          <div className="setup-balances">
            <div className="section-title compact">
              <h2>Selected cards and opening balances</h2>
              <span className="hint-text">Edit names or remove cards here</span>
            </div>
            {setupCards.map((card) => (
              <label className="setup-balance-row" key={card.bankId}>
                <BankMark card={card} />
                <input value={card.name} onChange={(event) => onUpdateName(card.bankId, event.target.value)} aria-label={`${card.name} name`} />
                <input type="number" value={card.openingBalance} onChange={(event) => onUpdateBalance(card.bankId, event.target.value)} placeholder="Current balance" />
                <button type="button" onClick={() => onRemoveCard(card.bankId)} disabled={setupCards.length <= 1}>Remove</button>
              </label>
            ))}
          </div>
          <button className="primary-action setup-finish" type="button" onClick={onFinish}>Start tracking</button>
        </div>
      </section>
    </div>
  );
}

function BankMark({ card }) {
  return (
    <span className="bank-mark" style={{ background: card.color || '#334155', color: card.accent || '#ffffff' }}>
      {card.logoText || 'CARD'}
    </span>
  );
}

function UpdateControl({ state, onCheck, onDownload, onInstall }) {
  if (state.status === 'available') {
    return (
      <button className="update-action available" type="button" onClick={onDownload}>
        Update {state.version ? `v${state.version}` : 'available'}
      </button>
    );
  }

  if (state.status === 'downloading') {
    return (
      <button className="update-action" type="button" disabled>
        Downloading {state.percent || 0}%
      </button>
    );
  }

  if (state.status === 'downloaded') {
    return (
      <button className="update-action ready" type="button" onClick={onInstall}>
        Restart to update
      </button>
    );
  }

  if (state.status === 'checking') {
    return <button className="update-action" type="button" disabled>Checking...</button>;
  }

  if (state.status === 'error') {
    return <button className="update-action error" type="button" onClick={onCheck}>Update error</button>;
  }

  return <button className="update-action" type="button" onClick={onCheck}>Check updates</button>;
}

function Metric({ label, value, tone }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function findCard(cards, id) {
  return cards.find((card) => card.id === id);
}

function downloadBrowserFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
