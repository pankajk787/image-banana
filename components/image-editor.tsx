import { useEditorStore } from '@/store/useEditorStore';
import { Point } from '@/types';
import { useCallback, useEffect, useRef } from 'react'
// import NextImage from "next/image";

const MASK_WHITE_THRESHOLD = 10;

const ImageEditor = () => {
    const { image } = useEditorStore();
    const { selectedTool } = useEditorStore();
    const { brushSize } = useEditorStore();
    const { setMask } = useEditorStore();
    // const { mask } = useEditorStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const startPosRef = useRef<Point>(null);
    const isDrawingRef = useRef<boolean>(false);

    const draw = useCallback(() => {
        if(!canvasRef.current) return;

        // draw image
        const ctx = canvasRef.current.getContext("2d");
        if(!ctx || !imgRef.current) return;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(imgRef.current, 0, 0);

        // copy mask to overlay canvas
        ctx.save();
        // Todo: change global alpha
        const overlayCanvas = overlayCanvasRef.current;
        if(!overlayCanvas) return;
        const overlayCtx = overlayCanvas.getContext("2d");
        if(!overlayCtx) return;
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)

        if(!maskCanvasRef.current) return;
        overlayCtx.drawImage(maskCanvasRef.current, 0, 0);
        console.log("MASK COPIED TO OVERLAY")
        // Change White to red highlight
        const imageData = overlayCtx.getImageData(0, 0, overlayCanvas.width, overlayCanvas.height);

        const data = imageData.data;

        for(let i =0; i< data.length; i+=4) {
            if(data[i] > MASK_WHITE_THRESHOLD ) {
                data[i] = 255; // red;
                data[i+1] = 0; // green;
                data[i+2] = 0; // blue;
                data[i+3] = 120; // alpha
            } else {
                // Make full transparent transparent
                data[i+3] = 0; // alpha
            }
        }

        overlayCtx.putImageData(imageData, 0, 0);

        ctx.drawImage(overlayCanvas, 0, 0);
        ctx.restore();

        console.log("Image: Data::", imageData);
    }, [])

    useEffect(() =>{
        if(!image) return;
        const img = new Image();
        img.src = image;
        img.onload = () => {
            imgRef.current = img;
            canvasRef.current!.width = img.naturalWidth;
            canvasRef.current!.height = img.naturalHeight;

            // Prepare mask
            maskCanvasRef.current = document.createElement("canvas"); /////
            // set same width height as original canvas
            maskCanvasRef.current.width = img.naturalWidth;
            maskCanvasRef.current.height = img.naturalHeight;

            // Get Mask context 
            const maskCtx = maskCanvasRef.current.getContext("2d");

            if(maskCtx) {
                maskCtx.fillStyle = "black";
                maskCtx.fillRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
            }
            
            // Create overlay canvas (temp)
            overlayCanvasRef.current = document.createElement("canvas"); /////
            // set same width height as original canvas
            overlayCanvasRef.current.width = img.naturalWidth;
            overlayCanvasRef.current.height = img.naturalHeight;

            draw()
        }
    }, [image, draw]);

    const getPointerPos = (e: React.PointerEvent) => {
        if(!canvasRef.current) return { x: 0, y: 0 };

        const rect = canvasRef.current.getBoundingClientRect();

        const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
        const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);

        return { x, y };
    }

    const updateMask = (start: Point, end: Point) => {
        if(!maskCanvasRef.current) return;


        const ctx = maskCanvasRef.current.getContext("2d");
        if(!ctx) return;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if(selectedTool === ToolType.ERASER) {
            ctx.strokeStyle = "black";
            ctx.fillStyle = "black";
        } else if(selectedTool === ToolType.BRUSH) {
            ctx.strokeStyle = "white";
            ctx.fillStyle = "white";
        }
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

    }
    const startDrwaing = (e : React.PointerEvent) => {
        e.preventDefault();
        if(selectedTool === ToolType.MOVE) return;
        if(e.pointerType !== "mouse") return; // Supporting mouse pointer only for now
        const pos = getPointerPos(e);

        startPosRef.current = pos;
        isDrawingRef.current = true;
        if(selectedTool === ToolType.BRUSH ||  selectedTool === ToolType.ERASER) {
            updateMask(pos, pos);
        }

    }

    const drawMove = (e: React.PointerEvent) => {
        e.preventDefault();
        if(!isDrawingRef.current) return;
        const startPos = startPosRef.current;
        if(!startPos) return;
        const currentPos = getPointerPos(e);

        if(selectedTool === ToolType.BRUSH || selectedTool === ToolType.ERASER) {
            updateMask(startPos, currentPos);
            startPosRef.current = currentPos;
        }

        draw()
    }

    const endDrawing = () => {
        isDrawingRef.current = false;

        // TODO: Prepare the mask to be bas64 data url

        if(maskCanvasRef.current) {
            const dataUrl = maskCanvasRef.current.toDataURL("image/png");
            setMask(dataUrl);
        }
    }


    if(!image) return null;
  return (
    <div className='p-1 border flex flex-col overflow-auto'>
        <canvas 
            ref={canvasRef} 
            width={1000} 
            height={500} 
            onPointerDown={startDrwaing}
            onPointerMove={drawMove}
            onPointerUp={endDrawing}
            // className='cursor-'
        />
        {/* {
            mask && <NextImage src={mask} width={1000} height={500} alt="mask"/>
        } */}
    </div>
  )
}

export enum ToolType {
    MOVE = "MOVE",
    RECTANGLE = "RECTANGLE",
    BRUSH = "BRUSH",
    ERASER = "ERASER"
}

export default ImageEditor;
