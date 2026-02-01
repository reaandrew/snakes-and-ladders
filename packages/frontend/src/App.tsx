import { GameScreen } from './components/GameScreen';
import { GameProvider } from './contexts/GameContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

function App() {
  return (
    <WebSocketProvider>
      <GameProvider>
        <div className="min-h-screen animate-gradient-shift bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 bg-[length:400%_400%]">
          <GameScreen />
        </div>
      </GameProvider>
    </WebSocketProvider>
  );
}

export default App;
