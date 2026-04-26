import { useEditorStore } from '@/store/useEditorStore';
import { useCallback, useEffect, useRef } from 'react'

const ImageEditor = () => {
    const { image } = useEditorStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const draw = useCallback(() => {
        if(!canvasRef.current) return;

        const ctx = canvasRef.current.getContext("2d");
        if(!ctx) return;

        // ctx.fillStyle = "green";
        // ctx.fillRect(10, 10, 150, 300);

        if(!image) return;

        const img = new Image();
        img.src= image;
        img.onload = () => {
            if(!canvasRef.current) return;

            canvasRef.current.width = img.naturalWidth;
            canvasRef.current.height = img.naturalHeight;

            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(img, 0, 0)
        }
    }, [image])

    useEffect(() =>{
        if(!image) return;
        const img = new Image();
        img.src = image;
        img.onload = () => {
            draw();
        }
    }, [image, draw]);

    if(!image) return null;
  return (
    <div className='p-1 border'>
        <canvas ref={canvasRef} width={1000} height={500} />
    </div>
  )
}

export default ImageEditor;
