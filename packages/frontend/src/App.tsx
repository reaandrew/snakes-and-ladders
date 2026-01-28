import { GameScreen } from './components/GameScreen';
import { GameProvider } from './contexts/GameContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

function App() {
  return (
    <WebSocketProvider>
      <GameProvider>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
          <GameScreen />
        </div>
      </GameProvider>
    </WebSocketProvider>
  );
}

export default App;
