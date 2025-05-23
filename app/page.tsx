"use client";

import PlantPlanner from "./PlantPlanner";

export default function Home() {
  return (
    <div className="flex flex-col items-center min-h-screen p-8 sm:p-20">
      <main className="flex flex-col w-full items-center">
        <PlantPlanner />
      </main>
    </div>
  );
}
