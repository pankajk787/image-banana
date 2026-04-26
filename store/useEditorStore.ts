import { FileUIPart } from "ai";
import { create } from "zustand";

type HistoryImage = {
  img: string;
  id: string;
};

type EditorStoreState = {
  image: string | null;
  setImage: (img: string) => void;
  prompt: string;
  userFiles: FileUIPart[];
  setUserFiles: (files: FileUIPart[]) => void;
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
  applyFilter: (prompt: string) => void;
};

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  image: null,
  prompt: "",
  userFiles: [],
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
          userFiles: state.userFiles
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
      set({ isLoading: false, prompt: "", userFiles: [] });
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
  setUserFiles: (files: FileUIPart[]) => {
    set({ userFiles: files});
  },
  applyFilter: async (filterPrompt: string) => {
    const state = get();
    if(!state.image) return;
    try {
      set({ isLoading : true });
      
      const finalPrompt = `
        ${filterPrompt}
        TECHNICAL CONSTRAINTS:
        1. STRICTLY PRESERVE COMPOSITION: Do not change the subject's pose, the camera angle or the placement of objects.
        2. OUTPUT FORMAT: This is a style transfer. Keep the underlying structure of the image identical to the origin only changing the texture, lighting & colors to match the requested style.
      `
      const response = await fetch("/api/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: state.image,
          prompt: finalPrompt,
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
      set({ isLoading: false, prompt: "", userFiles: [] });
    }
  }
}));
