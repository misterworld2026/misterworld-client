import { Navigate, Route, Routes } from 'react-router-dom';
import RequireRole from '@/auth/RequireRole';
import AuthPage from '@/pages/customer/AuthPage';
import MainPage from '@/pages/customer/MainPage';
import ThemesPage from '@/pages/customer/ThemesPage';
import BookingPage from '@/pages/customer/BookingPage';
import MyPage from '@/pages/customer/MyPage';
import ProductsPage from '@/pages/staff/ProductsPage';
import ReservationsPage from '@/pages/staff/ReservationsPage';
import InventoryPage from '@/pages/staff/InventoryPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* 고객 */}
      <Route path="/" element={<MainPage />} />
      <Route path="/themes" element={<ThemesPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/booking"
        element={
          <RequireRole role="MEMBER">
            <BookingPage />
          </RequireRole>
        }
      />
      <Route
        path="/my"
        element={
          <RequireRole role="MEMBER">
            <MyPage />
          </RequireRole>
        }
      />

      {/* 직원 */}
      <Route
        path="/staff/products"
        element={
          <RequireRole role="STAFF">
            <ProductsPage />
          </RequireRole>
        }
      />
      <Route
        path="/staff/reservations"
        element={
          <RequireRole role="STAFF">
            <ReservationsPage />
          </RequireRole>
        }
      />
      <Route
        path="/staff/inventory"
        element={
          <RequireRole role="STAFF">
            <InventoryPage />
          </RequireRole>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
