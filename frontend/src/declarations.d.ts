declare module "react-katex" {
  import * as React from "react";

  export interface MathProps {
    math?: string;
    children?: React.ReactNode;
    errorColor?: string;
    renderError?: (error: Error | TypeError) => React.ReactNode;
  }

  export class InlineMath extends React.Component<MathProps> {}
  export class BlockMath extends React.Component<MathProps> {}
}

declare module "react-syntax-highlighter";
declare module "react-syntax-highlighter/dist/esm/styles/prism";
