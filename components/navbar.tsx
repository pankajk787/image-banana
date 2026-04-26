"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, History, Redo, Undo, Upload, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";
import { useMemo } from "react";

export function Navbar() {
  return (
    <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 z-50">
      {/* Left: Branding */}
      <div className="flex items-center gap-4">
        <Link
          className="flex items-center gap-2 font-bold text-xl hover:opacity-90 transition-opacity"
          href="/"
        >
          <div className="relative h-11 w-11 overflow-hidden rounded-xl flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Coder's Banana Logo"
              fill
              className="object-cover p-1"
              priority
            />
          </div>
          <span className="text-zinc-100 hidden md:block tracking-tight">
            {`Coder's`}
            <span className="text-yellow-500">Banana</span>
          </span>
        </Link>
      </div>

      {/* Right: Actions Toolbar */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* 1. Undo / Redo Group */}
        <UndoRedoAction />
        {/* Separator 1 */}
        <div className="h-6 w-px bg-zinc-700 mx-1 md:mx-2"></div>

        {/* 2. File Operations Group */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-700 px-2.5 md:px-4"
          >
            <Upload size={14} className="md:mr-2" />
            <span className="hidden md:inline">Upload</span>
          </Button>

          <ExportButton />
        </div>

        {/* 3. History Toggle & Separator (Hidden on Mobile) */}
        {/* <div className="hidden md:flex items-center gap-3">
          <div className="h-6 w-px bg-zinc-700 mx-2"></div>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 transition-all duration-200 bg-zinc-800 text-zinc-100 border border-zinc-700",
            )}
            title="Open History"

          >
            <History size={18} />
          </Button>
        </div> */}
        <HistoryToggle />
      </div>
    </header>
  );
}

function ExportButton() {
  const { image } = useEditorStore();
  const exportCurrentImage = () => {
    // download the base64 image
    if(image) {
      const link = document.createElement("a");
      link.href = image;
      link.download = `image-${Date.now()}.png`;
      link.click();
    }
  }
  return (
    <Button
      variant="default"
      size="sm"
      className="h-9 bg-yellow-500 text-zinc-950 hover:bg-yellow-400 font-bold px-2.5 md:px-4"
      disabled={!image}
      onClick={exportCurrentImage}
    >
      <span className="hidden md:inline">Export</span>
      <Download size={14} className="md:ml-2" />
    </Button>
  );
}

function HistoryToggle() {
  const { history, showHistory, toggleShowHistory } = useEditorStore();
  return (
    <div className="hidden md:flex items-center gap-3">
      <div className="h-6 w-px bg-zinc-700 mx-2"></div>
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${!history.length ? "text-zinc-600 hover:text-zinc-800 cursor-not-allowed" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"}`}
        title={showHistory ? "Close history" : "Open History"}
        disabled={!history.length}
        onClick={toggleShowHistory}
      >
        {showHistory ? <X /> : <History size={18} />}
      </Button>
    </div>
  );
}

function UndoRedoAction() {
  const { undo } = useEditorStore();
  const { redo } = useEditorStore();
  const { historyIndex } = useEditorStore();
  const { history } = useEditorStore();

  const disableUndo = useMemo(() => {
    return historyIndex <= 0;
  }, [historyIndex]);
  const disableRedo = useMemo(() => {
    return historyIndex >= history.length - 1;
  }, [historyIndex, history.length]);
  return (
    <div className="flex items-center bg-zinc-900 rounded-md p-1 border border-zinc-800">
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${disableUndo ? "text-zinc-600 hover:text-zinc-800 cursor-not-allowed" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"}`}
        onClick={undo}
        title="Undo"
        disabled={disableUndo}
      >
        <Undo size={15} />
      </Button>

      <div className="h-4 w-px bg-zinc-700 mx-1"></div>

      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${disableRedo ? "text-zinc-600 hover:text-zinc-800 cursor-not-allowed" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"}`}
        onClick={redo}
        title="Redo"
        disabled={disableRedo}
      >
        <Redo size={15} />
      </Button>
    </div>
  );
}
