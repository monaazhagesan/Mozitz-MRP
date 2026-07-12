import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { TrendingUp, Calculator, Settings2, RefreshCw, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react";
import { addDays, format } from "date-fns";
type ForecastMethod = "moving_average" | "weighted_average" | "simple_trend" | "fixed_quantity" | "seasonal_index";

interface ForecastConfig {
  method: ForecastMethod;
  periods: number;
  weights?: number[];
  fixedQuantity?: number;
  seasonalFactors?: number[];
}

interface HistoricalData {
  item_code: string;
  item_name: string;
  periods: number[];
}

interface ForecastResult {
  item_code: string;
  item_name: string;
  historical: number[];
  forecast: number;
  method: ForecastMethod;
  isValid: boolean;
  validationMessage: string;
  selected?: boolean;
}

const METHOD_LABELS: Record<ForecastMethod, string> = {
  moving_average: "Moving Average",
  weighted_average: "Weighted Average",
  simple_trend: "Simple Trend",
  fixed_quantity: "Fixed Quantity",
  seasonal_index: "Seasonal Index",
};

const DEFAULT_WEIGHTS = [0.5, 0.3, 0.2];
const DEFAULT_SEASONAL_FACTORS = [1.2, 0.8, 1.0, 1.1, 0.9, 1.0, 1.0, 0.9, 1.1, 1.2, 1.3, 1.1];

export default function ForecastingTab() {
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [creatingDemands, setCreatingDemands] = useState(false);
  const [items, setItems] = useState<{ item_code: string; item_name: string }[]>([]);
  const [historicalData, setHistoricalData] = useState<Map<string, number[]>>(new Map());
  const [forecastResults, setForecastResults] = useState<ForecastResult[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<ForecastConfig>({
    method: "moving_average",
    periods: 3,
    weights: DEFAULT_WEIGHTS,
    fixedQuantity: 100,
    seasonalFactors: DEFAULT_SEASONAL_FACTORS,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      // Get items that have transaction history
      const txRes = await axios.get("/api/stock-transactions");
      const transactions = (txRes.data || [])
        .slice()
        .sort((a: any, b: any) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

      // Get unique items and their historical demand data
      const itemMap = new Map<string, number[]>();
      const itemNames = new Map<string, string>();

      // Group transactions by month for historical analysis
      (transactions || []).forEach((tx: any) => {
        if (tx.transaction_type === "Issue" || tx.transaction_type === "Sale") {
          const monthKey = new Date(tx.transaction_date).toISOString().slice(0, 7);
          const existing = itemMap.get(tx.item_code) || [];
          // For simplicity, aggregate by adding quantities
          itemMap.set(tx.item_code, [...existing, Math.abs(tx.quantity)]);
        }
      });

      // Get item names
      const itemCodes = Array.from(itemMap.keys());
      if (itemCodes.length > 0) {
        const invRes = await axios.get("/api/inventory-stock");
        const inventoryItems: any[] = invRes.data?.items || [];

        inventoryItems.forEach((item: any) => {
          const code = item.itemCode ?? item.item_code;
          const name = item.itemName ?? item.item_name;
          if (itemCodes.includes(code)) {
            itemNames.set(code, name);
          }
        });
      }

      setItems(
        itemCodes.map((code) => ({
          item_code: code,
          item_name: itemNames.get(code) || code,
        }))
      );
      setHistoricalData(itemMap);
    } catch (error: any) {
      toast({
        title: "Failed to load items",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMovingAverage = (data: number[], periods: number): number => {
    if (data.length < periods) return data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;
    const recentData = data.slice(-periods);
    return recentData.reduce((a, b) => a + b, 0) / periods;
  };

  const calculateWeightedAverage = (data: number[], weights: number[]): number => {
    if (data.length === 0) return 0;
    const periods = Math.min(data.length, weights.length);
    const recentData = data.slice(-periods);
    const usedWeights = weights.slice(0, periods);
    const totalWeight = usedWeights.reduce((a, b) => a + b, 0);
    let sum = 0;
    for (let i = 0; i < periods; i++) {
      sum += recentData[i] * usedWeights[i];
    }
    return sum / totalWeight;
  };

  const calculateSimpleTrend = (data: number[]): number => {
    if (data.length < 2) return data.length > 0 ? data[0] : 0;
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return Math.max(0, intercept + slope * n); // Predict next period
  };

  const calculateSeasonalIndex = (data: number[], factors: number[]): number => {
    if (data.length === 0) return 0;
    const baseAverage = data.reduce((a, b) => a + b, 0) / data.length;
    const currentMonth = new Date().getMonth();
    const seasonalFactor = factors[currentMonth] || 1;
    return baseAverage * seasonalFactor;
  };

  const validateForecast = (forecast: number, historical: number[]): { isValid: boolean; message: string } => {
    if (historical.length < 2) {
      return { isValid: false, message: "Insufficient historical data (need at least 2 periods)" };
    }
    
    const avg = historical.reduce((a, b) => a + b, 0) / historical.length;
    const stdDev = Math.sqrt(historical.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / historical.length);
    
    // Check if forecast is within 3 standard deviations
    if (forecast < 0) {
      return { isValid: false, message: "Forecast cannot be negative" };
    }
    
    if (stdDev > 0 && Math.abs(forecast - avg) > 3 * stdDev) {
      return { isValid: false, message: `Forecast (${forecast.toFixed(0)}) deviates significantly from historical average (${avg.toFixed(0)})` };
    }
    
    if (forecast === 0 && avg > 0) {
      return { isValid: false, message: "Zero forecast with positive historical demand" };
    }
    
    return { isValid: true, message: "Forecast validated successfully" };
  };

  const runForecast = () => {
    setRunning(true);
    try {
      const results: ForecastResult[] = [];

      items.forEach((item) => {
        const historical = historicalData.get(item.item_code) || [];
        let forecast = 0;

        switch (config.method) {
          case "moving_average":
            forecast = calculateMovingAverage(historical, config.periods);
            break;
          case "weighted_average":
            forecast = calculateWeightedAverage(historical, config.weights || DEFAULT_WEIGHTS);
            break;
          case "simple_trend":
            forecast = calculateSimpleTrend(historical);
            break;
          case "fixed_quantity":
            forecast = config.fixedQuantity || 100;
            break;
          case "seasonal_index":
            forecast = calculateSeasonalIndex(historical, config.seasonalFactors || DEFAULT_SEASONAL_FACTORS);
            break;
        }

        const validation = validateForecast(forecast, historical);

        results.push({
          item_code: item.item_code,
          item_name: item.item_name,
          historical: historical.slice(-6), // Last 6 periods for display
          forecast: Math.round(forecast),
          method: config.method,
          isValid: validation.isValid,
          validationMessage: validation.message,
        });
      });

      setForecastResults(results);
      
      const validCount = results.filter(r => r.isValid).length;
      const invalidCount = results.filter(r => !r.isValid).length;
      
      toast({
        title: "Forecast Complete",
        description: `${validCount} valid, ${invalidCount} need review`,
      });
    } catch (error: any) {
      toast({
        title: "Forecast Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const handleWeightChange = (index: number, value: string) => {
    const newWeights = [...(config.weights || DEFAULT_WEIGHTS)];
    newWeights[index] = parseFloat(value) || 0;
    setConfig({ ...config, weights: newWeights });
  };

  const toggleItemSelection = (itemCode: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemCode)) {
        newSet.delete(itemCode);
      } else {
        newSet.add(itemCode);
      }
      return newSet;
    });
  };

  const selectAllValid = () => {
    const validItemCodes = forecastResults
      .filter((r) => r.isValid && r.forecast > 0)
      .map((r) => r.item_code);
    setSelectedItems(new Set(validItemCodes));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const createDemandsFromForecast = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select forecast items to create demands",
        variant: "destructive",
      });
      return;
    }

    setCreatingDemands(true);
    try {
      const selectedForecasts = forecastResults.filter((r) => selectedItems.has(r.item_code));
      const requiredDate = addDays(new Date(), 30); // Default 30 days lead time
      
      const demandsToCreate = selectedForecasts.map((forecast, index) => ({
        demand_number: `DEM-FC-${Date.now()}-${index + 1}`,
        item_code: forecast.item_code,
        item_name: forecast.item_name,
        quantity: forecast.forecast,
        required_date: requiredDate.toISOString(),
        department: "Planning",
        status: "Pending",
        description: `Auto-generated from ${METHOD_LABELS[forecast.method]} forecast`,
        notes: `[FORECAST] Method: ${METHOD_LABELS[forecast.method]}, Historical avg: ${
          forecast.historical.length > 0
            ? Math.round(forecast.historical.reduce((a, b) => a + b, 0) / forecast.historical.length)
            : "N/A"
        }`,
      }));

      await Promise.all(
        demandsToCreate.map((demand) =>
          axios.post("/api/item-demands", { id: crypto.randomUUID(), ...demand })
        )
      );

      toast({
        title: "Demands Created",
        description: `Successfully created ${demandsToCreate.length} item demand(s) from forecast`,
      });

      setSelectedItems(new Set());
    } catch (error: any) {
      toast({
        title: "Failed to Create Demands",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingDemands(false);
    }
  };

  const validCount = forecastResults.filter((r) => r.isValid).length;
  const invalidCount = forecastResults.filter((r) => !r.isValid).length;

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Forecast Configuration
          </CardTitle>
          <CardDescription>
            Configure forecast method and parameters for demand prediction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Method Selection */}
            <div className="space-y-2">
              <Label>Forecast Method</Label>
              <Select
                value={config.method}
                onValueChange={(value) => setConfig({ ...config, method: value as ForecastMethod })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moving_average">Moving Average</SelectItem>
                  <SelectItem value="weighted_average">Weighted Average</SelectItem>
                  <SelectItem value="simple_trend">Simple Trend</SelectItem>
                  <SelectItem value="fixed_quantity">Fixed Quantity</SelectItem>
                  <SelectItem value="seasonal_index">Seasonal Index</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period Selection (for Moving Average) */}
            {config.method === "moving_average" && (
              <div className="space-y-2">
                <Label>Number of Periods</Label>
                <Select
                  value={config.periods.toString()}
                  onValueChange={(value) => setConfig({ ...config, periods: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Periods</SelectItem>
                    <SelectItem value="6">6 Periods</SelectItem>
                    <SelectItem value="12">12 Periods</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Weights (for Weighted Average) */}
            {config.method === "weighted_average" && (
              <div className="space-y-2">
                <Label>Weights (Most Recent First)</Label>
                <div className="flex gap-2">
                  {(config.weights || DEFAULT_WEIGHTS).slice(0, 3).map((weight, idx) => (
                    <Input
                      key={idx}
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={weight}
                      onChange={(e) => handleWeightChange(idx, e.target.value)}
                      className="w-20"
                      placeholder={`W${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Fixed Quantity */}
            {config.method === "fixed_quantity" && (
              <div className="space-y-2">
                <Label>Fixed Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={config.fixedQuantity}
                  onChange={(e) => setConfig({ ...config, fixedQuantity: parseInt(e.target.value) || 0 })}
                  placeholder="Enter fixed quantity"
                />
              </div>
            )}

            {/* Run Button */}
            <div className="flex items-end gap-2">
              <Button onClick={runForecast} disabled={running || loading}>
                {running ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="mr-2 h-4 w-4" />
                )}
                {running ? "Running..." : "Run Forecast"}
              </Button>
              {loading && (
                <span className="text-sm text-muted-foreground flex items-center">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Loading items...
                </span>
              )}
            </div>
          </div>

          {/* No Data Warning */}
          {!loading && items.length === 0 && (
            <div className="p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">No transaction history found</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Forecasting requires "Issue" or "Sale" type stock transactions to analyze historical demand patterns. 
                  Please add stock transactions in the Inventory module first, then return here to run forecasts.
                </p>
              </div>
            </div>
          )}

          {/* Method Description */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            {config.method === "moving_average" && (
              <p><strong>Moving Average:</strong> Averages the last N periods of historical data. Good for stable demand patterns.</p>
            )}
            {config.method === "weighted_average" && (
              <p><strong>Weighted Average:</strong> Applies higher weights to recent periods. Useful when recent data is more relevant.</p>
            )}
            {config.method === "simple_trend" && (
              <p><strong>Simple Trend:</strong> Uses linear regression to project future demand based on historical trend.</p>
            )}
            {config.method === "fixed_quantity" && (
              <p><strong>Fixed Quantity:</strong> Uses a manually set quantity for all items. Useful for minimum order quantities or safety stock.</p>
            )}
            {config.method === "seasonal_index" && (
              <p><strong>Seasonal Index:</strong> Adjusts base demand by monthly seasonal factors. Ideal for products with seasonal patterns.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Summary */}
      {forecastResults.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{forecastResults.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valid Forecasts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{validCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Needs Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{invalidCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions Bar */}
      {forecastResults.length > 0 && (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={selectAllValid}>
              Select All Valid
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection} disabled={selectedItems.size === 0}>
              Clear Selection
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedItems.size} item(s) selected
            </span>
          </div>
          <Button
            onClick={createDemandsFromForecast}
            disabled={selectedItems.size === 0 || creatingDemands}
          >
            {creatingDemands ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {creatingDemands ? "Creating..." : "Create Demands"}
          </Button>
        </div>
      )}

      {/* Forecast Results Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Forecast Results
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadItems} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Historical (Last 6)</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Forecast Qty</TableHead>
                  <TableHead>Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      <p className="mt-2 text-muted-foreground">Loading items...</p>
                    </TableCell>
                  </TableRow>
                ) : forecastResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {items.length === 0
                        ? "No items with transaction history found. Add stock transactions first."
                        : "Click 'Run Forecast' to generate demand predictions."}
                    </TableCell>
                  </TableRow>
                ) : (
                  forecastResults.map((result) => (
                    <TableRow key={result.item_code} className={!result.isValid ? "bg-orange-50/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(result.item_code)}
                          onCheckedChange={() => toggleItemSelection(result.item_code)}
                          disabled={result.forecast === 0}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{result.item_code}</TableCell>
                      <TableCell>{result.item_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {result.historical.map((val, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {val}
                            </Badge>
                          ))}
                          {result.historical.length === 0 && (
                            <span className="text-muted-foreground text-sm">No data</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{METHOD_LABELS[result.method]}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">{result.forecast}</TableCell>
                      <TableCell>
                        {result.isValid ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">Valid</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-orange-600" title={result.validationMessage}>
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm truncate max-w-[150px]">{result.validationMessage}</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
