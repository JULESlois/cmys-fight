/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameCanvas } from "./components/GameCanvas";

export default function App() {
  return (
    <div className="w-full h-screen font-sans bg-black text-white">
      <GameCanvas />
    </div>
  );
}
