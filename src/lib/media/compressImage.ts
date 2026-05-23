export type CompressImageOptions = {
  maxWidth: number;
  quality: number;
  base64?: boolean;
  /** If set, retry once at quality 0.6 when output exceeds this byte count. */
  maxBytes?: number;
};

export type CompressImageResult = {
  uri: string;
  base64?: string;
  width: number;
  height: number;
  size: number;
};

async function measureOutputSize(
  uri: string,
  base64?: string,
): Promise<number> {
  if (base64) {
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    return dataUrl.length;
  }
  const blob = await fetch(uri).then((r) => r.blob());
  return blob.size;
}

async function loadImageManipulator() {
  try {
    return await import("expo-image-manipulator");
  } catch (error) {
    throw new Error(
      "expo-image-manipulator is not linked. Rebuild the native app: npx expo run:ios",
      { cause: error },
    );
  }
}

export async function compressImage(
  uri: string,
  opts: CompressImageOptions,
): Promise<CompressImageResult> {
  const ImageManipulator = await loadImageManipulator();
  const qualities = opts.maxBytes
    ? [opts.quality, 0.6]
    : [opts.quality];

  let lastResult: Awaited<
    ReturnType<typeof ImageManipulator.manipulateAsync>
  > | null = null;
  let lastSize = 0;

  for (const quality of qualities) {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: opts.maxWidth } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: opts.base64 ?? false,
      },
    );

    const size = await measureOutputSize(result.uri, result.base64);
    lastResult = result;
    lastSize = size;

    if (!opts.maxBytes || size <= opts.maxBytes) {
      return {
        uri: result.uri,
        base64: result.base64,
        width: result.width,
        height: result.height,
        size,
      };
    }
  }

  return {
    uri: lastResult!.uri,
    base64: lastResult!.base64,
    width: lastResult!.width,
    height: lastResult!.height,
    size: lastSize,
  };
}
