'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileUp,
  Eye,
  ChevronRight,
  AlertCircle,
  Download,
  Filter
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { toast } from 'react-hot-toast';
import {
  parseExcelFile,
  validateImportRow,
  transformImportedData,
  detectDuplicates,
  generateImportSummary,
  generateSkuFromName
} from '@/lib/services/excelImportService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { MOBILE_DIALOG_SHELL_WIDE } from '@/lib/utils/formMobileStyles';
import { cn } from '@/lib/utils';

/**
 * Excel Import Modal Component
 * 4-Step import workflow: Upload -> Parse -> Preview -> Validate -> Confirm
 * Production-ready with comprehensive error handling
 */
export function ExcelImportModal({
  onImport,
  onCancel,
  existingProducts = {},
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}) {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Validate, 4: Confirm
  const [loading, setLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [parseResult, setParseResult] = useState(null);
  const [validationResults, setValidationResults] = useState([]);
  const [importSummary, setImportSummary] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // all, valid, warnings, errors
  const [importingRows, setImportingRows] = useState([]);

  // Step 1: File Upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await parseExcelFile(file);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setImportFile(file);
      setParseResult(result);
      setSelectedSheet(result.sheetNames.includes('Products') ? 'Products' : result.sheetNames[0]);
      setStep(2);
      toast.success(`File parsed successfully: ${result.sheetCount} sheet(s)`);
    } catch (error) {
      toast.error('Failed to parse file');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Preview and Validate
  const handleProceedToValidation = () => {
    if (!parseResult || !selectedSheet) {
      toast.error('No data to validate');
      return;
    }

    const sheetData = parseResult.sheets[selectedSheet];
    if (!sheetData || sheetData.length === 0) {
      toast.error('Selected sheet is empty');
      return;
    }

    // Create map of existing products by SKU for duplicate detection
    const existingMap = {};
    Object.entries(existingProducts).forEach(([, product]) => {
      if (product.sku) {
        existingMap[product.sku] = product;
      }
    });

    // Validate each row
    const results = sheetData.map((row, index) => ({
      ...validateImportRow(row, existingMap),
      rowNumber: index + 2 // +2 because row 1 is header
    }));

    setValidationResults(results);

    // Generate summary
    const summary = generateImportSummary(parseResult, results);
    setImportSummary(summary);

    // If all rows have errors, warn user
    if (summary.rowsWithErrors === summary.totalRows) {
      toast.error('All rows have errors. Please fix data and try again.');
      return;
    }

    setStep(3);
  };

  // Step 3: Review and Filter
  const getFilteredResults = () => {
    if (filterMode === 'valid') {
      return validationResults.filter(r => r.isValid && r.errors.length === 0);
    }
    if (filterMode === 'warnings') {
      return validationResults.filter(r => r.warnings.length > 0 && r.errors.length === 0);
    }
    if (filterMode === 'errors') {
      return validationResults.filter(r => r.errors.length > 0);
    }
    return validationResults;
  };

  const handleConfirmImport = () => {
    const rowsToImport = validationResults.filter(r => r.errors.length === 0);

    if (rowsToImport.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    // Auto-generate SKUs where missing
    const processedRows = rowsToImport.map((row, index) => {
      if (!row.cleaned.sku) {
        row.cleaned.sku = generateSkuFromName(row.cleaned.name, index);
      }
      return row;
    });

    setImportingRows(processedRows);
    setStep(4);
  };

  // Step 4: Final Confirmation
  const handleExecuteImport = async () => {
    if (importingRows.length === 0) {
      toast.error('No rows to import');
      return;
    }

    setLoading(true);
    try {
      await onImport({
        rows: importingRows,
        file: importFile,
        selectedSheet,
      });
      toast.success(`Imported ${importingRows.length} products successfully`);
      resetModal();
    } catch (error) {
      toast.error(`Import failed: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setImportFile(null);
    setParseResult(null);
    setValidationResults([]);
    setImportSummary(null);
    setSelectedSheet(null);
    setImportingRows([]);
    setFilterMode('all');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isControlled = controlledOpen !== undefined;
  const dialogOpen = isControlled ? controlledOpen : undefined;

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) resetModal();
    controlledOnOpenChange?.(nextOpen);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 whitespace-nowrap rounded-lg border-gray-200 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-700 hover:bg-gray-50"
          >
            <Upload className="mr-2 h-4 w-4 shrink-0" />
            Import
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className={cn(MOBILE_DIALOG_SHELL_WIDE, 'max-w-3xl')}>
        <DialogHeader>
          <DialogTitle>Excel Import Wizard</DialogTitle>
          <DialogDescription>
            Step {step} of 4: {step === 1 ? 'Upload File' : step === 2 ? 'Select & Preview' : step === 3 ? 'Validate & Review' : 'Confirm Import'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition sm:p-8"
              onClick={() => fileInputRef.current?.click()}>
              <FileUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500 mt-1">Excel files (.xlsx, .xls) or CSV up to 10MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={loading}
              className="hidden"
            />

            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
              <strong>Required columns:</strong> Name, Price, Stock (Cost, SKU are optional)
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && parseResult && (
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Select Sheet</label>
              <select
                value={selectedSheet || ''}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="w-full mt-2 px-3 py-2 border rounded-md text-sm"
              >
                {parseResult.sheetNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {selectedSheet && (
              <div className="border rounded-md overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      {Object.keys(parseResult.sheets[selectedSheet][0] || {}).map(key => (
                        <th key={key} className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.sheets[selectedSheet].slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        {Object.values(row).map((val, colIdx) => (
                          <td key={colIdx} className="px-4 py-2 text-sm">
                            {String(val).substring(0, 50)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-xs text-gray-500">
              Showing first 5 rows of {parseResult.sheets[selectedSheet]?.length || 0} total rows
            </p>
          </div>
        )}

        {/* Step 3: Validate & Review */}
        {step === 3 && importSummary && (
          <div className="space-y-4 py-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-2">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{importSummary.totalRows}</div>
                  <p className="text-xs text-gray-500">Total Rows</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">{importSummary.validRows}</div>
                  <p className="text-xs text-gray-500">Valid</p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-50">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-yellow-600">{importSummary.rowsWithWarnings}</div>
                  <p className="text-xs text-gray-500">Warnings</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-600">{importSummary.rowsWithErrors}</div>
                  <p className="text-xs text-gray-500">Errors</p>
                </CardContent>
              </Card>
            </div>

            {/* Filter Tabs */}
            <Tabs value={filterMode} onValueChange={setFilterMode}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({validationResults.length})</TabsTrigger>
                <TabsTrigger value="valid" className="text-green-600">Valid ({validationResults.filter(r => r.isValid).length})</TabsTrigger>
                <TabsTrigger value="warnings" className="text-yellow-600">Warnings ({validationResults.filter(r => r.warnings.length > 0 && r.errors.length === 0).length})</TabsTrigger>
                <TabsTrigger value="errors" className="text-red-600">Errors ({validationResults.filter(r => r.errors.length > 0).length})</TabsTrigger>
              </TabsList>

              <TabsContent value={filterMode} className="space-y-2 max-h-64 overflow-y-auto">
                {getFilteredResults().map((result, idx) => (
                  <div key={idx} className={`p-3 rounded border ${result.isValid ? 'border-green-200 bg-green-50' : result.errors.length > 0 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{result.cleaned.name} ({result.cleaned.sku || 'no SKU'})</p>
                        {result.errors.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {result.errors.map((err, i) => (
                              <p key={i} className="text-xs text-red-700">[X] {err}</p>
                            ))}
                          </div>
                        )}
                        {result.warnings.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {result.warnings.map((warn, i) => (
                              <p key={i} className="text-xs text-yellow-700">[WARNING] {warn}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="ml-2">
                        {result.isValid ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : result.errors.length > 0 ? (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="space-y-4 py-4">
            <Card className="bg-blue-50">
              <CardContent className="pt-4">
                <p className="text-sm">
                  Ready to import <strong>{importingRows.length} products</strong>. This action cannot be undone.
                </p>
              </CardContent>
            </Card>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {importingRows.map((row, idx) => (
                <div key={idx} className="p-2 border rounded text-sm">
                  <p className="font-medium">{row.cleaned.name}</p>
                  <p className="text-xs text-gray-600">
                    SKU: {row.cleaned.sku} | Price: {row.cleaned.price} | Stock: {row.cleaned.stock}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 1) {
                onCancel?.();
              } else {
                setStep(step - 1);
              }
            }}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          <div className="space-x-2">
            {step < 4 && (
              <Button
                onClick={() => {
                  if (step === 1) {
                    fileInputRef.current?.click();
                  } else if (step === 2) {
                    handleProceedToValidation();
                  } else if (step === 3) {
                    handleConfirmImport();
                  }
                }}
                disabled={loading || (step === 2 && !selectedSheet) || (step === 3 && importSummary?.rowsWithErrors === importSummary?.totalRows)}
              >
                {step === 1 ? 'Choose File' : step === 2 ? 'Validate' : 'Confirm'}
                <ChevronRight className="w-4 h-4 ml-2 bg-emerald-600 hover:bg-emerald-700 text-white" />
              </Button>
            )}

            {step === 4 && (
              <Button
                onClick={handleExecuteImport}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Importing...' : 'Execute Import'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExcelImportModal;
