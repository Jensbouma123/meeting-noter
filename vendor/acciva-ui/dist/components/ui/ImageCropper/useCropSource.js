import { useEffect, useRef, useState } from "react";
import { MAX_DECODE_PIXELS, initialCropRect, isCroppable, } from "../../../lib/image/index.js";
export function useCropSource({ source, aspect, defaultValue, onLoad, onError }) {
    const [url, setUrl] = useState();
    const [image, setImage] = useState();
    const [failed, setFailed] = useState(false);
    const [innerRect, setInnerRect] = useState();
    // `null` keeps the view centred on the box; a pan or drag pins it to a source point.
    const [center, setCenter] = useState(null);
    // Latest-value refs read by the async decode, so the effect below does not re-run on each render.
    const callbacks = useRef({ onLoad, onError });
    // eslint-disable-next-line react-hooks/refs
    callbacks.current = { onLoad, onError };
    const initial = useRef({ defaultValue, aspect });
    // eslint-disable-next-line react-hooks/refs
    initial.current = { defaultValue, aspect };
    useEffect(() => {
        let cancelled = false;
        // Reset to the empty state for a new source; this is the intended sync point.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setImage(undefined);
        setFailed(false);
        setInnerRect(undefined);
        setCenter(null);
        const fail = (code) => {
            if (cancelled)
                return;
            setFailed(true);
            callbacks.current.onError?.(code);
        };
        if (!isCroppable(source)) {
            fail("unsupported");
            return;
        }
        const objectUrl = URL.createObjectURL(source);
        setUrl(objectUrl);
        createImageBitmap(source, { imageOrientation: "from-image" }).then((bitmap) => {
            const size = { width: bitmap.width, height: bitmap.height };
            bitmap.close();
            if (cancelled)
                return;
            if (size.width * size.height > MAX_DECODE_PIXELS)
                return fail("too-large");
            const { defaultValue: start, aspect: startAspect } = initial.current;
            setImage(size);
            setInnerRect(start ?? initialCropRect(size.width, size.height, startAspect));
            callbacks.current.onLoad?.(size);
        }, () => fail("decode"));
        return () => {
            cancelled = true;
            URL.revokeObjectURL(objectUrl);
            setUrl(undefined);
        };
    }, [source]);
    return { url, image, failed, innerRect, setInnerRect, center, setCenter };
}
