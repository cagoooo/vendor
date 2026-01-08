import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CustomerApp } from './apps/customer/CustomerApp';
import { KitchenApp } from './apps/kitchen/KitchenApp';
import { DisplayApp } from './apps/display/DisplayApp';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 顧客點餐 */}
        <Route path="/" element={<CustomerApp />} />
        <Route path="/order" element={<CustomerApp />} />

        {/* 廚房管理 */}
        <Route path="/kitchen" element={<KitchenApp />} />
        <Route path="/admin" element={<KitchenApp />} />

        {/* 叫號顯示 */}
        <Route path="/display" element={<DisplayApp />} />
        <Route path="/pickup" element={<DisplayApp />} />

        {/* 預設導向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
