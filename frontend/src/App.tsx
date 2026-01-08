import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CustomerApp } from './apps/customer/CustomerApp';
import { KitchenApp } from './apps/kitchen/KitchenApp';
import { LoginPage } from './apps/kitchen/LoginPage';
import { DisplayApp } from './apps/display/DisplayApp';
import { Loader2 } from 'lucide-react';

// 受保護路由元件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  // 未登入或無權限 -> 顯示登入頁
  if (!isAuthenticated || !profile || profile.role === 'none') {
    return <LoginPage />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* 顧客點餐 - 公開 */}
      <Route path="/" element={<CustomerApp />} />
      <Route path="/order" element={<CustomerApp />} />

      {/* 廚房管理 - 需登入 */}
      <Route path="/kitchen" element={
        <ProtectedRoute>
          <KitchenApp />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute>
          <KitchenApp />
        </ProtectedRoute>
      } />
      <Route path="/login" element={<LoginPage />} />

      {/* 叫號顯示 - 公開 */}
      <Route path="/display" element={<DisplayApp />} />
      <Route path="/pickup" element={<DisplayApp />} />

      {/* 預設導向 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
