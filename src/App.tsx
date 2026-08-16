import "./App.css";
import { VideoSelector } from "./components/VideoSelector";
import { TranscriptionPanel } from "./components/TranscriptionPanel";

import { BackgroundAudioSelector } from "./components/BackgroundAudioSelector";

function App() {
  return (
    <main className="container flex flex-col items-center min-h-screen pt-10 pb-20">
      <h1 className="text-3xl font-bold mb-8">UD Captioning</h1>
      <VideoSelector />
      <BackgroundAudioSelector />
      <TranscriptionPanel />
    </main>
  );
}

export default App;
