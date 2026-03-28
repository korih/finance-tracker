# Finance Tracker — Project TODOs

## Merchant Category Classification

Classify transaction merchants (e.g. "Whole Foods", "Netflix", "Shell") into spending categories for charts, filtering, and insights.

**Chosen approach: AI + Persistent Cache** — batch-classify unique merchants via Workers AI once, store in D1, never re-classify the same merchant. User can override any AI decision permanently.

---

### Proposed Categories (fixed set)
```
Groceries · Dining · Gas & Auto · Entertainment · Shopping
Travel · Health & Pharmacy · Utilities · Personal Care
Home Improvement · Financial · Other
```

---

### Options Considered

| Option | Accuracy | Speed | Cost | Maintenance | Notes |
|--------|----------|-------|------|-------------|-------|
| Static lookup table | Low | Instant | Free | High | Too brittle — real merchant names are garbled/non-standard |
| Pattern/regex matching | Medium | Instant | Free | Medium | Better than lookup but fails on unknown local merchants |
| AI per-transaction | High | Slow | High | Low | Catastrophic latency — same merchant called 30x |
| **AI + cache (chosen)** | **High** | **Fast after first** | **Low** | **Low** | Batch all unknowns into one AI call, cache forever |
| Embeddings similarity | High | Fast | Medium | Medium | Overkill — LLM gives better accuracy with less complexity |

---

### Data Model

**Migration 0007** — merchant_categories table
```sql
CREATE TABLE merchant_categories (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  spreadsheet_id TEXT NOT NULL,
  merchant       TEXT NOT NULL,
  category       TEXT NOT NULL,
  source         TEXT NOT NULL DEFAULT 'ai',  -- 'ai' | 'user'
  inserted_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(spreadsheet_id, merchant)
);
```

**Migration 0008** — category column on transactions + income_entries
```sql
ALTER TABLE transactions ADD COLUMN category TEXT;
ALTER TABLE income_entries ADD COLUMN category TEXT;
```

---

### Classification Flow

1. After `syncTransactions()`, call `classifyNewMerchants(db, spreadsheetId)`
2. Find all transactions where `category IS NULL`
3. Filter out merchants already in `merchant_categories` cache → batch-update those
4. For truly unknown merchants → single AI call with all names in one prompt → JSON response
5. Insert into `merchant_categories`, then `UPDATE transactions SET category = ...`
6. `source = 'user'` entries are never re-classified by AI

---

### AI Prompt Design
```
Classify each merchant into exactly one of: Groceries, Dining, Gas & Auto,
Entertainment, Shopping, Travel, Health & Pharmacy, Utilities, Personal Care,
Home Improvement, Financial, Other

Rules:
- Delivery apps (DoorDash, Uber Eats) → Dining
- Amazon → Shopping (AWS → Financial)
- Gas stations → Gas & Auto even if they sell food
- Use "Other" when genuinely uncertain
- Return ONLY valid JSON, no explanation

Merchants: ["Whole Foods", "Netflix", "Shell", ...]
Response: {"Whole Foods": "Groceries", "Netflix": "Entertainment", ...}
```

---

### Files to Create / Modify

| File | Action | Description |
|------|--------|-------------|
| `migrations/0007_merchant_categories.sql` | Create | merchant_categories table |
| `migrations/0008_category_column.sql` | Create | category column on transactions + income_entries |
| `src/lib/classify.ts` | Create | `classifyNewMerchants()` — AI batch call + DB update |
| `src/components/category-badge.tsx` | Create | Colored pill + inline dropdown for user override |
| `src/components/category-chart.tsx` | Create | Spending-by-category Recharts horizontal bar chart |
| `src/app/dashboard/sheet/[id]/expenses/page.tsx` | Modify | Call classify, pass category data, add chart + filter |
| `src/components/transactions-table.tsx` | Modify | Add category badge column |

---

### Build Order (MVP first)

- [ ] DB migrations (0007 + 0008)
- [ ] `src/lib/classify.ts` — `classifyNewMerchants()`
- [ ] Wire into expenses page server component after `syncTransactions`
- [ ] Category badge in transactions table (display only)
- [ ] Spending-by-category chart on expenses page
- [ ] Category filter pills above transactions table
- [ ] User override (click badge → change category → persists as `source='user'`)
