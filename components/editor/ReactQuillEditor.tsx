"use client";

import type { ComponentProps } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

type Props = ComponentProps<typeof ReactQuill>;

/**
 * Thin wrapper so `next/dynamic` loads a stable local chunk (avoids broken `/_next/undefined`
 * URLs from dynamic `import("react-quill")` alone) and keeps Quill off the SSR path.
 */
export default function ReactQuillEditor(props: Props) {
  return <ReactQuill {...props} />;
}
