interface Window {
  SacramentDialogs: {
    open(element: HTMLElement, from: HTMLElement | null): void;
    close(element: HTMLElement): void;
    reset(): void;
  };
}
