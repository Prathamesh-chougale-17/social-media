"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Keyboard, X } from "lucide-react";

export function KeyboardShortcutsHelper() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show helper after 3 seconds if not dismissed
    const timer = setTimeout(() => {
      const wasDismissed = localStorage.getItem("keyboard-shortcuts-dismissed");
      if (!wasDismissed) {
        setShow(true);
      } else {
        setDismissed(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("keyboard-shortcuts-dismissed", "true");
  };

  const toggleShow = () => {
    setShow(!show);
  };

  return (
    <>
      {/* Floating button to show shortcuts */}
      {dismissed && !show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={toggleShow}
          className="fixed bottom-20 right-4 z-50 p-3 bg-black/70 backdrop-blur-sm text-white rounded-full shadow-lg hover:bg-black/90 transition-colors"
        >
          <Keyboard className="w-5 h-5" />
        </motion.button>
      )}

      {/* Shortcuts overlay */}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 right-4 z-50 bg-black/90 backdrop-blur-md text-white rounded-2xl p-6 shadow-2xl max-w-xs"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                <h3 className="font-semibold">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <ShortcutItem
                keys={["Space"]}
                description="Play / Pause video"
              />
              <ShortcutItem keys={["M"]} description="Mute / Unmute" />
              <ShortcutItem
                keys={["↑", "↓"]}
                description="Scroll between videos"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type ShortcutItemProps = {
  keys: string[];
  description: string;
};

function ShortcutItem({ keys, description }: ShortcutItemProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="px-2 py-1 bg-white/10 rounded text-xs font-mono"
          >
            {key}
          </kbd>
        ))}
      </div>
      <span className="text-gray-300 text-xs">{description}</span>
    </div>
  );
}
