/**
 * Centralized Chart of Accounts (COA) Configuration
 * Maps system functions (Revenue, AR, AP) to standardized GL Codes
 * Localized for the Pakistani market standards (FBR / IFRS / GAAP aligned)
 *
 * Code ranges:
 *   1000-1999  Assets
 *   2000-2999  Liabilities
 *   3000-3999  Equity
 *   4000-4999  Revenue / Income
 *   5000-5999  Expenses
 */

export const ACCOUNT_CODES = {
    // --- Assets (1000-1999) --------------------------------------------
    CASH_ON_HAND: '1001',
    PETTY_CASH: '1002',
    BANK_ACCOUNTS: '1010',
    SHORT_TERM_INVESTMENTS: '1020',
    ACCOUNTS_RECEIVABLE: '1100',
    ALLOWANCE_FOR_DOUBTFUL: '1101',
    ADVANCE_TO_SUPPLIERS: '1110',
    PREPAID_EXPENSES: '1120',
    INVENTORY_ASSET: '1200',
    RAW_MATERIALS: '1201',
    WORK_IN_PROGRESS: '1202',
    FINISHED_GOODS: '1203',
    FIXED_ASSETS: '1300',
    FURNITURE_FIXTURES: '1310',
    EQUIPMENT: '1320',
    VEHICLES: '1330',
    ACCUMULATED_DEPRECIATION: '1400',

    // --- Liabilities (2000-2999) ---------------------------------------
    ACCOUNTS_PAYABLE: '2001',
    ACCRUED_EXPENSES: '2010',
    ADVANCE_FROM_CUSTOMERS: '2020',
    SALES_TAX_PAYABLE: '2100',         // Federal Sales Tax (FBR)
    PROVINCIAL_TAX_PAYABLE: '2101',    // Provincial Sales Tax (PST/SRB/PRA)
    WITHHOLDING_TAX_PAYABLE: '2102',   // WHT
    INPUT_TAX_CREDIT: '2103',          // Input GST claimable
    UNEARNED_REVENUE: '2200',
    SHORT_TERM_LOAN: '2300',
    LONG_TERM_LOAN: '2500',

    // --- Equity (3000-3999) --------------------------------------------
    OWNER_EQUITY: '3000',
    OWNER_CAPITAL: '3001',
    RETAINED_EARNINGS: '3100',
    DRAWINGS: '3200',
    CURRENT_YEAR_EARNINGS: '3300',

    // --- Revenue / Income (4000-4999) ----------------------------------
    SALES_REVENUE: '4000',
    SERVICE_REVENUE: '4100',
    SALES_RETURNS: '4200',
    SALES_DISCOUNTS: '4300',
    OTHER_INCOME: '4900',
    INTEREST_INCOME: '4910',
    GAIN_ON_DISPOSAL: '4920',

    // --- Expenses (5000-5999) ------------------------------------------
    COGS: '5000',                      // Cost of Goods Sold
    MANUFACTURING_COST: '5001',        // Clearing account for production
    PURCHASE_RETURNS: '5002',
    RENT_EXPENSE: '5100',
    UTILITIES: '5200',
    SALARIES: '5300',
    EMPLOYEE_BENEFITS: '5310',
    MARKETING: '5400',
    LOGISTICS: '5500',
    DEPRECIATION: '5600',
    BANK_CHARGES: '5700',
    OFFICE_SUPPLIES: '5800',
    INSURANCE: '5900',
    REPAIRS_MAINTENANCE: '5950',
    PROFESSIONAL_FEES: '5960',
    TRAVEL: '5970',
    COMMUNICATION: '5980',
    MISCELLANEOUS: '5999',
};

/**
 * Account type metadata for reporting.
 * Debit-normal types: asset, expense
 * Credit-normal types: liability, equity, income
 */
export const ACCOUNT_TYPE_NORMAL = {
    asset: 'debit',
    liability: 'credit',
    equity: 'credit',
    income: 'credit',
    expense: 'debit',
};

/**
 * Account sub-type mapping for financial statements
 */
export const ACCOUNT_SUB_TYPES = {
    current_asset: 'asset',
    fixed_asset: 'asset',
    contra_asset: 'asset',
    current_liability: 'liability',
    long_term_liability: 'liability',
    equity: 'equity',
    revenue: 'income',
    contra_revenue: 'income',
    cost_of_sales: 'expense',
    operating_expense: 'expense',
    other_income: 'income',
};

/**
 * Default Chart of Accounts for initialization
 * Comprehensive list covering all standard business needs
 */
export const DEFAULT_COA = [
    // --- Assets --------------------------------------------------------
    { code: ACCOUNT_CODES.CASH_ON_HAND, name: 'Cash on Hand', type: 'asset', sub_type: 'current_asset', is_system: true },
    { code: ACCOUNT_CODES.PETTY_CASH, name: 'Petty Cash', type: 'asset', sub_type: 'current_asset', is_system: true },
    { code: ACCOUNT_CODES.BANK_ACCOUNTS, name: 'Bank Accounts', type: 'asset', sub_type: 'current_asset', is_system: true },
    { code: ACCOUNT_CODES.SHORT_TERM_INVESTMENTS, name: 'Short-term Investments', type: 'asset', sub_type: 'current_asset', is_system: false },
    { code: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, name: 'Accounts Receivable', type: 'asset', sub_type: 'current_asset', is_system: true },
    { code: ACCOUNT_CODES.ALLOWANCE_FOR_DOUBTFUL, name: 'Allowance for Doubtful Debts', type: 'asset', sub_type: 'contra_asset', is_system: false },
    { code: ACCOUNT_CODES.ADVANCE_TO_SUPPLIERS, name: 'Advance to Suppliers', type: 'asset', sub_type: 'current_asset', is_system: false },
    { code: ACCOUNT_CODES.PREPAID_EXPENSES, name: 'Prepaid Expenses', type: 'asset', sub_type: 'current_asset', is_system: false },
    { code: ACCOUNT_CODES.INVENTORY_ASSET, name: 'Inventory Asset', type: 'asset', sub_type: 'current_asset', is_system: true },
    { code: ACCOUNT_CODES.RAW_MATERIALS, name: 'Raw Materials', type: 'asset', sub_type: 'current_asset', is_system: false },
    { code: ACCOUNT_CODES.WORK_IN_PROGRESS, name: 'Work in Progress', type: 'asset', sub_type: 'current_asset', is_system: false },
    { code: ACCOUNT_CODES.FINISHED_GOODS, name: 'Finished Goods', type: 'asset', sub_type: 'current_asset', is_system: false },
    { code: ACCOUNT_CODES.FIXED_ASSETS, name: 'Fixed Assets', type: 'asset', sub_type: 'fixed_asset', is_system: false },
    { code: ACCOUNT_CODES.FURNITURE_FIXTURES, name: 'Furniture & Fixtures', type: 'asset', sub_type: 'fixed_asset', is_system: false },
    { code: ACCOUNT_CODES.EQUIPMENT, name: 'Equipment', type: 'asset', sub_type: 'fixed_asset', is_system: false },
    { code: ACCOUNT_CODES.VEHICLES, name: 'Vehicles', type: 'asset', sub_type: 'fixed_asset', is_system: false },
    { code: ACCOUNT_CODES.ACCUMULATED_DEPRECIATION, name: 'Accumulated Depreciation', type: 'asset', sub_type: 'contra_asset', is_system: false },

    // --- Liabilities ---------------------------------------------------
    { code: ACCOUNT_CODES.ACCOUNTS_PAYABLE, name: 'Accounts Payable', type: 'liability', sub_type: 'current_liability', is_system: true },
    { code: ACCOUNT_CODES.ACCRUED_EXPENSES, name: 'Accrued Expenses', type: 'liability', sub_type: 'current_liability', is_system: false },
    { code: ACCOUNT_CODES.ADVANCE_FROM_CUSTOMERS, name: 'Advance from Customers', type: 'liability', sub_type: 'current_liability', is_system: false },
    { code: ACCOUNT_CODES.SALES_TAX_PAYABLE, name: 'Sales Tax Payable (FBR)', type: 'liability', sub_type: 'current_liability', is_system: true },
    { code: ACCOUNT_CODES.PROVINCIAL_TAX_PAYABLE, name: 'Provincial Tax Payable', type: 'liability', sub_type: 'current_liability', is_system: true },
    { code: ACCOUNT_CODES.WITHHOLDING_TAX_PAYABLE, name: 'Withholding Tax Payable', type: 'liability', sub_type: 'current_liability', is_system: true },
    { code: ACCOUNT_CODES.INPUT_TAX_CREDIT, name: 'Input Tax Credit (GST)', type: 'liability', sub_type: 'current_liability', is_system: false },
    { code: ACCOUNT_CODES.UNEARNED_REVENUE, name: 'Unearned Revenue', type: 'liability', sub_type: 'current_liability', is_system: false },
    { code: ACCOUNT_CODES.SHORT_TERM_LOAN, name: 'Short-term Loan', type: 'liability', sub_type: 'current_liability', is_system: false },
    { code: ACCOUNT_CODES.LONG_TERM_LOAN, name: 'Long-term Loan', type: 'liability', sub_type: 'long_term_liability', is_system: false },

    // --- Equity --------------------------------------------------------
    { code: ACCOUNT_CODES.OWNER_EQUITY, name: 'Owner Equity', type: 'equity', sub_type: 'equity', is_system: true },
    { code: ACCOUNT_CODES.OWNER_CAPITAL, name: 'Owner Capital', type: 'equity', sub_type: 'equity', is_system: false },
    { code: ACCOUNT_CODES.RETAINED_EARNINGS, name: 'Retained Earnings', type: 'equity', sub_type: 'equity', is_system: true },
    { code: ACCOUNT_CODES.DRAWINGS, name: 'Drawings / Withdrawals', type: 'equity', sub_type: 'equity', is_system: false },
    { code: ACCOUNT_CODES.CURRENT_YEAR_EARNINGS, name: 'Current Year Earnings', type: 'equity', sub_type: 'equity', is_system: true },

    // --- Revenue / Income ----------------------------------------------
    { code: ACCOUNT_CODES.SALES_REVENUE, name: 'Sales Revenue', type: 'income', sub_type: 'revenue', is_system: true },
    { code: ACCOUNT_CODES.SERVICE_REVENUE, name: 'Service Revenue', type: 'income', sub_type: 'revenue', is_system: false },
    { code: ACCOUNT_CODES.SALES_RETURNS, name: 'Sales Returns & Allowances', type: 'income', sub_type: 'contra_revenue', is_system: false },
    { code: ACCOUNT_CODES.SALES_DISCOUNTS, name: 'Sales Discounts', type: 'income', sub_type: 'contra_revenue', is_system: false },
    { code: ACCOUNT_CODES.OTHER_INCOME, name: 'Other Income', type: 'income', sub_type: 'other_income', is_system: false },
    { code: ACCOUNT_CODES.INTEREST_INCOME, name: 'Interest Income', type: 'income', sub_type: 'other_income', is_system: false },
    { code: ACCOUNT_CODES.GAIN_ON_DISPOSAL, name: 'Gain on Asset Disposal', type: 'income', sub_type: 'other_income', is_system: false },

    // --- Expenses ------------------------------------------------------
    { code: ACCOUNT_CODES.COGS, name: 'Cost of Goods Sold', type: 'expense', sub_type: 'cost_of_sales', is_system: true },
    { code: ACCOUNT_CODES.MANUFACTURING_COST, name: 'Manufacturing Costs', type: 'expense', sub_type: 'cost_of_sales', is_system: false },
    { code: ACCOUNT_CODES.PURCHASE_RETURNS, name: 'Purchase Returns', type: 'expense', sub_type: 'cost_of_sales', is_system: false },
    { code: ACCOUNT_CODES.RENT_EXPENSE, name: 'Rent Expense', type: 'expense', sub_type: 'operating_expense', is_system: false },
    { code: ACCOUNT_CODES.UTILITIES, name: 'Utilities', type: 'expense', sub_type: 'operating_expense', is_system: false },
    { code: ACCOUNT_CODES.SALARIES, name: 'Salaries & Wages', type: 'expense', sub_type: 'operating_expense', is_system: false },
    { code: ACCOUNT_CODES.EMPLOYEE_BENEFITS, name: 'Employee Benefits', type: 'expense', sub_type: 'operating_expense', is_system: false },
    { code: ACCOUNT_CODES.MARKETING, name: 'Marketing & Advertising', type: 'expense', sub_type: 'operating_expense', is_system: false },
    { code: ACCOUNT_CODES.LOGISTICS, name: 'Logistics & Shipping', type: 'expense', sub_type: 'operating_expense', is_system: false },
    { code: ACCOUNT_CODES.DEPRECIATION, name: 'Depreciation Expense', type: 'expense', sub_type: 'operating_expense', is_system: false },
    { code: ACCOUNT_CODES.BANK_CHARGES, name: 'Bank Charges & Fees', type: 'expense', sub_type: 'operating_expense', is_system: false },
    { code: ACCOUNT_CODES.OFFICE_SUPPLIES, name: 'Office Supplies', type: 'expense', sub_type: 'operating_expense', is_system: false },
    { code: ACCOUNT_CODES.INSURANCE, name: 'Insurance', type: 'expense', sub_type: 'operating_expense', is_system: false },
    { code: ACCOUNT_CODES.REPAIRS_MAINTENANCE, name: 'Repairs & Maintenance', type: 'expense', sub_type: 'operating_expense', is_system: false },
    { code: ACCOUNT_CODES.PROFESSIONAL_FEES, name: 'Professional & Legal Fees', type: 'expense', sub_type: 'operating_expense', is_system: false },
    { code: ACCOUNT_CODES.TRAVEL, name: 'Travel & Conveyance', type: 'expense', sub_type: 'operating_expense', is_system: false },
    { code: ACCOUNT_CODES.COMMUNICATION, name: 'Communication & Internet', type: 'expense', sub_type: 'operating_expense', is_system: false },
    { code: ACCOUNT_CODES.MISCELLANEOUS, name: 'Miscellaneous Expense', type: 'expense', sub_type: 'operating_expense', is_system: false },
];

/**
 * Get COGS-related account codes (for P&L COGS section)
 */
export const COGS_CODES = [
    ACCOUNT_CODES.COGS,
    ACCOUNT_CODES.MANUFACTURING_COST,
    ACCOUNT_CODES.PURCHASE_RETURNS,
];

/**
 * Expense category presets for the ExpenseManager UI
 */
export const EXPENSE_CATEGORIES = [
    { value: 'rent', label: 'Rent', account_code: ACCOUNT_CODES.RENT_EXPENSE },
    { value: 'utilities', label: 'Utilities', account_code: ACCOUNT_CODES.UTILITIES },
    { value: 'salaries', label: 'Salaries & Wages', account_code: ACCOUNT_CODES.SALARIES },
    { value: 'marketing', label: 'Marketing', account_code: ACCOUNT_CODES.MARKETING },
    { value: 'logistics', label: 'Logistics & Shipping', account_code: ACCOUNT_CODES.LOGISTICS },
    { value: 'office', label: 'Office Supplies', account_code: ACCOUNT_CODES.OFFICE_SUPPLIES },
    { value: 'insurance', label: 'Insurance', account_code: ACCOUNT_CODES.INSURANCE },
    { value: 'repairs', label: 'Repairs & Maintenance', account_code: ACCOUNT_CODES.REPAIRS_MAINTENANCE },
    { value: 'professional', label: 'Professional Fees', account_code: ACCOUNT_CODES.PROFESSIONAL_FEES },
    { value: 'travel', label: 'Travel', account_code: ACCOUNT_CODES.TRAVEL },
    { value: 'communication', label: 'Communication', account_code: ACCOUNT_CODES.COMMUNICATION },
    { value: 'bank_charges', label: 'Bank Charges', account_code: ACCOUNT_CODES.BANK_CHARGES },
    { value: 'depreciation', label: 'Depreciation', account_code: ACCOUNT_CODES.DEPRECIATION },
    { value: 'miscellaneous', label: 'Miscellaneous', account_code: ACCOUNT_CODES.MISCELLANEOUS },
];
