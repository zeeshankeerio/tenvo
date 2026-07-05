'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useBusiness } from './BusinessContext';
import { useFilters } from './FilterContext';
import {
    productAPI,
    customerAPI,
    invoiceAPI,
    vendorAPI,
    purchaseAPI,
    quotationAPI,
} from '@/lib/api';
import {
    getInvoicesAction
} from '@/lib/actions/basic/invoice';
import {
    getWarehouseLocationsAction
} from '@/lib/actions/standard/inventory/warehouse';
import {
    getBOMsAction,
    getProductionOrdersAction
} from '@/lib/actions/premium/manufacturing';
import {
    getPayrollEmployeesAction,
    getPayrollRunsAction
} from '@/lib/actions/standard/payroll';
import {
    getPendingApprovalsAction,
    getApprovalHistoryAction
} from '@/lib/actions/standard/workflow';
import {
    getMonthlyFinancialsAction,
    getAccountingSummaryAction
} from '@/lib/actions/standard/report';
import { getExpensesAction } from '@/lib/actions/basic/expense';
import {
    getDashboardMetricsAction,
    getExpenseBreakdownAction
} from '@/lib/actions/premium/ai/analytics';
import { getAdvancedDashboardSnapshotAction } from '@/lib/actions/dashboard/advancedDashboardSnapshot';
import toast from 'react-hot-toast';

const DataContext = createContext(undefined);

/** Unblock hub shell if analytics/finance bootstrap exceeds this (ms). */
const SHELL_FETCH_TIMEOUT_MS = 8_000;

export function DataProvider({ children }) {
    const { business } = useBusiness();
    const { dateRange } = useFilters();

    const [invoices, setInvoices] = useState([]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [challans, setChallans] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [locations, setLocations] = useState([]);
    const [bomList, setBomList] = useState([]);
    const [productionOrders, setProductionOrders] = useState([]);
    const [payrollEmployees, setPayrollEmployees] = useState([]);
    const [payrollRuns, setPayrollRuns] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [approvalHistory, setApprovalHistory] = useState([]);
    const [accountingSummary, setAccountingSummary] = useState(null);
    const [dashboardChartData, setDashboardChartData] = useState([]);
    const [dashboardMetrics, setDashboardMetrics] = useState(null);
    const [expenseBreakdown, setExpenseBreakdown] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [advancedDashboardSnapshot, setAdvancedDashboardSnapshot] = useState(null);

    const [loadingModules, setLoadingModules] = useState({});
    /** Per-module fetch completed for current business (avoids tab-switch refetch storms). */
    const [moduleReady, setModuleReady] = useState({});
    /** True once minimal dashboard data is available — unblocks main content shell. */
    const [isShellReady, setIsShellReady] = useState(false);
    /** True once all background module fetches for the current business have settled. */
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const fetchGenerationRef = useRef(0);
    const shellReadyBusinessIdRef = useRef(null);
    const financeDateKeyRef = useRef(null);
    const moduleInFlightRef = useRef({});
    /** Sync module-ready flags (ref avoids recreating fetch callbacks). */
    const moduleReadyRef = useRef({});

    // Modular Fetchers
    // Stable ISO string primitives for date deps — prevents fetchFinance from
    // being recreated on every render due to Date object reference changes
    const dateFromISO = dateRange.from.toISOString();
    const dateToISO = dateRange.to.toISOString();

    const fetchFinance = useCallback(async ({ force = false } = {}) => {
        if (!business?.id) return;
        if (moduleInFlightRef.current.finance) return;
        if (!force && moduleReadyRef.current.finance) return;
        moduleInFlightRef.current.finance = true;
        setLoadingModules(prev => ({ ...prev, finance: true }));
        try {
            const [summary, financials, breakdown, snapshot] = await Promise.all([
                getAccountingSummaryAction(business.id, dateFromISO, dateToISO),
                getMonthlyFinancialsAction(business.id, 6),
                getExpenseBreakdownAction(business.id, { from: dateFromISO, to: dateToISO }),
                getAdvancedDashboardSnapshotAction(business.id, { from: dateFromISO, to: dateToISO }),
            ]);
            setAccountingSummary(summary.success ? summary.summary : null);
            setDashboardChartData(financials.success ? financials.analytics : []);
            setExpenseBreakdown(breakdown.success ? breakdown.data : []);
            setAdvancedDashboardSnapshot(
                snapshot.success
                    ? { finance: snapshot.finance, range: snapshot.range }
                    : null
            );
            moduleReadyRef.current.finance = true;
            setModuleReady(prev => ({ ...prev, finance: true }));
        } catch (error) {
            console.error('Fetch Finance Error:', error);
            toast.error('Failed to load financial data');
        } finally {
            moduleInFlightRef.current.finance = false;
            setLoadingModules(prev => ({ ...prev, finance: false }));
        }
    }, [business?.id, dateFromISO, dateToISO]);

    useEffect(() => {
        financeDateKeyRef.current = null;
    }, [business?.id]);

    // Refetch GL + advanced snapshot when the global date filter changes (Header presets / picker).
    useEffect(() => {
        if (!business?.id || !isShellReady) return;
        const key = `${business.id}|${dateFromISO}|${dateToISO}`;
        if (financeDateKeyRef.current === key) return;
        const hadPriorKey = financeDateKeyRef.current != null;
        financeDateKeyRef.current = key;
        if (hadPriorKey) fetchFinance({ force: true });
    }, [business?.id, dateFromISO, dateToISO, isShellReady, fetchFinance]);

    const fetchInventory = useCallback(async ({ force = false } = {}) => {
        if (!business?.id) return;
        if (moduleInFlightRef.current.inventory) return;
        if (!force && moduleReadyRef.current.inventory) return;
        moduleInFlightRef.current.inventory = true;
        setLoadingModules(prev => ({ ...prev, inventory: true }));
        try {
            const [prodRes, locRes] = await Promise.all([
                productAPI.getAll(business.id),
                getWarehouseLocationsAction(business.id)
            ]);
            // productAPI.getAll returns the products array directly
            setProducts(prodRes || []);
            setLocations(locRes.success ? locRes.locations : []);
            moduleReadyRef.current.inventory = true;
            setModuleReady(prev => ({ ...prev, inventory: true }));
        } catch (error) {
            const message = error?.message || '';
            const isSessionFailure =
                message.includes('Unauthorized') ||
                message.includes('Failed to get session') ||
                message.includes('Session lookup failed');

            if (isSessionFailure) {
                setProducts([]);
                setLocations([]);
                return;
            }

            console.error('Fetch Inventory Error:', error);
        } finally {
            moduleInFlightRef.current.inventory = false;
            setLoadingModules(prev => ({ ...prev, inventory: false }));
        }
    }, [business?.id]);

    const fetchAnalytics = useCallback(async ({ force = false } = {}) => {
        if (!business?.id) return;
        if (moduleInFlightRef.current.analytics) return;
        if (!force && moduleReadyRef.current.analytics) return;
        moduleInFlightRef.current.analytics = true;
        setLoadingModules(prev => ({ ...prev, analytics: true }));
        try {
            const res = await getDashboardMetricsAction(business.id);
            if (res.success) {
                setDashboardMetrics(res.data);
            }
            moduleReadyRef.current.analytics = true;
            setModuleReady(prev => ({ ...prev, analytics: true }));
        } catch (error) {
            console.error('Fetch Analytics Error:', error);
        } finally {
            moduleInFlightRef.current.analytics = false;
            setLoadingModules(prev => ({ ...prev, analytics: false }));
        }
    }, [business?.id]);

    const fetchPurchases = useCallback(async ({ force = false } = {}) => {
        if (!business?.id) return;
        if (moduleInFlightRef.current.purchases) return;
        if (!force && moduleReadyRef.current.purchases) return;
        moduleInFlightRef.current.purchases = true;
        setLoadingModules(prev => ({ ...prev, purchases: true }));
        try {
            const [vendRes, poRes] = await Promise.all([
                vendorAPI.getAll(business.id),
                purchaseAPI.getAll(business.id)
            ]);
            setVendors(vendRes || []);
            setPurchaseOrders(poRes.purchaseOrders || []);
            moduleReadyRef.current.purchases = true;
            setModuleReady(prev => ({ ...prev, purchases: true }));
        } catch (error) {
            console.error('Fetch Purchases Error:', error);
        } finally {
            moduleInFlightRef.current.purchases = false;
            setLoadingModules(prev => ({ ...prev, purchases: false }));
        }
    }, [business?.id]);

    const fetchSales = useCallback(async ({ force = false } = {}) => {
        if (!business?.id) return;
        if (moduleInFlightRef.current.sales) return;
        if (!force && moduleReadyRef.current.sales) return;
        moduleInFlightRef.current.sales = true;
        setLoadingModules(prev => ({ ...prev, sales: true }));
        try {
            const [invRes, custRes, quotRes] = await Promise.all([
                getInvoicesAction(business.id),
                customerAPI.getAll(business.id),
                quotationAPI.getAll(business.id)
            ]);
            setInvoices(invRes.success ? invRes.invoices : []);
            // customerAPI.getAll returns the customers array directly
            setCustomers(custRes || []);
            setQuotations(quotRes.success ? quotRes.quotations : []);
            setSalesOrders(quotRes.success ? quotRes.salesOrders : []);
            setChallans(quotRes.success ? quotRes.challans : []);
            moduleReadyRef.current.sales = true;
            setModuleReady(prev => ({ ...prev, sales: true }));
        } catch (error) {
            console.error('Fetch Sales Error:', error);
        } finally {
            moduleInFlightRef.current.sales = false;
            setLoadingModules(prev => ({ ...prev, sales: false }));
        }
    }, [business?.id]);

    const fetchManufacturing = useCallback(async ({ force = false } = {}) => {
        if (!business?.id) return;
        if (moduleInFlightRef.current.manufacturing) return;
        if (!force && moduleReadyRef.current.manufacturing) return;
        moduleInFlightRef.current.manufacturing = true;
        setLoadingModules(prev => ({ ...prev, manufacturing: true }));
        try {
            const [bomRes, poRes] = await Promise.all([
                getBOMsAction(business.id),
                getProductionOrdersAction(business.id)
            ]);
            setBomList(bomRes.success ? bomRes.boms : []);
            setProductionOrders(poRes.success ? poRes.productionOrders : []);
            moduleReadyRef.current.manufacturing = true;
            setModuleReady(prev => ({ ...prev, manufacturing: true }));
        } finally {
            moduleInFlightRef.current.manufacturing = false;
            setLoadingModules(prev => ({ ...prev, manufacturing: false }));
        }
    }, [business?.id]);

    const fetchPayroll = useCallback(async ({ force = false } = {}) => {
        if (!business?.id) return;
        if (moduleInFlightRef.current.payroll) return;
        if (!force && moduleReadyRef.current.payroll) return;
        moduleInFlightRef.current.payroll = true;
        setLoadingModules(prev => ({ ...prev, payroll: true }));
        try {
            const [empRes, runsRes] = await Promise.all([
                getPayrollEmployeesAction(business.id),
                getPayrollRunsAction(business.id)
            ]);
            setPayrollEmployees(empRes.success ? empRes.employees : []);
            setPayrollRuns(runsRes.success ? runsRes.runs : []);
            moduleReadyRef.current.payroll = true;
            setModuleReady(prev => ({ ...prev, payroll: true }));
        } catch (error) {
            console.error('Fetch Payroll Error:', error);
        } finally {
            moduleInFlightRef.current.payroll = false;
            setLoadingModules(prev => ({ ...prev, payroll: false }));
        }
    }, [business?.id]);

    const fetchApprovals = useCallback(async ({ force = false } = {}) => {
        if (!business?.id) return;
        if (moduleInFlightRef.current.approvals) return;
        if (!force && moduleReadyRef.current.approvals) return;
        moduleInFlightRef.current.approvals = true;
        setLoadingModules(prev => ({ ...prev, approvals: true }));
        try {
            const [pendingRes, historyRes] = await Promise.all([
                getPendingApprovalsAction(business.id),
                getApprovalHistoryAction(business.id)
            ]);
            setPendingApprovals(pendingRes.success ? pendingRes.requests : []);
            setApprovalHistory(historyRes.success ? historyRes.requests : []);
            moduleReadyRef.current.approvals = true;
            setModuleReady(prev => ({ ...prev, approvals: true }));
        } catch (error) {
            console.error('Fetch Approvals Error:', error);
        } finally {
            moduleInFlightRef.current.approvals = false;
            setLoadingModules(prev => ({ ...prev, approvals: false }));
        }
    }, [business?.id]);

    const fetchExpenses = useCallback(async ({ force = false } = {}) => {
        if (!business?.id) return;
        if (moduleInFlightRef.current.expenses) return;
        if (!force && moduleReadyRef.current.expenses) return;
        moduleInFlightRef.current.expenses = true;
        setLoadingModules(prev => ({ ...prev, expenses: true }));
        try {
            const res = await getExpensesAction(business.id, { limit: 200, offset: 0 });
            if (res.success) {
                setExpenses(res.expenses || []);
            }
            moduleReadyRef.current.expenses = true;
            setModuleReady(prev => ({ ...prev, expenses: true }));
        } catch (error) {
            console.error('Fetch Expenses Error:', error);
        } finally {
            moduleInFlightRef.current.expenses = false;
            setLoadingModules(prev => ({ ...prev, expenses: false }));
        }
    }, [business?.id]);

    const refreshAllData = useCallback(async () => {
        if (!business?.id) return;
        setLoadingModules(prev => ({ ...prev, refreshing: true }));
        const force = { force: true };
        try {
            await Promise.allSettled([
                fetchFinance(force),
                fetchInventory(force),
                fetchSales(force),
                fetchPurchases(force),
                fetchManufacturing(force),
                fetchAnalytics(force),
                fetchPayroll(force),
                fetchApprovals(force),
                fetchExpenses(force)
            ]);
            setIsShellReady(true);
            setIsDataLoaded(true);
            shellReadyBusinessIdRef.current = business.id;
        } finally {
            setLoadingModules(prev => ({ ...prev, refreshing: false }));
        }
    }, [business?.id, fetchFinance, fetchInventory, fetchSales, fetchPurchases, fetchManufacturing, fetchAnalytics, fetchPayroll, fetchApprovals, fetchExpenses]);

    // Keep a ref to the latest fetch functions so the init effect doesn't need
    // them in its dep array (avoids re-running when callbacks are recreated)
    const fetchersRef = useRef({});
    fetchersRef.current = { fetchFinance, fetchSales, fetchAnalytics, fetchInventory, fetchPurchases, fetchExpenses };

    // Initial load: shell-first bootstrap, then background modules.
    // Only re-run when business.id changes. Generation token prevents stale races.
    useEffect(() => {
        const id = business?.id;
        if (!id) {
            shellReadyBusinessIdRef.current = null;
            setIsShellReady(false);
            setIsDataLoaded(false);
            return;
        }
        if (shellReadyBusinessIdRef.current === id) return;

        const generation = ++fetchGenerationRef.current;
        moduleInFlightRef.current = {};
        moduleReadyRef.current = {};
        setModuleReady({});
        setIsShellReady(false);
        setIsDataLoaded(false);
        setDashboardMetrics(null);
        setAccountingSummary(null);
        setDashboardChartData([]);
        setExpenseBreakdown([]);
        setAdvancedDashboardSnapshot(null);

        const {
            fetchFinance,
            fetchSales,
            fetchAnalytics,
            fetchInventory,
            fetchPurchases,
            fetchExpenses,
        } = fetchersRef.current;

        const markShellReady = () => {
            if (fetchGenerationRef.current !== generation) return;
            shellReadyBusinessIdRef.current = id;
            financeDateKeyRef.current = `${id}|${dateFromISO}|${dateToISO}`;
            setIsShellReady(true);
        };

        const shellWork = Promise.allSettled([fetchAnalytics(), fetchFinance()]);
        const timeout = new Promise((resolve) => {
            setTimeout(resolve, SHELL_FETCH_TIMEOUT_MS);
        });

        Promise.race([shellWork, timeout]).finally(() => {
            markShellReady();
            if (fetchGenerationRef.current !== generation) return;

            Promise.allSettled([
                fetchSales(),
                fetchInventory(),
                fetchPurchases(),
                fetchExpenses(),
            ]).then(() => {
                if (fetchGenerationRef.current !== generation) return;
                setIsDataLoaded(true);
            });
        });
    }, [business?.id]);

    const value = useMemo(() => ({
        invoices,
        products,
        customers,
        vendors,
        quotations,
        salesOrders,
        challans,
        purchaseOrders,
        locations,
        bomList,
        productionOrders,
        payrollEmployees,
        payrollRuns,
        pendingApprovals,
        approvalHistory,
        accountingSummary,
        dashboardChartData,
        dashboardMetrics,
        expenseBreakdown,
        expenses,
        advancedDashboardSnapshot,
        isShellReady,
        isDataLoaded,
        isLoading: Object.values(loadingModules).some(Boolean),
        loadingModules,
        moduleReady,
        refreshAllData,
        fetchFinance,
        fetchAnalytics,
        fetchInventory,
        fetchSales,
        fetchManufacturing,
        fetchPurchases,
        fetchPayroll,
        fetchApprovals,
        fetchExpenses
    }), [
        invoices,
        products,
        customers,
        vendors,
        quotations,
        salesOrders,
        challans,
        purchaseOrders,
        locations,
        bomList,
        productionOrders,
        payrollEmployees,
        payrollRuns,
        pendingApprovals,
        approvalHistory,
        accountingSummary,
        dashboardChartData,
        dashboardMetrics,
        expenseBreakdown,
        expenses,
        advancedDashboardSnapshot,
        isShellReady,
        isDataLoaded,
        loadingModules,
        moduleReady,
        refreshAllData,
        fetchFinance,
        fetchAnalytics,
        fetchInventory,
        fetchSales,
        fetchManufacturing,
        fetchPurchases,
        fetchPayroll,
        fetchApprovals,
        fetchExpenses,
    ]);


    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}
