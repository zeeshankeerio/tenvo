'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, User } from 'lucide-react';
import { generateNextEmployeeCode, formatEmployeeCode } from '@/lib/utils/employeeCodeGenerator';
import toast from 'react-hot-toast';

export function EmployeeFormDialog({ open, onOpenChange, onSubmit, businessId, employee = null }) {
    const isEdit = !!employee;
    
    const [formData, setFormData] = useState({
        employeeCode: '',
        fullName: '',
        cnic: '',
        phone: '',
        email: '',
        department: '',
        designation: '',
        joinDate: '',
        baseSalary: '',
        bankName: '',
        bankAccount: '',
        taxFiler: false
    });
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    
    // Load employee data if editing
    useEffect(() => {
        if (open && employee) {
            setFormData({
                employeeCode: employee.employee_code || '',
                fullName: employee.full_name || '',
                cnic: employee.cnic || '',
                phone: employee.phone || '',
                email: employee.email || '',
                department: employee.department || '',
                designation: employee.designation || '',
                joinDate: employee.join_date ? employee.join_date.split('T')[0] : '',
                baseSalary: employee.base_salary || '',
                bankName: employee.bank_name || '',
                bankAccount: employee.bank_account || '',
                taxFiler: employee.tax_filer || false
            });
        } else if (open && !employee) {
            // Auto-generate code for new employee
            handleGenerateCode();
        }
    }, [open, employee]);
    
    const handleGenerateCode = async () => {
        if (!businessId) return;
        
        setIsGenerating(true);
        try {
            const code = await generateNextEmployeeCode(businessId);
            setFormData(prev => ({ ...prev, employeeCode: code }));
            setErrors(prev => ({ ...prev, employeeCode: undefined }));
        } catch (error) {
            toast.error('Failed to generate employee code');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const validate = () => {
        const newErrors = {};
        
        if (!formData.employeeCode || !formData.employeeCode.trim()) {
            newErrors.employeeCode = 'Employee code is required';
        }
        
        if (!formData.fullName || !formData.fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        }
        
        if (formData.baseSalary && parseFloat(formData.baseSalary) < 0) {
            newErrors.baseSalary = 'Salary must be positive';
        }
        
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        
        return newErrors;
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        
        setIsSubmitting(true);
        try {
            const payload = {
                businessId,
                employeeCode: formatEmployeeCode(formData.employeeCode),
                fullName: formData.fullName.trim(),
                cnic: formData.cnic?.trim() || null,
                phone: formData.phone?.trim() || null,
                email: formData.email?.trim() || null,
                department: formData.department?.trim() || null,
                designation: formData.designation?.trim() || null,
                joinDate: formData.joinDate || null,
                baseSalary: formData.baseSalary ? parseFloat(formData.baseSalary) : 0,
                bankName: formData.bankName?.trim() || null,
                bankAccount: formData.bankAccount?.trim() || null,
                taxFiler: formData.taxFiler
            };
            
            if (isEdit) {
                payload.employeeId = employee.id;
            }
            
            await onSubmit(payload);
            handleClose();
        } catch (error) {
            toast.error(error.message || 'Failed to save employee');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleClose = () => {
        setFormData({
            employeeCode: '',
            fullName: '',
            cnic: '',
            phone: '',
            email: '',
            department: '',
            designation: '',
            joinDate: '',
            baseSalary: '',
            bankName: '',
            bankAccount: '',
            taxFiler: false
        });
        setErrors({});
        onOpenChange(false);
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        {isEdit ? 'Edit Employee' : 'Add New Employee'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit ? 'Update employee information' : 'Add a new employee to your payroll system'}
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Employee Code */}
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                        <div>
                            <Label htmlFor="employeeCode">
                                Employee Code <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="employeeCode"
                                value={formData.employeeCode}
                                onChange={(e) => setFormData(prev => ({ ...prev, employeeCode: e.target.value }))}
                                placeholder="EMP-0001"
                                disabled={isEdit || isGenerating}
                                className={errors.employeeCode ? 'border-red-500' : ''}
                            />
                            {errors.employeeCode && (
                                <p className="text-xs text-red-500 mt-1">{errors.employeeCode}</p>
                            )}
                        </div>
                        {!isEdit && (
                            <div className="flex items-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleGenerateCode}
                                    disabled={isGenerating}
                                    className="whitespace-nowrap"
                                >
                                    <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                                    Generate
                                </Button>
                            </div>
                        )}
                    </div>
                    
                    {/* Full Name */}
                    <div>
                        <Label htmlFor="fullName">
                            Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="fullName"
                            value={formData.fullName}
                            onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                            placeholder="John Doe"
                            className={errors.fullName ? 'border-red-500' : ''}
                        />
                        {errors.fullName && (
                            <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>
                        )}
                    </div>
                    
                    {/* CNIC and Phone */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="cnic">CNIC / National ID</Label>
                            <Input
                                id="cnic"
                                value={formData.cnic}
                                onChange={(e) => setFormData(prev => ({ ...prev, cnic: e.target.value }))}
                                placeholder="12345-1234567-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+92 300 1234567"
                            />
                        </div>
                    </div>
                    
                    {/* Email */}
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="john@example.com"
                            className={errors.email ? 'border-red-500' : ''}
                        />
                        {errors.email && (
                            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                        )}
                    </div>
                    
                    {/* Department and Designation */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="department">Department</Label>
                            <Input
                                id="department"
                                value={formData.department}
                                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                placeholder="Sales"
                            />
                        </div>
                        <div>
                            <Label htmlFor="designation">Designation</Label>
                            <Input
                                id="designation"
                                value={formData.designation}
                                onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                                placeholder="Sales Manager"
                            />
                        </div>
                    </div>
                    
                    {/* Join Date and Base Salary */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="joinDate">Join Date</Label>
                            <Input
                                id="joinDate"
                                type="date"
                                value={formData.joinDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, joinDate: e.target.value }))}
                            />
                        </div>
                        <div>
                            <Label htmlFor="baseSalary">Base Salary</Label>
                            <Input
                                id="baseSalary"
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.baseSalary}
                                onChange={(e) => setFormData(prev => ({ ...prev, baseSalary: e.target.value }))}
                                placeholder="50000"
                                className={errors.baseSalary ? 'border-red-500' : ''}
                            />
                            {errors.baseSalary && (
                                <p className="text-xs text-red-500 mt-1">{errors.baseSalary}</p>
                            )}
                        </div>
                    </div>
                    
                    {/* Bank Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="bankName">Bank Name</Label>
                            <Input
                                id="bankName"
                                value={formData.bankName}
                                onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                                placeholder="Allied Bank"
                            />
                        </div>
                        <div>
                            <Label htmlFor="bankAccount">Bank Account</Label>
                            <Input
                                id="bankAccount"
                                value={formData.bankAccount}
                                onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
                                placeholder="1234567890"
                            />
                        </div>
                    </div>
                    
                    {/* Tax Filer */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <Label htmlFor="taxFiler" className="font-semibold">Tax Filer</Label>
                            <p className="text-xs text-gray-500">Employee files income tax returns</p>
                        </div>
                        <Switch
                            id="taxFiler"
                            checked={formData.taxFiler}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, taxFiler: checked }))}
                        />
                    </div>
                    
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Employee' : 'Add Employee')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
