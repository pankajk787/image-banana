import { ToolType } from "@/components/image-editor";
import { FileUIPart } from "ai";
import { create } from "zustand";

type HistoryImage = {
  img: string;
  id: string;
};

type EditorStoreState = {
  image: string | null;
  mask: string | null;
  setImage: (img: string) => void;
  setMask: (mask: string) => void;
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
  applyExpansion: (aspectRatio: string) => void;
  applyBackgroundremove: () => void;
  applyAIRefreshment: () => void;
  selectedTool: ToolType;
  setSelectedTool: (tool: ToolType) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
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
      set({ isLoading: true });
      const finalPrompt = `
      TASK: Professional Image In-Painting / Generative Fill.
      ROLE: Expert Photo Retoucher

      INPUT DATA EXPLANATION:
      - You have received a primary image and a corresponding mask image.
      - The mask defines the precise editing region.
      - WHITE pixels in the mask indicate the area where you must apply the user's instruction.
      - BLACK pixels in the mask must remain exactly as they are in the original image.

      USER GOAL:
      "${state.prompt}"

      EXECUTION GUIDELINES(critical):
      1. IF REMOVING/ERASING: If user asks to "remove" or "erase" or "delete" and object you MUST perform "Background Reconstruction". Analyze the surrounding background (wall, floor, nature etc.) and seamlesly extend it over the masked area to hide the object.
      2. IF CHANGING/REPLACING: If the user asks to add or change something, generate the new object strictly within the white mask matching the scene's lighting and perspective.
      3. SEAMLESS INTEGRATION: The new content generated inside the white masked area must perfectly match the surrounding environment's perspective, lighting direction, shadows and color grading.
      4. TEXTURE MATCHING: Replicate the exact film grain, noise level, and sharpness of the original photo to prevent a "pasted-on" look. The transition at the mask boundary must be invisible.
      5. STRICT ISOLATION: DO NOT modify any pixels outside the designated white masked area under any circumstances.`;

      const response = await fetch("/api/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: state.image,
          prompt: finalPrompt,
          userFiles: state.userFiles,
          maskBase64: state.mask
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
    set({ userFiles: files });
  },
  applyFilter: async (filterPrompt: string) => {
    const state = get();
    if (!state.image) return;
    try {
      set({ isLoading: true });

      const finalPrompt = `
        ${filterPrompt}
        TECHNICAL CONSTRAINTS:
        1. STRICTLY PRESERVE COMPOSITION: Do not change the subject's pose, the camera angle or the placement of objects.
        2. OUTPUT FORMAT: This is a style transfer. Keep the underlying structure of the image identical to the origin only changing the texture, lighting & colors to match the requested style.
      `;
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
  },
  applyExpansion: async (aspectRatio: string) => {
    const state = get();
    if (!state.image) return;

    const baseInstruction = `High-fidelity outpainting. Analyze the visual context of the original image and seamlessly extend the scenery into the empty areas indicated by the white mask. Ensure the person's face and features remain completely unchanged.`;

    const technicalConstarint = `Strictly maintain the continuity of existing lines, horizon, textures, lighting and perspective. The transition must be invisible. Do not alter the style or content of the original center image.`;

    const userContext = state.prompt
      ? `Additional context/subject for extension: ${state.prompt}`
      : "";

    const finalPrompt = `
    ${baseInstruction}
    ${technicalConstarint}
    ${userContext}
    `;

    try {
      set({ isLoading: true });

      const response = await fetch("/api/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: state.image,
          prompt: finalPrompt,
          aspectRatio
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
  applyBackgroundremove: () => {
    // TODO
  },
  applyAIRefreshment: () => {
    // TODO
  },
  selectedTool: ToolType.MOVE,
  setSelectedTool: (tool: ToolType) => { set({ selectedTool: tool })},
  brushSize: 20,
  setBrushSize: (size: number) => set({ brushSize: size }),
  mask: null,
  setMask: (mask: string) => {
    set({ mask })
  }
}));
