'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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
  generateSkuFromName,
  detectColumnMapping
} from '@/lib/services/excelImportService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { MOBILE_DIALOG_SHELL_WIDE } from '@/lib/utils/formMobileStyles';
import { cn } from '@/lib/utils';
import { resolveDomainKey } from '@/lib/config/domainKeyAliases';

/** Canonical fields the owner can map spreadsheet columns onto (order = display order). */
const BASE_MAPPABLE_FIELDS = [
  { key: 'name', label: 'Product Name', required: true },
  { key: 'sku', label: 'SKU / Code' },
  { key: 'price', label: 'Selling Price' },
  { key: 'cost_price', label: 'Cost Price' },
  { key: 'stock', label: 'Stock Qty' },
  { key: 'min_stock', label: 'Min Stock' },
  { key: 'mrp', label: 'MRP' },
  { key: 'category', label: 'Category' },
  { key: 'brand', label: 'Brand' },
  { key: 'unit', label: 'Unit' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'tax_percent', label: 'Tax %' },
  { key: 'hsn_code', label: 'HSN / SAC' },
  { key: 'batch_number', label: 'Batch #' },
  { key: 'expiry_date', label: 'Expiry Date' },
  { key: 'serial_number', label: 'Serial #' },
];

const TEXTILE_MAPPABLE_FIELDS = [
  { key: 'domain_data.articleno', label: 'Article No' },
  { key: 'domain_data.designno', label: 'Design No' },
  { key: 'domain_data.fabrictype', label: 'Fabric Type' },
  { key: 'domain_data.korafinished', label: 'Kora/Finished' },
  { key: 'domain_data.widtharz', label: 'Width (Arz)' },
  { key: 'domain_data.thaanlength', label: 'Thaan Length' },
  { key: 'domain_data.suitcutting', label: 'Suit Cutting' },
  { key: 'domain_data.sourcing', label: 'Sourcing' },
  { key: 'domain_data.origin', label: 'Origin' },
];

function getMappableFields(category) {
  const key = String(category || '').toLowerCase();
  if (key === 'textile-wholesale' || key === 'textile') {
    return [...BASE_MAPPABLE_FIELDS, ...TEXTILE_MAPPABLE_FIELDS];
  }
  return BASE_MAPPABLE_FIELDS;
}

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
  category = 'retail-shop',
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
  const [columnMapping, setColumnMapping] = useState({});

  // Header labels of the currently selected sheet
  const sheetHeaders = useMemo(() => {
    if (!parseResult || !selectedSheet) return [];
    const firstRow = parseResult.sheets[selectedSheet]?.[0];
    return firstRow ? Object.keys(firstRow) : [];
  }, [parseResult, selectedSheet]);

  // Auto-detect the column mapping whenever the selected sheet's headers change
  useEffect(() => {
    if (sheetHeaders.length === 0) {
      setColumnMapping({});
      return;
    }
    setColumnMapping(detectColumnMapping(sheetHeaders, { category }));
  }, [sheetHeaders, category]);

  const mappableFields = useMemo(
    () => getMappableFields(resolveDomainKey(category)),
    [category]
  );

  const mappedFieldCount = useMemo(
    () => mappableFields.filter((f) => columnMapping[f.key]).length,
    [columnMapping, mappableFields]
  );
  const nameMapped = Boolean(columnMapping.name);

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

    // Validate each row using the (possibly owner-adjusted) intelligent column mapping
    const results = sheetData.map((row, index) => ({
      ...validateImportRow(row, existingMap, category, columnMapping),
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
    setColumnMapping({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'Name', 'SKU', 'Category', 'Brand', 'Unit', 'Cost', 'Price', 'MRP',
      'Stock', 'Min Stock', 'Barcode', 'HSN Code', 'Tax %',
    ];
    const sampleRows = [
      ['Sample Product A', 'SKU-001', 'General', 'Acme', 'pcs', '80', '120', '150', '25', '5', '8901234567890', '', '17'],
      ['Sample Product B', 'SKU-002', 'General', '', 'pcs', '40', '65', '', '10', '2', '', '', '17'],
    ];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...sampleRows].map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
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
              <strong>Smart import:</strong> Upload any Excel/CSV, even with your own column names
              (e.g. &quot;Item&quot;, &quot;Rate&quot;, &quot;Qty&quot;). We auto-detect and map the columns for you.
              Only a product name column is required.
            </div>

            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Download a sample CSV template
            </button>
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

            {selectedSheet && sheetHeaders.length > 0 && (
              <div className="rounded-md border border-gray-200 bg-gray-50/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-800">Column mapping</span>
                    <Badge variant="secondary" className="bg-blue-100 text-[10px] font-bold uppercase text-blue-700">
                      Auto-detected
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">
                    {mappedFieldCount} field{mappedFieldCount === 1 ? '' : 's'} matched
                  </span>
                </div>
                <p className="mb-3 text-xs text-gray-500">
                  We matched your spreadsheet columns to product fields. Adjust any that look wrong before validating.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {mappableFields.map((field) => {
                    const value = columnMapping[field.key] || '';
                    const missingRequired = field.required && !value;
                    return (
                      <label key={field.key} className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                          {field.label}
                          {field.required && <span className="text-red-500">*</span>}
                        </span>
                        <select
                          value={value}
                          onChange={(e) =>
                            setColumnMapping((prev) => {
                              const next = { ...prev };
                              if (e.target.value) next[field.key] = e.target.value;
                              else delete next[field.key];
                              return next;
                            })
                          }
                          className={cn(
                            'w-full rounded-md border bg-white px-2 py-1.5 text-xs',
                            missingRequired ? 'border-red-300 text-red-600' : 'border-gray-200 text-gray-700'
                          )}
                        >
                          <option value="">— Not imported —</option>
                          {sheetHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  })}
                </div>
                {!nameMapped && (
                  <div className="mt-3 flex items-center gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Map a column to <strong>Product Name</strong> to continue — it is required.
                  </div>
                )}
              </div>
            )}

            {selectedSheet && (
              <div className="border rounded-md overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      {sheetHeaders.map(key => (
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
                disabled={loading || (step === 2 && (!selectedSheet || !nameMapped)) || (step === 3 && importSummary?.rowsWithErrors === importSummary?.totalRows)}
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
