import React, { useState } from "react";
import styles from "./Purchases.module.css";
import {
  DialogBody,
  DialogContent,
  DialogRoot,
  DialogTrigger,
  DialogCloseTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/Auth";
import PDFPreviewModal from "@/utils/PDFPreviewModal";
import ErrorModal from "@/components/ErrorModal";
import Loading from "@/components/Loading";

function getDamageColor(damagePercent) {
  if (damagePercent >= 50) return "#dc3545"; // red (>=50%)
  if (damagePercent >= 10) return "#ffc107"; // yellow (10-49%)
  if (damagePercent >= 0) return "#007bff"; // blue (0-9%)
  return "inherit";
}

function ReportsModal({ pdetails, warehouses, setWarehouses }) {
  const { axiosAPI } = useAuth();
  const token = localStorage.getItem("accessToken");

  // State for controlling modal, error, loading, etc.
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState();
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Delivery Challan upload
  const [deliveryChallanFile, setDeliveryChallanFile] = useState(null);
  const [deliveryChallanPreview, setDeliveryChallanPreview] = useState(null);

  // Damaged goods list and new damaged good inputs
  const [damagedRows, setDamagedRows] = useState([]);
  const [selectedSku, setSelectedSku] = useState("");
  const [damagedQty, setDamagedQty] = useState("");
  const [damagedReason, setDamagedReason] = useState("");
  const [newImageFile, setNewImageFile] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);

  const [formErrors, setFormErrors] = useState({});

  const closeModal = () => setIsModalOpen(false);


  

 // ✅ helper to compute live damaged total for a SKU including the "current input"
  const getTotalDamagedForSku = (sku) => {
    const already = damagedRows
      .filter((d) => d.SKU === sku)
      .reduce((sum, curr) => sum + Number(curr.damagedQty || 0), 0);
    if (sku === selectedSku && damagedQty) {
      return already + Number(damagedQty);
    }
    return already;
  };

  const calculateReceivedQty = (orderedQty, damagedQtySum) =>
    Math.max(orderedQty - damagedQtySum, 0);

  

  // Validate inputs for adding a new damaged good row
  const validateNewDamagedRow = () => {
    const errors = {};
    if (!selectedSku) errors.product = "Please select a product";
    const prod = pdetails.items.find((i) => i.SKU === selectedSku);
    const maxQty = prod?.quantity || 0;
    const qtyNum = Number(damagedQty);
    const alreadyDamagedQty = getTotalDamagedForSku(selectedSku);
    if (!damagedQty || qtyNum <= 0) {
      errors.quantity = "Please enter a valid damaged quantity";
    } else if (qtyNum + alreadyDamagedQty > maxQty) {
      errors.quantity = `Damaged quantity cannot exceed ordered quantity (${maxQty}) minus already added damaged quantity (${alreadyDamagedQty})`;
    }
    if (!damagedReason || damagedReason.trim() === "") {
      errors.reason = "Please enter a reason for the damage";
    }
    if (!newImageFile) {
      errors.image = "Please upload an image for the damaged goods";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handler to add new damaged good row
  const handleAddDamagedGood = () => {
    if (!validateNewDamagedRow()) return;
    const prod = pdetails.items.find((i) => i.SKU === selectedSku);
    if (!prod) return;

    setDamagedRows((prev) => [
      ...prev,
      {
        SKU: prod.SKU,
        productId: prod.productId,
        name: prod.name,
        orderedQty: prod.quantity,
        damagedQty: Number(damagedQty),
        reason: damagedReason,
        image: newImageFile,
        imagePreview: newImagePreview,
      },
    ]);

    // Reset inputs after adding
    setSelectedSku("");
    setDamagedQty("");
    setDamagedReason("");
    setNewImageFile(null);
    setNewImagePreview(null);
    setFormErrors({});
  };

  // Handler to remove damaged good row by index
  const handleRemoveDamagedGood = (idx) => {
    setDamagedRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // Handle upload event for new damaged good image preview
  const handleNewImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setNewImageFile(null);
      setNewImagePreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("❌ Only images are allowed for damaged goods");
      return;
    }

    if (file.size > 100 * 1024) {
      alert("❌ Each damaged good image must be less than 100KB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewImageFile(reader.result); // ✅ base64 string
      setNewImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };


  // Handle delivery challan upload
  // ✅ preview DC (PDF or image)
  // Handle delivery challan upload
  const handleDeliveryChallanUpload = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setDeliveryChallanFile(null);
      setDeliveryChallanPreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("❌ Only image files are allowed for Delivery Challan");
      return;
    }

    if (file.size > 100 * 1024) {
      alert("❌ Delivery Challan must be less than 100KB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setDeliveryChallanFile(reader.result); // ✅ store base64 string directly
      setDeliveryChallanPreview({ type: "image", url: reader.result });
    };
    reader.readAsDataURL(file);
  };


  // Check if stock-in action is allowed based on purchase order status
  const canStockIn =
    ["Received", "received", "Pending", "pending"].includes(
      (pdetails?.status || "").trim()
    ) &&
    !["Stocked In", "stocked_in"].includes((pdetails?.status || "").trim());

  // Handler for "Confirm Stock In" button click (backend integration to follow)
// 1. Fix the validation check in handleStockIn:
const handleStockIn = async () => {
  console.log("Stock In button clicked"); // Debug log
  console.log("=== Stock In Debug Info ===");
  console.log("Delivery Challan File:", deliveryChallanFile);
  console.log("Damaged Rows:", damagedRows);
  console.log("PDetails:", pdetails);
  console.log("Token:", token ? "Present" : "Missing");
  if (!deliveryChallanFile) {
    setError("Please upload the Delivery Challan image");
    setIsModalOpen(true);
    return;
  }

  // Fix: Check for 'image' property instead of 'imageBase64'
  if (damagedRows.some(d => !d.image)) {
    setError("All damaged goods must have an image (under 100KB).");
    setIsModalOpen(true);
    return;
  }

  setConfirmLoading(true);
  
  try {
    // Fix: Properly extract base64 data
    const dcBase64 = typeof deliveryChallanFile === 'string' 
      ? deliveryChallanFile.split(",")[1] 
      : deliveryChallanFile;

    const payload = {
      dcCopy: deliveryChallanFile.split(",")[1], 
      receivedItems: pdetails.items.map((item) => {
        // Send ORIGINAL quantity, not adjusted quantity
        return { 
          productId: item.productId, 
          receivedQuantity: item.quantity  // Original quantity from PO
        };
      }),
      damagedGoods: damagedRows.map((d) => ({
        productId: d.productId,
        receivedQuantity: d.orderedQty,  // Original ordered qty
        damagedQuantity: d.damagedQty,
        reason: d.reason,
        imageFile: {
          data: d.image.split(",")[1],
          type: "image/jpeg",
        },
      })),
    };

    console.log("Payload:", payload); // This should now print

    const response = await axiosAPI.post(
      `warehouses/incoming/purchases/${pdetails.id}`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log("API Response:", response); // Debug log
    
    setError("✅ Stock IN completed successfully!");
    setIsModalOpen(true);
    setDamagedRows([]);
    setDeliveryChallanFile(null);
    setDeliveryChallanPreview(null);
    
  } catch (err) {
    console.error("API Error:", err);
    console.error("Error Response:", err.response?.data);
    setError(`❌ Stock IN failed: ${err.response?.data?.message || err.message || 'Please try again.'}`);
    setIsModalOpen(true);
  } finally {
    setConfirmLoading(false);
  }
};


  // Adjust received quantities based on damaged goods totals
  const adjustedReceivedQuantities = pdetails.items.map((item) => {
    const totalDamaged = getTotalDamagedForSku(item.SKU);
    const receivedQty = calculateReceivedQty(item.quantity, totalDamaged);
    const damagePercent = (totalDamaged / item.quantity) * 100;
    return {
      SKU: item.SKU,
      receivedQty,
      damagePercent,
    };
  });

  // Status color helper for purchase order status badge
  const statusBg =
    pdetails?.status === "Received"
      ? "#d4edda"
      : pdetails?.status === "Stocked In" || pdetails?.status === "stocked_in"
      ? "#cce5ff"
      : "#f8d7da";
  const statusColor =
    pdetails?.status === "Received"
      ? "#155724"
      : pdetails?.status === "Stocked In" || pdetails?.status === "stocked_in"
      ? "#004085"
      : "#721c24";

  return (
    <>
      {/* Purchase Order Details Section */}
      <h3 className={`px-3 mdl-title`}>Purchase Report</h3>

      <div className="row m-0 p-0">
        <div className={`col-3 ${styles.longformmdl}`}>
          <label>Date :</label>
          <input type="text" value={pdetails?.date || ""} readOnly />
        </div>
        <div className={`col-3 ${styles.longformmdl}`}>
          <label>Time :</label>
          <input
            type="text"
            value={pdetails?.createdAt?.slice(11, 16) || ""}
            readOnly
          />
        </div>
        <div className={`col-3 ${styles.longformmdl}`}>
          <label>Warehouse :</label>
          <input type="text" value={pdetails?.warehouse?.name || ""} readOnly />
        </div>
        <div className={`col-3 ${styles.longformmdl}`}>
          <label>Purchase ID :</label>
          <input type="text" value={pdetails?.orderNumber || ""} readOnly />
        </div>
        <div className={`col-3 ${styles.longformmdl}`}>
          <label>Status :</label>
          <input
            type="text"
            value={pdetails?.status || "Unknown"}
            readOnly
            style={{ backgroundColor: statusBg, color: statusColor }}
          />
        </div>
      </div>

      <div className="row m-0 p-0">
        <h5 className={styles.headmdl}>TO</h5>
        <div className={`col-3 ${styles.longformmdl}`}>
          <label>Vendor Name :</label>
          <input type="text" value={pdetails?.supplier?.name || ""} readOnly />
        </div>
        <div className={`col-3 ${styles.longformmdl}`}>
          <label>Vendor ID :</label>
          <input
            type="text"
            value={pdetails?.supplier?.supplierCode || ""}
            readOnly
          />
        </div>
        <div className={`col-3 ${styles.longformmdl}`}>
          <label>Address Line 1 :</label>
          <input type="text" value={pdetails?.supplier?.plot || ""} readOnly />
        </div>
        <div className={`col-3 ${styles.longformmdl}`}>
          <label>Address Line 2 :</label>
          <input
            type="text"
            value={pdetails?.supplier?.street || ""}
            readOnly
          />
        </div>
        <div className={`col-3 ${styles.longformmdl}`}>
          <label>Village/City :</label>
          <input type="text" value={pdetails?.supplier?.city || ""} readOnly />
        </div>
        <div className={`col-3 ${styles.longformmdl}`}>
          <label>District :</label>
          <input
            type="text"
            value={pdetails?.supplier?.district || ""}
            readOnly
          />
        </div>
        <div className={`col-3 ${styles.longformmdl}`}>
          <label>State :</label>
          <input type="text" value={pdetails?.supplier?.state || ""} readOnly />
        </div>
        <div className={`col-3 ${styles.longformmdl}`}>
          <label>Pincode :</label>
          <input
            type="text"
            value={pdetails?.supplier?.pincode || ""}
            readOnly
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="row m-0 p-0 justify-content-center">
        <h5 className={styles.headmdl}>Products</h5>
        <div className="col-10">
          <table
            className={`table table-bordered borderedtable ${styles.mdltable}`}
          >
            <thead>
              <tr>
                <th>S.No</th>
                <th>Product ID</th>
                <th>Product Name</th>
                <th>Units</th>
                <th>Quantity</th>
                <th>Net Amount</th>
              </tr>
            </thead>
            <tbody>
              {pdetails?.items?.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>{item.SKU}</td>
                  <td>{item.name}</td>
                  <td>
                    {item.type === "packed" ? "packets" : item.unit}
                  </td>
                  <td>{item.quantity}</td>
                  <td>{item.totalAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row m-0 p-3 pt-4">
          <div className={`col-3 ${styles.longformmdl}`}>
            <label>Total Amount :</label>
            <span>{pdetails?.totalAmount || 0}/-</span>
          </div>
        </div>
      </div>

      {/* STOCK IN Modal Trigger & Modal */}
      <div className="row m-0 p-3 pt-4 justify-content-center">
        <div className={`col-4`}>
          <PDFPreviewModal
            pdfUrl={`/purchases/${pdetails.id}/pdf`}
            filename={`Purchase-${pdetails.orderNumber || pdetails.id}.pdf`}
            triggerText="Preview PDF"
          />
          {canStockIn && (
            <DialogRoot
              placement={"center"}
              size={"lg"}
              className={styles.mdl}
            >
              <DialogTrigger asChild>
                <button className="submitbtn">Stock IN</button>
              </DialogTrigger>

              <DialogContent
                className="mdl"
                style={{
                  minWidth: 750,
                  maxWidth: 900,
                  maxHeight: "90vh",
                  overflowY: "auto",
                }}
              >
                <DialogBody>
                  <div className="row m-0 p-3">
                    <div className={`col`}>
                      <h5 className="mdltitle">Confirm Stock In</h5>

                      {/* Products Table with adjusted received Qty and color */}
                      <p>
                        Please confirm the received quantities for the following
                        products:
                      </p>
                      <table className="table table-sm table-bordered borderedtable mb-4">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Ordered Qty</th>
                            <th>Received Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pdetails.items.map((item) => {
                            const adj = adjustedReceivedQuantities.find(
                              (adj) => adj.SKU === item.SKU
                            );
                            const color = getDamageColor(adj?.damagePercent || 0);
                            return (
                              <tr key={item.id}>
                                <td>{item.name}</td>
                                <td>{item.quantity}</td>
                                <td
                                  style={{ color, fontWeight: "600" }}
                                >
                                  {adj?.receivedQty ?? item.quantity}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Delivery Challan Upload */}
                      <div style={{ marginBottom: 20 }}>
                        <label style={{ fontWeight: 600, display: "block" }}>
                          Upload Delivery Challan <span style={{ color: "#dc3545" }}>*</span>:
                        </label>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={handleDeliveryChallanUpload}
                          style={{ width: "100%" }}
                        />
                        {deliveryChallanFile && (
                          <div style={{ marginTop: 8 }}>
                            Selected file: <strong>{deliveryChallanFile.name}</strong>
                          </div>
                        )}
                        {deliveryChallanPreview?.type === "pdf" && (
                          <embed
                            src={deliveryChallanPreview.url}
                            type="application/pdf"
                            width="100%"
                            height="300px"
                            style={{ marginTop: 8, border: "1px solid #ccc", borderRadius: 4 }}
                          />
                        )}
                        {deliveryChallanPreview?.type === "image" && (
                          <img
                            src={deliveryChallanPreview.url}
                            alt="Delivery Challan Preview"
                            style={{ marginTop: 8, maxHeight: 200, borderRadius: 4 }}
                          />
                        )}
                      </div>

                      {/* Damaged Goods Section */}
                      <h5
                        style={{ fontWeight: 600, marginTop: 16, marginBottom: 8 }}
                      >
                        Damaged Goods
                      </h5>
                      <table className="table table-bordered" style={{ width: "100%" }}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>SKU - Product</th>
                            <th>Ordered Qty</th>
                            <th>Damaged Qty</th>
                            <th>Reason</th>
                            <th>Image</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Input row to add new damaged good */}
                          <tr>
                            <td>#</td>
                            <td>
                              <select
                                value={selectedSku}
                                onChange={(e) => setSelectedSku(e.target.value)}
                                style={{
                                  border: formErrors.product
                                    ? "1px solid #dc3545"
                                    : "1px solid #ced4da",
                                  borderRadius: "4px",
                                  padding: "6px 12px",
                                  width: "100%",
                                }}
                              >
                                <option value="">--select product--</option>
                                {pdetails.items.map((item) => {
                                  const totalDamaged = getTotalDamagedForSku(item.SKU);
                                  const disabled = totalDamaged >= item.quantity;
                                  return (
                                    <option
                                      key={item.id}
                                      value={item.SKU}
                                      disabled={disabled}
                                    >
                                      {item.SKU} - {item.name}{" "}
                                      {disabled ? "(Max damaged reached)" : ""}
                                    </option>
                                  );
                                })}
                              </select>
                              {formErrors.product && (
                                <div
                                  style={{
                                    color: "#dc3545",
                                    fontSize: "12px",
                                    marginTop: "4px",
                                  }}
                                >
                                  {formErrors.product}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {
                                pdetails.items.find((i) => i.SKU === selectedSku)
                                  ?.quantity || ""
                              }
                            </td>
                            <td>
                              <input
                                type="number"
                                min={1}
                                step={pdetails.items.find((i) => i.SKU === selectedSku)?.type === "loose" ? "0.01" : "1"}
                                max={
                                  pdetails.items.find((i) => i.SKU === selectedSku)?.quantity || 1
                                }
                                value={damagedQty}
                                onChange={(e) => {
                                  const product = pdetails.items.find((i) => i.SKU === selectedSku);
                                  let value = e.target.value;

                                  if (product?.type === "packed") {
                                    // Only whole numbers allowed
                                    value = value.replace(/\D/g, ""); // remove non-digits
                                    value = value ? parseInt(value, 10) : "";
                                  } else {
                                    // Loose → allow decimals (but valid numbers only)
                                    value = value.replace(/[^0-9.]/g, ""); // remove invalid chars
                                  }

                                  setDamagedQty(value);
                                }}
                                placeholder="Qty"
                                style={{
                                  border: formErrors.quantity
                                    ? "1px solid #dc3545"
                                    : "1px solid #ced4da",
                                  borderRadius: "4px",
                                  padding: "6px 12px",
                                  width: "100%",
                                }}
                              />
                              {formErrors.quantity && (
                                <div
                                  style={{
                                    color: "#dc3545",
                                    fontSize: "12px",
                                    marginTop: "4px",
                                  }}
                                >
                                  {formErrors.quantity}
                                </div>
                              )}
                            </td>
                            <td>
                              <input
                                type="text"
                                value={damagedReason}
                                onChange={(e) => setDamagedReason(e.target.value)}
                                placeholder="Reason for damage"
                                style={{
                                  border: formErrors.reason
                                    ? "1px solid #dc3545"
                                    : "1px solid #ced4da",
                                  borderRadius: "4px",
                                  padding: "6px 12px",
                                  width: "100%",
                                }}
                              />
                              {formErrors.reason && (
                                <div
                                  style={{
                                    color: "#dc3545",
                                    fontSize: "12px",
                                    marginTop: "4px",
                                  }}
                                >
                                  {formErrors.reason}
                                </div>
                              )}
                            </td>
                            <td>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleNewImageUpload}
                                style={{
                                  border: formErrors.image
                                    ? "1px solid #dc3545"
                                    : "1px solid #ced4da",
                                  borderRadius: "4px",
                                  padding: "6px 12px",
                                  width: "100%",
                                }}
                              />
                              {formErrors.image && (
                                <div
                                  style={{
                                    color: "#dc3545",
                                    fontSize: "12px",
                                    marginTop: "4px",
                                  }}
                                >
                                  {formErrors.image}
                                </div>
                              )}
                              {newImagePreview && (
                                <img
                                  src={newImagePreview}
                                  alt="Preview"
                                  style={{
                                    width: 40,
                                    height: 40,
                                    marginTop: 4,
                                    borderRadius: 4,
                                    display: "block",
                                  }}
                                />
                              )}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={handleAddDamagedGood}
                              >
                                + Add
                              </button>
                            </td>
                          </tr>

                          {/* Existing damaged rows */}
                          {damagedRows.length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ textAlign: "center" }}>
                                No damaged goods added.
                              </td>
                            </tr>
                          ) : (
                            damagedRows.map((row, idx) => (
                              <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td>
                                  {row.SKU} - {row.name}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  {row.orderedQty}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  {row.damagedQty}
                                </td>
                                <td>{row.reason}</td>
                                <td style={{ textAlign: "center" }}>
                                  {row.imagePreview ? (
                                    <img
                                      src={row.imagePreview}
                                      alt="Damaged"
                                      style={{ width: 40, height: 40, borderRadius: 4 }}
                                    />
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleRemoveDamagedGood(idx)}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>

                      {/* Modal Actions */}
                      <div className="d-flex justify-content-end mt-3">
                        <button
                          className="cancelbtn me-2"
                          onClick={(e) => {
                              e.preventDefault(); // Add this
                              e.stopPropagation(); // Add this
                              const closeButton = document.querySelector("[data-radix-dialog-close]");
                              if (closeButton) closeButton.click();
                            }}
                          disabled={confirmLoading}
                        >
                          Cancel
                        </button>
                        <button
                          className="submitbtn"
                          onClick={(e) => {
                            e.preventDefault(); // Add this
                            e.stopPropagation(); // Add this
                            handleStockIn();
                          }}
                          disabled={confirmLoading}
                        >
                          {confirmLoading ? "Processing..." : "Confirm Stock In"}
                        </button>
                      </div>
                    </div>
                  </div>
                </DialogBody>
                <DialogCloseTrigger className="inputcolumn-mdl-close" />
              </DialogContent>
            </DialogRoot>
          )}
        </div>
      </div>

      {/* Show loading spinner */}
      {loading && <Loading />}

      {/* Show error modal */}
      {isModalOpen && (
        <ErrorModal isOpen={isModalOpen} message={error} onClose={closeModal} />
      )}
    </>
  );
}

export default ReportsModal;
