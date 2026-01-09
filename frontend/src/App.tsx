import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CustomerApp } from './apps/customer/CustomerApp';
import { KitchenApp } from './apps/kitchen/KitchenApp';
import { LoginPage } from './apps/kitchen/LoginPage';
import { AdminApp } from './apps/admin/AdminApp';
import { DisplayApp } from './apps/display/DisplayApp';
import { Loader2 } from 'lucide-react';

// 受保護路由元件 (一般員工/班級管理員)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, isPending, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  // 待審核狀態 -> 顯示登入頁（會顯示待審核畫面）
  if (isPending) {
    return <LoginPage />;
  }

  // 未登入或無權限 -> 顯示登入頁
  if (!isAuthenticated || !profile || profile.role === 'none') {
    return <LoginPage />;
  }

  return <>{children}</>;
}

// 管理員專用路由
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { loading, isOwner } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }

  // 只有 owner 可以存取管理頁面
  if (!isOwner) {
    return <Navigate to="/kitchen" replace />;
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

      {/* 管理中心 - 只有 owner */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminApp />
        </AdminRoute>
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

// 取得 base path（GitHub Pages 部署時使用 /vendor/）
const basename = import.meta.env.BASE_URL;

function App() {
  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

