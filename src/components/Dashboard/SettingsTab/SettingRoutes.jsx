import React, { lazy, Suspense } from "react";
import styles from "./Settings.module.css";
import { Route, Routes, useNavigate } from "react-router-dom";
import PageSkeleton from "../../SkeletonLoaders/PageSkeleton";

// Lazy-loaded components
const SettingsHome = lazy(() => import("./SettingsHome"));
const DropoffRules = lazy(() => import("./DropoffRules"));
const MinimumOrderRules = lazy(() => import("./MinimumOrderRules"));
const WarehouseRules = lazy(() => import("./WarehouseRules"));



function SettingRoutes() {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route
        index
        element={
          <Suspense fallback={<PageSkeleton />}>
            <SettingsHome navigate={navigate} />
          </Suspense>
        }
      />
      <Route
        path="/drop-off-rules/*"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <DropoffRules navigate={navigate} />
          </Suspense>
        }
      />
      <Route
        path="/minimum-order-rules/*"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <MinimumOrderRules navigate={navigate} />
          </Suspense>
        }
      />
      <Route
        path="/warehouse-rules/*"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <WarehouseRules navigate={navigate} />
          </Suspense>
        }
      />
    </Routes>
  );
}

export default SettingRoutes;
