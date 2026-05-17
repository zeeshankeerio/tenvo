'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, GitBranch, CheckCircle2, XCircle, Bell, Zap, Plus,
    ChevronRight, ArrowDown, Trash2, Settings, Copy, Save,
    FileText, DollarSign, ShoppingCart, RefreshCcw, Users,
    AlertTriangle, Eye, Layers, GripVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const NODE_TYPES = {
    trigger: { label: 'Trigger', icon: Play, color: 'bg-emerald-500', description: 'Starts the workflow' },
    approval: { label: 'Approval', icon: CheckCircle2, color: 'bg-indigo-500', description: 'Requires approval from a role' },
    condition: { label: 'Condition', icon: GitBranch, color: 'bg-amber-500', description: 'Branch based on a rule' },
    action: { label: 'Action', icon: Zap, color: 'bg-wine-500', description: 'Execute an operation' },
    notification: { label: 'Notification', icon: Bell, color: 'bg-blue-500', description: 'Send alert or email' },
    reject: { label: 'Reject', icon: XCircle, color: 'bg-red-500', description: 'End with rejection' },
};

const TRIGGER_OPTIONS = [
    { id: 'po_created', label: 'Purchase Order Created', icon: ShoppingCart },
    { id: 'discount_requested', label: 'Discount Requested', icon: DollarSign },
    { id: 'refund_initiated', label: 'Refund Initiated', icon: RefreshCcw },
    { id: 'expense_submitted', label: 'Expense Report Submitted', icon: FileText },
    { id: 'new_employee', label: 'New Employee Added', icon: Users },
];

const APPROVAL_ROLES = ['manager', 'admin', 'owner', 'accountant', 'warehouse_manager'];

const CONDITION_OPTIONS = [
    { id: 'amount_gt_10000', label: 'Amount > 10,000' },
    { id: 'amount_gt_50000', label: 'Amount > 50,000' },
    { id: 'department_finance', label: 'Department = Finance' },
    { id: 'department_operations', label: 'Department = Operations' },
    { id: 'customer_vip', label: 'Customer is VIP' },
];

const PRESET_WORKFLOWS = [
    {
        id: 'po_approval', name: 'Purchase Order Approval',
        description: 'Auto-approve small POs, route large ones to admin',
        nodes: [
            { id: 'n1', type: 'trigger', config: { trigger: 'po_created' }, x: 0, y: 0 },
            { id: 'n2', type: 'condition', config: { condition: 'amount_gt_10000' }, x: 0, y: 1 },
            { id: 'n3', type: 'action', config: { action: 'Auto-approve PO' }, x: -1, y: 2 },
            { id: 'n4', type: 'approval', config: { role: 'admin' }, x: 1, y: 2 },
            { id: 'n5', type: 'notification', config: { message: 'PO approved notify vendor' }, x: 0, y: 3 },
        ]
    },
    {
        id: 'discount_approval', name: 'Discount Approval',
        description: 'Manager approves discounts, auto-reject excessive ones',
        nodes: [
            { id: 'n1', type: 'trigger', config: { trigger: 'discount_requested' }, x: 0, y: 0 },
            { id: 'n2', type: 'condition', config: { condition: 'amount_gt_50000' }, x: 0, y: 1 },
            { id: 'n3', type: 'approval', config: { role: 'manager' }, x: -1, y: 2 },
            { id: 'n4', type: 'reject', config: { reason: 'Discount exceeds maximum threshold' }, x: 1, y: 2 },
            { id: 'n5', type: 'notification', config: { message: 'Discount approved' }, x: -1, y: 3 },
        ]
    },
    {
        id: 'refund_flow', name: 'Refund Approval',
        description: 'All refunds require manager sign-off',
        nodes: [
            { id: 'n1', type: 'trigger', config: { trigger: 'refund_initiated' }, x: 0, y: 0 },
            { id: 'n2', type: 'approval', config: { role: 'manager' }, x: 0, y: 1 },
            { id: 'n3', type: 'action', config: { action: 'Process refund' }, x: 0, y: 2 },
            { id: 'n4', type: 'notification', config: { message: 'Refund completed notify customer' }, x: 0, y: 3 },
        ]
    },
    {
        id: 'expense_flow', name: 'Expense Approval',
        description: 'Accountant reviews, then manager approves',
        nodes: [
            { id: 'n1', type: 'trigger', config: { trigger: 'expense_submitted' }, x: 0, y: 0 },
            { id: 'n2', type: 'approval', config: { role: 'accountant' }, x: 0, y: 1 },
            { id: 'n3', type: 'approval', config: { role: 'manager' }, x: 0, y: 2 },
            { id: 'n4', type: 'action', config: { action: 'Reimburse employee' }, x: 0, y: 3 },
        ]
    },
];

function WorkflowNode({ node, isSelected, onClick, onDelete }) {
    const nType = NODE_TYPES[node.type];
    const Icon = nType?.icon || Zap;

    const getLabel = () => {
        if (node.type === 'trigger') {
            const trigger = TRIGGER_OPTIONS.find(t => t.id === node.config?.trigger);
            return trigger?.label || 'Select Trigger';
        }
        if (node.type === 'approval') return `Requires: ${node.config?.role || 'Select role'}`;
        if (node.type === 'condition') {
            const cond = CONDITION_OPTIONS.find(c => c.id === node.config?.condition);
            return cond?.label || 'Set Condition';
        }
        if (node.type === 'action') return node.config?.action || 'Configure Action';
        if (node.type === 'notification') return node.config?.message || 'Set Message';
        if (node.type === 'reject') return node.config?.reason || 'Rejection';
        return nType?.label;
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                'relative group flex items-center gap-3 p-3 rounded-2xl border-2 bg-white transition-all cursor-pointer hover:shadow-lg',
                isSelected ? 'border-indigo-400 shadow-indigo-100 shadow-lg' : 'border-gray-100 hover:border-gray-200'
            )}
            onClick={onClick}
        >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0', nType?.color)}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{nType?.label}</span>
                </div>
                <p className="text-xs font-semibold text-gray-800 truncate mt-0.5">{getLabel()}</p>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition-all"
            >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
        </motion.div>
    );
}

export function WorkflowBuilder({ businessId }) {
    const [workflows, setWorkflows] = useState(PRESET_WORKFLOWS);
    const [activeWorkflow, setActiveWorkflow] = useState(null);
    const [nodes, setNodes] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [showNodePicker, setShowNodePicker] = useState(false);
    const [workflowName, setWorkflowName] = useState('');

    const loadWorkflow = (wf) => {
        setActiveWorkflow(wf.id);
        setNodes(wf.nodes);
        setWorkflowName(wf.name);
        setSelectedNode(null);
    };

    const createNew = () => {
        const id = `wf-${Date.now()}`;
        setActiveWorkflow(id);
        setNodes([{ id: `n-${Date.now()}`, type: 'trigger', config: {}, x: 0, y: 0 }]);
        setWorkflowName('New Workflow');
        setSelectedNode(null);
    };

    const addNode = (type) => {
        const newNode = {
            id: `n-${Date.now()}`,
            type: type,
            config: {},
            x: 0,
            y: nodes.length,
        };
        setNodes(prev => [...prev, newNode]);
        setShowNodePicker(false);
        setSelectedNode(newNode.id);
    };

    const updateNode = (id, updates) => {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    };

    const deleteNode = (id) => {
        setNodes(prev => prev.filter(n => n.id !== id));
        if (selectedNode === id) setSelectedNode(null);
    };

    const saveWorkflow = () => {
        const wf = {
            id: activeWorkflow,
            name: workflowName,
            description: `${nodes.length} steps workflow`,
            nodes: nodes,
        };
        setWorkflows(prev => {
            const existing = prev.findIndex(w => w.id === activeWorkflow);
            if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = wf;
                return updated;
            }
            return [...prev, wf];
        });
    };

    const selectedNodeData = nodes.find(n => n.id === selectedNode);

    // List view (no active workflow)
    if (!activeWorkflow) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-gray-900">Workflow Templates</h3>
                        <p className="text-sm text-gray-400">Pre-built approval flows. Click to customize or create your own.</p>
                    </div>
                    <Button onClick={createNew} className="h-9 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-1.5" /> New Workflow
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workflows.map(wf => (
                        <motion.button
                            key={wf.id}
                            whileHover={{ y: -4 }}
                            onClick={() => loadWorkflow(wf)}
                            className="text-left p-5 rounded-2xl border-2 border-gray-100 hover:border-indigo-200 hover:shadow-lg bg-white transition-all"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                        <GitBranch className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900">{wf.name}</h4>
                                        <p className="text-xs text-gray-400 mt-0.5">{wf.description}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 mt-1" />
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                                {wf.nodes.map(n => {
                                    const cfg = NODE_TYPES[n.type];
                                    return (
                                        <div key={n.id} className="flex items-center gap-1">
                                            <div className={cn('w-6 h-6 rounded-md flex items-center justify-center text-white', cfg?.color)}>
                                                {React.createElement(cfg?.icon || Zap, { className: 'w-3 h-3' })}
                                            </div>
                                        </div>
                                    );
                                })}
                                <span className="text-[10px] text-gray-400 ml-1">{wf.nodes.length} steps</span>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>
        );
    }

    // Editor view
    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" className="h-8 text-xs font-bold rounded-lg" onClick={() => setActiveWorkflow(null)}>
                    Back to List
                </Button>
                <Input
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    className="h-8 w-56 text-sm font-bold rounded-lg border-2"
                />
                <div className="flex-1" />
                <Button variant="outline" className="h-8 text-xs font-bold rounded-lg" onClick={() => setShowNodePicker(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Step
                </Button>
                <Button className="h-8 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700" onClick={saveWorkflow}>
                    <Save className="w-3.5 h-3.5 mr-1.5" /> Save
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Flow Canvas */}
                <div className="lg:col-span-2">
                    <Card className="border-none shadow-sm">
                        <CardContent className="p-6">
                            <div className="space-y-2">
                                <AnimatePresence>
                                    {nodes.map((node, idx) => (
                                        <React.Fragment key={node.id}>
                                            <WorkflowNode
                                                node={node}
                                                isSelected={selectedNode === node.id}
                                                onClick={() => setSelectedNode(node.id)}
                                                onDelete={deleteNode}
                                            />
                                            {idx < nodes.length - 1 && (
                                                <div className="flex justify-center py-1">
                                                    <ArrowDown className="w-4 h-4 text-gray-300" />
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </AnimatePresence>

                                {nodes.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <GitBranch className="w-12 h-12 text-gray-200 mb-4" />
                                        <h3 className="text-lg font-bold text-gray-400">Empty Workflow</h3>
                                        <p className="text-sm text-gray-300 mt-1">Add steps to build your approval flow</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Inspector Panel */}
                <div className="lg:col-span-1">
                    <Card className="border-none shadow-sm sticky top-4">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Settings className="w-4 h-4 text-gray-400" />
                                {selectedNodeData ? 'Step Configuration' : 'Inspector'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedNodeData ? (
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-xs font-bold text-gray-600">Step Type</Label>
                                        <p className="text-sm font-semibold text-gray-800 mt-1 capitalize">{NODE_TYPES[selectedNodeData.type]?.label}</p>
                                    </div>

                                    {selectedNodeData.type === 'trigger' && (
                                        <div>
                                            <Label className="text-xs font-bold text-gray-600 mb-2 block">Trigger Event</Label>
                                            {TRIGGER_OPTIONS.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => updateNode(selectedNodeData.id, { config: { ...selectedNodeData.config, trigger: t.id } })}
                                                    className={cn(
                                                        'w-full flex items-center gap-2 p-2 rounded-lg mb-1 text-xs font-medium transition-all text-left',
                                                        selectedNodeData.config?.trigger === t.id
                                                            ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' : 'hover:bg-gray-50'
                                                    )}
                                                >
                                                    <t.icon className="w-4 h-4" />
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {selectedNodeData.type === 'approval' && (
                                        <div>
                                            <Label className="text-xs font-bold text-gray-600 mb-2 block">Approver Role</Label>
                                            {APPROVAL_ROLES.map(role => (
                                                <button
                                                    key={role}
                                                    onClick={() => updateNode(selectedNodeData.id, { config: { ...selectedNodeData.config, role } })}
                                                    className={cn(
                                                        'w-full p-2 rounded-lg mb-1 text-xs font-medium transition-all text-left capitalize',
                                                        selectedNodeData.config?.role === role
                                                            ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' : 'hover:bg-gray-50'
                                                    )}
                                                >
                                                    {role.replace(/_/g, ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {selectedNodeData.type === 'condition' && (
                                        <div>
                                            <Label className="text-xs font-bold text-gray-600 mb-2 block">Condition Rule</Label>
                                            {CONDITION_OPTIONS.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => updateNode(selectedNodeData.id, { config: { ...selectedNodeData.config, condition: c.id } })}
                                                    className={cn(
                                                        'w-full p-2 rounded-lg mb-1 text-xs font-medium transition-all text-left',
                                                        selectedNodeData.config?.condition === c.id
                                                            ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'hover:bg-gray-50'
                                                    )}
                                                >
                                                    {c.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {selectedNodeData.type === 'action' && (
                                        <div>
                                            <Label className="text-xs font-bold text-gray-600">Action Name</Label>
                                            <Input
                                                value={selectedNodeData.config?.action || ''}
                                                onChange={(e) => updateNode(selectedNodeData.id, { config: { ...selectedNodeData.config, action: e.target.value } })}
                                                placeholder="e.g., Process refund"
                                                className="mt-1 h-9 text-sm rounded-lg"
                                            />
                                        </div>
                                    )}

                                    {selectedNodeData.type === 'notification' && (
                                        <div>
                                            <Label className="text-xs font-bold text-gray-600">Notification Message</Label>
                                            <Input
                                                value={selectedNodeData.config?.message || ''}
                                                onChange={(e) => updateNode(selectedNodeData.id, { config: { ...selectedNodeData.config, message: e.target.value } })}
                                                placeholder="e.g., Order approved"
                                                className="mt-1 h-9 text-sm rounded-lg"
                                            />
                                        </div>
                                    )}

                                    {selectedNodeData.type === 'reject' && (
                                        <div>
                                            <Label className="text-xs font-bold text-gray-600">Rejection Reason</Label>
                                            <Input
                                                value={selectedNodeData.config?.reason || ''}
                                                onChange={(e) => updateNode(selectedNodeData.id, { config: { ...selectedNodeData.config, reason: e.target.value } })}
                                                placeholder="e.g., Exceeds limit"
                                                className="mt-1 h-9 text-sm rounded-lg"
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Eye className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                    <p className="text-sm text-gray-400">Select a step to configure</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Add Node Dialog */}
            <Dialog open={showNodePicker} onOpenChange={setShowNodePicker}>
                <DialogContent className="sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black">Add Step</DialogTitle>
                        <DialogDescription>Choose a step type to add to your workflow.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 mt-2">
                        {Object.entries(NODE_TYPES).map(([key, type]) => (
                            <button
                                key={key}
                                onClick={() => addNode(key)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left"
                            >
                                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white', type.color)}>
                                    <type.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{type.label}</p>
                                    <p className="text-xs text-gray-400">{type.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

