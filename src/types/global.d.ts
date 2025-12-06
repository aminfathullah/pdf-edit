// Type declarations for module hot replacement
interface NodeModule {
  hot?: {
    accept(): void;
    accept(dependencies: string[], callback: (updatedDependencies: string[]) => void): void;
  };
}

// Declare global module variable
declare const module: NodeModule;

// Declare CSS modules
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Declare asset imports
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.wasm' {
  const content: string;
  export default content;
}
