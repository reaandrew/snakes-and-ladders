import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AdminRoutes } from './components/admin/AdminRoutes';
import { GameScreen } from './components/GameScreen';
import { GameProvider } from './contexts/GameContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen animate-gradient-shift bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 bg-[length:400%_400%]">
        <Routes>
          <Route path="/admin/*" element={<AdminRoutes />} />
          <Route
            path="*"
            element={
              <WebSocketProvider>
                <GameProvider>
                  <GameScreen />
                </GameProvider>
              </WebSocketProvider>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
