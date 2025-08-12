import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/Auth";
import styles from "./WarehouseStockSummaryTab.module.css";

function WarehouseStockSummaryTab({ warehouse }) {
  const { axiosAPI } = useAuth();
  const [stockSummary, setStockSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Date filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // Set default dates (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    setToDate(today.toISOString().split('T')[0]);
    setFromDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  // Fetch stock summary data
  const fetchStockSummary = async () => {
    if (!warehouse?.id || !fromDate || !toDate) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const query = `/warehouse/stock-summary?fromDate=${fromDate}&toDate=${toDate}&warehouseId=${warehouse.id}`;
      console.log("Fetching stock summary:", query);
      
      const res = await axiosAPI.get(query);
      console.log("Stock summary response:", res.data);
      
      if (res.data.data) {
        setStockSummary(res.data.data);
      } else {
        setStockSummary([]);
      }
    } catch (err) {
      console.error("Error fetching stock summary:", err);
      setError(err.response?.data?.message || "Failed to fetch stock summary");
      setStockSummary([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when dates or warehouse changes
  useEffect(() => {
    fetchStockSummary();
  }, [fromDate, toDate, warehouse?.id]);

  // Debug: Log the stockSummary data
  console.log("StockSummaryTab stockSummary:", stockSummary);
  console.log("StockSummaryTab type:", typeof stockSummary);
  console.log("StockSummaryTab isArray:", Array.isArray(stockSummary));
  
  // ✅ Handle both old nested structure and new flat array structure
  const flattened = useMemo(() => {
    const map = {};

    // Check if stockSummary is an array (new format) or object (old format)
    if (Array.isArray(stockSummary)) {
      // New format: flat array from backend
      stockSummary.forEach(item => {
        const productId = item.productId;
        const product = item.product;
        const warehouse = item.warehouse;
        
        if (!product || !product.name) return;

        if (!map[productId]) {
          map[productId] = {
            productName: product.name,
            productType: item.productType || "loose",
            primaryUnit: item.unit || "kg",
            packetsPerUnit: 1,
            summary: [],
          };
        }

        map[productId].summary.push({
          date: item.date,
          opening: item.openingStock,
          inward: item.inwardStock,
          outward: item.outwardStock,
          closing: item.closingStock,
        });
      });
    } else {
      // Old format: nested structure
      for (const year in stockSummary) {
        for (const month in stockSummary[year]) {
          for (const day in stockSummary[year][month]) {
            const dateString = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            const products = stockSummary[year][month][day];

            if (!products || typeof products !== "object") continue;

            for (const productId in products) {
              const product = products[productId];
              if (!product) continue;

              const { 
                productName, 
                productType,
                primaryUnit,
                packetsPerUnit,
                opening, 
                inward, 
                outward, 
                closing 
              } = product;

              if (!productName || productName === "NA" || productName.trim() === "") {
                continue;
              }

              if (!map[productId]) {
                map[productId] = {
                  productName: productName,
                  productType: productType || "loose",
                  primaryUnit: primaryUnit || "kg",
                  packetsPerUnit: packetsPerUnit || 1,
                  summary: [],
                };
              }

              map[productId].summary.push({
                date: dateString,
                opening,
                inward,
                outward,
                closing,
              });
            }
          }
        }
      }
    }

    // Sort each product's summary by date
    for (const productId in map) {
      map[productId].summary.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    return map;
  }, [stockSummary]);

  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedProductType, setSelectedProductType] = useState("all");

  // Filter products based on product type
  const filteredProducts = useMemo(() => {
    const allProductIds = Object.keys(flattened);
    
    if (selectedProductType === "all") {
      return allProductIds;
    }

    // Filter products based on their names containing the selected type
    return allProductIds.filter(productId => {
      const productName = flattened[productId].productName.toLowerCase();
      
      switch (selectedProductType) {
        case "cattle":
          return productName.includes("cattle") || productName.includes("cow") || productName.includes("buffalo");
        case "poultry":
          return productName.includes("poultry") || productName.includes("chicken") || productName.includes("bird");
        case "other":
          return !productName.includes("cattle") && !productName.includes("cow") && 
                 !productName.includes("buffalo") && !productName.includes("poultry") && 
                 !productName.includes("chicken") && !productName.includes("bird");
        default:
          return true;
      }
    });
  }, [flattened, selectedProductType]);

  // Update selected product when product type filter changes
  useEffect(() => {
    if (filteredProducts.length > 0) {
      // If current selected product is not in filtered list, select first available
      if (!filteredProducts.includes(selectedProduct)) {
        setSelectedProduct(filteredProducts[0]);
      }
    } else {
      setSelectedProduct("");
    }
  }, [filteredProducts, selectedProduct]);

  // Calculate totals for summary cards
  const totals = useMemo(() => {
    if (!selectedProduct || !flattened[selectedProduct]) {
      return { opening: 0, inward: 0, outward: 0, closing: 0 };
    }

    const summary = flattened[selectedProduct].summary;
    let opening = 0, inward = 0, outward = 0, closing = 0;

    summary.forEach(entry => {
      opening += entry.opening || 0;
      inward += entry.inward || 0;
      outward += entry.outward || 0;
      closing += entry.closing || 0;
    });

    return { opening, inward, outward, closing };
  }, [selectedProduct, flattened]);

  // Helper function to convert tons to packets or primary units
  const convertToDisplayUnit = (tons, productInfo) => {
    if (!tons || !productInfo) return 0;
    
    if (productInfo.productType === 'packed') {
      // Convert tons to packets
      return Math.round(tons * productInfo.packetsPerUnit);
    } else {
      // Convert tons to primary units (kg, g, etc.)
      const conversionFactor = productInfo.primaryUnit === 'kg' ? 1000 : 
                              productInfo.primaryUnit === 'g' ? 1000000 : 1000;
      return Math.round(tons * conversionFactor);
    }
  };

  // Get display unit label
  const getDisplayUnitLabel = (productInfo) => {
    if (!productInfo) return "units";

    if (productInfo.productType === 'packed') {
      return "packets";
    } else {
      return productInfo.primaryUnit || "kg";
    }
  };

  // Filter data based on date range
  const filteredData = useMemo(() => {
    if (!selectedProduct || !flattened[selectedProduct]) return [];

    let data = flattened[selectedProduct].summary;

    if (fromDate) {
      data = data.filter(entry => entry.date >= fromDate);
    }

    if (toDate) {
      data = data.filter(entry => entry.date <= toDate);
    }

    return data;
  }, [selectedProduct, flattened, fromDate, toDate]);

  // Product type filter options
  const productTypes = [
    { id: "all", label: "All Products" },
    { id: "cattle", label: "Cattle Feed" },
    { id: "poultry", label: "Poultry Feed" },
    { id: "other", label: "Other Products" }
  ];

  if (loading) {
    return <div className={styles.loading}>Loading stock summary...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  if (filteredProducts.length === 0) {
    return <div className={styles.empty}>No products available for the selected filter.</div>;
  }

  const selectedProductInfo = flattened[selectedProduct];
  const displayUnitLabel = getDisplayUnitLabel(selectedProductInfo);

  return (
    <div className={styles.container}>
      {/* Product Type Filter */}
      <div className={styles.filterSection}>
        <h6 className={styles.filterTitle}>Product Type:</h6>
        <div className={styles.productTypeFilters}>
          {productTypes.map(type => (
            <button
              key={type.id}
              className={`${styles.filterButton} ${
                selectedProductType === type.id ? styles.activeFilter : ""
              }`}
              onClick={() => setSelectedProductType(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Selector */}
      <div className={styles.dateRangeSection}>
        <div className={styles.dateInput}>
          <label>From Date:</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={styles.dateField}
          />
        </div>
        <div className={styles.dateInput}>
          <label>To Date:</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className={styles.dateField}
          />
        </div>
        <button 
          className={styles.generateButton}
          onClick={() => {
            // Trigger data refresh if needed
            console.log("Generate report for:", { fromDate, toDate, selectedProductType });
          }}
        >
          Generate Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <h3 className={styles.cardTitle}>Total Opening</h3>
          <p className={`${styles.cardValue} ${styles.openingColor}`}>
            {totals.opening?.toFixed(2) || "0.00"} tons
          </p>
          <p className={styles.cardSubValue}>
            {convertToDisplayUnit(totals.opening, selectedProductInfo).toLocaleString()} {displayUnitLabel}
          </p>
        </div>
        <div className={styles.summaryCard}>
          <h3 className={styles.cardTitle}>Total Inward</h3>
          <p className={`${styles.cardValue} ${styles.inwardColor}`}>
            {totals.inward?.toFixed(2) || "0.00"} tons
          </p>
          <p className={styles.cardSubValue}>
            {convertToDisplayUnit(totals.inward, selectedProductInfo).toLocaleString()} {displayUnitLabel}
          </p>
        </div>
        <div className={styles.summaryCard}>
          <h3 className={styles.cardTitle}>Total Outward</h3>
          <p className={`${styles.cardValue} ${styles.outwardColor}`}>
            {totals.outward?.toFixed(2) || "0.00"} tons
          </p>
          <p className={styles.cardSubValue}>
            {convertToDisplayUnit(totals.outward, selectedProductInfo).toLocaleString()} {displayUnitLabel}
          </p>
        </div>
        <div className={styles.summaryCard}>
          <h3 className={styles.cardTitle}>Current Stock</h3>
          <p className={`${styles.cardValue} ${styles.closingColor}`}>
            {totals.closing?.toFixed(2) || "0.00"} tons
          </p>
          <p className={styles.cardSubValue}>
            {convertToDisplayUnit(totals.closing, selectedProductInfo).toLocaleString()} {displayUnitLabel}
          </p>
        </div>
      </div>

      {/* Product Info Banner */}
      {selectedProductInfo && (
        <div className={styles.productInfoBanner}>
          <div className={styles.productInfo}>
            <span className={styles.productName}>{selectedProductInfo.productName}</span>
            <span className={styles.productType}>
              Type: {selectedProductInfo.productType === 'packed' ? 'Packed' : 'Loose'}
            </span>
            <span className={styles.productUnit}>
              Unit: {selectedProductInfo.productType === 'packed' ? 
                `${selectedProductInfo.packetsPerUnit} packets/ton` : 
                `${selectedProductInfo.primaryUnit}/ton`}
            </span>
          </div>
        </div>
      )}

      {/* Product Tabs */}
      <div className={styles.tabList}>
        {filteredProducts.map((productId) => (
          <button
            key={productId}
            className={`${styles.tab} ${selectedProduct === productId ? styles.active : ""}`}
            onClick={() => setSelectedProduct(productId)}
          >
            {flattened[productId].productName}
            <span className={styles.productTypeBadge}>
              {flattened[productId].productType === 'packed' ? '📦' : '⚖️'}
            </span>
          </button>
        ))}
      </div>

      {/* Enhanced Stock Summary Table */}
      <div className={styles.tableWrapper}>
        <table className={`table table-bordered ${styles.stockTable}`}>
          <thead>
            <tr className={styles.tableHeader}>
              <th>Date</th>
              <th>Opening</th>
              <th>Inward</th>
              <th>Outward</th>
              <th>Closing</th>
              {/* <th>Actions</th> */}
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((entry, index) => (
                <tr key={index} className={styles.tableRow}>
                  <td className={styles.dateCell}>{entry.date}</td>
                  <td className={styles.openingCell}>
                    <div className={styles.unitDisplay}>
                      <div className={styles.primaryUnit}>{entry.opening ?? "-"} tons</div>
                      <div className={styles.secondaryUnit}>
                        {entry.opening ? 
                          `${convertToDisplayUnit(entry.opening, selectedProductInfo).toLocaleString()} ${displayUnitLabel}` : 
                          "-"
                        }
                      </div>
                    </div>
                  </td>
                  <td className={styles.inwardCell}>
                    <div className={styles.unitDisplay}>
                      <div className={styles.primaryUnit}>
                        {entry.inward != null ? `+${entry.inward}` : "-"} tons
                      </div>
                      <div className={styles.secondaryUnit}>
                        {entry.inward ? 
                          `+${convertToDisplayUnit(entry.inward, selectedProductInfo).toLocaleString()} ${displayUnitLabel}` : 
                          "-"
                        }
                      </div>
                    </div>
                  </td>
                  <td className={styles.outwardCell}>
                    <div className={styles.unitDisplay}>
                      <div className={styles.primaryUnit}>
                        {entry.outward != null ? `-${entry.outward}` : "-"} tons
                      </div>
                      <div className={styles.secondaryUnit}>
                        {entry.outward ? 
                          `-${convertToDisplayUnit(entry.outward, selectedProductInfo).toLocaleString()} ${displayUnitLabel}` : 
                          "-"
                        }
                      </div>
                    </div>
                  </td>
                  <td className={styles.closingCell}>
                    <div className={styles.unitDisplay}>
                      <div className={styles.primaryUnit}>{entry.closing ?? "-"} tons</div>
                      <div className={styles.secondaryUnit}>
                        {entry.closing ? 
                          `${convertToDisplayUnit(entry.closing, selectedProductInfo).toLocaleString()} ${displayUnitLabel}` : 
                          "-"
                        }
                      </div>
                    </div>
                  </td>
                  {/* <td className={styles.actionCell}>
                    <button className={styles.detailsButton}>
                      Details
                    </button>
                  </td> */}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className={styles.noDataCell}>
                  No data available for the selected filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default WarehouseStockSummaryTab;
