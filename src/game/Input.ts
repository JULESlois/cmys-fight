export class Input {
  public keys: { [key: string]: boolean } = {};
  public justPressed: { [key: string]: boolean } = {};

  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleKeyUp = this.onKeyUp.bind(this);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", () => this.clear());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clear();
    });
  }

  private normalizeKey(key: string): string {
    if (key === " ") return " ";
    return key.toLowerCase();
  }

  private onKeyDown(e: KeyboardEvent) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }
    const nk = this.normalizeKey(e.key);
    if (!this.keys[nk]) {
      this.justPressed[nk] = true;
    }
    this.keys[nk] = true;
  }

  private onKeyUp(e: KeyboardEvent) {
    const nk = this.normalizeKey(e.key);
    this.keys[nk] = false;
    this.justPressed[nk] = false;
  }

  public update() {
    // Reset justPressed after the frame
    for (let key in this.justPressed) {
      this.justPressed[key] = false;
    }
  }

  public clear() {
    this.keys = {};
    this.justPressed = {};
  }

  public clearJustPressed() {
    this.justPressed = {};
  }

  public cleanup() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  public isDown(key: string): boolean {
    return !!this.keys[this.normalizeKey(key)];
  }

  public wasPressed(key: string): boolean {
    return !!this.justPressed[this.normalizeKey(key)];
  }

  public getAxis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    
    if (this.isDown("arrowleft") || this.isDown("a")) x -= 1;
    if (this.isDown("arrowright") || this.isDown("d")) x += 1;
    if (this.isDown("arrowup") || this.isDown("w")) y -= 1;
    if (this.isDown("arrowdown") || this.isDown("s")) y += 1;
    
    // Normalize if moving diagonally
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }
    
    return { x, y };
  }
}
