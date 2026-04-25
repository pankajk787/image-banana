import { create } from "zustand";

type HistoryImage = {
  img: string;
  id: string;
};

type EditorStoreState = {
  image: string | null;
  setImage: (img: string) => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  generateEdit: () => Promise<void>;
  history: HistoryImage[];
  setHistory: (histry: HistoryImage[]) => void;
  historyIndex: number;
  setHistoryIndex: (index: number) => void;
  undo: () => void;
  redo: () => void;
  showHistory: boolean;
  toggleShowHistory: () => void;
  isLoading: boolean;
  setLoading: (val: boolean) => void;
};

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  image: null,
  prompt: "",
  history: [],
  historyIndex: 0,
  setHistory: (history: HistoryImage[]) => set(() => ({ history })),
  setHistoryIndex: (index: number) =>
    set((state) => ({
      historyIndex: index,
      image: state.history[index].img,
    })),
  setImage: (img: string) =>
    set(() => ({ image: img, history: [{ img, id: Date.now().toString() }] })),
  setPrompt: (text: string) => set(() => ({ prompt: text })),
  generateEdit: async () => {
    const state = get();

    try {
      set({ isLoading : true })
      const response = await fetch("/api/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: state.image,
          prompt: state.prompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate");
      }

      const data = await response.json();
      const clonedHistory = [
        ...state.history,
        { id: Date.now().toString(), img: data.result },
      ];

      set(() => ({
        image: data.result,
        history: clonedHistory,
        historyIndex: clonedHistory.length - 1,
      }));
    } catch (error) {
      console.error("Operation Failed: ", error);
    } finally {
      set({ isLoading: false });
    }
  },
  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      set(() => ({
        historyIndex: state.historyIndex - 1,
        image: state.history[state.historyIndex - 1].img,
      }));
    }
  },
  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      set(() => ({
        historyIndex: state.historyIndex + 1,
        image: state.history[state.historyIndex + 1].img,
      }));
    }
  },
  showHistory: false,
  toggleShowHistory: () => {
    const state = get();
    set({ showHistory: !state.showHistory });
  },
  isLoading: false,
  setLoading: (val: boolean) => {
    set({ isLoading: val });
  },
}));
