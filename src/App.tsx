import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { VideoSelector } from "./components/VideoSelector";
import { TranscriptionPanel } from "./components/TranscriptionPanel";

function App() {
  return (
    <main className="container flex flex-col items-center min-h-screen pt-10 pb-20">
      <h1 className="text-3xl font-bold mb-8">UD Captioning</h1>
      <VideoSelector />
      <TranscriptionPanel />
    </main>
  );
}

export default App;
