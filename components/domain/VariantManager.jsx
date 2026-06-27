'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, X, ListTree, Package, Layers, Settings2, Grid3X3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { generateCombinations, Attribute, Variant } from '@/lib/utils/variantUtils';
import { formatCurrency } from '@/lib/currency';

export function VariantManager({
  value = [],
  onChange,
  product = {},
  category = 'retail-shop',
}) {
  const [attributes, setAttributes] = useState([]);
  const [variants, setVariants] = useState(value);
  const [view, setView] = useState('generate');

  // Sync internal state with prop
  useEffect(() => {
    if (value && value.length > 0 && variants.length === 0) {
      setVariants(value);
      setView('list');
    }
  }, [value]);

  const addAttribute = useCallback(() => {
    setAttributes(prev => [...prev, { name: '', values: [] }]);
  }, []);

  const removeAttribute = useCallback((index) => {
    setAttributes(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateAttributeName = useCallback((index, name) => {
    setAttributes(prev => prev.map((attr, i) => i === index ? { ...attr, name } : attr));
  }, []);

  const addValue = useCallback((index, val) => {
    if (!val.trim()) return;
    setAttributes(prev => prev.map((attr, i) => {
      if (i === index && !attr.values.includes(val.trim())) {
        return { ...attr, values: [...attr.values, val.trim()] };
      }
      return attr;
    }));
  }, []);

  const removeValue = useCallback((attrIndex, valueIndex) => {
    setAttributes(prev => prev.map((attr, i) => {
      if (i === attrIndex) {
        return { ...attr, values: attr.values.filter((_, j) => j !== valueIndex) };
      }
      return attr;
    }));
  }, []);

  const handleGenerate = useCallback(() => {
    const validAttributes = attributes.filter(attr => attr.name && attr.values.length > 0);
    if (validAttributes.length === 0) return;

    const newVariants = generateCombinations(validAttributes, product.sku || 'PROD', product.price || 0);
    setVariants(newVariants);
    onChange?.(newVariants);
    setView('list');
  }, [attributes, product, onChange]);

  const updateVariant = useCallback((index, field, val) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: val };
    setVariants(updated);
    onChange?.(updated);
  }, [variants, onChange]);

  const removeVariant = useCallback((index) => {
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
    onChange?.(updated);
  }, [variants, onChange]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex p-1 bg-gray-100 rounded-lg">
          <Button
            variant={view === 'generate' ? "white" : "ghost"}
            size="sm"
            onClick={() => setView('generate')}
            className={view === 'generate' ? "shadow-sm" : ""}
          >
            <Grid3X3 className="w-4 h-4 mr-2" /> Generator
          </Button>
          <Button
            variant={view === 'list' ? "white" : "ghost"}
            size="sm"
            onClick={() => setView('list')}
            className={view === 'list' ? "shadow-sm" : ""}
          >
            <ListTree className="w-4 h-4 mr-2" /> All Variants ({variants.length})
          </Button>
        </div>
      </div>

      {view === 'generate' ? (
        <Card className="border-indigo-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-indigo-50/50 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 text-white rounded-lg">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-indigo-900">Variation Generator</CardTitle>
                  <CardDescription className="text-indigo-700/80">Design sizes, colors, or materials for batch creation</CardDescription>
                </div>
              </div>
              <Button variant="outline" onClick={addAttribute} className="border-indigo-200">
                <Plus className="w-4 h-4 mr-2" /> Add Attribute
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {attributes.length === 0 ? (
              <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium font-outfit">No generation rules defined yet.</p>
                <Button variant="link" onClick={addAttribute} className="text-indigo-600">Add an attribute to start</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {attributes.map((attr, index) => (
                  <div key={index} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm relative group">
                    <button
                      onClick={() => removeAttribute(index)}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-gray-400 uppercase">Attribute Name</Label>
                        <Input
                          placeholder="e.g. Size"
                          value={attr.name}
                          onChange={(e) => updateAttributeName(index, e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs font-bold text-gray-400 uppercase">Values (Press Enter)</Label>
                        <div className="flex flex-wrap gap-2 p-1.5 bg-gray-50 rounded-lg border min-h-[42px]">
                          {attr.values.map((v, vIdx) => (
                            <Badge key={vIdx} className="bg-white text-indigo-700 border-indigo-100 py-1 flex items-center gap-1">
                              {v}
                              <button onClick={() => removeValue(index, vIdx)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                            </Badge>
                          ))}
                          <input
                            placeholder="Type value..."
                            className="bg-transparent border-none outline-none text-sm flex-1 min-w-[80px]"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addValue(index, e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button onClick={handleGenerate} className="bg-indigo-600 hover:bg-indigo-700 font-bold px-8">
                    Generate Combinations
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-100 shadow-sm overflow-hidden auto-in fade-in zoom-in-95 duration-500">
          <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600 text-white rounded-lg">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-emerald-900">Active Variants</CardTitle>
                  <CardDescription className="text-emerald-700/80">Manage pricing and stock for each variation</CardDescription>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-emerald-600 uppercase">Total Stock</p>
                <p className="text-xl font-semibold text-emerald-900">{variants.reduce((s, v) => s + (v.stock || 0), 0)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {variants.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No variants created yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-emerald-50/30">
                  <TableRow className="border-emerald-100">
                    <TableHead className="font-bold text-emerald-900">Attributes</TableHead>
                    <TableHead className="font-bold text-emerald-900">SKU</TableHead>
                    <TableHead className="font-bold text-emerald-900 text-right">Price</TableHead>
                    <TableHead className="font-bold text-emerald-900 text-right">Stock</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((v, i) => (
                    <TableRow key={i} className="border-emerald-50">
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(v.attributes).map(([k, val]) => (
                            <Badge key={k} variant="outline" className="text-[10px] uppercase bg-white border-emerald-200 text-emerald-700">
                              {k}: {val}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-gray-400 font-bold">{v.sku}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="w-24 ml-auto text-right h-8 font-bold text-emerald-700 border-emerald-100"
                          value={v.price}
                          onChange={(e) => updateVariant(i, 'price', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="w-20 ml-auto text-right h-8 font-bold text-gray-900 border-emerald-100"
                          value={v.stock}
                          onChange={(e) => updateVariant(i, 'stock', parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeVariant(i)} className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
