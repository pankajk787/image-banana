import { create } from "zustand";

type EditorStoreState = {
    image: string | null;
    setImage: (img: string) => void;
    prompt: string;
    setPrompt: (prompt: string) => void;
    generateEdit: () => Promise<void>;
}

export const useEditorStore = create<EditorStoreState>((set, get) => ({
    image: null,
    prompt: "",
    setImage : (img: string) => set(() => ({ image: img })),
    setPrompt: (text: string) => set(() => ({ prompt : text })),
    generateEdit: async () => {
        const state = get();
        console.log("Sending image and prompt to server", { image: state.image, prompt: state.prompt })
    }
}))