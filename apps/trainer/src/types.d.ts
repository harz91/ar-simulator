import React from "react";

declare module "@google/model-viewer";

declare namespace JSX {
  interface IntrinsicElements {
    "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string;
      ar?: boolean;
      "ar-modes"?: string;
      "camera-controls"?: boolean;
      exposure?: string;
      "shadow-intensity"?: string;
    };
  }
}
