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
        const response = await fetch("/api/edit-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                imageBase64: state.image, 
                prompt: state.prompt 
            })
        })

        if(!response.ok) {
            throw new Error("Failed to generate")
        }

        const data = await response.json();
        set(() => ({ image: data.result }))
    }
}))